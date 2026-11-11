import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { REVISION_CONFLICT_MESSAGE } from "./revision-conflict"

export type QuestionDestination = {
  assessmentId: string
  expectedRevision: number
  section: string | null
  marks: number
  negativeMarks: number
}

/** Must run in the SAME transaction as question creation and allocation. */
export async function reserveQuestionDestination(
  tx: Prisma.TransactionClient,
  input: QuestionDestination & { workspaceId: string; installationId: string },
  principal: ToolExecutionPrincipal
) {
  if (!principal.actorId || principal.workspaceId !== input.workspaceId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  const block = await tx.block.findFirst({
    where: {
      id: input.assessmentId,
      workspaceId: input.workspaceId,
      originToolInstallationId: input.installationId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "mock-tests.assessment" },
    },
    select: {
      revision: true,
      allowAgentAccess: true,
      assessmentDetails: {
        select: {
          workspaceId: true,
          status: true,
          blueprint: true,
          _count: { select: { questions: true, attempts: true } },
          questions: {
            orderBy: { position: "desc" },
            take: 1,
            select: { position: true },
          },
        },
      },
    },
  })
  const assessment = block?.assessmentDetails
  if (
    !block ||
    !assessment ||
    assessment.workspaceId !== input.workspaceId ||
    assessment.status === "ARCHIVED"
  )
    throw new ToolActionExecutionError(
      "This assessment is no longer available.",
      "NOT_AVAILABLE"
    )
  if (principal.invocationSource !== "web" && !block.allowAgentAccess)
    throw new ToolActionExecutionError(
      "Agent access is not enabled for this assessment.",
      "FORBIDDEN"
    )
  if (Number(block.revision) !== input.expectedRevision)
    throw new ToolActionExecutionError(
      REVISION_CONFLICT_MESSAGE,
      "REVISION_CONFLICT"
    )
  if (assessment._count.attempts)
    throw new ToolActionExecutionError(
      "This assessment has attempts. Create a new version before changing its questions.",
      "INVALID_INPUT"
    )
  if (assessment._count.questions >= 200)
    throw new ToolActionExecutionError(
      "An assessment can hold at most 200 questions.",
      "INVALID_INPUT"
    )
  const blueprint = assessment.blueprint as {
    sections?: Array<{ key: string }>
  } | null
  if (
    input.section &&
    !blueprint?.sections?.some((section) => section.key === input.section)
  )
    throw new ToolActionExecutionError(
      "The selected section is no longer available. Return to the builder to refresh.",
      "INVALID_INPUT"
    )
  const position = (assessment.questions[0]?.position ?? -1) + 1
  if (position > 9999)
    throw new ToolActionExecutionError(
      "Reorder the assessment before adding another question.",
      "INVALID_INPUT"
    )
  const changed = await tx.block.updateMany({
    where: {
      id: input.assessmentId,
      workspaceId: input.workspaceId,
      revision: BigInt(input.expectedRevision),
    },
    data: { revision: { increment: 1 } },
  })
  if (changed.count !== 1)
    throw new ToolActionExecutionError(
      REVISION_CONFLICT_MESSAGE,
      "REVISION_CONFLICT"
    )
  return {
    revision: input.expectedRevision + 1,
    position,
    questionCount: assessment._count.questions + 1,
  }
}

/** The handler owns the transaction; content, allocation and revision roll back together. */
export async function createAndAttachQuestion<T extends { id: string }>(
  tx: Prisma.TransactionClient,
  input: QuestionDestination & { workspaceId: string; installationId: string },
  principal: ToolExecutionPrincipal,
  create: (tx: Prisma.TransactionClient) => Promise<T>
) {
  const destination = await reserveQuestionDestination(tx, input, principal)
  const question = await create(tx)
  await tx.assessmentQuestion.create({
    data: {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      assessmentId: input.assessmentId,
      questionId: question.id,
      section: input.section,
      position: destination.position,
      marks: input.marks,
      negativeMarks: input.negativeMarks,
      isRequired: true,
    },
  })
  const totals = await tx.assessmentQuestion.aggregate({
    where: { assessmentId: input.assessmentId, workspaceId: input.workspaceId },
    _sum: { marks: true },
  })
  return {
    question,
    assessment: {
      id: input.assessmentId,
      revision: destination.revision,
      questionCount: destination.questionCount,
      totalMarks: Number(totals._sum.marks ?? 0),
    },
  }
}

import type { Prisma } from "@/generated/prisma/client"
import { ToolActionExecutionError } from "@/lib/tools/errors"

export function activeExamPrepBlock(
  workspaceId: string,
  installationId?: string,
  agent = false
) {
  return {
    workspaceId,
    status: "ACTIVE" as const,
    archivedAt: null,
    ...(installationId ? { originToolInstallationId: installationId } : {}),
    ...(agent ? { allowAgentAccess: true } : {}),
    originToolInstallation: {
      workspaceId,
      status: "ACTIVE" as const,
      toolDefinition: { key: "core.exam-prep" },
    },
  }
}

/** Validate the typed FK at the transactional write boundary, including every ancestor. */
export async function assertAssessmentStudyContext(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  blockId: string,
  agent = false
) {
  const block = await tx.block.findFirst({
    where: {
      id: blockId,
      ...activeExamPrepBlock(workspaceId, undefined, agent),
    },
    select: {
      id: true,
      originToolInstallationId: true,
      blockType: { select: { key: true } },
      examDetails: { select: { blockId: true } },
      subjectDetails: { select: { blockId: true } },
      chapterDetails: { select: { blockId: true } },
      topicDetails: { select: { blockId: true } },
    },
  })
  const type = block?.blockType.key
  const validDetails =
    type === "exam-prep.exam"
      ? block?.examDetails
      : type === "exam-prep.subject"
        ? block?.subjectDetails
        : type === "exam-prep.chapter"
          ? block?.chapterDetails
          : type === "exam-prep.topic"
            ? block?.topicDetails
            : null
  if (!block || !validDetails || !block.originToolInstallationId) {
    throw new ToolActionExecutionError(
      "Choose an active Exam Prep exam, subject, chapter or topic in this workspace.",
      "INVALID_INPUT"
    )
  }
  const active = activeExamPrepBlock(
    workspaceId,
    block.originToolInstallationId,
    agent
  )
  const ancestry = [
    {
      child: "exam-prep.topic",
      parent: "exam-prep.chapter",
      relation: "exam-prep.chapter-has-topic",
    },
    {
      child: "exam-prep.chapter",
      parent: "exam-prep.subject",
      relation: "exam-prep.subject-has-chapter",
    },
    {
      child: "exam-prep.subject",
      parent: "exam-prep.exam",
      relation: "exam-prep.exam-has-subject",
    },
  ]
  let currentId = block.id
  let currentType = type
  for (const edge of ancestry) {
    if (currentType !== edge.child) continue
    const relation = await tx.blockRelation.findFirst({
      where: {
        workspaceId,
        toBlockId: currentId,
        relationType: { key: edge.relation },
        toBlock: { ...active, blockType: { key: edge.child } },
        fromBlock: {
          ...active,
          blockType: { key: edge.parent },
          ...(edge.parent === "exam-prep.exam"
            ? { examDetails: { isNot: null } }
            : edge.parent === "exam-prep.subject"
              ? { subjectDetails: { isNot: null } }
              : { chapterDetails: { isNot: null } }),
        },
      },
      select: { fromBlockId: true },
      orderBy: { id: "asc" },
    })
    if (!relation)
      throw new ToolActionExecutionError(
        "The study context is no longer part of an active Exam Prep syllabus.",
        "INVALID_INPUT"
      )
    currentId = relation.fromBlockId
    currentType = edge.parent
  }
}

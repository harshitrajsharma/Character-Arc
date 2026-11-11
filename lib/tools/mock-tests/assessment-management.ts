import type { Prisma } from "../../../generated/prisma/client"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { REVISION_CONFLICT_MESSAGE } from "./revision-conflict"

export type AssessmentManagementInput = {
  workspaceId: string
  installationId: string
  assessmentId: string
  expectedRevision: number
  operation: "rename" | "delete"
  title?: string
}

/** Called inside the authorized tool action transaction; never deletes history. */
export async function manageAssessment(
  tx: Prisma.TransactionClient,
  input: AssessmentManagementInput,
  principal: ToolExecutionPrincipal
) {
  if (!principal.actorId || principal.workspaceId !== input.workspaceId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  const title = input.title?.trim()
  if (input.operation === "rename" && (!title || title.length > 200))
    throw new ToolActionExecutionError(
      "Enter an assessment name between 1 and 200 characters.",
      "INVALID_INPUT"
    )
  const existing = await tx.block.findFirst({
    where: {
      id: input.assessmentId,
      workspaceId: input.workspaceId,
      status: "ACTIVE",
      archivedAt: null,
      originToolInstallationId: input.installationId,
      blockType: { key: "mock-tests.assessment" },
    },
    select: {
      title: true,
      revision: true,
      allowAgentAccess: true,
      assessmentDetails: {
        select: { workspaceId: true, status: true },
      },
    },
  })
  if (!existing)
    throw new ToolActionExecutionError(
      "This assessment is no longer available in this workspace.",
      "NOT_AVAILABLE"
    )
  if (
    existing.assessmentDetails &&
    existing.assessmentDetails.workspaceId !== input.workspaceId
  )
    throw new ToolActionExecutionError(
      "This assessment is no longer available in this workspace.",
      "NOT_AVAILABLE"
    )
  if (
    input.operation === "rename" &&
    existing.assessmentDetails?.status === "ARCHIVED"
  )
    throw new ToolActionExecutionError(
      "Archived assessments cannot be renamed.",
      "NOT_AVAILABLE"
    )
  if (principal.invocationSource !== "web" && !existing.allowAgentAccess)
    throw new ToolActionExecutionError(
      "Agent access is disabled for this assessment.",
      "FORBIDDEN"
    )
  if (Number(existing.revision) !== input.expectedRevision)
    throw new ToolActionExecutionError(
      REVISION_CONFLICT_MESSAGE,
      "REVISION_CONFLICT"
    )
  if (
    input.operation === "delete" &&
    (await tx.attempt.count({
      where: {
        workspaceId: input.workspaceId,
        assessmentId: input.assessmentId,
        status: "IN_PROGRESS",
      },
    }))
  )
    throw new ToolActionExecutionError(
      "Finish or abandon the active attempts before deleting this assessment.",
      "INVALID_INPUT"
    )
  const changed = await tx.block.updateMany({
    where: {
      id: input.assessmentId,
      workspaceId: input.workspaceId,
      originToolInstallationId: input.installationId,
      status: "ACTIVE",
      archivedAt: null,
      revision: BigInt(input.expectedRevision),
    },
    data: {
      revision: { increment: 1 },
      ...(input.operation === "rename"
        ? { title }
        : { status: "ARCHIVED" as const, archivedAt: new Date() }),
    },
  })
  if (changed.count !== 1)
    throw new ToolActionExecutionError(
      REVISION_CONFLICT_MESSAGE,
      "REVISION_CONFLICT"
    )
  if (input.operation === "delete" && existing.assessmentDetails)
    await tx.assessment.update({
      where: { blockId: input.assessmentId },
      data: { status: "ARCHIVED" },
    })
  return {
    id: input.assessmentId,
    title: input.operation === "rename" ? title! : existing.title,
    revision: input.expectedRevision + 1,
    deleted: input.operation === "delete",
  }
}

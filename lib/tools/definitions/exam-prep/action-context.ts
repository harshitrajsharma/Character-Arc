import "server-only"

import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export class ExamPrepActionContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExamPrepActionContextError"
  }
}

export async function getExamPrepActionContext(workspaceSlug: string) {
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    installationId: installation.id,
    role: workspace.role,
  }
}

export async function getExamPrepWriteContext(workspaceSlug: string) {
  const context = await getExamPrepActionContext(workspaceSlug)

  if (context.role === "VIEWER") {
    throw new ExamPrepActionContextError(
      "You do not have permission to modify Exam Prep data in this workspace."
    )
  }

  return context
}

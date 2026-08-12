import "server-only"

import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export class MockTestsActionContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MockTestsActionContextError"
  }
}

export async function getMockTestsActionContext(workspaceSlug: string) {
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.mock-tests"
  )

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    installationId: installation.id,
    role: workspace.role,
  }
}

export async function getMockTestsWriteContext(workspaceSlug: string) {
  const context = await getMockTestsActionContext(workspaceSlug)

  if (context.role === "VIEWER") {
    throw new MockTestsActionContextError(
      "You do not have permission to modify Mock Tests data in this workspace."
    )
  }

  return context
}

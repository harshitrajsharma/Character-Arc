"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { installTool, ToolInstallationError } from "@/lib/tools/install-tool"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"

export type InstallToolActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const installToolActionSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceSlug: z.string().trim().min(1).max(100),
  toolKey: z.string().trim().min(3).max(120),
})

export async function installToolAction(
  _previousState: InstallToolActionState,
  formData: FormData
): Promise<InstallToolActionState> {
  const parsed = installToolActionSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    workspaceSlug: formData.get("workspaceSlug"),
    toolKey: formData.get("toolKey"),
  })

  if (!parsed.success) {
    return { status: "error", message: "The installation request is invalid." }
  }

  const workspace = await getWorkspaceIdentity(parsed.data.workspaceSlug)
  if (workspace.id !== parsed.data.workspaceId) {
    return {
      status: "error",
      message: "The selected workspace does not match this page.",
    }
  }

  const destination = workspaceRoutes.toolHome(
    workspace.slug,
    parsed.data.toolKey
  )
  if (!destination) {
    return {
      status: "error",
      message: "This tool does not have a workspace destination yet.",
    }
  }

  try {
    await installTool({
      workspaceId: workspace.id,
      toolKey: parsed.data.toolKey,
    })
  } catch (error) {
    if (error instanceof ToolInstallationError) {
      return { status: "error", message: error.message }
    }

    return {
      status: "error",
      message: "The tool could not be installed. Try again.",
    }
  }

  revalidatePath("/tools")
  revalidatePath(workspaceRoutes.home(workspace.slug))
  revalidatePath(destination, "layout")
  redirect(destination)
}

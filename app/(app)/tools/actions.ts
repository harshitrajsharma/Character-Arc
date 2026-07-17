"use server"

import { revalidatePath } from "next/cache"

import { installTool, ToolInstallationError } from "@/lib/tools/install-tool"

export type InstallToolActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export async function installToolAction(
  _previousState: InstallToolActionState,
  formData: FormData
): Promise<InstallToolActionState> {
  try {
    await installTool({
      workspaceId: String(formData.get("workspaceId") ?? ""),
      toolKey: String(formData.get("toolKey") ?? ""),
    })

    revalidatePath("/tools")
    revalidatePath("/dashboard")

    return {
      status: "success",
      message: "Tool installed. Your workspace is ready for its first outcome.",
    }
  } catch (error) {
    if (error instanceof ToolInstallationError) {
      return { status: "error", message: error.message }
    }

    return {
      status: "error",
      message: "The tool could not be installed. Try again.",
    }
  }
}

import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"

const installToolInputSchema = z.object({
  workspaceId: z.uuid(),
  toolKey: z.string().min(3).max(120),
})

const installationSchema = z.object({
  installation_id: z.uuid(),
  workspace_id: z.uuid(),
  tool_definition_id: z.uuid(),
  tool_release_id: z.uuid(),
  status: z.enum(["active", "disabled", "removed"]),
  installed_at: z.iso.datetime({ offset: true }),
})

export type InstallToolInput = z.input<typeof installToolInputSchema>
export type InstalledTool = z.infer<typeof installationSchema>

export class ToolInstallationError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_INPUT" | "NOT_AVAILABLE" | "FORBIDDEN" | "FAILED"
  ) {
    super(message)
    this.name = "ToolInstallationError"
  }
}

export async function installTool(input: InstallToolInput) {
  const parsed = installToolInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new ToolInstallationError(
      "The tool installation request is invalid.",
      "INVALID_INPUT"
    )
  }

  const manifest = getFirstPartyToolManifest(parsed.data.toolKey)

  if (!manifest) {
    throw new ToolInstallationError(
      "This tool is not available in this application release.",
      "NOT_AVAILABLE"
    )
  }

  await requireVerifiedClaims("/tools")
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc("install_tool", {
    requested_release_version: manifest.release.version,
    requested_tool_key: parsed.data.toolKey,
    target_workspace_id: parsed.data.workspaceId,
  })

  if (error) {
    if (error.code === "42501") {
      throw new ToolInstallationError(
        "Only the workspace owner can install tools.",
        "FORBIDDEN"
      )
    }

    if (error.code === "P0002") {
      throw new ToolInstallationError(
        "The requested tool or published release is unavailable.",
        "NOT_AVAILABLE"
      )
    }

    throw new ToolInstallationError(
      "The tool could not be installed. Try again.",
      "FAILED"
    )
  }

  const installation = Array.isArray(data) ? data[0] : data
  const result = installationSchema.safeParse(installation)

  if (!result.success) {
    throw new ToolInstallationError(
      "The installation completed with an invalid response.",
      "FAILED"
    )
  }

  return result.data
}

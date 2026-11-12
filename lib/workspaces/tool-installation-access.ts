import type { PrismaClient } from "@/generated/prisma/client"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"

export class ToolInstallationUnavailableError extends Error {
  readonly code = "NOT_AVAILABLE"
  readonly recoveryHref: string
  constructor(toolKey: string) {
    super(
      "This tool is not enabled in this workspace. Enable it from the tool catalog."
    )
    this.name = "ToolInstallationUnavailableError"
    this.recoveryHref =
      getFirstPartyToolManifest(toolKey)?.routes?.home ?? "/tools"
  }
}

/** Caller has already verified workspace membership. Reads never supply installation consent. */
export async function readActiveToolInstallation(
  db: Pick<PrismaClient, "toolInstallation">,
  workspaceId: string,
  toolKey: string
) {
  const installation = await db.toolInstallation.findFirst({
    where: {
      workspaceId,
      status: "ACTIVE",
      toolDefinition: { key: toolKey, enabled: true },
      toolRelease: { status: "PUBLISHED" },
    },
    select: { id: true, toolDefinition: { select: { key: true, name: true } } },
  })
  if (!installation) throw new ToolInstallationUnavailableError(toolKey)
  return installation
}

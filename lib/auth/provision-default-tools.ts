import type { Prisma } from "@/generated/prisma/client"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"
import { ensureToolDefaultGrants } from "@/lib/tools/installation-grants"

const DEFAULT_CORE_TOOL_KEYS = [
  "core.exam-prep",
  "core.goals-paths",
  "core.mock-tests",
] as const

/** Only called in the transaction that creates a brand-new personal workspace. */
export async function provisionDefaultCoreTools(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string
) {
  const manifests = DEFAULT_CORE_TOOL_KEYS.flatMap((key) => {
    const manifest = getFirstPartyToolManifest(key)
    return manifest ? [manifest] : []
  })
  const definitions = await tx.toolDefinition.findMany({
    where: { key: { in: [...DEFAULT_CORE_TOOL_KEYS] }, enabled: true },
    select: {
      id: true,
      key: true,
      releases: {
        where: {
          status: "PUBLISHED",
          version: {
            in: manifests.map((manifest) => manifest.release.version),
          },
        },
        select: { id: true, version: true },
      },
    },
  })
  for (const definition of definitions) {
    const manifest = manifests.find(
      (candidate) => candidate.tool.key === definition.key
    )
    const release = definition.releases.find(
      (candidate) => candidate.version === manifest?.release.version
    )
    // Registry deployment may intentionally omit/disable a tool. Never activate it here.
    if (!manifest || !release) continue
    const installation = await tx.toolInstallation.create({
      data: {
        workspaceId,
        installedById: userId,
        toolDefinitionId: definition.id,
        toolReleaseId: release.id,
        status: "ACTIVE",
      },
      select: { id: true },
    })
    await ensureToolDefaultGrants(
      tx,
      workspaceId,
      installation.id,
      manifest.defaultGrants
    )
  }
}

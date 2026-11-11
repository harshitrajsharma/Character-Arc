import { ToolGrantEffect, type Prisma } from "@/generated/prisma/client"
import type { ToolManifest } from "./contracts"

/** Installation consent supplies defaults; an existing grant remains authoritative. */
export async function ensureToolDefaultGrants(
  tx: Pick<Prisma.TransactionClient, "toolGrant">,
  workspaceId: string,
  installationId: string,
  grants: ToolManifest["defaultGrants"]
) {
  for (const grant of grants) {
    await tx.toolGrant.upsert({
      where: {
        installationId_permissionKey: {
          installationId,
          permissionKey: grant.permissionKey,
        },
      },
      create: {
        workspaceId,
        installationId,
        permissionKey: grant.permissionKey,
        effect:
          grant.effect === "allow"
            ? ToolGrantEffect.ALLOW
            : ToolGrantEffect.DENY,
        constraints: grant.constraints as Prisma.InputJsonValue,
      },
      // Re-enabling a tool must not erase an owner's explicit deny or constraints.
      update: {},
    })
  }
}

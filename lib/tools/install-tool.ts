import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"
import type { Prisma } from "../../generated/prisma/client"
import { ToolGrantEffect } from "../../generated/prisma/client"

type StoredReleaseManifest = {
  defaultGrants?: ReadonlyArray<{
    permissionKey?: string
    effect?: string
    constraints?: Prisma.InputJsonValue
  }>
}

const installToolInputSchema = z.object({
  workspaceId: z.string().uuid(),
  toolKey: z.string().min(3).max(120),
})

const installationSchema = z.object({
  installation_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  tool_definition_id: z.string().uuid(),
  tool_release_id: z.string().uuid(),
  status: z.enum(["active", "disabled", "removed"]),
  installed_at: z.string().datetime({ offset: true }),
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

  const claims = await requireVerifiedClaims("/tools")

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate the caller is a workspace owner
      const member = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: parsed.data.workspaceId,
            userId: claims.sub,
          },
        },
      })

      if (!member || member.role !== "OWNER") {
        throw new ToolInstallationError(
          "Only the workspace owner can install tools.",
          "FORBIDDEN"
        )
      }

      // 2. Find the requested tool definition and release
      const definition = await tx.toolDefinition.findUnique({
        where: { key: parsed.data.toolKey },
      })

      if (!definition || !definition.enabled) {
        throw new ToolInstallationError(
          "The requested tool or published release is unavailable.",
          "NOT_AVAILABLE"
        )
      }

      const release = await tx.toolRelease.findFirst({
        where: {
          toolDefinitionId: definition.id,
          version: manifest.release.version,
          status: "PUBLISHED",
        },
      })

      if (!release) {
        throw new ToolInstallationError(
          "The requested tool or published release is unavailable.",
          "NOT_AVAILABLE"
        )
      }

      // 3. Create or update tool_installations row
      const installation = await tx.toolInstallation.upsert({
        where: {
          workspaceId_toolDefinitionId: {
            workspaceId: parsed.data.workspaceId,
            toolDefinitionId: definition.id,
          },
        },
        create: {
          workspaceId: parsed.data.workspaceId,
          installedById: claims.sub,
          toolDefinitionId: definition.id,
          toolReleaseId: release.id,
          status: "ACTIVE",
        },
        update: {
          installedById: claims.sub,
          toolReleaseId: release.id,
          status: "ACTIVE",
          disabledAt: null,
        },
      })

      // 4. Copies permissions from release.manifest->'defaultGrants' into tool_grants
      const manifestData: StoredReleaseManifest =
        release.manifest && typeof release.manifest === "object"
          ? (release.manifest as StoredReleaseManifest)
          : {}
      const defaultGrants = Array.isArray(manifestData?.defaultGrants)
        ? manifestData.defaultGrants
        : []

      for (const grant of defaultGrants) {
        if (!grant.permissionKey) continue

        const effect =
          grant.effect === "allow"
            ? ToolGrantEffect.ALLOW
            : ToolGrantEffect.DENY
        const constraints = grant.constraints || {}

        await tx.toolGrant.upsert({
          where: {
            installationId_permissionKey: {
              installationId: installation.id,
              permissionKey: grant.permissionKey,
            },
          },
          create: {
            workspaceId: parsed.data.workspaceId,
            installationId: installation.id,
            permissionKey: grant.permissionKey,
            effect: effect,
            constraints: constraints,
          },
          update: {
            effect: effect,
            constraints: constraints,
          },
        })
      }

      return installation
    })

    const formattedInstallation = {
      installation_id: result.id,
      workspace_id: result.workspaceId,
      tool_definition_id: result.toolDefinitionId,
      tool_release_id: result.toolReleaseId,
      status: result.status.toLowerCase(),
      installed_at: result.installedAt.toISOString(),
    }

    const validationResult = installationSchema.safeParse(formattedInstallation)

    if (!validationResult.success) {
      throw new ToolInstallationError(
        "The installation completed with an invalid response.",
        "FAILED"
      )
    }

    return validationResult.data
  } catch (error) {
    if (error instanceof ToolInstallationError) {
      throw error
    }

    throw new ToolInstallationError(
      "The tool could not be installed. Try again.",
      "FAILED"
    )
  }
}

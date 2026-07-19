import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { ToolManifest } from "@/lib/tools/contracts"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"

const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
})

const toolDefinitionsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    key: z.string(),
  })
)

const toolReleasesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    toolDefinitionId: z.string().uuid(),
    version: z.string(),
  })
)

const toolInstallationsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    toolDefinitionId: z.string().uuid(),
    toolReleaseId: z.string().uuid(),
    status: z.enum(["ACTIVE", "DISABLED", "REMOVED"]),
    installedAt: z.date(),
  })
)

export type ToolCategory = ToolManifest["tool"]["category"]
export type ToolCatalogIssue = "workspace_unavailable" | "catalog_unavailable"

export type ToolCatalogItem = {
  key: string
  name: string
  description: string
  icon: string
  category: ToolCategory
  homeRoute: string
  actionNames: string[]
  blockTypeNames: string[]
  installationStatus: "active" | "disabled" | "removed" | "not_installed"
  installationId: string | null
  installedAt: string | null
  installable: boolean
}

export type ToolCatalog = {
  workspace: { id: string; name: string; slug: string } | null
  items: ToolCatalogItem[]
  issue: ToolCatalogIssue | null
}

function unavailableItems(manifests: ToolManifest[]): ToolCatalogItem[] {
  return manifests.map((manifest) => ({
    key: manifest.tool.key,
    name: manifest.tool.name,
    description: manifest.tool.description,
    icon: manifest.tool.icon,
    category: manifest.tool.category,
    homeRoute: manifest.routes.home,
    actionNames: manifest.actions.map((action) => action.name),
    blockTypeNames: manifest.blockTypes.map((blockType) => blockType.name),
    installationStatus: "not_installed",
    installationId: null,
    installedAt: null,
    installable: false,
  }))
}

export async function getToolCatalog(): Promise<ToolCatalog> {
  const claims = await requireVerifiedClaims("/tools")
  const manifests = listFirstPartyToolManifests()
  
  const workspaceData = await prisma.workspace.findFirst({
    where: {
      createdById: claims.sub,
      kind: "PERSONAL",
      archivedAt: null,
    },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" }
  })

  const workspace = workspaceSchema.safeParse(workspaceData)

  if (!workspaceData || !workspace.success) {
    return {
      workspace: null,
      items: unavailableItems(manifests),
      issue: "workspace_unavailable",
    }
  }

  const toolKeys = manifests.map((manifest) => manifest.tool.key)
  const [definitionsData, releasesData, installationsData] =
    await Promise.all([
      prisma.toolDefinition.findMany({
        where: { key: { in: toolKeys } },
        select: { id: true, key: true }
      }),
      prisma.toolRelease.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, toolDefinitionId: true, version: true }
      }),
      prisma.toolInstallation.findMany({
        where: { workspaceId: workspace.data.id },
        select: { id: true, toolDefinitionId: true, toolReleaseId: true, status: true, installedAt: true }
      }),
    ])

  const definitions = toolDefinitionsSchema.safeParse(definitionsData)
  const releases = toolReleasesSchema.safeParse(releasesData)
  const installations = toolInstallationsSchema.safeParse(installationsData)

  const catalogFailed =
    !definitions.success ||
    !releases.success ||
    !installations.success

  if (catalogFailed) {
    if (!definitions.success) console.error("Definitions parse error:", definitions.error)
    if (!releases.success) console.error("Releases parse error:", releases.error)
    if (!installations.success) console.error("Installations parse error:", installations.error)
    return {
      workspace: workspace.data,
      items: unavailableItems(manifests),
      issue: "catalog_unavailable",
    }
  }

  const definitionByKey = new Map(
    definitions.data.map((definition) => [definition.key, definition])
  )
  const releaseKeys = new Set(
    releases.data.map(
      (release) => `${release.toolDefinitionId}:${release.version}`
    )
  )
  const installationByDefinition = new Map(
    installations.data.map((installation) => [
      installation.toolDefinitionId,
      installation,
    ])
  )

  const items = manifests.map<ToolCatalogItem>((manifest) => {
    const definition = definitionByKey.get(manifest.tool.key)
    const releaseAvailable = definition
      ? releaseKeys.has(`${definition.id}:${manifest.release.version}`)
      : false
    const installation = definition
      ? installationByDefinition.get(definition.id)
      : undefined

    const installationStatus = (installation?.status.toLowerCase() as ToolCatalogItem["installationStatus"]) ?? "not_installed"

    return {
      key: manifest.tool.key,
      name: manifest.tool.name,
      description: manifest.tool.description,
      icon: manifest.tool.icon,
      category: manifest.tool.category,
      homeRoute: manifest.routes.home,
      actionNames: manifest.actions.map((action) => action.name),
      blockTypeNames: manifest.blockTypes.map((blockType) => blockType.name),
      installationStatus,
      installationId: installation?.id ?? null,
      installedAt: installation?.installedAt ? installation.installedAt.toISOString() : null,
      installable: releaseAvailable && installationStatus !== "active",
    }
  })

  return {
    workspace: workspace.data,
    items,
    issue: null,
  }
}

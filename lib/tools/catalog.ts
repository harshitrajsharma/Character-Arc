import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ToolManifest } from "@/lib/tools/contracts"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"

const workspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
})

const toolDefinitionsSchema = z.array(
  z.object({
    id: z.uuid(),
    key: z.string(),
  })
)

const toolReleasesSchema = z.array(
  z.object({
    id: z.uuid(),
    tool_definition_id: z.uuid(),
    version: z.string(),
  })
)

const toolInstallationsSchema = z.array(
  z.object({
    id: z.uuid(),
    tool_definition_id: z.uuid(),
    tool_release_id: z.uuid(),
    status: z.enum(["active", "disabled", "removed"]),
    installed_at: z.iso.datetime({ offset: true }),
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
  workspace: { id: string; name: string } | null
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
  const supabase = await createServerSupabaseClient()
  const workspaceResult = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("created_by_id", claims.sub)
    .eq("kind", "personal")
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const workspace = workspaceSchema.safeParse(workspaceResult.data)

  if (workspaceResult.error || !workspace.success) {
    return {
      workspace: null,
      items: unavailableItems(manifests),
      issue: "workspace_unavailable",
    }
  }

  const toolKeys = manifests.map((manifest) => manifest.tool.key)
  const [definitionsResult, releasesResult, installationsResult] =
    await Promise.all([
      supabase.from("tool_definitions").select("id, key").in("key", toolKeys),
      supabase
        .from("tool_releases")
        .select("id, tool_definition_id, version")
        .eq("status", "published"),
      supabase
        .from("tool_installations")
        .select("id, tool_definition_id, tool_release_id, status, installed_at")
        .eq("workspace_id", workspace.data.id),
    ])

  const definitions = toolDefinitionsSchema.safeParse(definitionsResult.data)
  const releases = toolReleasesSchema.safeParse(releasesResult.data)
  const installations = toolInstallationsSchema.safeParse(
    installationsResult.data
  )
  const catalogFailed =
    Boolean(definitionsResult.error) ||
    Boolean(releasesResult.error) ||
    Boolean(installationsResult.error) ||
    !definitions.success ||
    !releases.success ||
    !installations.success

  if (catalogFailed) {
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
      (release) => `${release.tool_definition_id}:${release.version}`
    )
  )
  const installationByDefinition = new Map(
    installations.data.map((installation) => [
      installation.tool_definition_id,
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

    return {
      key: manifest.tool.key,
      name: manifest.tool.name,
      description: manifest.tool.description,
      icon: manifest.tool.icon,
      category: manifest.tool.category,
      homeRoute: manifest.routes.home,
      actionNames: manifest.actions.map((action) => action.name),
      blockTypeNames: manifest.blockTypes.map((blockType) => blockType.name),
      installationStatus: installation?.status ?? "not_installed",
      installationId: installation?.id ?? null,
      installedAt: installation?.installed_at ?? null,
      installable: releaseAvailable && installation?.status !== "active",
    }
  })

  return {
    workspace: workspace.data,
    items,
    issue: null,
  }
}

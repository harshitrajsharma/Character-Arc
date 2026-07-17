import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getToolCatalog } from "@/lib/tools/catalog"

const arcPropertiesSchema = z
  .object({
    objective: z.string().optional(),
    currentReality: z.string().optional(),
    why: z.string().nullable().optional(),
    targetDate: z.string().nullable().optional(),
    constraints: z.array(z.string()).optional(),
    contentFormat: z.string().optional(),
  })
  .passthrough()

const arcRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    body: z.string().nullable(),
    status: z.enum(["draft", "active", "archived"]),
    visibility: z.enum(["private", "workspace", "public"]),
    allow_agent_access: z.boolean(),
    properties: arcPropertiesSchema,
    schema_version: z.number().int(),
    revision: z.union([z.string(), z.number()]),
    created_at: z.string(),
    updated_at: z.string(),
  })
)

const stateRowsSchema = z.array(
  z.object({
    block_id: z.uuid(),
    status: z.enum([
      "not_started",
      "active",
      "paused",
      "completed",
      "archived",
    ]),
    progress_percent: z.union([z.string(), z.number()]).nullable(),
    last_activity_at: z.string().nullable(),
  })
)

const evidenceRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    evidence_key: z.string(),
    numeric_value: z.union([z.string(), z.number()]).nullable(),
    max_value: z.union([z.string(), z.number()]).nullable(),
    properties: z
      .object({ note: z.string().nullable().optional() })
      .passthrough(),
    occurred_at: z.string(),
  })
)

export type ArcLifecycleStatus = z.infer<
  typeof stateRowsSchema
>[number]["status"]

export type ArcListItem = {
  id: string
  title: string
  summary: string | null
  objective: string
  targetDate: string | null
  createdAt: string
  updatedAt: string
  lifecycleStatus: ArcLifecycleStatus
  progressPercent: number
  lastActivityAt: string | null
}

export type ArcDetail = ArcListItem & {
  revision: number
  currentReality: string
  why: string | null
  constraints: string[]
  body: string | null
  visibility: "private" | "workspace" | "public"
  allowAgentAccess: boolean
  schemaVersion: number
  evidence: Array<{
    id: string
    progressPercent: number | null
    note: string | null
    occurredAt: string
  }>
}

type GoalsPathsIssue =
  "workspace_unavailable" | "catalog_unavailable" | "data_unavailable"

function toNumber(value: string | number | null, fallback = 0) {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeArc(
  row: z.infer<typeof arcRowsSchema>[number],
  state?: z.infer<typeof stateRowsSchema>[number]
): ArcListItem {
  const objective = row.properties.objective?.trim() || row.summary || row.title

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    objective,
    targetDate: row.properties.targetDate ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lifecycleStatus: state?.status ?? "active",
    progressPercent: toNumber(state?.progress_percent ?? null),
    lastActivityAt: state?.last_activity_at ?? null,
  }
}

async function resolveArcContext() {
  const [catalog, claims] = await Promise.all([
    getToolCatalog(),
    requireVerifiedClaims("/tools/goals-paths"),
  ])
  const item = catalog.items.find(
    (candidate) => candidate.key === "core.goals-paths"
  )

  return { catalog, claims, item }
}

export async function getGoalsPathsOverview() {
  const { catalog, claims, item } = await resolveArcContext()

  if (!catalog.workspace) {
    return {
      workspace: null,
      item,
      arcs: [] as ArcListItem[],
      issue: (catalog.issue ?? "workspace_unavailable") as GoalsPathsIssue,
    }
  }

  const supabase = await createServerSupabaseClient()
  const blockTypeResult = await supabase
    .from("block_types")
    .select("id")
    .eq("key", "goals-paths.arc")
    .maybeSingle()

  if (blockTypeResult.error || !blockTypeResult.data?.id) {
    return {
      workspace: catalog.workspace,
      item,
      arcs: [] as ArcListItem[],
      issue: "catalog_unavailable" as const,
    }
  }

  const arcsResult = await supabase
    .from("blocks")
    .select(
      "id, title, summary, body, status, visibility, allow_agent_access, properties, schema_version, revision, created_at, updated_at"
    )
    .eq("workspace_id", catalog.workspace.id)
    .eq("block_type_id", blockTypeResult.data.id)
    .eq("status", "active")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50)

  const arcRows = arcRowsSchema.safeParse(arcsResult.data)
  if (arcsResult.error || !arcRows.success) {
    return {
      workspace: catalog.workspace,
      item,
      arcs: [] as ArcListItem[],
      issue: "data_unavailable" as const,
    }
  }

  const blockIds = arcRows.data.map((arc) => arc.id)
  const statesResult = blockIds.length
    ? await supabase
        .from("user_block_states")
        .select("block_id, status, progress_percent, last_activity_at")
        .eq("workspace_id", catalog.workspace.id)
        .eq("user_id", claims.sub)
        .in("block_id", blockIds)
    : { data: [], error: null }
  const states = stateRowsSchema.safeParse(statesResult.data)

  if (statesResult.error || !states.success) {
    return {
      workspace: catalog.workspace,
      item,
      arcs: [] as ArcListItem[],
      issue: "data_unavailable" as const,
    }
  }

  const stateByBlockId = new Map(
    states.data.map((state) => [state.block_id, state])
  )
  const arcs = arcRows.data
    .map((arc) => normalizeArc(arc, stateByBlockId.get(arc.id)))
    .filter((arc) => arc.lifecycleStatus !== "archived")

  return { workspace: catalog.workspace, item, arcs, issue: null }
}

export async function getArcDetail(arcId: string): Promise<{
  workspace: { id: string; name: string } | null
  item: Awaited<ReturnType<typeof getToolCatalog>>["items"][number] | undefined
  arc: ArcDetail | null
  issue: GoalsPathsIssue | "not_found" | null
}> {
  const parsedArcId = z.uuid().safeParse(arcId)
  if (!parsedArcId.success) {
    return { workspace: null, item: undefined, arc: null, issue: "not_found" }
  }

  const { catalog, claims, item } = await resolveArcContext()
  if (!catalog.workspace) {
    return {
      workspace: null,
      item,
      arc: null,
      issue: (catalog.issue ?? "workspace_unavailable") as GoalsPathsIssue,
    }
  }

  const supabase = await createServerSupabaseClient()
  const blockTypeResult = await supabase
    .from("block_types")
    .select("id")
    .eq("key", "goals-paths.arc")
    .maybeSingle()

  if (blockTypeResult.error || !blockTypeResult.data?.id) {
    return {
      workspace: catalog.workspace,
      item,
      arc: null,
      issue: "data_unavailable",
    }
  }

  const [arcResult, stateResult, evidenceResult] = await Promise.all([
    supabase
      .from("blocks")
      .select(
        "id, title, summary, body, status, visibility, allow_agent_access, properties, schema_version, revision, created_at, updated_at"
      )
      .eq("id", parsedArcId.data)
      .eq("workspace_id", catalog.workspace.id)
      .eq("block_type_id", blockTypeResult.data.id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("user_block_states")
      .select("block_id, status, progress_percent, last_activity_at")
      .eq("workspace_id", catalog.workspace.id)
      .eq("user_id", claims.sub)
      .eq("block_id", parsedArcId.data)
      .maybeSingle(),
    supabase
      .from("progress_evidence")
      .select(
        "id, evidence_key, numeric_value, max_value, properties, occurred_at"
      )
      .eq("workspace_id", catalog.workspace.id)
      .eq("user_id", claims.sub)
      .eq("block_id", parsedArcId.data)
      .eq("evidence_key", "arc.check-in")
      .order("occurred_at", { ascending: false })
      .limit(12),
  ])

  if (!arcResult.data && !arcResult.error) {
    return { workspace: catalog.workspace, item, arc: null, issue: "not_found" }
  }

  const arcRows = arcRowsSchema.safeParse(
    arcResult.data ? [arcResult.data] : null
  )
  const states = stateRowsSchema.safeParse(
    stateResult.data ? [stateResult.data] : []
  )
  const evidence = evidenceRowsSchema.safeParse(evidenceResult.data)

  if (
    arcResult.error ||
    stateResult.error ||
    evidenceResult.error ||
    !arcRows.success ||
    !states.success ||
    !evidence.success
  ) {
    return {
      workspace: catalog.workspace,
      item,
      arc: null,
      issue: "data_unavailable",
    }
  }

  const row = arcRows.data[0]
  const listItem = normalizeArc(row, states.data[0])
  return {
    workspace: catalog.workspace,
    item,
    issue: null,
    arc: {
      ...listItem,
      revision: toNumber(row.revision, 1),
      currentReality:
        row.properties.currentReality?.trim() || row.summary || "",
      why: row.properties.why?.trim() || null,
      constraints: row.properties.constraints ?? [],
      body: row.body,
      visibility: row.visibility,
      allowAgentAccess: row.allow_agent_access,
      schemaVersion: row.schema_version,
      evidence: evidence.data.map((entry) => ({
        id: entry.id,
        progressPercent:
          entry.numeric_value === null ? null : toNumber(entry.numeric_value),
        note: entry.properties.note?.trim() || null,
        occurredAt: entry.occurred_at,
      })),
    },
  }
}

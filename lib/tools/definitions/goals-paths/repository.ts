import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

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
    revision: z.any(),
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
    progress_percent: z.any(),
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

import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

async function resolveArcContext(workspaceSlug: string) {
  const [workspace, claims, installation] = await Promise.all([
    getWorkspaceIdentity(workspaceSlug),
    requireVerifiedClaims(`/workspace/${encodeURIComponent(workspaceSlug)}`),
    requireActiveToolInstallation(workspaceSlug, "core.goals-paths"),
  ])

  const item = {
    key: "core.goals-paths",
    installationStatus: "active" as const,
    installationId: installation.id,
    installable: false,
  }

  return { workspace, claims, item }
}

export async function getGoalsPathsOverview(workspaceSlug: string) {
  const { workspace, claims, item } = await resolveArcContext(workspaceSlug)

  if (!workspace) {
    return {
      workspace: null,
      item,
      arcs: [] as ArcListItem[],
      issue: "workspace_unavailable" as GoalsPathsIssue,
    }
  }

  const blockType = await prisma.blockType.findUnique({
    where: { key: "goals-paths.arc" },
    select: { id: true },
  })

  if (!blockType) {
    return {
      workspace: workspace,
      item,
      arcs: [] as ArcListItem[],
      issue: "catalog_unavailable" as const,
    }
  }

  const arcsData = await prisma.block.findMany({
    where: {
      workspaceId: workspace.id,
      originToolInstallationId: item.installationId,
      blockTypeId: blockType.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      body: true,
      status: true,
      visibility: true,
      allowAgentAccess: true,
      properties: true,
      schemaVersion: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  const mappedArcs = arcsData.map((e) => ({
    ...e,
    allow_agent_access: e.allowAgentAccess,
    schema_version: e.schemaVersion,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
    status: e.status.toLowerCase(),
    visibility: e.visibility.toLowerCase(),
    revision: e.revision.toString(),
  }))
  const arcRows = arcRowsSchema.safeParse(mappedArcs)
  if (!arcRows.success) {
    return {
      workspace: workspace,
      item,
      arcs: [] as ArcListItem[],
      issue: "data_unavailable" as const,
    }
  }

  const blockIds = arcRows.data.map((arc) => arc.id)
  const statesData = blockIds.length
    ? await prisma.userBlockState.findMany({
        where: {
          workspaceId: workspace.id,
          userId: claims.sub,
          blockId: { in: blockIds },
        },
        select: {
          blockId: true,
          status: true,
          progressPercent: true,
          lastActivityAt: true,
        },
      })
    : []
  const mappedStates = statesData.map((s) => ({
    ...s,
    block_id: s.blockId,
    status: s.status.toLowerCase(),
    progress_percent: s.progressPercent?.toString() || null,
    last_activity_at: s.lastActivityAt?.toISOString() || null,
  }))
  const states = stateRowsSchema.safeParse(mappedStates)

  if (!states.success) {
    return {
      workspace: workspace,
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

  return { workspace, item, arcs, issue: null }
}

export async function getArcDetail(
  workspaceSlug: string,
  arcId: string
): Promise<{
  workspace: { id: string; name: string } | null
  item:
    | { installationStatus: "active" | "none"; installationId: string | null }
    | undefined
  arc: ArcDetail | null
  issue: GoalsPathsIssue | "not_found" | null
}> {
  const parsedArcId = z.uuid().safeParse(arcId)
  if (!parsedArcId.success) {
    return { workspace: null, item: undefined, arc: null, issue: "not_found" }
  }

  const { workspace, claims, item } = await resolveArcContext(workspaceSlug)
  if (!workspace) {
    return {
      workspace: null,
      item,
      arc: null,
      issue: "workspace_unavailable" as GoalsPathsIssue,
    }
  }

  const blockType = await prisma.blockType.findUnique({
    where: { key: "goals-paths.arc" },
    select: { id: true },
  })

  if (!blockType) {
    return {
      workspace,
      item,
      arc: null,
      issue: "data_unavailable",
    }
  }

  const [arcData, stateData, evidenceData] = await Promise.all([
    prisma.block.findFirst({
      where: {
        id: parsedArcId.data,
        workspaceId: workspace.id,
        originToolInstallationId: item.installationId,
        blockTypeId: blockType.id,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        body: true,
        status: true,
        visibility: true,
        allowAgentAccess: true,
        properties: true,
        schemaVersion: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.userBlockState.findUnique({
      where: {
        userId_blockId: {
          userId: claims.sub,
          blockId: parsedArcId.data,
        },
        workspaceId: workspace.id,
      },
      select: {
        blockId: true,
        status: true,
        progressPercent: true,
        lastActivityAt: true,
      },
    }),
    prisma.progressEvidence.findMany({
      where: {
        workspaceId: workspace.id,
        userId: claims.sub,
        blockId: parsedArcId.data,
        evidenceKey: "arc.check-in",
      },
      select: {
        id: true,
        evidenceKey: true,
        numericValue: true,
        maxValue: true,
        properties: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 12,
    }),
  ])

  if (!arcData) {
    return { workspace, item, arc: null, issue: "not_found" }
  }

  const mappedArc = {
    ...arcData,
    allow_agent_access: arcData.allowAgentAccess,
    schema_version: arcData.schemaVersion,
    created_at: arcData.createdAt.toISOString(),
    updated_at: arcData.updatedAt.toISOString(),
    status: arcData.status.toLowerCase(),
    visibility: arcData.visibility.toLowerCase(),
    revision: arcData.revision.toString(),
  }
  const mappedState = stateData
    ? {
        ...stateData,
        block_id: stateData.blockId,
        status: stateData.status.toLowerCase(),
        progress_percent: stateData.progressPercent?.toString() || null,
        last_activity_at: stateData.lastActivityAt?.toISOString() || null,
      }
    : null
  const mappedEvidence = evidenceData.map((e) => ({
    ...e,
    evidence_key: e.evidenceKey,
    numeric_value: e.numericValue?.toString() || null,
    max_value: e.maxValue?.toString() || null,
    occurred_at: e.occurredAt.toISOString(),
  }))

  const arcRows = arcRowsSchema.safeParse([mappedArc])
  const states = stateRowsSchema.safeParse(mappedState ? [mappedState] : [])
  const evidence = evidenceRowsSchema.safeParse(mappedEvidence)

  if (!arcRows.success || !states.success || !evidence.success) {
    return {
      workspace,
      item,
      arc: null,
      issue: "data_unavailable",
    }
  }

  const row = arcRows.data[0]
  const listItem = normalizeArc(row, states.data[0])
  return {
    workspace,
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

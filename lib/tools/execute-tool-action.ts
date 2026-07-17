import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  resolveToolActionStrict,
  validateActionInput,
} from "@/lib/tools/action-contract"
import { parseToolManifest, type ToolActionResult } from "@/lib/tools/contracts"
import { evaluateToolPermissions } from "@/lib/tools/permissions"
import { getFirstPartyToolManifest } from "@/lib/tools/registry"

const executeInputSchema = z.object({
  workspaceId: z.uuid(),
  installationId: z.uuid(),
  toolKey: z.string().min(3).max(120),
  actionKey: z.string().min(3).max(120),
  idempotencyKey: z.string().min(1).max(128),
  input: z.unknown(),
})

const installationSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  tool_definition_id: z.uuid(),
  tool_release_id: z.uuid(),
  status: z.enum(["active", "disabled", "removed"]),
})

const definitionSchema = z.object({ id: z.uuid(), key: z.string() })
const releaseSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  manifest: z.unknown(),
})
const grantsSchema = z.array(
  z.object({
    permission_key: z.string(),
    effect: z.enum(["allow", "deny"]),
    constraints: z.unknown(),
  })
)

const executionResponseSchema = z.object({
  run_id: z.uuid(),
  run_status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  root_block_id: z.uuid().nullable(),
  created_block_ids: z.array(z.uuid()),
  evidence_ids: z.array(z.uuid()),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
})

type ExecuteToolActionInput = z.input<typeof executeInputSchema>

type HandlerBinding = Readonly<{
  handlerVersion: string
  execute: (
    input: z.output<typeof executeInputSchema>,
    handlerVersion: string
  ) => Promise<ToolActionResult>
}>

export class ToolActionExecutionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_INPUT"
      | "NOT_AVAILABLE"
      | "FORBIDDEN"
      | "HANDLER_MISSING"
      | "RELEASE_MISMATCH"
      | "RUN_FAILED"
      | "FAILED"
  ) {
    super(message)
    this.name = "ToolActionExecutionError"
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

async function executeCreateArc(
  input: z.output<typeof executeInputSchema>,
  handlerVersion: string
): Promise<ToolActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc(
    "execute_goals_paths_create_arc_v3",
    {
      action_input: input.input,
      requested_handler_version: handlerVersion,
      requested_idempotency_key: input.idempotencyKey,
      target_installation_id: input.installationId,
      target_workspace_id: input.workspaceId,
    }
  )

  if (error) {
    const code =
      error.code === "42501"
        ? "FORBIDDEN"
        : error.code === "P0002"
          ? "NOT_AVAILABLE"
          : error.code === "22023"
            ? "INVALID_INPUT"
            : "FAILED"

    throw new ToolActionExecutionError(
      code === "FORBIDDEN"
        ? "This tool is not allowed to make that change."
        : code === "INVALID_INPUT"
          ? "The action input is invalid or conflicts with an earlier request."
          : code === "NOT_AVAILABLE"
            ? "The installed tool action is unavailable."
            : "The action could not be completed. Try again.",
      code
    )
  }

  const row = Array.isArray(data) ? data[0] : data
  const result = executionResponseSchema.safeParse(row)

  if (!result.success) {
    throw new ToolActionExecutionError(
      "The action completed with an invalid execution receipt.",
      "FAILED"
    )
  }

  if (result.data.run_status === "failed") {
    throw new ToolActionExecutionError(
      result.data.error_message ?? "The action could not be completed.",
      "RUN_FAILED"
    )
  }

  return {
    runId: result.data.run_id,
    status: result.data.run_status,
    rootBlockId: result.data.root_block_id ?? undefined,
    createdBlockIds: result.data.created_block_ids,
    evidenceIds: result.data.evidence_ids,
  }
}

function createArcUpdateExecutor(actionKey: "arc.check-in" | "arc.set-status") {
  return async function executeArcUpdate(
    input: z.output<typeof executeInputSchema>,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.rpc(
      "execute_goals_paths_arc_update_v2",
      {
        action_input: input.input,
        requested_action_key: actionKey,
        requested_handler_version: handlerVersion,
        requested_idempotency_key: input.idempotencyKey,
        target_installation_id: input.installationId,
        target_workspace_id: input.workspaceId,
      }
    )

    if (error) {
      const code =
        error.code === "42501"
          ? "FORBIDDEN"
          : error.code === "P0002"
            ? "NOT_AVAILABLE"
            : error.code === "22023"
              ? "INVALID_INPUT"
              : "FAILED"

      throw new ToolActionExecutionError(
        code === "FORBIDDEN"
          ? "This tool is not allowed to make that change."
          : code === "INVALID_INPUT"
            ? "The action input is invalid or conflicts with an earlier request."
            : code === "NOT_AVAILABLE"
              ? "This Arc is unavailable."
              : "The action could not be completed. Try again.",
        code
      )
    }

    const row = Array.isArray(data) ? data[0] : data
    const result = executionResponseSchema.safeParse(row)
    if (!result.success) {
      throw new ToolActionExecutionError(
        "The action completed with an invalid execution receipt.",
        "FAILED"
      )
    }
    if (result.data.run_status === "failed") {
      throw new ToolActionExecutionError(
        result.data.error_message ?? "The action could not be completed.",
        "RUN_FAILED"
      )
    }

    return {
      runId: result.data.run_id,
      status: result.data.run_status,
      rootBlockId: result.data.root_block_id ?? undefined,
      createdBlockIds: result.data.created_block_ids,
      evidenceIds: result.data.evidence_ids,
    }
  }
}

function createArcContentExecutor(actionKey: "arc.update" | "arc.delete") {
  return async function executeArcContent(
    input: z.output<typeof executeInputSchema>,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.rpc(
      "execute_goals_paths_arc_content_v1",
      {
        action_input: input.input,
        requested_action_key: actionKey,
        requested_handler_version: handlerVersion,
        requested_idempotency_key: input.idempotencyKey,
        target_installation_id: input.installationId,
        target_workspace_id: input.workspaceId,
      }
    )

    if (error) {
      const code =
        error.code === "42501"
          ? "FORBIDDEN"
          : error.code === "P0002"
            ? "NOT_AVAILABLE"
            : error.code === "22023"
              ? "INVALID_INPUT"
              : "FAILED"

      throw new ToolActionExecutionError(
        code === "FORBIDDEN"
          ? "Only the Arc owner can make that change."
          : code === "INVALID_INPUT"
            ? "This Arc changed elsewhere. Refresh it before trying again."
            : code === "NOT_AVAILABLE"
              ? "This Arc is unavailable."
              : "The Arc could not be changed. Try again.",
        code
      )
    }

    const row = Array.isArray(data) ? data[0] : data
    const result = executionResponseSchema.safeParse(row)
    if (!result.success) {
      throw new ToolActionExecutionError(
        "The action completed with an invalid execution receipt.",
        "FAILED"
      )
    }
    if (result.data.run_status === "failed") {
      throw new ToolActionExecutionError(
        result.data.error_message ?? "The Arc could not be changed.",
        "RUN_FAILED"
      )
    }

    return {
      runId: result.data.run_id,
      status: result.data.run_status,
      rootBlockId: result.data.root_block_id ?? undefined,
      createdBlockIds: result.data.created_block_ids,
      evidenceIds: result.data.evidence_ids,
    }
  }
}

const handlers = new Map<string, HandlerBinding>([
  [
    "core.goals-paths@3.1.0:arc.create",
    {
      handlerVersion: "goals-paths.arc.create.v3.1",
      execute: executeCreateArc,
    },
  ],
  [
    "core.goals-paths@3.1.0:arc.check-in",
    {
      handlerVersion: "goals-paths.arc.check-in.v1",
      execute: createArcUpdateExecutor("arc.check-in"),
    },
  ],
  [
    "core.goals-paths@3.1.0:arc.set-status",
    {
      handlerVersion: "goals-paths.arc.set-status.v1",
      execute: createArcUpdateExecutor("arc.set-status"),
    },
  ],
  [
    "core.goals-paths@3.1.0:arc.update",
    {
      handlerVersion: "goals-paths.arc.update.v1",
      execute: createArcContentExecutor("arc.update"),
    },
  ],
  [
    "core.goals-paths@3.1.0:arc.delete",
    {
      handlerVersion: "goals-paths.arc.delete.v1",
      execute: createArcContentExecutor("arc.delete"),
    },
  ],
])

export async function executeToolAction(input: ExecuteToolActionInput) {
  const parsed = executeInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new ToolActionExecutionError(
      "The tool action request is invalid.",
      "INVALID_INPUT"
    )
  }

  await requireVerifiedClaims("/tools")

  const localManifest = getFirstPartyToolManifest(parsed.data.toolKey)
  if (!localManifest) {
    throw new ToolActionExecutionError(
      "This tool is not available in this application release.",
      "NOT_AVAILABLE"
    )
  }

  const action = resolveToolActionStrict(localManifest, parsed.data.actionKey)
  const inputValidation = validateActionInput(action, parsed.data.input)
  if (!inputValidation.success) {
    throw new ToolActionExecutionError(
      inputValidation.issues[0]?.message ?? "The action input is invalid.",
      "INVALID_INPUT"
    )
  }

  const handlerKey = `${parsed.data.toolKey}@${localManifest.release.version}:${parsed.data.actionKey}`
  const handler = handlers.get(handlerKey)
  if (!handler) {
    throw new ToolActionExecutionError(
      "This action has no trusted handler in the current application release.",
      "HANDLER_MISSING"
    )
  }

  const supabase = await createServerSupabaseClient()
  const [installationResult, grantsResult] = await Promise.all([
    supabase
      .from("tool_installations")
      .select("id, workspace_id, tool_definition_id, tool_release_id, status")
      .eq("id", parsed.data.installationId)
      .eq("workspace_id", parsed.data.workspaceId)
      .maybeSingle(),
    supabase
      .from("tool_grants")
      .select("permission_key, effect, constraints")
      .eq("installation_id", parsed.data.installationId),
  ])

  const installation = installationSchema.safeParse(installationResult.data)
  const grants = grantsSchema.safeParse(grantsResult.data)
  if (
    installationResult.error ||
    grantsResult.error ||
    !installation.success ||
    !grants.success ||
    installation.data.status !== "active"
  ) {
    throw new ToolActionExecutionError(
      "The active tool installation is unavailable.",
      "NOT_AVAILABLE"
    )
  }

  const [definitionResult, releaseResult] = await Promise.all([
    supabase
      .from("tool_definitions")
      .select("id, key")
      .eq("id", installation.data.tool_definition_id)
      .maybeSingle(),
    supabase
      .from("tool_releases")
      .select("id, version, manifest")
      .eq("id", installation.data.tool_release_id)
      .maybeSingle(),
  ])

  const definition = definitionSchema.safeParse(definitionResult.data)
  const release = releaseSchema.safeParse(releaseResult.data)
  if (
    definitionResult.error ||
    releaseResult.error ||
    !definition.success ||
    !release.success ||
    definition.data.key !== parsed.data.toolKey ||
    release.data.version !== localManifest.release.version
  ) {
    throw new ToolActionExecutionError(
      "The installed release does not match this application release.",
      "RELEASE_MISMATCH"
    )
  }

  let deployedManifest
  try {
    deployedManifest = parseToolManifest(release.data.manifest)
  } catch {
    throw new ToolActionExecutionError(
      "The installed release manifest is invalid.",
      "RELEASE_MISMATCH"
    )
  }

  if (canonicalJson(deployedManifest) !== canonicalJson(localManifest)) {
    throw new ToolActionExecutionError(
      "The installed release manifest has drifted from the trusted handler.",
      "RELEASE_MISMATCH"
    )
  }

  const permissionDecision = evaluateToolPermissions(
    grants.data.map((grant) => ({
      permissionKey: grant.permission_key,
      effect: grant.effect,
      constraints: grant.constraints,
    })),
    action.requiredPermissions,
    {
      installationId: parsed.data.installationId,
      originInstallationId: parsed.data.installationId,
      blockTypeKeys: [
        ...action.output.createsBlockTypeKeys,
        ...action.output.writesBlockTypeKeys,
      ],
    }
  )

  if (!permissionDecision.allowed) {
    throw new ToolActionExecutionError(
      "This installation has not been granted the permissions required by the action.",
      "FORBIDDEN"
    )
  }

  return handler.execute(parsed.data, handler.handlerVersion)
}

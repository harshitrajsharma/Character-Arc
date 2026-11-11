import { createHash, randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import {
  executeToolActionForPrincipal,
  hasTrustedToolActionHandler,
} from "@/lib/tools/execute-tool-action"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import {
  evaluateToolPermissions,
  type ToolGrantLike,
} from "@/lib/tools/permissions"
import { parseToolManifest, type ToolManifest } from "@/lib/tools/contracts"
import type { AuthenticatedMcpPrincipal } from "./auth"
import type { McpJsonRpcResponse, McpToolCallResult } from "./contracts"
import {
  MCP_ERROR_CODES,
  MCP_IDEMPOTENCY_FIELD,
  MCP_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSIONS,
  McpProtocolError,
  parseMcpToolName,
} from "./contracts"
import { manifestToMcpTools } from "./schema-adapter"

type Installation = {
  id: string
  toolKey: string
  version: string
  manifest: unknown
  grants: ToolGrantLike[]
}
export type McpServerDependencies = {
  installations: (workspaceId: string) => Promise<Installation[]>
  execute: typeof executeToolActionForPrincipal
}
const dependencies: McpServerDependencies = {
  installations: async (workspaceId) => {
    const rows = await prisma.toolInstallation.findMany({
      where: { workspaceId, status: "ACTIVE", workspace: { archivedAt: null } },
      select: {
        id: true,
        toolDefinition: { select: { key: true } },
        toolRelease: { select: { version: true, manifest: true } },
        grants: {
          select: { permissionKey: true, effect: true, constraints: true },
        },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      toolKey: row.toolDefinition.key,
      version: row.toolRelease.version,
      manifest: row.toolRelease.manifest,
      grants: row.grants,
    }))
  },
  execute: executeToolActionForPrincipal,
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && !Array.isArray(input)
}
function isReadOnly(action: ToolManifest["actions"][number]) {
  return action.requiredPermissions.every((permission) =>
    permission.startsWith("blocks.read")
  )
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}
function hasTrustedManifest(stored: unknown, local: ToolManifest) {
  try {
    return canonicalJson(parseToolManifest(stored)) === canonicalJson(local)
  } catch {
    return false
  }
}
function actionAllowed(
  installation: Installation,
  action: ToolManifest["actions"][number],
  role: AuthenticatedMcpPrincipal["role"]
) {
  if (role === "VIEWER" && !isReadOnly(action)) return false
  return evaluateToolPermissions(
    installation.grants,
    action.requiredPermissions,
    {
      installationId: installation.id,
      originInstallationId: installation.id,
      blockTypeKeys: [
        ...new Set([
          action.output.rootBlockTypeKey,
          ...action.output.createsBlockTypeKeys,
          ...action.output.writesBlockTypeKeys,
        ]),
      ],
    }
  ).allowed
}
async function availableActions(
  principal: AuthenticatedMcpPrincipal,
  deps: McpServerDependencies
) {
  // Discovery is read-only and fail-closed. Installation/grant changes require the normal web UI.
  const installed = await deps.installations(principal.workspaceId)
  return listFirstPartyToolManifests().flatMap((manifest) => {
    const installation = installed.find(
      (item) =>
        item.toolKey === manifest.tool.key &&
        item.version === manifest.release.version &&
        hasTrustedManifest(item.manifest, manifest)
    )
    if (!installation) return []
    return manifest.actions
      .filter(
        (action) =>
          actionAllowed(installation, action, principal.role) &&
          hasTrustedToolActionHandler(manifest.tool.key, action.key)
      )
      .map((action) => ({ manifest, action, installation }))
  })
}

export async function listMcpToolsForWorkspace(
  principal: AuthenticatedMcpPrincipal,
  deps = dependencies
) {
  const available = await availableActions(principal, deps)
  return available
    .flatMap(({ manifest, action }) =>
      manifestToMcpTools({ ...manifest, actions: [action] })
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function handleMcpToolCall(
  params: Record<string, unknown>,
  principal: AuthenticatedMcpPrincipal,
  deps: McpServerDependencies = dependencies
): Promise<McpToolCallResult> {
  if (
    typeof params.name !== "string" ||
    !params.name ||
    params.name.length > 128 ||
    (params.arguments !== undefined && !isRecord(params.arguments))
  ) {
    throw new McpProtocolError(
      MCP_ERROR_CODES.INVALID_PARAMS,
      "tools/call requires a tool name and object arguments."
    )
  }
  const resolved = parseMcpToolName(params.name, listFirstPartyToolManifests())
  if (!resolved)
    throw new McpProtocolError(
      MCP_ERROR_CODES.INVALID_PARAMS,
      "Unknown tool name."
    )
  const available = await availableActions(principal, deps)
  const target = available.find(
    ({ manifest, action }) =>
      manifest.tool.key === resolved.toolKey &&
      action.key === resolved.actionKey
  )
  if (!target)
    return toolError(
      "FORBIDDEN",
      "The tool is not enabled and permitted in this workspace."
    )

  const args = {
    ...((params.arguments as Record<string, unknown> | undefined) ?? {}),
  }
  const operationKey = args[MCP_IDEMPOTENCY_FIELD]
  delete args[MCP_IDEMPOTENCY_FIELD]
  if (
    !isReadOnly(target.action) &&
    (typeof operationKey !== "string" ||
      operationKey.length < 8 ||
      operationKey.length > 128 ||
      !/^[\x21-\x7e]+$/.test(operationKey))
  ) {
    return toolError(
      "INVALID_INPUT",
      "Provide _idempotencyKey (8–128 visible ASCII characters) for this change. Reuse the same key and arguments when retrying it."
    )
  }
  const idempotencyKey = isReadOnly(target.action)
    ? `mcp-read-${randomUUID()}`
    : `mcp-${createHash("sha256")
        .update(
          JSON.stringify([
            principal.userId,
            principal.workspaceId,
            params.name,
            operationKey,
          ])
        )
        .digest("hex")}`
  try {
    const result = await deps.execute(
      {
        workspaceId: principal.workspaceId,
        installationId: target.installation.id,
        toolKey: resolved.toolKey,
        actionKey: resolved.actionKey,
        idempotencyKey,
        input: args,
      },
      {
        actorId: principal.userId,
        workspaceId: principal.workspaceId,
        invocationSource: "mcp",
      }
    )
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result as unknown as Record<string, unknown>,
      isError: result.status === "failed" || result.status === "cancelled",
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      const safe = [
        "INVALID_INPUT",
        "FORBIDDEN",
        "NOT_AVAILABLE",
        "REVISION_CONFLICT",
        "HANDLER_MISSING",
        "RELEASE_MISMATCH",
      ].includes(error.code)
      return toolError(
        error.code,
        safe
          ? error.message
          : "The action could not be completed. Retry with the same operation key if its outcome is uncertain."
      )
    }
    // Unknown exceptions may contain SQL, tokens or connection strings. Never send them to clients.
    return toolError(
      "INTERNAL_ERROR",
      "The action could not be completed. Retry with the same operation key if its outcome is uncertain."
    )
  }
}
function toolError(code: string, message: string): McpToolCallResult {
  const data = { status: "failed", code, message }
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
    isError: true,
  }
}

export async function processMcpJsonRpcRequest(
  body: unknown,
  principal: AuthenticatedMcpPrincipal,
  deps: McpServerDependencies = dependencies
): Promise<McpJsonRpcResponse | null> {
  const id =
    isRecord(body) &&
    (typeof body.id === "string" ||
      (typeof body.id === "number" && Number.isFinite(body.id)))
      ? body.id
      : null
  const invalid = (
    message = "Invalid JSON-RPC 2.0 request."
  ): McpJsonRpcResponse => ({
    jsonrpc: "2.0",
    id,
    error: { code: MCP_ERROR_CODES.INVALID_REQUEST, message },
  })
  if (
    !isRecord(body) ||
    body.jsonrpc !== "2.0" ||
    typeof body.method !== "string" ||
    ("id" in body && id === null) ||
    (body.params !== undefined && !isRecord(body.params))
  )
    return invalid()
  // Only a validated message without id is a notification; it never invokes mutating tools.
  if (!("id" in body)) return null
  const params = (body.params ?? {}) as Record<string, unknown>
  try {
    switch (body.method) {
      case "initialize": {
        if (
          typeof params.protocolVersion !== "string" ||
          !isRecord(params.clientInfo) ||
          typeof params.clientInfo.name !== "string" ||
          typeof params.clientInfo.version !== "string" ||
          !isRecord(params.capabilities)
        ) {
          throw new McpProtocolError(
            MCP_ERROR_CODES.INVALID_PARAMS,
            "initialize requires protocolVersion, capabilities and clientInfo."
          )
        }
        const protocolVersion = MCP_PROTOCOL_VERSIONS.includes(
          params.protocolVersion as (typeof MCP_PROTOCOL_VERSIONS)[number]
        )
          ? params.protocolVersion
          : MCP_PROTOCOL_VERSION
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "character-arc-mcp-server", version: "1.1.0" },
            instructions:
              "This server uses explicit workspace-scoped Bearer credentials. Only enabled tool actions with current permissions are available. Review mutations with the user. Each change requires a unique _idempotencyKey; keep it and the arguments unchanged on retries. Study and assessment data are subject to agent-access settings.",
          },
        }
      }
      case "ping":
        return { jsonrpc: "2.0", id, result: {} }
      case "tools/list": {
        const tools = await listMcpToolsForWorkspace(principal, deps)
        let start = 0
        if (params.cursor !== undefined) {
          try {
            if (typeof params.cursor !== "string" || params.cursor.length > 512)
              throw new Error()
            const cursor = JSON.parse(
              Buffer.from(params.cursor, "base64url").toString()
            )
            if (!isRecord(cursor) || typeof cursor.after !== "string")
              throw new Error()
            const index = tools.findIndex((tool) => tool.name === cursor.after)
            if (index < 0) throw new Error()
            start = index + 1
          } catch {
            throw new McpProtocolError(
              MCP_ERROR_CODES.INVALID_PARAMS,
              "Invalid or expired tools cursor. Restart tools/list."
            )
          }
        }
        const page = tools.slice(start, start + 40)
        const nextCursor =
          start + page.length < tools.length
            ? Buffer.from(
                JSON.stringify({ after: page.at(-1)!.name })
              ).toString("base64url")
            : undefined
        return {
          jsonrpc: "2.0",
          id,
          result: { tools: page, ...(nextCursor ? { nextCursor } : {}) },
        }
      }
      case "tools/call":
        return {
          jsonrpc: "2.0",
          id,
          result: await handleMcpToolCall(params, principal, deps),
        }
      default:
        throw new McpProtocolError(
          MCP_ERROR_CODES.METHOD_NOT_FOUND,
          "Method not supported by this server."
        )
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error:
        error instanceof McpProtocolError
          ? { code: error.code, message: error.message }
          : {
              code: MCP_ERROR_CODES.INTERNAL_ERROR,
              message: "MCP request failed. Please retry later.",
            },
    }
  }
}

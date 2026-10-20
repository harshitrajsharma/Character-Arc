import { prisma } from "@/lib/prisma"
import { executeToolActionForPrincipal } from "@/lib/tools/execute-tool-action"
import { getFirstPartyToolManifest, listFirstPartyToolManifests } from "@/lib/tools/registry"
import type { Prisma, ToolGrantEffect } from "../../generated/prisma/client"
import type { AuthenticatedMcpPrincipal } from "./auth"
import type {
  McpJsonRpcRequest,
  McpJsonRpcResponse,
  McpToolCallResult,
} from "./contracts"
import { MCP_ERROR_CODES, parseMcpToolName } from "./contracts"
import { manifestsToMcpTools } from "./schema-adapter"

/**
 * Returns active MCP tools for the workspace, falling back to all first-party tools
 * if no explicit installation records exist or during test discovery.
 */
export async function listMcpToolsForWorkspace(workspaceId: string) {
  try {
    const activeInstallations = await prisma.toolInstallation.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
      },
      include: {
        toolDefinition: true,
      },
    })

    if (activeInstallations.length > 0) {
      const activeKeys = new Set(
        activeInstallations
          .map((inst) => inst.toolDefinition?.key)
          .filter((k): k is string => Boolean(k))
      )
      const manifests = listFirstPartyToolManifests().filter((m) =>
        activeKeys.has(m.tool.key)
      )
      if (manifests.length > 0) {
        return manifestsToMcpTools(manifests)
      }
    }
  } catch (error) {
    console.warn(
      "Failed to query active tool installations, falling back to all manifests:",
      error
    )
  }

  // Fallback gracefully if workspace has no explicit tool installation records or during test discovery
  const manifests = listFirstPartyToolManifests()
  return manifestsToMcpTools(manifests)
}

/**
 * Ensures a tool is active for the workspace before executing an MCP call.
 */
async function ensureActiveInstallation(
  workspaceId: string,
  userId: string,
  toolKey: string
) {
  const manifest = getFirstPartyToolManifest(toolKey)
  if (!manifest) {
    throw new Error(`Tool "${toolKey}" is not available in this release.`)
  }

  const definition = await prisma.toolDefinition.findUnique({
    where: { key: toolKey },
  })

  if (!definition) {
    throw new Error(`Tool definition for "${toolKey}" was not found in registry.`)
  }

  const release = await prisma.toolRelease.findFirst({
    where: {
      toolDefinitionId: definition.id,
      version: manifest.release.version,
    },
  })

  if (!release) {
    throw new Error(
      `Tool release version ${manifest.release.version} for "${toolKey}" was not found.`
    )
  }

  let installation = await prisma.toolInstallation.findUnique({
    where: {
      workspaceId_toolDefinitionId: {
        workspaceId,
        toolDefinitionId: definition.id,
      },
    },
  })

  if (!installation || installation.status !== "ACTIVE") {
    installation = await prisma.toolInstallation.upsert({
      where: {
        workspaceId_toolDefinitionId: {
          workspaceId,
          toolDefinitionId: definition.id,
        },
      },
      create: {
        workspaceId,
        installedById: userId,
        toolDefinitionId: definition.id,
        toolReleaseId: release.id,
        status: "ACTIVE",
      },
      update: {
        toolReleaseId: release.id,
        status: "ACTIVE",
        disabledAt: null,
      },
    })

    // Sync default grants
    const defaultGrants = manifest.defaultGrants ?? []
    for (const grant of defaultGrants) {
      await prisma.toolGrant.upsert({
        where: {
          installationId_permissionKey: {
            installationId: installation.id,
            permissionKey: grant.permissionKey,
          },
        },
        create: {
          workspaceId,
          installationId: installation.id,
          permissionKey: grant.permissionKey,
          effect: grant.effect.toUpperCase() as ToolGrantEffect,
          constraints: (grant.constraints ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          effect: grant.effect.toUpperCase() as ToolGrantEffect,
          constraints: (grant.constraints ?? {}) as Prisma.InputJsonValue,
        },
      })
    }
  }

  return installation
}

/**
 * Handles execution of a specific MCP tool call.
 */
export async function handleMcpToolCall(
  params: { name?: string; arguments?: unknown },
  principal: AuthenticatedMcpPrincipal
): Promise<McpToolCallResult> {
  if (!params.name || typeof params.name !== "string") {
    throw {
      code: MCP_ERROR_CODES.INVALID_PARAMS,
      message: "Tool execution requires a valid 'name' string parameter.",
    }
  }

  const manifests = listFirstPartyToolManifests()
  const resolved = parseMcpToolName(params.name, manifests)

  if (!resolved) {
    throw {
      code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
      message: `MCP tool "${params.name}" does not match any registered Character Arc tool action.`,
    }
  }

  const installation = await ensureActiveInstallation(
    principal.workspaceId,
    principal.userId,
    resolved.toolKey
  )

  const idempotencyKey = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const actionResult = await executeToolActionForPrincipal(
    {
      workspaceId: principal.workspaceId,
      installationId: installation.id,
      toolKey: resolved.toolKey,
      actionKey: resolved.actionKey,
      idempotencyKey,
      input: params.arguments ?? {},
    },
    {
      actorId: principal.userId,
      workspaceId: principal.workspaceId,
      invocationSource: "mcp",
    }
  )

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(actionResult, null, 2),
      },
    ],
  }
}

/**
 * Processes a JSON-RPC 2.0 MCP request payload.
 */
export async function processMcpJsonRpcRequest(
  body: unknown,
  principal: AuthenticatedMcpPrincipal
): Promise<McpJsonRpcResponse | null> {
  const req = body as Partial<McpJsonRpcRequest> | null | undefined

  if (!req || typeof req !== "object") {
    return {
      jsonrpc: "2.0",
      id: "1",
      error: {
        code: MCP_ERROR_CODES.INVALID_REQUEST,
        message: "Invalid JSON-RPC 2.0 request structure.",
      },
    }
  }

  // Strictly comply with JSON-RPC 2.0 §4.1: notifications omit "id" or start with "notifications/".
  // The server MUST NOT reply to a notification -> return null so HTTP layer responds with 202 Accepted.
  const isNotification =
    req.id === undefined ||
    (typeof req.method === "string" && req.method.startsWith("notifications/"))

  if (isNotification) {
    return null
  }

  const requestId: string | number = req.id!

  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: MCP_ERROR_CODES.INVALID_REQUEST,
        message: "Invalid JSON-RPC 2.0 request structure.",
      },
    }
  }

  try {
    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: requestId,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "character-arc-mcp-server",
              version: "1.0.0",
            },
          },
        }

      case "ping":
        return {
          jsonrpc: "2.0",
          id: requestId,
          result: {},
        }

      case "tools/list": {
        const tools = await listMcpToolsForWorkspace(principal.workspaceId)
        return {
          jsonrpc: "2.0",
          id: requestId,
          result: { tools },
        }
      }

      case "tools/call": {
        const params = (req.params as { name?: string; arguments?: unknown }) ?? {}
        const toolResult = await handleMcpToolCall(params, principal)
        return {
          jsonrpc: "2.0",
          id: requestId,
          result: toolResult,
        }
      }

      default:
        return {
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
            message: `Method "${req.method}" is not supported by Character Arc MCP server.`,
          },
        }
    }
  } catch (error) {
    const thrown =
      typeof error === "object" && error !== null
        ? (error as { code?: unknown; message?: unknown })
        : null
    const code =
      typeof thrown?.code === "number"
        ? thrown.code
        : MCP_ERROR_CODES.INTERNAL_ERROR
    const message =
      typeof thrown?.message === "string"
        ? thrown.message
        : "An unexpected error occurred during MCP execution."
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: { code, message },
    }
  }
}


import { prisma } from "@/lib/prisma"
import { executeToolActionForPrincipal } from "@/lib/tools/execute-tool-action"
import { getFirstPartyToolManifest, listFirstPartyToolManifests } from "@/lib/tools/registry"
import type { ToolGrantEffect } from "../../generated/prisma/client"
import type { AuthenticatedMcpPrincipal } from "./auth"
import type {
  McpJsonRpcRequest,
  McpJsonRpcResponse,
  McpToolCallResult,
} from "./contracts"
import { MCP_ERROR_CODES, parseMcpToolName } from "./contracts"
import { manifestsToMcpTools } from "./schema-adapter"

/**
 * Returns all MCP tools supported by Character Arc first-party tool manifests.
 */
export async function listMcpToolsForWorkspace(_workspaceId: string) {
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

  let definition = await prisma.toolDefinition.findUnique({
    where: { key: toolKey },
  })

  if (!definition) {
    throw new Error(`Tool definition for "${toolKey}" was not found in registry.`)
  }

  let release = await prisma.toolRelease.findFirst({
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
          constraints: (grant.constraints ?? {}) as any,
        },
        update: {
          effect: grant.effect.toUpperCase() as ToolGrantEffect,
          constraints: (grant.constraints ?? {}) as any,
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
): Promise<McpJsonRpcResponse> {
  const req = body as Partial<McpJsonRpcRequest>
  const requestId = req?.id ?? "1"

  if (!req || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
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
  } catch (error: any) {
    const code = error?.code ?? MCP_ERROR_CODES.INTERNAL_ERROR
    const message = error?.message ?? "An unexpected error occurred during MCP execution."
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: { code, message },
    }
  }
}


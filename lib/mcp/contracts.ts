export type McpJsonRpcRequest = {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export type McpJsonRpcError = {
  code: number
  message: string
  data?: unknown
}

export type McpJsonRpcResponse = {
  jsonrpc: "2.0"
  id: string | number
  result?: unknown
  error?: McpJsonRpcError
}

export type McpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type McpTextContent = {
  type: "text"
  text: string
}

export type McpToolCallResult = {
  content: McpTextContent[]
  isError?: boolean
}

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
} as const

/**
 * Converts Character Arc namespaced tool & action keys into a valid MCP tool name.
 * e.g., toolKey: "core.exam-prep", actionKey: "exam.create" -> "core_exam_prep__exam_create"
 */
export function formatMcpToolName(toolKey: string, actionKey: string): string {
  const sanitizedTool = toolKey.replace(/[^a-zA-Z0-9]/g, "_")
  const sanitizedAction = actionKey.replace(/[^a-zA-Z0-9]/g, "_")
  return `${sanitizedTool}__${sanitizedAction}`
}

/**
 * Parses an MCP tool name back into Character Arc toolKey and actionKey.
 */
export function parseMcpToolName(
  mcpName: string,
  knownManifests: Array<{ tool: { key: string }; actions: Array<{ key: string }> }>
): { toolKey: string; actionKey: string } | null {
  for (const manifest of knownManifests) {
    const toolKey = manifest.tool.key
    for (const action of manifest.actions) {
      const actionKey = action.key
      if (formatMcpToolName(toolKey, actionKey) === mcpName) {
        return { toolKey, actionKey }
      }
    }
  }
  return null
}

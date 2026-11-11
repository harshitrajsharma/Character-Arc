import { authenticateMcpRequest } from "@/lib/mcp/auth"
import { processMcpJsonRpcRequest } from "@/lib/mcp/server"
import { MCP_ERROR_CODES, MCP_PROTOCOL_VERSION } from "@/lib/mcp/contracts"
import {
  isAllowedMcpOrigin,
  mcpHeaders,
  mcpHttpError,
  readMcpJsonBody,
  validateMcpHttpRequest,
} from "@/lib/mcp/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function OPTIONS(req: Request) {
  if (!isAllowedMcpOrigin(req))
    return mcpHttpError(
      req,
      403,
      MCP_ERROR_CODES.FORBIDDEN,
      "Origin is not permitted."
    )
  return new Response(null, { status: 204, headers: mcpHeaders(req) })
}

/** Stateless JSON Streamable HTTP: no process-local sessions or unsolicited SSE. */
export async function POST(req: Request) {
  const invalid = validateMcpHttpRequest(req)
  if (invalid) return invalid
  const auth = await authenticateMcpRequest(req)
  if (!auth.success)
    return mcpHttpError(req, auth.status, auth.errorCode, auth.errorMessage)
  const parsed = await readMcpJsonBody(req)
  if (!parsed.ok) return parsed.response
  const result = await processMcpJsonRpcRequest(parsed.body, auth.principal)
  const headers = mcpHeaders(req)
  const initializedVersion =
    result?.result &&
    typeof result.result === "object" &&
    "protocolVersion" in result.result
      ? String(result.result.protocolVersion)
      : (req.headers.get("mcp-protocol-version") ?? "2025-03-26")
  headers.set(
    "mcp-protocol-version",
    initializedVersion || MCP_PROTOCOL_VERSION
  )
  return result === null
    ? new Response(null, { status: 202, headers })
    : Response.json(result, {
        headers,
        status:
          result.error?.code === MCP_ERROR_CODES.INVALID_REQUEST ? 400 : 200,
      })
}

async function unsupported(req: Request) {
  const invalid = validateMcpHttpRequest(req)
  if (invalid) return invalid
  const auth = await authenticateMcpRequest(req)
  if (!auth.success)
    return mcpHttpError(req, auth.status, auth.errorCode, auth.errorMessage)
  return mcpHttpError(
    req,
    405,
    MCP_ERROR_CODES.METHOD_NOT_FOUND,
    "Use POST for Streamable HTTP. Server-initiated streams and sessions are not supported."
  )
}
export const GET = unsupported
export const DELETE = unsupported

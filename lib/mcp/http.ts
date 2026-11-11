import { MCP_ERROR_CODES, MCP_PROTOCOL_VERSIONS } from "./contracts"

export const MCP_MAX_BODY_BYTES = 1024 * 1024
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"])

export function isAllowedMcpOrigin(
  req: Request,
  configured = process.env.MCP_ALLOWED_ORIGINS ?? ""
) {
  const origin = req.headers.get("origin")
  if (!origin) return true
  if (origin === "null") return false
  try {
    const parsed = new URL(origin)
    if (parsed.origin !== origin) return false
    const site = process.env.NEXT_PUBLIC_SITE_URL
    const allowed = new Set(
      configured
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
    if (site) allowed.add(new URL(site).origin)
    // Never trust an arbitrary Host header as an allowed browser origin in production.
    if (
      process.env.NODE_ENV !== "production" &&
      loopback.has(parsed.hostname)
    ) {
      allowed.add(new URL(req.url).origin)
    }
    return allowed.has(origin)
  } catch {
    return false
  }
}

export function mcpHeaders(req: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  })
  const origin = req.headers.get("origin")
  if (origin && isAllowedMcpOrigin(req)) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS")
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-api-key, x-workspace-id, mcp-protocol-version"
    )
    headers.set(
      "Access-Control-Expose-Headers",
      "mcp-protocol-version, WWW-Authenticate"
    )
  }
  return headers
}

export function mcpHttpError(
  req: Request,
  status: number,
  code: number,
  message: string
) {
  const headers = mcpHeaders(req)
  if (status === 401)
    headers.set("WWW-Authenticate", 'Bearer realm="Character Arc MCP"')
  if (status === 405) headers.set("Allow", "POST, OPTIONS")
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers }
  )
}

export function validateMcpHttpRequest(req: Request) {
  if (!isAllowedMcpOrigin(req))
    return mcpHttpError(
      req,
      403,
      MCP_ERROR_CODES.FORBIDDEN,
      "Origin is not permitted."
    )
  const version = req.headers.get("mcp-protocol-version")
  if (
    version &&
    !MCP_PROTOCOL_VERSIONS.includes(
      version as (typeof MCP_PROTOCOL_VERSIONS)[number]
    )
  ) {
    return mcpHttpError(
      req,
      400,
      MCP_ERROR_CODES.INVALID_REQUEST,
      "Unsupported MCP-Protocol-Version."
    )
  }
  return null
}

export async function readMcpJsonBody(
  req: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return {
      ok: false,
      response: mcpHttpError(
        req,
        415,
        MCP_ERROR_CODES.INVALID_REQUEST,
        "Content-Type must be application/json."
      ),
    }
  }
  const accept = (req.headers.get("accept") ?? "").toLowerCase()
  if (
    !accept.includes("application/json") ||
    !accept.includes("text/event-stream")
  ) {
    return {
      ok: false,
      response: mcpHttpError(
        req,
        406,
        MCP_ERROR_CODES.INVALID_REQUEST,
        "Accept must include application/json and text/event-stream."
      ),
    }
  }
  if (Number(req.headers.get("content-length")) > MCP_MAX_BODY_BYTES) {
    return {
      ok: false,
      response: mcpHttpError(
        req,
        413,
        MCP_ERROR_CODES.INVALID_REQUEST,
        "MCP request body is too large."
      ),
    }
  }
  const reader = req.body?.getReader()
  if (!reader)
    return {
      ok: false,
      response: mcpHttpError(
        req,
        400,
        MCP_ERROR_CODES.PARSE_ERROR,
        "A JSON body is required."
      ),
    }
  try {
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MCP_MAX_BODY_BYTES) {
        await reader.cancel()
        return {
          ok: false,
          response: mcpHttpError(
            req,
            413,
            MCP_ERROR_CODES.INVALID_REQUEST,
            "MCP request body is too large."
          ),
        }
      }
      chunks.push(chunk.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return {
      ok: true,
      body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    }
  } catch {
    return {
      ok: false,
      response: mcpHttpError(
        req,
        400,
        MCP_ERROR_CODES.PARSE_ERROR,
        "Invalid JSON body."
      ),
    }
  } finally {
    reader.releaseLock()
  }
}

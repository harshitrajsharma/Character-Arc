import { mcpHttpError } from "@/lib/mcp/http"
import { MCP_ERROR_CODES } from "@/lib/mcp/contracts"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  return mcpHttpError(
    req,
    410,
    MCP_ERROR_CODES.METHOD_NOT_FOUND,
    "Legacy SSE messages are retired. Send JSON-RPC to /api/mcp using a Bearer header."
  )
}

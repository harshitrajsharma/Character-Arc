import { mcpHttpError } from "@/lib/mcp/http"
import { MCP_ERROR_CODES } from "@/lib/mcp/contracts"

export const dynamic = "force-dynamic"

/** Legacy SSE relied on a process-local session and is not safe across serverless instances. */
export async function GET(req: Request) {
  return mcpHttpError(
    req,
    410,
    MCP_ERROR_CODES.METHOD_NOT_FOUND,
    "Legacy SSE is retired. Connect to /api/mcp using Streamable HTTP and a Bearer header."
  )
}

import { NextRequest, NextResponse } from "next/server"
import { authenticateMcpRequest } from "@/lib/mcp/auth"
import { registerSseSession, unregisterSseSession } from "@/lib/mcp/sse-session"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, x-workspace-id",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateMcpRequest(req)

  if (!authResult.success) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: authResult.errorCode,
          message: authResult.errorMessage,
        },
      },
      {
        status: authResult.errorCode === -32001 ? 401 : 403,
        headers: corsHeaders,
      }
    )
  }

  const sessionId = crypto.randomUUID()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      registerSseSession(sessionId, controller, authResult.principal)

      // Emit the endpoint event required by MCP SSE specification
      const endpointPayload = `event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`
      controller.enqueue(encoder.encode(endpointPayload))
    },
    cancel() {
      unregisterSseSession(sessionId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  })
}

import { NextRequest, NextResponse } from "next/server"
import { authenticateMcpRequest } from "@/lib/mcp/auth"
import { processMcpJsonRpcRequest } from "@/lib/mcp/server"

export const dynamic = "force-dynamic"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, x-workspace-id, mcp-session-id, mcp-protocol-version, last-event-id",
  "Access-Control-Expose-Headers":
    "Content-Type, mcp-session-id, mcp-protocol-version, last-event-id",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") ?? ""

  if (accept.includes("text/event-stream")) {
    const url = new URL(req.url)
    const encoder = new TextEncoder()
    let pingInterval: ReturnType<typeof setInterval> | null = null

    const stream = new ReadableStream({
      start(controller) {
        // Immediately send endpoint event followed by initial keep-alive comment
        controller.enqueue(
          encoder.encode(`event: endpoint\ndata: /api/mcp${url.search}\n\n`)
        )
        controller.enqueue(encoder.encode(": ping\n\n"))

        // Active keep-alive comments every 15s to keep connections alive through proxies / load balancers
        pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"))
          } catch {
            if (pingInterval) {
              clearInterval(pingInterval)
              pingInterval = null
            }
          }
        }, 15000)
      },
      cancel() {
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  }

  return NextResponse.json(
    {
      name: "character-arc-mcp",
      version: "1.0.0",
      status: "online",
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      transport: {
        sse: true,
        jsonrpc: true,
      },
      documentation: "https://characterarc.app/docs/mcp",
    },
    {
      headers: corsHeaders,
    }
  )
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateMcpRequest(req)
  const sessionId =
    req.headers.get("mcp-session-id") ||
    req.nextUrl.searchParams.get("sessionId") ||
    crypto.randomUUID()

  const responseHeaders = {
    ...corsHeaders,
    "mcp-protocol-version": "2024-11-05",
    "mcp-session-id": sessionId,
  }

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
        headers: responseHeaders,
      }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON was received by the server.",
        },
      },
      {
        status: 400,
        headers: responseHeaders,
      }
    )
  }

  const response = await processMcpJsonRpcRequest(body, authResult.principal)

  // Per JSON-RPC 2.0 §4.1: server MUST NOT reply to notifications -> HTTP 202 Accepted
  if (response === null) {
    return new NextResponse(null, {
      status: 202,
      headers: responseHeaders,
    })
  }

  return NextResponse.json(response, {
    headers: responseHeaders,
  })
}

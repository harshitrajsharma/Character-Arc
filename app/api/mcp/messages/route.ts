import { NextRequest, NextResponse } from "next/server"
import { processMcpJsonRpcRequest } from "@/lib/mcp/server"
import { getSseSession, sendSseMessage } from "@/lib/mcp/sse-session"

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

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (!sessionId) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32602,
          message: "Missing 'sessionId' query parameter.",
        },
      },
      { status: 400, headers: corsHeaders }
    )
  }

  const session = getSseSession(sessionId)
  if (!session) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Active SSE session not found or disconnected.",
        },
      },
      { status: 404, headers: corsHeaders }
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
          message: "Parse error: Invalid JSON payload.",
        },
      },
      { status: 400, headers: corsHeaders }
    )
  }

  // Process JSON-RPC request and push result through SSE session stream
  const response = await processMcpJsonRpcRequest(body, session.principal)
  sendSseMessage(sessionId, response)

  return NextResponse.json(
    { status: "accepted" },
    { status: 202, headers: corsHeaders }
  )
}

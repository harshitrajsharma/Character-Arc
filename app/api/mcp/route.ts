import { NextRequest, NextResponse } from "next/server"
import { authenticateMcpRequest } from "@/lib/mcp/auth"
import { processMcpJsonRpcRequest } from "@/lib/mcp/server"

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

export async function GET() {
  return NextResponse.json(
    {
      name: "character-arc-mcp",
      version: "1.0.0",
      status: "online",
      protocolVersion: "2024-11-05",
      documentation: "https://characterarc.app/docs/mcp",
    },
    {
      headers: corsHeaders,
    }
  )
}

export async function POST(req: NextRequest) {
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
        headers: corsHeaders,
      }
    )
  }

  const response = await processMcpJsonRpcRequest(body, authResult.principal)

  return NextResponse.json(response, {
    headers: corsHeaders,
  })
}

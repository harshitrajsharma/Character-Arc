// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"
let authenticated = true
let processed = 0
mock.module("@/lib/mcp/auth", () => ({
  authenticateMcpRequest: async () =>
    authenticated
      ? {
          success: true,
          principal: {
            userId: "user",
            workspaceId: "workspace",
            role: "OWNER",
          },
        }
      : {
          success: false,
          status: 401,
          errorCode: -32001,
          errorMessage: "Credential required.",
        },
}))
mock.module("@/lib/mcp/server", () => ({
  processMcpJsonRpcRequest: async (body: { id?: string; method?: string }) => {
    processed++
    if (!body.id) return null
    return {
      jsonrpc: "2.0",
      id: body.id,
      result:
        body.method === "initialize" ? { protocolVersion: "2025-11-25" } : {},
    }
  },
}))
const { POST, GET, OPTIONS } = await import("@/app/api/mcp/route")
const request = (
  body = '{"jsonrpc":"2.0","id":"1","method":"ping"}',
  headers: Record<string, string> = {}
) =>
  new Request("https://app.example/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body,
  })
beforeEach(() => {
  authenticated = true
  processed = 0
})

describe("stateless MCP route boundary", () => {
  test("authorized JSON requests never create process-local session headers", async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(response.headers.get("mcp-session-id")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
  test("credential failures return a Bearer challenge without processing input", async () => {
    authenticated = false
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toContain("Bearer")
    expect(processed).toBe(0)
  })
  test("notification acceptance has no response payload", async () => {
    const response = await POST(
      request('{"jsonrpc":"2.0","method":"notifications/initialized"}')
    )
    expect(response.status).toBe(202)
    expect(await response.text()).toBe("")
  })
  test("untrusted origins and unsupported transport input fail before invocation", async () => {
    expect(
      (await POST(request(undefined, { Origin: "https://untrusted.invalid" })))
        .status
    ).toBe(403)
    expect((await POST(request("bad json"))).status).toBe(400)
    expect(
      (await POST(request(undefined, { Accept: "application/json" }))).status
    ).toBe(406)
    expect(
      (await POST(request(undefined, { "Content-Type": "text/plain" }))).status
    ).toBe(415)
    expect(processed).toBe(0)
  })
  test("GET does not pretend to be an SSE transport and CORS is not wildcard", async () => {
    const response = await GET(
      new Request("https://app.example/api/mcp", {
        headers: { Accept: "text/event-stream" },
      })
    )
    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("POST, OPTIONS")
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
    expect(
      (
        await OPTIONS(
          new Request("https://app.example/api/mcp", {
            method: "OPTIONS",
            headers: { Origin: "https://untrusted.invalid" },
          })
        )
      ).status
    ).toBe(403)
  })
})

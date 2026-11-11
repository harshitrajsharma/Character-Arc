/** Read-only MCP protocol verification. Never discovers, creates or recovers database credentials. */
import "dotenv/config"
import assert from "node:assert/strict"

const base = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000")
if (base.search || base.hash || base.username || base.password)
  throw new Error(
    "TEST_BASE_URL must not include credentials, query parameters or a fragment."
  )
const endpoint = new URL("/api/mcp", base)
const secret = process.env.MCP_API_KEY?.trim()
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
}
const results: string[] = []
async function check(name: string, operation: () => Promise<void>) {
  await operation()
  results.push(name)
  console.log(`PASS ${name}`)
}
async function post(body: unknown, extra: Record<string, string> = {}) {
  return fetch(endpoint, {
    method: "POST",
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
}
await check("unauthenticated requests are rejected", async () => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: headers.Accept },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    signal: AbortSignal.timeout(30_000),
  })
  assert.equal(response.status, 401)
  assert.match(response.headers.get("www-authenticate") ?? "", /Bearer/)
})
await check("untrusted browser origins are rejected", async () => {
  const response = await post(
    { jsonrpc: "2.0", id: 1, method: "ping" },
    { Origin: "https://untrusted.invalid" }
  )
  assert.equal(response.status, 403)
  assert.equal(response.headers.get("access-control-allow-origin"), null)
})
await check("URL credentials are rejected", async () => {
  const url = new URL(endpoint)
  url.searchParams.set("apiKey", "not-a-real-key")
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    signal: AbortSignal.timeout(30_000),
  })
  assert.equal(response.status, 401)
})
await check("legacy SSE endpoints are retired", async () => {
  const response = await fetch(new URL("/api/mcp/sse", base), {
    headers: { Accept: "text/event-stream" },
    signal: AbortSignal.timeout(30_000),
  })
  assert.equal(response.status, 410)
  const messages = await fetch(
    new URL("/api/mcp/messages?sessionId=unused", base),
    { method: "POST", headers, body: "{}", signal: AbortSignal.timeout(30_000) }
  )
  assert.equal(messages.status, 410)
})
if (!secret) {
  console.log(
    "SKIP authenticated checks: supply MCP_API_KEY explicitly; no key was created or recovered."
  )
} else {
  await check("initialize negotiates stateless Streamable HTTP", async () => {
    const response = await post({
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "character-arc-verifier", version: "1.0.0" },
      },
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.result.protocolVersion, "2025-11-25")
    assert.equal(response.headers.get("mcp-session-id"), null)
  })
  await check("valid notification has an empty 202 response", async () => {
    const response = await post({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    })
    assert.equal(response.status, 202)
    assert.equal(await response.text(), "")
  })
  await check("tools discovery is bounded and fully pageable", async () => {
    let cursor: string | undefined
    const names = new Set<string>()
    for (let page = 0; page < 100; page += 1) {
      const response = await post({
        jsonrpc: "2.0",
        id: `list-${page}`,
        method: "tools/list",
        params: cursor ? { cursor } : {},
      })
      assert.equal(response.status, 200)
      const body = await response.json()
      assert.ok(Array.isArray(body.result?.tools))
      assert.ok(body.result.tools.length <= 40)
      for (const tool of body.result.tools) {
        assert.ok(!names.has(tool.name))
        names.add(tool.name)
      }
      cursor = body.result.nextCursor
      if (!cursor) return
    }
    throw new Error("Tool pagination did not terminate.")
  })
  await check("unknown tools are protocol errors", async () => {
    const response = await post({
      jsonrpc: "2.0",
      id: "unknown",
      method: "tools/call",
      params: { name: "does_not_exist", arguments: {} },
    })
    const body = await response.json()
    assert.equal(body.error?.code, -32602)
  })
  await check("standalone SSE is not falsely advertised", async () => {
    const response = await fetch(endpoint, {
      headers: { ...headers, Accept: "text/event-stream" },
      signal: AbortSignal.timeout(30_000),
    })
    assert.equal(response.status, 405)
  })
}
console.log(
  `MCP verification passed: ${results.length} checks. No domain actions, records or credentials were created.`
)

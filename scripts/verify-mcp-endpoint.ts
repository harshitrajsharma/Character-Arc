/**
 * Automated Verification Suite for Character Arc Unified MCP Endpoint (/api/mcp)
 *
 * Verifies:
 * 1. GET metadata (regular HTTP GET -> JSON health & capability metadata)
 * 2. GET SSE streaming (Accept: text/event-stream -> endpoint negotiation & keep-alive : ping)
 * 3. POST initialize handshake -> 200 OK with capabilities & server info
 * 4. POST notifications/initialized -> 202 Accepted without JSON-RPC error (JSON-RPC 2.0 §4.1)
 * 5. POST other notifications (notifications/cancelled, notification without id) -> 202 Accepted
 * 6. POST tools/list -> enumerates active installed tools in workspace
 * 7. POST tools/call -> executes tool action (core_mock_tests__assessment_get_weak_topics)
 * 8. Negative security -> unauthenticated requests return 401 Unauthorized
 * 9. CORS & preflight -> OPTIONS returns 204 with exposed MCP headers
 * 10. Parse error -> malformed JSON returns 400 with code -32700
 * 11. Method not found -> unknown method with id returns 200 with code -32601
 */

import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { createHash, randomBytes } from "node:crypto"

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000"

type TestResult = {
  name: string
  passed: boolean
  durationMs: number
  details?: string
  error?: string
}

const results: TestResult[] = []

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    const durationMs = Date.now() - start
    results.push({ name, passed: true, durationMs })
    console.log(`  \x1b[32m✔\x1b[0m ${name} (${durationMs}ms)`)
  } catch (err) {
    const durationMs = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, durationMs, error: message })
    console.error(`  \x1b[31m✘\x1b[0m ${name} (${durationMs}ms): ${message}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function main() {
  const { prisma } = await import("../lib/prisma")

  console.log(`\n===============================================================`)
  console.log(` Starting Character Arc MCP Unified Endpoint Verification`)
  console.log(` Target Base URL: ${BASE_URL}`)
  console.log(`===============================================================\n`)

  // Step 1: Ensure valid test API key exists
  let apiKey = process.env.MCP_API_KEY || ""
  let createdTestTokenId: string | null = null

  if (!apiKey) {
    // Check if an existing token with valid secret is in the DB
    const tokens = await prisma.mcpToken.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: "desc" },
    })

    for (const t of tokens) {
      if (t.keyPrefix && !t.keyPrefix.includes("...")) {
        const hash = createHash("sha256").update(t.keyPrefix).digest("hex")
        if (hash === t.keyHash) {
          apiKey = t.keyPrefix
          break
        }
      }
    }

    if (!apiKey) {
      // Find an active workspace member to create an ephemeral verification token
      const member = await prisma.workspaceMember.findFirst({
        where: { workspace: { archivedAt: null } },
      })

      if (!member) {
        throw new Error("No active workspace found in database to execute MCP tests.")
      }

      const rawSecret = `mcp_sec_${randomBytes(20).toString("hex")}`
      const keyHash = createHash("sha256").update(rawSecret).digest("hex")

      const created = await prisma.mcpToken.create({
        data: {
          workspaceId: member.workspaceId,
          createdById: member.userId,
          name: "MCP Automated Verification Key",
          keyHash,
          keyPrefix: rawSecret,
        },
      })

      apiKey = rawSecret
      createdTestTokenId = created.id
      console.log(`  [Setup] Created ephemeral verification key: ${created.name}`)
    }
  }

  assert(Boolean(apiKey), "Failed to resolve a valid API key for MCP tests.")

  try {
    // --- Test 1: OPTIONS Preflight & CORS Headers ---
    await runTest("CORS Preflight (OPTIONS /api/mcp)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, {
        method: "OPTIONS",
      })
      assert(res.status === 204, `Expected status 204, got ${res.status}`)
      assert(
        res.headers.get("access-control-allow-origin") === "*",
        "Expected Access-Control-Allow-Origin: *"
      )
      const allowHeaders = res.headers.get("access-control-allow-headers") ?? ""
      assert(
        allowHeaders.includes("mcp-session-id") &&
          allowHeaders.includes("mcp-protocol-version") &&
          allowHeaders.includes("last-event-id"),
        `Expected allow-headers to include mcp-session-id, mcp-protocol-version, last-event-id. Got: ${allowHeaders}`
      )
      const exposeHeaders = res.headers.get("access-control-expose-headers") ?? ""
      assert(
        exposeHeaders.includes("mcp-session-id") &&
          exposeHeaders.includes("mcp-protocol-version") &&
          exposeHeaders.includes("last-event-id"),
        `Expected expose-headers to include mcp-session-id, mcp-protocol-version, last-event-id. Got: ${exposeHeaders}`
      )
    })

    // --- Test 2: Regular GET Server Metadata ---
    await runTest("GET Server Metadata (Regular HTTP GET)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`)
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const contentType = res.headers.get("content-type") ?? ""
      assert(
        contentType.includes("application/json"),
        `Expected application/json, got ${contentType}`
      )

      const body = (await res.json()) as {
        status?: string
        protocolVersion?: string
        capabilities?: { tools?: { listChanged?: boolean } }
        transport?: { sse?: boolean; jsonrpc?: boolean }
      }
      assert(body.status === "online", `Expected status: "online", got ${body.status}`)
      assert(
        body.protocolVersion === "2024-11-05",
        `Expected protocolVersion: "2024-11-05", got ${body.protocolVersion}`
      )
      assert(
        body.capabilities?.tools?.listChanged === false,
        `Expected capabilities.tools.listChanged: false`
      )
      assert(
        body.transport?.sse === true && body.transport?.jsonrpc === true,
        `Expected transport descriptors for sse and jsonrpc`
      )
    })

    // --- Test 3: GET with Accept: text/event-stream (SSE Stream Negotiation & Heartbeat) ---
    await runTest("GET SSE Stream Negotiation & Heartbeat (: ping)", async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      try {
        const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
          headers: {
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        })

        assert(res.status === 200, `Expected status 200, got ${res.status}`)
        const contentType = res.headers.get("content-type") ?? ""
        assert(
          contentType.includes("text/event-stream"),
          `Expected text/event-stream, got ${contentType}`
        )
        const buffering = res.headers.get("x-accel-buffering")
        assert(
          buffering === "no",
          `Expected X-Accel-Buffering: no, got ${buffering}`
        )

        assert(res.body !== null, "Response body stream was null")
        const reader = res.body!.getReader()

        let accumulated = ""
        while (accumulated.length < 50) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += new TextDecoder().decode(value)
          if (accumulated.includes(": ping\n\n")) break
        }

        await reader.cancel()

        assert(
          accumulated.includes("event: endpoint"),
          `Expected stream to contain "event: endpoint", received: ${accumulated}`
        )
        assert(
          accumulated.includes("data: /api/mcp"),
          `Expected stream to contain "data: /api/mcp", received: ${accumulated}`
        )
        assert(
          accumulated.includes(": ping\n\n"),
          `Expected initial keep-alive heartbeat ": ping\\n\\n", received: ${accumulated}`
        )
      } finally {
        clearTimeout(timeoutId)
      }
    })

    // --- Test 4: POST initialize Handshake ---
    await runTest("POST initialize Handshake", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "init-1",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "verify-script", version: "1.0.0" },
          },
        }),
      })

      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      assert(
        res.headers.get("mcp-protocol-version") === "2024-11-05",
        "Expected mcp-protocol-version: 2024-11-05 in response headers"
      )
      assert(
        Boolean(res.headers.get("mcp-session-id")),
        "Expected mcp-session-id header in response"
      )

      const body = (await res.json()) as {
        jsonrpc: string
        id: string
        result?: {
          protocolVersion?: string
          serverInfo?: { name?: string; version?: string }
          capabilities?: Record<string, unknown>
        }
      }

      assert(body.jsonrpc === "2.0", `Expected jsonrpc: "2.0", got ${body.jsonrpc}`)
      assert(body.id === "init-1", `Expected id: "init-1", got ${body.id}`)
      assert(
        body.result?.protocolVersion === "2024-11-05",
        `Expected protocolVersion: "2024-11-05"`
      )
      assert(
        body.result?.serverInfo?.name === "character-arc-mcp-server",
        `Expected serverInfo.name: "character-arc-mcp-server"`
      )
      assert(Boolean(body.result?.capabilities), "Expected capabilities in initialize result")
    })

    // --- Test 5: POST notifications/initialized (JSON-RPC 2.0 §4.1 Protocol Safety) ---
    await runTest("POST notifications/initialized (Safety: HTTP 202, No -32601 Error)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      })

      assert(
        res.status === 202,
        `Expected status 202 Accepted for notification, got ${res.status}`
      )
      const bodyText = await res.text()
      assert(
        bodyText.length === 0,
        `Expected empty body for notification, received: ${bodyText}`
      )
      assert(
        res.headers.get("mcp-protocol-version") === "2024-11-05",
        "Expected mcp-protocol-version header in 202 response"
      )
    })

    // --- Test 6: POST Other Standard Notifications (notifications/cancelled & no-id notification) ---
    await runTest("POST notifications/cancelled & no-id Notification", async () => {
      const res1 = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: "req-999" },
        }),
      })
      assert(res1.status === 202, `Expected status 202 for notifications/cancelled, got ${res1.status}`)

      const res2 = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "custom/notification",
          params: {},
        }),
      })
      assert(res2.status === 202, `Expected status 202 for no-id notification, got ${res2.status}`)
    })

    // --- Test 7: POST ping ---
    await runTest("POST ping", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ping-1",
          method: "ping",
        }),
      })

      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const body = (await res.json()) as { jsonrpc: string; id: string; result: unknown }
      assert(body.id === "ping-1", `Expected id: "ping-1", got ${body.id}`)
      assert(typeof body.result === "object", "Expected object result for ping")
    })

    // --- Test 8: POST tools/list ---
    await runTest("POST tools/list (Enumerates Active Workspace Tools)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "tools-list-1",
          method: "tools/list",
        }),
      })

      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const body = (await res.json()) as {
        jsonrpc: string
        id: string
        result?: { tools?: Array<{ name: string; description: string; inputSchema: unknown }> }
      }

      assert(Array.isArray(body.result?.tools), "Expected tools array in result")
      assert(body.result!.tools!.length > 0, `Expected at least 1 tool, found ${body.result?.tools?.length}`)

      const toolNames = body.result!.tools!.map((t) => t.name)
      assert(
        toolNames.includes("core_mock_tests__assessment_get_weak_topics"),
        `Expected tool "core_mock_tests__assessment_get_weak_topics" in tool list. Got: ${toolNames.slice(0, 5).join(", ")}...`
      )
    })

    // --- Test 9: POST tools/call ---
    await runTest("POST tools/call (Executes Tool Action)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "tools-call-1",
          method: "tools/call",
          params: {
            name: "core_mock_tests__assessment_get_weak_topics",
            arguments: { limit: 3 },
          },
        }),
      })

      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const body = (await res.json()) as {
        jsonrpc: string
        id: string
        result?: {
          content?: Array<{ type: string; text: string }>
          isError?: boolean
        }
      }

      assert(Array.isArray(body.result?.content), "Expected content array in result")
      assert(body.result!.content!.length > 0, "Expected at least 1 content item")
      assert(body.result!.content![0].type === "text", "Expected content[0].type to be text")

      const parsed = JSON.parse(body.result!.content![0].text) as { status?: string }
      assert(
        parsed.status === "succeeded",
        `Expected execution status "succeeded", got ${parsed.status}`
      )
    })

    // --- Test 10: Security Guardrails - Unauthenticated Request ---
    await runTest("Security Guardrail: Unauthenticated Request Returns 401", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "unauth-1",
          method: "tools/list",
        }),
      })

      assert(
        res.status === 401,
        `Expected status 401 Unauthorized, got ${res.status}`
      )
      const body = (await res.json()) as {
        jsonrpc: string
        id: unknown
        error?: { code: number; message: string }
      }
      assert(
        body.error?.code === -32001,
        `Expected error code -32001 (UNAUTHORIZED), got ${body.error?.code}`
      )
    })

    // --- Test 11: Invalid JSON Parse Error ---
    await runTest("Parse Error: Malformed JSON Returns 400 (-32700)", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json...",
      })

      assert(res.status === 400, `Expected status 400, got ${res.status}`)
      const body = (await res.json()) as {
        error?: { code: number; message: string }
      }
      assert(
        body.error?.code === -32700,
        `Expected error code -32700, got ${body.error?.code}`
      )
    })

    // --- Test 12: Method Not Found with ID ---
    await runTest("Method Not Found: Unknown Method with ID Returns -32601", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "unknown-1",
          method: "non_existent_method",
        }),
      })

      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const body = (await res.json()) as {
        id: string
        error?: { code: number; message: string }
      }
      assert(body.id === "unknown-1", `Expected id: "unknown-1", got ${body.id}`)
      assert(
        body.error?.code === -32601,
        `Expected error code -32601 (METHOD_NOT_FOUND), got ${body.error?.code}`
      )
    })
  } finally {
    // Teardown: revoke ephemeral key if created during this run
    if (createdTestTokenId) {
      try {
        await prisma.mcpToken.update({
          where: { id: createdTestTokenId },
          data: { revokedAt: new Date() },
        })
        console.log(`\n  [Teardown] Ephemeral verification key revoked cleanly.`)
      } catch {
        // Ignore teardown error
      }
    }
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length

  console.log(`\n===============================================================`)
  console.log(` MCP Endpoint Verification Summary:`)
  console.log(` Total Tests: ${results.length}`)
  console.log(` \x1b[32mPassed:\x1b[0m ${passedCount}`)
  console.log(` \x1b[31mFailed:\x1b[0m ${failedCount}`)
  console.log(`===============================================================\n`)

  if (failedCount > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal verification test error:", err)
  process.exit(1)
})

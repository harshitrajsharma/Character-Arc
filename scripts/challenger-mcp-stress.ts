/**
 * Empirical Adversarial Challenger Test Suite for MCP Endpoint (/api/mcp)
 *
 * Stress-tests:
 * 1. Notification Safety & Notification Variations without ID
 * 2. Standard Handshake Sequencing (initialize -> notifications/initialized -> ping -> tools/list -> tools/call)
 * 3. Edge Cases, Malformed Payloads, Auth Boundary Conditions, and Method/Param Errors
 * 4. Concurrent Notification Flooding
 * 5. SSE & CORS Transport Compliance
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { createHash, randomBytes } from "node:crypto"

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000"

interface TestStepResult {
  suite: string
  test: string
  status: "PASS" | "FAIL"
  durationMs: number
  details?: string
  error?: string
}

const testResults: TestStepResult[] = []

async function recordTest(
  suite: string,
  test: string,
  fn: () => Promise<void>
) {
  const start = Date.now()
  try {
    await fn()
    const durationMs = Date.now() - start
    testResults.push({ suite, test, status: "PASS", durationMs })
    console.log(`  \x1b[32m[PASS]\x1b[0m [${suite}] ${test} (${durationMs}ms)`)
  } catch (err: unknown) {
    const durationMs = Date.now() - start
    const msg = err instanceof Error ? err.message : String(err)
    testResults.push({ suite, test, status: "FAIL", durationMs, error: msg })
    console.error(`  \x1b[31m[FAIL]\x1b[0m [${suite}] ${test} (${durationMs}ms): ${msg}`)
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

async function runAllChallengerTests() {
  const { prisma } = await import("../lib/prisma")

  console.log(`\n======================================================================`)
  console.log(` EMPIRICAL CHALLENGER: Adversarial MCP & JSON-RPC Stress Suite`)
  console.log(` Target Base URL: ${BASE_URL}`)
  console.log(`======================================================================\n`)

  // Step 0: Acquire or create API key
  let apiKey = process.env.MCP_API_KEY || ""
  let createdEphemeralTokenId: string | null = null

  if (!apiKey) {
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
      const member = await prisma.workspaceMember.findFirst({
        where: { workspace: { archivedAt: null } },
      })
      if (!member) {
        throw new Error("No active workspace found to run tests.")
      }
      const rawSecret = `mcp_sec_${randomBytes(20).toString("hex")}`
      const keyHash = createHash("sha256").update(rawSecret).digest("hex")
      const created = await prisma.mcpToken.create({
        data: {
          workspaceId: member.workspaceId,
          createdById: member.userId,
          name: "Challenger Adversarial Test Key",
          keyHash,
          keyPrefix: rawSecret,
        },
      })
      apiKey = rawSecret
      createdEphemeralTokenId = created.id
      console.log(`  [Auth Setup] Created ephemeral test token: ${created.id}`)
    }
  }

  assert(Boolean(apiKey), "Valid API key is required to proceed.")

  try {
    // ========================================================================
    // SUITE 1: Notification Safety Stress
    // ========================================================================
    console.log(`\n--- SUITE 1: Notification Safety Stress ---`)

    await recordTest("Notifications", "notifications/initialized returns 202 and empty body", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
      assert(!text.includes("-32601"), `Body must not contain -32601`)
    })

    await recordTest("Notifications", "notifications/cancelled with params returns 202 and empty body", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: "req-12345", reason: "Client cancelled operation" },
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
    })

    await recordTest("Notifications", "notifications/message returns 202 and empty body", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/message",
          params: { level: "info", data: "status update" },
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
    })

    await recordTest("Notifications", "notifications/custom_event returns 202 and empty body", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/custom_event",
          params: { event: "user_action", meta: { foo: "bar" } },
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
    })

    await recordTest("Notifications", "Arbitrary method without 'id' treated as notification -> 202 Accepted", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "telemetry/heartbeat",
          params: { tick: 99 },
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
    })

    await recordTest("Notifications", "Notification with 'id' explicitly provided is safely handled without error", async () => {
      // In MCP specification, notifications start with "notifications/". Even if a misbehaved client sends an id,
      // server must treat as notification (return 202) and not return -32601.
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "bogus-id-99",
          method: "notifications/initialized",
        }),
      })
      assert(res.status === 202, `Expected HTTP 202, got ${res.status}`)
      const text = await res.text()
      assert(text === "", `Expected empty body, got: "${text}"`)
    })

    await recordTest("Notifications", "Rapid Concurrent Notification Burst (25 parallel requests)", async () => {
      const burstMethods = [
        "notifications/initialized",
        "notifications/cancelled",
        "notifications/message",
        "notifications/custom_event",
        "notifications/progress",
      ]
      const promises = Array.from({ length: 25 }, (_, i) => {
        const method = burstMethods[i % burstMethods.length]
        return fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method,
            params: { sequence: i },
          }),
        })
      })

      const responses = await Promise.all(promises)
      for (let i = 0; i < responses.length; i++) {
        const r = responses[i]
        assert(r.status === 202, `Burst notification #${i} expected 202, got ${r.status}`)
        const txt = await r.text()
        assert(txt === "", `Burst notification #${i} expected empty body, got "${txt}"`)
      }
    })

    // ========================================================================
    // SUITE 2: Standard Methods Handshake
    // ========================================================================
    console.log(`\n--- SUITE 2: Standard Methods Handshake ---`)

    await recordTest("Handshake", "Full Sequence: initialize -> notifications/initialized -> ping -> tools/list -> tools/call", async () => {
      // Step A: initialize
      const initRes = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "seq-init",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "challenger-handshake", version: "2.0.0" },
          },
        }),
      })
      assert(initRes.status === 200, `initialize status expected 200, got ${initRes.status}`)
      const initJson = (await initRes.json()) as {
        id: string
        result?: { protocolVersion?: string; serverInfo?: { name?: string } }
      }
      assert(initJson.id === "seq-init", `Expected id "seq-init"`)
      assert(initJson.result?.protocolVersion === "2024-11-05", "Protocol version mismatch")
      assert(initJson.result?.serverInfo?.name === "character-arc-mcp-server", "Server name mismatch")

      // Step B: notifications/initialized
      const notifRes = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      })
      assert(notifRes.status === 202, `notifications/initialized expected 202, got ${notifRes.status}`)
      const notifTxt = await notifRes.text()
      assert(notifTxt === "", `Expected empty body from notification`)

      // Step C: ping
      const pingRes = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "seq-ping",
          method: "ping",
        }),
      })
      assert(pingRes.status === 200, `ping status expected 200, got ${pingRes.status}`)
      const pingJson = (await pingRes.json()) as { id: string; result?: unknown }
      assert(pingJson.id === "seq-ping", `ping id mismatch`)

      // Step D: tools/list
      const listRes = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "seq-list",
          method: "tools/list",
        }),
      })
      assert(listRes.status === 200, `tools/list status expected 200, got ${listRes.status}`)
      const listJson = (await listRes.json()) as {
        id: string
        result?: { tools?: Array<{ name: string; description: string }> }
      }
      assert(listJson.id === "seq-list", `list id mismatch`)
      assert(Array.isArray(listJson.result?.tools) && listJson.result!.tools!.length > 0, "Tools list empty")

      // Step E: tools/call
      const callRes = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "seq-call",
          method: "tools/call",
          params: {
            name: "core_mock_tests__assessment_get_weak_topics",
            arguments: { limit: 1 },
          },
        }),
      })
      assert(callRes.status === 200, `tools/call status expected 200, got ${callRes.status}`)
      const callJson = (await callRes.json()) as {
        id: string
        result?: { content?: Array<{ type: string; text: string }> }
      }
      assert(callJson.id === "seq-call", `call id mismatch`)
      assert(Boolean(callJson.result?.content?.[0]?.text), "No content returned in tools/call")
      const inner = JSON.parse(callJson.result!.content![0].text)
      assert(inner.status === "succeeded", `Expected status: "succeeded", got: ${inner.status}`)
    })

    // ========================================================================
    // SUITE 3: Edge Cases & Boundary Conditions
    // ========================================================================
    console.log(`\n--- SUITE 3: Edge Cases & Boundary Conditions ---`)

    await recordTest("EdgeCases", "Unknown method with string ID returns -32601 METHOD_NOT_FOUND", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "unknown-str-id",
          method: "nonExistentMethod",
        }),
      })
      assert(res.status === 200, `Expected 200 for JSON-RPC error response, got ${res.status}`)
      const json = (await res.json()) as {
        id: string
        error?: { code: number; message: string }
      }
      assert(json.id === "unknown-str-id", `Expected id "unknown-str-id", got ${json.id}`)
      assert(json.error?.code === -32601, `Expected code -32601, got ${json.error?.code}`)
      assert(Boolean(json.error?.message?.includes("is not supported")), "Expected unsupported method message")
    })

    await recordTest("EdgeCases", "Unknown method with numeric ID returns -32601 with numeric ID preserved", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 42,
          method: "bogus_action",
        }),
      })
      assert(res.status === 200, `Expected 200, got ${res.status}`)
      const json = (await res.json()) as {
        id: number
        error?: { code: number; message: string }
      }
      assert(json.id === 42, `Expected numeric id 42, got ${json.id}`)
      assert(json.error?.code === -32601, `Expected -32601, got ${json.error?.code}`)
    })

    await recordTest("EdgeCases", "Malformed JSON payload returns 400 Bad Request with -32700 PARSE_ERROR", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"jsonrpc": "2.0", "method": "ping", "unclosed": ',
      })
      assert(res.status === 400, `Expected status 400, got ${res.status}`)
      const json = (await res.json()) as { error?: { code: number } }
      assert(json.error?.code === -32700, `Expected code -32700, got ${json.error?.code}`)
    })

    await recordTest("EdgeCases", "Empty string body returns 400 Bad Request with -32700 PARSE_ERROR", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      })
      assert(res.status === 400, `Expected status 400, got ${res.status}`)
      const json = (await res.json()) as { error?: { code: number } }
      assert(json.error?.code === -32700, `Expected code -32700, got ${json.error?.code}`)
    })

    await recordTest("EdgeCases", "Unauthenticated request without key returns 401 Unauthorized", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "auth-check-1",
          method: "ping",
        }),
      })
      assert(res.status === 401, `Expected status 401, got ${res.status}`)
      const json = (await res.json()) as { error?: { code: number; message: string } }
      assert(json.error?.code === -32001, `Expected auth error code -32001, got ${json.error?.code}`)
    })

    await recordTest("EdgeCases", "Request with invalid/fabricated API key returns 401 Unauthorized", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=mcp_sec_bogus_key_999999999`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "auth-check-2",
          method: "ping",
        }),
      })
      assert(res.status === 401, `Expected status 401, got ${res.status}`)
      const json = (await res.json()) as { error?: { code: number } }
      assert(json.error?.code === -32001, `Expected auth error code -32001`)
    })

    await recordTest("EdgeCases", "Header authentication (x-api-key: ...) functions identically to query param", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "header-auth-1",
          method: "ping",
        }),
      })
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const json = (await res.json()) as { id: string; result?: unknown }
      assert(json.id === "header-auth-1", "Header auth failed to identify request")
    })

    await recordTest("EdgeCases", "Bearer token authentication (Authorization: Bearer ...) functions identically", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "bearer-auth-1",
          method: "ping",
        }),
      })
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const json = (await res.json()) as { id: string }
      assert(json.id === "bearer-auth-1", "Bearer auth failed")
    })

    await recordTest("EdgeCases", "tools/call with missing tool name returns -32602 INVALID_PARAMS", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "tool-missing-name",
          method: "tools/call",
          params: {},
        }),
      })
      assert(res.status === 200, `Expected 200, got ${res.status}`)
      const json = (await res.json()) as { id: string; error?: { code: number; message: string } }
      assert(json.id === "tool-missing-name", `id mismatch`)
      assert(json.error?.code === -32602, `Expected -32602, got ${json.error?.code}`)
      assert(Boolean(json.error?.message?.includes("requires a valid 'name'")), "Expected name required message")
    })

    await recordTest("EdgeCases", "tools/call with nonexistent tool returns -32601 METHOD_NOT_FOUND", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "nonexistent-tool",
          method: "tools/call",
          params: {
            name: "non_existent_tool_action",
            arguments: {},
          },
        }),
      })
      assert(res.status === 200, `Expected 200, got ${res.status}`)
      const json = (await res.json()) as { id: string; error?: { code: number; message: string } }
      assert(json.id === "nonexistent-tool", `id mismatch`)
      assert(json.error?.code === -32601, `Expected -32601, got ${json.error?.code}`)
    })

    // ========================================================================
    // SUITE 4: Transport & SSE Conformance
    // ========================================================================
    console.log(`\n--- SUITE 4: Transport & SSE Conformance ---`)

    await recordTest("Transport", "GET /api/mcp with Accept: text/event-stream returns SSE stream with keep-alive", async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      try {
        const res = await fetch(`${BASE_URL}/api/mcp?apiKey=${apiKey}`, {
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
        })
        assert(res.status === 200, `Expected 200, got ${res.status}`)
        const ct = res.headers.get("content-type") ?? ""
        assert(ct.includes("text/event-stream"), `Expected text/event-stream, got ${ct}`)
        assert(res.headers.get("x-accel-buffering") === "no", "Expected X-Accel-Buffering: no")
        assert(Boolean(res.headers.get("cache-control")?.includes("no-cache")), "Expected Cache-Control: no-cache")

        const reader = res.body!.getReader()
        let chunks = ""
        while (chunks.length < 50) {
          const { done, value } = await reader.read()
          if (done) break
          chunks += new TextDecoder().decode(value)
          if (chunks.includes(": ping\n\n")) break
        }
        await reader.cancel()

        assert(chunks.includes("event: endpoint\n"), "SSE stream missing event: endpoint")
        assert(chunks.includes("data: /api/mcp"), "SSE stream missing data: /api/mcp")
        assert(chunks.includes(": ping\n\n"), "SSE stream missing initial keep-alive ping")
      } finally {
        clearTimeout(timeout)
      }
    })

    await recordTest("Transport", "Regular GET /api/mcp returns metadata and capability descriptors", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`)
      assert(res.status === 200, `Expected 200, got ${res.status}`)
      const ct = res.headers.get("content-type") ?? ""
      assert(ct.includes("application/json"), `Expected application/json, got ${ct}`)
      const json = (await res.json()) as {
        status: string
        protocolVersion: string
        capabilities: { tools: { listChanged: boolean } }
        transport: { sse: boolean; jsonrpc: boolean }
      }
      assert(json.status === "online", "status should be online")
      assert(json.protocolVersion === "2024-11-05", "protocolVersion mismatch")
      assert(json.transport.sse === true && json.transport.jsonrpc === true, "transport flags mismatch")
    })

    await recordTest("Transport", "OPTIONS /api/mcp returns 204 with full MCP Exposed and Allowed Headers", async () => {
      const res = await fetch(`${BASE_URL}/api/mcp`, { method: "OPTIONS" })
      assert(res.status === 204, `Expected 204, got ${res.status}`)
      const allowOrigin = res.headers.get("access-control-allow-origin")
      assert(allowOrigin === "*", `Expected *, got ${allowOrigin}`)

      const exposed = res.headers.get("access-control-expose-headers") ?? ""
      assert(exposed.includes("mcp-session-id"), "Expose headers missing mcp-session-id")
      assert(exposed.includes("mcp-protocol-version"), "Expose headers missing mcp-protocol-version")
      assert(exposed.includes("last-event-id"), "Expose headers missing last-event-id")

      const allowed = res.headers.get("access-control-allow-headers") ?? ""
      assert(allowed.includes("mcp-session-id"), "Allow headers missing mcp-session-id")
      assert(allowed.includes("mcp-protocol-version"), "Allow headers missing mcp-protocol-version")
      assert(allowed.includes("last-event-id"), "Allow headers missing last-event-id")
    })

  } finally {
    if (createdEphemeralTokenId) {
      try {
        await prisma.mcpToken.update({
          where: { id: createdEphemeralTokenId },
          data: { revokedAt: new Date() },
        })
        console.log(`  [Auth Teardown] Revoked ephemeral test token cleanly.`)
      } catch {
        // Ignored
      }
    }
  }

  // Summary Report
  const passed = testResults.filter((r) => r.status === "PASS").length
  const failed = testResults.filter((r) => r.status === "FAIL").length

  console.log(`\n======================================================================`)
  console.log(` CHALLENGER ADVERSARIAL STRESS TEST SUMMARY`)
  console.log(` Total Checks: ${testResults.length}`)
  console.log(` \x1b[32mPassed:\x1b[0m ${passed}`)
  console.log(` \x1b[31mFailed:\x1b[0m ${failed}`)
  console.log(`======================================================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

runAllChallengerTests().catch((err) => {
  console.error("Fatal Challenger Runner Error:", err)
  process.exit(1)
})

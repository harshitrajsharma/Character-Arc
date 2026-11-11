// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, mock, test } from "bun:test"
mock.module("server-only", () => ({}))
const { authenticateMcpRequest } = await import("./auth")
import type { McpAuthDependencies } from "./auth"
const {
  processMcpJsonRpcRequest,
  handleMcpToolCall,
  listMcpToolsForWorkspace,
} = await import("./server")
import type { McpServerDependencies } from "./server"
import { MCP_IDEMPOTENCY_FIELD } from "./contracts"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"
import { manifestToMcpTools } from "./schema-adapter"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import {
  isAllowedMcpOrigin,
  readMcpJsonBody,
  validateMcpHttpRequest,
  MCP_MAX_BODY_BYTES,
} from "./http"
import { maskMcpTokenPrefix } from "./token-metadata"
const { hasTrustedToolActionHandler } =
  await import("@/lib/tools/execute-tool-action")

const workspaceId = "30c56bf7-bd9e-46dc-975e-c37a83ddb7ae"
const userId = "9625ade5-1f2f-41d4-bbe1-2d2c13a330c2"
const principal = { userId, workspaceId, role: "OWNER" as const }
const token = `mcp_sec_${"a".repeat(64)}`
function auth(
  overrides: Partial<McpAuthDependencies> = {}
): McpAuthDependencies {
  return {
    findToken: async () => ({
      id: "token-1",
      workspaceId,
      createdById: userId,
      revokedAt: null,
      lastUsedAt: new Date(),
    }),
    findMembership: async () => ({ workspaceId, role: "EDITOR" }),
    verifyJwt: async () => userId,
    touchToken: async () => undefined,
    ...overrides,
  }
}
const request = (headers: Record<string, string> = {}, suffix = "") =>
  new Request(`https://app.example/api/mcp${suffix}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
  })
const manifests = listFirstPartyToolManifests()
function server(
  overrides: Partial<McpServerDependencies> = {}
): McpServerDependencies {
  return {
    installations: async () =>
      manifests.map((manifest, index) => ({
        id: `installation-${index}`,
        toolKey: manifest.tool.key,
        version: manifest.release.version,
        manifest,
        grants: manifest.defaultGrants,
      })),
    execute: async () => ({
      runId: "run",
      status: "succeeded",
      createdBlockIds: [],
      evidenceIds: [],
      data: { ok: true },
    }),
    ...overrides,
  }
}
const rpc = (method: string, params = {}) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params,
})

describe("MCP explicit authentication boundary", () => {
  test("tokens use the creator’s current role and active membership", async () => {
    const result = await authenticateMcpRequest(request(), auth())
    expect(result).toEqual({
      success: true,
      principal: { userId, workspaceId, role: "EDITOR" },
    })
    expect(
      (
        await authenticateMcpRequest(
          request(),
          auth({ findMembership: async () => null })
        )
      ).success
    ).toBe(false)
  })
  test("revoked credentials and database failure cannot fall through to JWT or cookies", async () => {
    let jwtCalls = 0
    const deps = auth({
      findToken: async () => null,
      verifyJwt: async () => {
        jwtCalls++
        return userId
      },
    })
    expect(
      (
        await authenticateMcpRequest(
          request({ Cookie: "valid-session=anything" }),
          deps
        )
      ).success
    ).toBe(false)
    expect(jwtCalls).toBe(0)
    const unavailable = await authenticateMcpRequest(
      request(),
      auth({
        findToken: async () => {
          throw new Error("secret connection string")
        },
      })
    )
    expect(unavailable.success).toBe(false)
    if (!unavailable.success) {
      expect(unavailable.status).toBe(503)
      expect(unavailable.errorMessage).not.toContain("secret")
    }
  })
  test("explicit workspace mismatch is denied without another-workspace fallback", async () => {
    const result = await authenticateMcpRequest(
      request({ "x-workspace-id": userId }),
      auth()
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(result.status).toBe(403)
    let targeted: string | undefined
    const jwt = await authenticateMcpRequest(
      request({ Authorization: "Bearer jwt", "x-workspace-id": workspaceId }),
      auth({
        findMembership: async (_user, workspace) => {
          targeted = workspace
          return null
        },
      })
    )
    expect(jwt.success).toBe(false)
    expect(targeted).toBe(workspaceId)
  })
  test("URL secrets, missing credentials and conflicting headers are rejected", async () => {
    expect(
      (await authenticateMcpRequest(request({}, "?apiKey=secret"), auth()))
        .success
    ).toBe(false)
    expect(
      (
        await authenticateMcpRequest(
          new Request("https://app.example/api/mcp", {
            headers: { Cookie: "session=valid" },
          }),
          auth()
        )
      ).success
    ).toBe(false)
    expect(
      (
        await authenticateMcpRequest(
          request({ "x-api-key": "different" }),
          auth()
        )
      ).success
    ).toBe(false)
  })
  test("legacy display prefixes cannot disclose a recoverable credential", () => {
    const masked = maskMcpTokenPrefix(token)
    expect(masked).not.toBe(token)
    expect(masked.length).toBeLessThan(20)
    expect(maskMcpTokenPrefix(masked)).toBe(masked)
  })
})

describe("MCP protocol and capability boundary", () => {
  test("every declared first-party action has a trusted runtime binding", () => {
    const missing = manifests.flatMap((manifest) =>
      manifest.actions
        .filter(
          (action) =>
            !hasTrustedToolActionHandler(manifest.tool.key, action.key)
        )
        .map((action) => `${manifest.tool.key}:${action.key}`)
    )
    expect(missing).toEqual([])
  })
  test("valid notifications return no response; malformed id-less messages are errors", async () => {
    expect(
      await processMcpJsonRpcRequest(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        principal,
        server()
      )
    ).toBeNull()
    for (const input of [
      [],
      {},
      { method: "tools/call" },
      { jsonrpc: "2.0", id: null, method: "ping" },
      { jsonrpc: "2.0", id: true, method: "ping" },
    ]) {
      const result = await processMcpJsonRpcRequest(input, principal, server())
      expect(result?.error?.code).toBe(-32600)
      expect(result?.id).toBeNull()
    }
    expect(
      (
        await processMcpJsonRpcRequest(
          rpc("notifications/initialized"),
          principal,
          server()
        )
      )?.error?.code
    ).toBe(-32601)
  })
  test("initialization validates parameters and negotiates supported versions", async () => {
    expect(
      (await processMcpJsonRpcRequest(rpc("initialize"), principal, server()))
        ?.error?.code
    ).toBe(-32602)
    const params = {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    }
    expect(
      (
        await processMcpJsonRpcRequest(
          rpc("initialize", params),
          principal,
          server()
        )
      )?.result
    ).toMatchObject({ protocolVersion: "2025-06-18" })
    expect(
      (
        await processMcpJsonRpcRequest(
          rpc("initialize", { ...params, protocolVersion: "old" }),
          principal,
          server()
        )
      )?.result
    ).toMatchObject({ protocolVersion: "2025-11-25" })
  })
  test("discovery is fail-closed and honors installation grants and viewer role", async () => {
    expect(
      await listMcpToolsForWorkspace(
        principal,
        server({ installations: async () => [] })
      )
    ).toEqual([])
    expect(
      await listMcpToolsForWorkspace(
        principal,
        server({
          installations: async () => [
            {
              id: "i",
              toolKey: "core.mock-tests",
              version: "1.2.0",
              manifest: manifests.find(
                (item) => item.tool.key === "core.mock-tests"
              ),
              grants: [],
            },
          ],
        })
      )
    ).toEqual([])
    const viewer = await listMcpToolsForWorkspace(
      { ...principal, role: "VIEWER" },
      server()
    )
    expect(viewer.length).toBeGreaterThan(0)
    expect(viewer.every((tool) => tool.annotations?.readOnlyHint)).toBe(true)
    const failed = await processMcpJsonRpcRequest(
      rpc("tools/list"),
      principal,
      server({
        installations: async () => {
          throw new Error("postgres://secret")
        },
      })
    )
    expect(failed?.error?.code).toBe(-32603)
    expect(JSON.stringify(failed)).not.toContain("secret")
  })
  test("same-version invalid or drifted manifests are never advertised or dispatched", async () => {
    const manifest = manifests.find(
      (item) => item.tool.key === "core.mock-tests"
    )!
    for (const stored of [
      null,
      {},
      { ...manifest, tool: { ...manifest.tool, name: "Changed" } },
    ]) {
      let executed = false
      const deps = server({
        installations: async () => [
          {
            id: "installation",
            toolKey: manifest.tool.key,
            version: manifest.release.version,
            manifest: stored,
            grants: manifest.defaultGrants,
          },
        ],
        execute: async () => {
          executed = true
          throw new Error("unreachable")
        },
      })
      expect(await listMcpToolsForWorkspace(principal, deps)).toEqual([])
      expect(
        (
          await handleMcpToolCall(
            {
              name: "core_mock_tests__assessment_create",
              arguments: {
                title: "draft",
                [MCP_IDEMPOTENCY_FIELD]: "operation-1",
              },
            },
            principal,
            deps
          )
        ).isError
      ).toBe(true)
      expect(executed).toBe(false)
    }
  })
  test("discovery pages retain stable names without duplicates", async () => {
    let next: string | undefined
    const seen = new Set<string>()
    for (let page = 0; page < 10; page++) {
      const response = await processMcpJsonRpcRequest(
        rpc("tools/list", next ? { cursor: next } : {}),
        principal,
        server()
      )
      const result = response?.result as {
        tools: { name: string }[]
        nextCursor?: string
      }
      expect(result.tools.length).toBeLessThanOrEqual(40)
      for (const tool of result.tools) {
        expect(seen.has(tool.name)).toBe(false)
        seen.add(tool.name)
      }
      next = result.nextCursor
      if (!next) break
    }
    expect(seen.size).toBe(
      (await listMcpToolsForWorkspace(principal, server())).length
    )
    expect(
      (
        await processMcpJsonRpcRequest(
          rpc("tools/list", { cursor: "invalid" }),
          principal,
          server()
        )
      )?.error?.code
    ).toBe(-32602)
  })
  test("mutations require a stable operation key and never auto-install tools", async () => {
    const calls: { key: string; input: unknown }[] = []
    const deps = server({
      execute: async (input) => {
        calls.push({ key: input.idempotencyKey, input: input.input })
        return {
          runId: "r",
          status: "succeeded",
          createdBlockIds: [],
          evidenceIds: [],
        }
      },
    })
    const params = {
      name: "core_mock_tests__assessment_create",
      arguments: { title: "draft" },
    }
    expect((await handleMcpToolCall(params, principal, deps)).isError).toBe(
      true
    )
    expect(calls).toHaveLength(0)
    const args = { title: "draft", [MCP_IDEMPOTENCY_FIELD]: "operation-1" }
    await handleMcpToolCall({ ...params, arguments: args }, principal, deps)
    await handleMcpToolCall({ ...params, arguments: args }, principal, deps)
    await handleMcpToolCall(
      {
        ...params,
        arguments: { ...args, [MCP_IDEMPOTENCY_FIELD]: "operation-2" },
      },
      principal,
      deps
    )
    expect(calls[0].key).toBe(calls[1].key)
    expect(calls[0].key).not.toBe(calls[2].key)
    expect(calls[0].input).toEqual({ title: "draft" })
    const blocked = await handleMcpToolCall(
      { ...params, arguments: args },
      principal,
      server({ installations: async () => [] })
    )
    expect(blocked.isError).toBe(true)
    expect(calls).toHaveLength(3)
  })
  test("unexpected tool failures are redacted and use tool isError", async () => {
    const result = await handleMcpToolCall(
      { name: "core_mock_tests__assessment_get_weak_topics", arguments: {} },
      principal,
      server({
        execute: async () => {
          throw new ToolActionExecutionError(
            "postgres://password",
            "RUN_FAILED"
          )
        },
      })
    )
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).not.toContain("password")
  })
  test("schemas preserve validation and advertise safe read effects/retry metadata", () => {
    const manifest = manifests.find(
      (item) => item.tool.key === "core.mock-tests"
    )!
    const tools = manifestToMcpTools(manifest)
    const read = tools.find((tool) => tool.name.endsWith("assessment_list"))!
    expect(read.annotations?.readOnlyHint).toBe(true)
    expect(read.inputSchema.required).not.toContain(MCP_IDEMPOTENCY_FIELD)
    const create = tools.find((tool) =>
      tool.name.endsWith("assessment_create")
    )!
    expect(create.inputSchema.required).toContain(MCP_IDEMPOTENCY_FIELD)
    expect(create.inputSchema.additionalProperties).toBe(false)
    expect(
      manifest.actions.find((action) => action.key === "assessment.list")
        ?.output.writesBlockTypeKeys
    ).toEqual([])
  })
})

describe("MCP bounded HTTP adapter", () => {
  test("browser origins are explicit, with no wildcard credential CORS", () => {
    expect(
      isAllowedMcpOrigin(
        request({ Origin: "https://allowed.example" }),
        "https://allowed.example"
      )
    ).toBe(true)
    expect(
      isAllowedMcpOrigin(
        request({ Origin: "https://evil.example" }),
        "https://allowed.example"
      )
    ).toBe(false)
    expect(isAllowedMcpOrigin(request({ Origin: "null" }), "*")).toBe(false)
    expect(
      validateMcpHttpRequest(request({ "mcp-protocol-version": "unknown" }))
        ?.status
    ).toBe(400)
  })
  test("valid UTF-8 JSON is read and oversized/invalid/media payloads are bounded", async () => {
    const req = (body: string, extra: Record<string, string> = {}) =>
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...extra,
        },
        body,
      })
    expect(await readMcpJsonBody(req('{"jsonrpc":"2.0"}'))).toEqual({
      ok: true,
      body: { jsonrpc: "2.0" },
    })
    for (const [body, extra, status] of [
      ["bad", {}, 400],
      ["{}", { "Content-Type": "text/plain" }, 415],
      ["{}", { Accept: "application/json" }, 406],
      ["x".repeat(MCP_MAX_BODY_BYTES + 1), {}, 413],
    ] as const) {
      const result = await readMcpJsonBody(req(body, extra))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.response.status).toBe(status)
    }
  })
})

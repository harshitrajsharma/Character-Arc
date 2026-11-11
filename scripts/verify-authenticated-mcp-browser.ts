/** Header-authenticated read checks using a real web sign-in. No agent key is created or recovered. */
import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import { chromium } from "playwright"
import { getBrowserTestConfig } from "./lib/browser-test-config"
import { reviewSubjectNavigation } from "./e2e-subject-navigation-review"
import { reviewMcpSettings } from "./e2e-mcp-settings-review"

const { baseUrl, workspaceSlug, email, password } = getBrowserTestConfig()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const checks: object[] = []
const pageErrors: string[] = []
const blockedMutations: string[] = []
let releaseDatabase: (() => Promise<void>) | undefined
try {
  const page = await context.newPage()
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrati|didn't match|does not match/i.test(message.text())
    )
      pageErrors.push("Hydration mismatch")
  })
  await page.route("**/*", async (route) => {
    const request = route.request()
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      /"(?:expectedRevision|idempotencyKey)"/.test(request.postData() ?? "")
    ) {
      blockedMutations.push(new URL(request.url()).pathname)
      await route.abort()
    } else await route.continue()
  })
  page.setDefaultTimeout(40_000)
  page.setDefaultNavigationTimeout(120_000)
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL(
    (url) => !url.pathname.includes("/login") || url.searchParams.has("error"),
    { timeout: 120_000 }
  )
  if (new URL(page.url()).pathname === "/login")
    throw new Error("Web authentication could not be verified.")
  await page
    .getByRole("heading", { name: "Workspace", exact: true })
    .waitFor({ timeout: 90_000 })
  if (process.env.E2E_SUBJECT_REVIEW_PATH) {
    await reviewSubjectNavigation(
      page,
      baseUrl,
      workspaceSlug,
      process.env.E2E_SUBJECT_REVIEW_PATH
    )
  }
  await reviewMcpSettings(page, baseUrl, workspaceSlug)

  // Read this newly verified browser session in memory. Never serialize cookies or JWTs.
  const chunks = (await context.cookies(baseUrl))
    .filter((cookie) => /-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort(
      (left, right) =>
        Number(left.name.split(".").at(-1) ?? 0) -
        Number(right.name.split(".").at(-1) ?? 0)
    )
  const encoded = chunks.map((cookie) => cookie.value).join("")
  let session: { access_token?: string }
  try {
    session = JSON.parse(
      encoded.startsWith("base64-")
        ? Buffer.from(encoded.slice(7), "base64url").toString("utf8")
        : decodeURIComponent(encoded)
    ) as { access_token?: string }
  } catch {
    throw new Error(
      "Verified browser session could not be decoded for the header-authentication probe."
    )
  }
  const accessToken = session.access_token
  if (!accessToken || accessToken.split(".").length !== 3)
    throw new Error(
      "Verified browser session did not contain an access credential."
    )
  const { prisma } = await import("../lib/prisma")
  releaseDatabase = () => prisma.$disconnect()
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace)
    throw new Error("The configured test workspace is unavailable.")
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${accessToken}`,
    "x-workspace-id": workspace.id,
    "MCP-Protocol-Version": "2025-11-25",
  }
  let id = 0
  const post = async (body: object, extra: Record<string, string> = {}) => {
    try {
      return await context.request.post(`${baseUrl}/api/mcp`, {
        headers: { ...headers, ...extra },
        data: body,
        timeout: 90_000,
      })
    } catch {
      // Playwright's request diagnostics can contain credential headers. Keep failures opaque.
      throw new Error(
        "MCP request did not complete within its verification budget."
      )
    }
  }
  const rpc = async (method: string, params: object = {}) => {
    const response = await post({ jsonrpc: "2.0", id: ++id, method, params })
    assert.equal(response.status(), 200, `MCP ${method} HTTP status`)
    const body = await response.json()
    assert.equal(
      body.error,
      undefined,
      `MCP ${method} returned a protocol error`
    )
    return { response, result: body.result }
  }
  const initialized = await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: {
      name: "character-arc-readonly-browser-verifier",
      version: "1.0.0",
    },
  })
  assert.equal(initialized.result.protocolVersion, "2025-11-25")
  assert.equal(initialized.response.headers()["mcp-session-id"], undefined)
  checks.push({
    check: "verified JWT header authentication and stateless initialize",
    passed: true,
  })

  let cookieOnly
  try {
    cookieOnly = await context.request.post(`${baseUrl}/api/mcp`, {
      headers: { "Content-Type": "application/json", Accept: headers.Accept },
      data: { jsonrpc: "2.0", id: ++id, method: "tools/list" },
      timeout: 90_000,
    })
  } catch {
    throw new Error(
      "Cookie-only denial probe did not complete within its verification budget."
    )
  }
  assert.equal(cookieOnly.status(), 401)
  const foreign = await post(
    { jsonrpc: "2.0", id: ++id, method: "tools/list" },
    { "x-workspace-id": "11111111-1111-4111-8111-111111111111" }
  )
  assert.equal(foreign.status(), 403)
  checks.push({
    check:
      "logged-in cookie alone denied; explicit unauthorized workspace denied",
    passed: true,
  })

  const names = new Set<string>()
  let cursor: string | undefined
  let discoveryPages = 0
  do {
    const { result } = await rpc("tools/list", cursor ? { cursor } : {})
    assert.ok(Array.isArray(result.tools) && result.tools.length <= 40)
    for (const tool of result.tools) {
      assert.ok(!names.has(tool.name))
      names.add(tool.name)
    }
    cursor = result.nextCursor
    discoveryPages += 1
    assert.ok(discoveryPages < 20, "Tool discovery must terminate")
  } while (cursor)
  checks.push({
    check: "bounded paginated tool discovery",
    passed: true,
    discoveryPages,
    tools: names.size,
  })

  for (const name of [
    "core_exam_prep__exam_list",
    "core_mock_tests__assessment_list",
    "core_mock_tests__attempt_list",
  ]) {
    assert.ok(
      names.has(name),
      `${name} must be advertised after registry synchronization`
    )
    const { result } = await rpc("tools/call", {
      name,
      arguments: { limit: 2 },
    })
    assert.equal(result.isError, false, `${name} must succeed`)
    const output = result.structuredContent
    assert.equal(output.status, "succeeded")
    const data = output.data
    assert.ok(Array.isArray(data.items) && data.items.length <= 2)
    const serialized = JSON.stringify(data)
    assert.ok(
      !/"(?:correctAnswers?|solution|answerKey|responses)"\s*:/.test(
        serialized
      ),
      `${name} exposed answer material`
    )
    if (name.endsWith("attempt_list")) {
      for (const attempt of data.items)
        if (attempt.status !== "EVALUATED") {
          assert.equal(attempt.score, null)
          assert.equal(attempt.maxScore, null)
        }
    }
    let secondPageRows: number | undefined
    if (data.nextCursor) {
      const next = await rpc("tools/call", {
        name,
        arguments: { limit: 2, cursor: data.nextCursor },
      })
      assert.equal(next.result.isError, false)
      const nextItems = next.result.structuredContent.data.items
      assert.ok(Array.isArray(nextItems) && nextItems.length <= 2)
      const firstIds = new Set(
        data.items.map((item: { id: string }) => item.id)
      )
      for (const item of nextItems) assert.ok(!firstIds.has(item.id))
      secondPageRows = nextItems.length
    }
    checks.push({
      check: name,
      passed: true,
      rows: data.items.length,
      secondPageRows,
    })
    console.log(`PASS ${name}: bounded read succeeded`)
  }
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(blockedMutations, [])
  await writeFile(
    "scratch/release-authenticated-mcp-browser.json",
    JSON.stringify(
      {
        passed: true,
        authentication: "in-memory JWT from verified UI sign-in",
        checks,
        credentialsCreated: 0,
        domainMutations: 0,
        auditReads: true,
        pageErrors,
        blockedMutations,
      },
      null,
      2
    )
  )
  console.log(
    "PASS authenticated MCP initialize, boundary checks, discovery and three bounded inventory reads. No credentials or domain records created; normal read audit runs only."
  )
} catch (error) {
  await context
    .pages()[0]
    ?.screenshot({ path: "scratch/release-late-browser-error.png" })
    .catch(() => undefined)
  throw error
} finally {
  await context.close()
  await browser.close()
  await releaseDatabase?.()
}

import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import type { Page } from "playwright"

/** Connection guidance and masked saved-key metadata only; never creates/revokes a key. */
export async function reviewMcpSettings(
  page: Page,
  base: string,
  workspace: string
) {
  console.log("[Release review] MCP connection settings and secret masking")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${base}/workspace/${workspace}`, {
    waitUntil: "networkidle",
  })
  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  // The development badge can cover a collapsed footer icon. Expand the real rail.
  if ((await sidebar.getAttribute("data-state")) === "collapsed") {
    await sidebar.locator('[data-slot="sidebar-trigger"]').click()
  }
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .first()
    .click()
  await page.getByRole("button", { name: /^AI & Agents(?:\s+\d+)?$/ }).click()
  const settings = page.getByRole("dialog", { name: "Settings", exact: true })
  await settings
    .getByRole("heading", { name: "AI agents", exact: true })
    .waitFor()
  await settings
    .locator('[data-slot="skeleton"]')
    .waitFor({ state: "hidden", timeout: 90_000 })
  assert.equal(
    await settings
      .getByText("Could not load agent keys", { exact: true })
      .count(),
    0,
    "Agent-key metadata must finish loading for this review"
  )
  await page.screenshot({ path: "scratch/release-mcp-settings-observed.png" })
  const endpoint = await settings
    .getByRole("textbox", { name: "Server URL", exact: true })
    .inputValue()
  const endpointUrl = new URL(endpoint)
  assert.equal(endpointUrl.pathname, "/api/mcp")
  assert.equal(endpointUrl.search, "")
  assert.equal(endpointUrl.username + endpointUrl.password, "")
  await settings
    .getByText("Example client configuration", { exact: true })
    .click()
  const configuration = JSON.parse(await settings.locator("pre").innerText())
  assert.equal(configuration.mcpServers["character-arc"].url, endpoint)
  assert.equal(
    configuration.mcpServers["character-arc"].headers.Authorization,
    "Bearer <YOUR_AGENT_KEY>"
  )
  const text = await settings.innerText()
  assert.ok(
    !/[?&](api_key|key|token)=/.test(text),
    "MCP secrets must not appear in URLs"
  )
  assert.ok(
    !/mcp_sec_[A-Za-z0-9_-]{25,}/.test(text),
    "Saved token secret exposed"
  )
  const layouts: object[] = []
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await page.waitForFunction(
      `(() => {
      const dialog=document.querySelector('[data-slot="dialog-content"]');
      const r=dialog?.getBoundingClientRect();
      return !!r && r.x>=-1 && r.y>=-1 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;
    })()`,
      undefined,
      { timeout: 5000 }
    )
    const box = await settings.boundingBox()
    assert.ok(
      box &&
        box.x >= -1 &&
        box.y >= -1 &&
        box.x + box.width <= width + 1 &&
        box.y + box.height <= height + 1,
      `Settings dialog containment ${width}`
    )
    const scrollWidth = (await page.evaluate(
      "document.documentElement.scrollWidth"
    )) as number
    assert.ok(scrollWidth <= width + 1, `Settings document overflow ${width}`)
    layouts.push({ width, height, scrollWidth, dialog: box })
    await page.screenshot({
      path: `scratch/release-mcp-settings-${width}.png`,
      animations: "disabled",
    })
  }
  await page.keyboard.press("Escape")
  await settings.waitFor({ state: "hidden" })
  await writeFile(
    "scratch/release-mcp-settings-browser.json",
    JSON.stringify(
      {
        passed: true,
        layouts,
        urlSecrets: false,
        savedTokenSecrets: false,
        credentialsCreated: 0,
        credentialsRevoked: 0,
      },
      null,
      2
    )
  )
  console.log(
    "PASS: MCP connection settings, masked metadata and responsive dialog; no keys changed."
  )
  return layouts
}

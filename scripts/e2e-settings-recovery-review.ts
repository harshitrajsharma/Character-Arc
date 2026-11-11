import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import type { Page, Route } from "playwright"

/** Inject one unavailable settings READ, then retry the real authorized read. Never changes keys. */
export async function reviewSettingsRecovery(
  page: Page,
  base: string,
  workspace: string
) {
  console.log("[Release review] Controlled settings read failure and recovery")
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${base}/workspace/${workspace}`, {
    waitUntil: "networkidle",
  })
  const before = new URL(page.url()).pathname
  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  if ((await sidebar.getAttribute("data-state")) === "collapsed")
    await sidebar.locator('[data-slot="sidebar-trigger"]').click()
  let injected = 0
  const handler = async (route: Route) => {
    const request = route.request()
    let args: unknown
    try {
      args = JSON.parse(request.postData() ?? "null")
    } catch {
      args = null
    }
    if (
      !injected &&
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      new URL(request.url()).pathname === before &&
      Array.isArray(args) &&
      args.length === 1 &&
      args[0] === workspace
    ) {
      injected += 1
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Controlled browser verification: settings are temporarily unavailable.",
      })
    } else await route.fallback()
  }
  await page.route("**/*", handler)
  try {
    await page
      .getByRole("button", { name: "Workspace settings", exact: true })
      .first()
      .click()
    const settings = page.getByRole("dialog", { name: "Settings", exact: true })
    await settings
      .getByText("Could not load settings", { exact: true })
      .waitFor()
    assert.equal(injected, 1, "Exactly one settings read must be intercepted")
    assert.equal(
      new URL(page.url()).pathname,
      before,
      "A temporary read failure must not log the user out"
    )
    await settings
      .getByRole("button", { name: /^AI & Agents(?:\s+\d+)?$/ })
      .click()
    await settings
      .getByText("Could not load agent keys", { exact: true })
      .waitFor()
    assert.equal(
      await settings
        .getByRole("button", { name: "Create key", exact: true })
        .isDisabled(),
      true
    )
    assert.equal(
      await settings.getByText("No agent keys", { exact: true }).count(),
      0,
      "Unavailable data must not masquerade as an empty key list"
    )
    await page.screenshot({
      path: "scratch/release-settings-read-unavailable.png",
      animations: "disabled",
    })
    await settings.getByRole("button", { name: "Retry", exact: true }).click()
    await settings
      .locator('[data-slot="skeleton"]')
      .waitFor({ state: "hidden", timeout: 90_000 })
    await page.waitForFunction(
      `(() => {
      const button=Array.from(document.querySelectorAll('[role="dialog"] button')).find(el=>el.textContent?.trim()==='Create key');
      return !!button && !button.hasAttribute('disabled');
    })()`,
      undefined,
      { timeout: 90_000 }
    )
    assert.equal(
      await settings
        .getByText("Could not load agent keys", { exact: true })
        .count(),
      0
    )
    assert.equal(new URL(page.url()).pathname, before)
    await page.screenshot({
      path: "scratch/release-settings-read-recovered.png",
      animations: "disabled",
    })
    await page.keyboard.press("Escape")
    await settings.waitFor({ state: "hidden" })
    await writeFile(
      "scratch/release-settings-recovery-browser.json",
      JSON.stringify(
        {
          passed: true,
          injectedReadStatus: 503,
          injectedReads: injected,
          visibleRetry: true,
          unavailableNotEmpty: true,
          actualReadRetrySucceeded: true,
          loginRedirect: false,
          keysChanged: 0,
          domainMutations: 0,
        },
        null,
        2
      )
    )
    console.log(
      "PASS: Settings 503 shows Retry; actual authorized reload succeeds without logging out or changing keys."
    )
  } finally {
    await page.unroute("**/*", handler)
  }
}

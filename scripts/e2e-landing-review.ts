/** Anonymous landing-page QA. No sign-in, account creation or domain mutations. */
import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import { chromium } from "playwright"

const origin = new URL(process.env.LANDING_BASE_URL ?? "http://127.0.0.1:3000")
if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw new Error("LANDING_BASE_URL must be an HTTP(S) origin.")

const browser = await chromium.launch({ headless: true })
const errors: string[] = []
const mutations: string[] = []
const layouts: object[] = []
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
  })
  await context.route("**/*", async (route) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(route.request().method())) {
      mutations.push(new URL(route.request().url()).pathname)
      await route.abort()
    } else await route.continue()
  })
  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (/hydration|didn't match|did not match/i.test(message.text()))
      errors.push(message.text())
  })
  await page.goto(origin.origin, { waitUntil: "networkidle", timeout: 120_000 })
  assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1)
  await page.getByRole("heading", { name: /Prepare with purpose/ }).waitFor()
  const tabs = page.getByRole("tablist", {
    name: "Explore the example workspace",
  })
  await tabs.getByRole("tab", { name: "Subject", exact: true }).click()
  await page
    .getByRole("button", { name: "Open subject tests", exact: true })
    .click()
  await page
    .getByRole("heading", { name: "A test that belongs here.", exact: true })
    .waitFor()
  assert.equal(
    await tabs
      .getByRole("tab", { name: "Tests", exact: true })
      .getAttribute("aria-selected"),
    "true"
  )
  await page
    .getByRole("button", { name: "Explore an answer review", exact: true })
    .click()
  await page.getByText("Correct answer: 2", { exact: true }).waitFor()
  await tabs.getByRole("tab", { name: "Subject", exact: true }).click()
  await tabs
    .getByRole("tab", { name: "Subject", exact: true })
    .press("ArrowRight")
  assert.equal(
    await tabs
      .getByRole("tab", { name: "Tests", exact: true })
      .evaluate((element) => element === document.activeElement),
    true
  )
  await tabs.getByRole("tab", { name: "Tests", exact: true }).press("Enter")
  await page
    .getByRole("heading", { name: "A test that belongs here.", exact: true })
    .waitFor()
  assert.equal(
    await tabs
      .getByRole("tab", { name: "Tests", exact: true })
      .getAttribute("aria-selected"),
    "true"
  )
  await tabs.getByRole("tab", { name: "Subject", exact: true }).click()

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      theme === "dark"
    )
    for (const [width, height] of [
      [1440, 1000],
      [1024, 900],
      [768, 1024],
      [390, 844],
      [320, 640],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height })
      await page.evaluate("window.scrollTo(0, 0)")
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        outside: Array.from(
          document.querySelectorAll("a:not(.sr-only),button,summary,[role=tab]")
        )
          .filter((element) => {
            const box = element.getBoundingClientRect()
            return (
              box.width > 0 && (box.left < -1 || box.right > innerWidth + 1)
            )
          })
          .map((element) => element.textContent?.trim()),
        smallTargets: Array.from(
          document.querySelectorAll("a:not(.sr-only),button,summary,[role=tab]")
        )
          .filter((element) => {
            const box = element.getBoundingClientRect()
            return box.width > 0 && box.height > 0 && box.height < 43
          })
          .map((element) => ({
            label: element.textContent?.trim(),
            height: element.getBoundingClientRect().height,
          })),
        header: (() => {
          const header = document.querySelector("header")!
          const style = getComputedStyle(header)
          return {
            background: style.backgroundColor,
            blur: style.backdropFilter,
          }
        })(),
      }))
      assert.ok(
        geometry.scrollWidth <= width + 1,
        `Overflow: ${theme}/${width}`
      )
      assert.deepEqual(
        geometry.outside,
        [],
        `Offscreen commands: ${theme}/${width}`
      )
      assert.deepEqual(
        geometry.smallTargets,
        [],
        `Small commands: ${theme}/${width}`
      )
      assert.equal(geometry.header.background, "rgba(0, 0, 0, 0)")
      assert.equal(geometry.header.blur, "blur(24px)")
      layouts.push({ theme, height, ...geometry })
      await page.screenshot({
        path: `scratch/landing-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate("window.scrollTo(0,0)")
  await page.screenshot({
    path: "scratch/landing-hero-390.png",
    animations: "disabled",
  })
  for (const question of [
    "Do I need an AI agent?",
    "Which AI connections are supported?",
    "What controls an agent’s access?",
    "Can I use Character Arc on my phone?",
  ]) {
    const summary = page.locator("summary").filter({ hasText: question })
    await summary.click()
    assert.equal(
      await summary.evaluate((element) =>
        element.parentElement?.hasAttribute("open")
      ),
      true
    )
  }
  await page
    .getByText(/OAuth-only connectors and the older SSE transport/)
    .waitFor()
  await page.getByText(/1024 × 600 pixels/).waitFor()
  await page.screenshot({
    path: "scratch/landing-mobile-faq.png",
    fullPage: true,
    animations: "disabled",
  })
  await page.goto(origin.origin, { waitUntil: "networkidle" })
  await page.keyboard.press("Tab")
  assert.equal(
    await page
      .getByRole("link", { name: "Skip to content", exact: true })
      .evaluate((element) => element === document.activeElement),
    true
  )
  await page.keyboard.press("Enter")
  assert.equal(new URL(page.url()).hash, "#main-content")
  const signUpLinks = page.getByRole("link", {
    name: /Create your workspace|Get started/,
  })
  for (const link of await signUpLinks.all())
    assert.equal(await link.getAttribute("href"), "/signup")
  await page
    .getByRole("navigation", { name: "Account", exact: true })
    .getByRole("link", { name: "Sign in", exact: true })
    .click()
  await page.waitForURL((url) => url.pathname === "/login")
  await page.locator('input[name="email"]').waitFor()
  await context.close()

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  const staticPage = await noJs.newPage()
  await staticPage.goto(origin.origin, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })
  await staticPage.getByRole("heading", { name: /Two tools/ }).waitFor()
  await staticPage.getByRole("heading", { name: /Your AI can help/ }).waitFor()
  assert.equal(await staticPage.locator('main [style*="opacity:0"]').count(), 0)
  await staticPage.screenshot({
    path: "scratch/landing-no-js-390.png",
    fullPage: true,
  })
  await noJs.close()
  assert.deepEqual(errors, [])
  assert.deepEqual(mutations, [])
  await writeFile(
    "scratch/landing-browser.json",
    JSON.stringify(
      {
        passed: true,
        origin: origin.origin,
        layouts,
        interactivePreview: true,
        keyboardTabs: true,
        nativeFaq: true,
        skipLink: true,
        signInNavigation: true,
        serverVisibleWithoutJavaScript: true,
        pageErrors: errors,
        blockedMutations: mutations,
      },
      null,
      2
    )
  )
  console.log(
    `PASS landing review: ${layouts.length} light/dark layouts, preview/keyboard/FAQ/auth navigation, server-visible content; no mutations.`
  )
} finally {
  await browser.close()
}

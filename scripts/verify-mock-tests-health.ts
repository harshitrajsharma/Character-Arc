import { chromium } from "playwright"
import path from "node:path"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function run() {
  console.log("=== HEADLESS BROWSER VERIFICATION: MOCK TESTS & TOOLS ===")
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const consoleErrors: string[] = []
  const httpErrors: string[] = []

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text())
      console.log(`[Browser Error] ${msg.text()}`)
    }
  })

  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("webpack-hmr") && !res.url().includes(".map")) {
      httpErrors.push(`${res.status()} ${res.url()}`)
      console.log(`[HTTP ${res.status()}] ${res.url()}`)
    }
  })

  try {
    // 1. Authenticate
    console.log("\n1. Navigating to /login...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })
    console.log(`Authenticated! Redirected to: ${page.url()}`)

    // 2. Visit Mock Tests Dashboard
    const mockTestsUrl = `${BASE_URL}/workspace/${WORKSPACE_SLUG}/mock-tests`
    console.log(`\n2. Navigating to Mock Tests Dashboard: ${mockTestsUrl}`)
    const response = await page.goto(mockTestsUrl, { waitUntil: "domcontentloaded" })
    console.log(`Response status: ${response?.status()}`)
    await page.waitForTimeout(2000)

    const pageHeading = await page.locator("h1, h2").allInnerTexts()
    console.log("Page Headings found:", pageHeading)

    const is404 = await page.locator('text="404", text="This page could not be found"').isVisible()
    console.log(`Is 404 visible on /mock-tests? ${is404}`)

    const screenshotPath = path.join(SCREENSHOT_DIR, "headless-verify-mock-tests-dashboard.png")
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`[Screenshot Saved] ${screenshotPath}`)

    // 3. Test /tools/mock-tests and /tools/core.mock-tests
    console.log(`\n3. Checking /tools/mock-tests...`)
    const resTool1 = await page.goto(`${BASE_URL}/tools/mock-tests`, { waitUntil: "domcontentloaded" })
    console.log(`/tools/mock-tests status: ${resTool1?.status()}`)
    await page.waitForTimeout(1000)

    console.log(`\n4. Checking /tools/core.mock-tests...`)
    const resTool2 = await page.goto(`${BASE_URL}/tools/core.mock-tests`, { waitUntil: "domcontentloaded" })
    console.log(`/tools/core.mock-tests status: ${resTool2?.status()}`)
    await page.waitForTimeout(1000)

    // 5. Navigate to New Assessment Form
    console.log(`\n5. Navigating to /mock-tests/new...`)
    const resNew = await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/mock-tests/new`, { waitUntil: "domcontentloaded" })
    console.log(`/mock-tests/new status: ${resNew?.status()}`)
    await page.waitForTimeout(1500)

    const screenshotNew = path.join(SCREENSHOT_DIR, "headless-verify-mock-tests-new.png")
    await page.screenshot({ path: screenshotNew, fullPage: true })
    console.log(`[Screenshot Saved] ${screenshotNew}`)

    console.log("\n=== VERIFICATION RESULTS ===")
    console.log(`Dashboard Status: ${response?.status()}`)
    console.log(`404 detected: ${is404}`)
    console.log(`HTTP Errors encountered: ${httpErrors.length}`)
    console.log(`Console Errors encountered: ${consoleErrors.length}`)

  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})

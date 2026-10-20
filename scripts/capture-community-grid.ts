import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function run() {
  console.log("=== CAPTURING COMMUNITY TAB GRID VIEW IN BROWSER ===")

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  try {
    // 1. Authenticate
    console.log("1. Signing in via /login...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1000)
    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })
    console.log(`Signed in! Current URL: ${page.url()}`)
    await page.waitForTimeout(1000)

    // 2. Visit Assessments Dashboard with tab=community in URL or click Community Hub
    const dashboardUrl = `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments?tab=community`
    console.log(`2. Navigating to Community Hub: ${dashboardUrl}`)
    await page.goto(dashboardUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // Ensure Grid View is selected
    const gridBtn = page.locator('button[aria-label="Grid View"]')
    if (await gridBtn.count() > 0) {
      await gridBtn.click()
      await page.waitForTimeout(1000)
    }

    // Capture screenshot of Community Grid
    const shotPath = path.join(SCREENSHOT_DIR, "community-grid-view.png")
    await page.screenshot({ path: shotPath, fullPage: true })
    console.log(`Captured Community Grid View: ${shotPath}`)

    console.log("=== CAPTURE COMPLETE! ===")
  } catch (err) {
    console.error("Capture failed:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()

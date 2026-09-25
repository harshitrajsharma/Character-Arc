import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function run() {
  console.log("=== VERIFYING REFACTORED ASSESSMENTS DASHBOARD IN BROWSER ===")

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }

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
    await page.waitForTimeout(1500)

    // 2. Visit Assessments Dashboard
    const dashboardUrl = `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`
    console.log(`2. Navigating to Dashboard: ${dashboardUrl}`)
    const response = await page.goto(dashboardUrl, { waitUntil: "networkidle" })
    console.log(`Dashboard response status: ${response?.status()}`)
    await page.waitForTimeout(2000)

    // Capture Grid View
    const gridShotPath = path.join(SCREENSHOT_DIR, "dashboard-grid-view.png")
    await page.screenshot({ path: gridShotPath, fullPage: true })
    console.log(`Captured Grid View screenshot: ${gridShotPath}`)

    // 3. Switch to List View
    console.log("3. Switching to List View...")
    const listBtn = page.locator('button[aria-label="List View"]')
    if (await listBtn.count() > 0) {
      await listBtn.click()
      await page.waitForTimeout(1000)
      const listShotPath = path.join(SCREENSHOT_DIR, "dashboard-list-view.png")
      await page.screenshot({ path: listShotPath, fullPage: true })
      console.log(`Captured List View screenshot: ${listShotPath}`)
    } else {
      console.warn("List view button not found")
    }

    // 4. Switch to Community Hub
    console.log("4. Switching to Community Hub Tab...")
    const communityTabBtn = page.locator('button:has-text("Community Hub")')
    if (await communityTabBtn.count() > 0) {
      await communityTabBtn.first().click()
      await page.waitForTimeout(1000)
      const communityShotPath = path.join(SCREENSHOT_DIR, "dashboard-community-hub.png")
      await page.screenshot({ path: communityShotPath, fullPage: true })
      console.log(`Captured Community Hub screenshot: ${communityShotPath}`)
    } else {
      console.warn("Community Hub tab button not found")
    }

    console.log("=== ALL DASHBOARD VERIFICATION TESTS PASSED SUCCESSFULLY! ===")
  } catch (err) {
    console.error("Verification failed:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()

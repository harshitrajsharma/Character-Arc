import { chromium, type Page, type BrowserContext } from "playwright"
import path from "node:path"
import fs from "node:fs"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots/consistency")

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function capture(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`[Screenshot Captured] ${name}.png`)
}

async function main() {
  console.log("=== STARTING FULL MOCK TESTS UI/UX CONSISTENCY VERIFICATION ===")
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(40000)

  try {
    // 1. SIGN IN
    console.log("\n[1] Signing in...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1000)
    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60000 })
    console.log("[1] Successfully logged in!")

    // 2. DASHBOARD - WORKSPACE TESTS
    console.log("\n[2] Visiting Assessments Dashboard (Workspace Tests)...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "01-dashboard-workspace-tests")

    // 3. DASHBOARD - COMMUNITY HUB TAB
    console.log("\n[3] Switching to Community Hub tab...")
    const communityTab = page.locator('button:has-text("Community Hub")').first()
    if (await communityTab.isVisible()) {
      await communityTab.click()
      await page.waitForTimeout(1500)
      await capture(page, "02-dashboard-community-hub")
    }

    // 4. QUESTION BANK VIEW
    console.log("\n[4] Navigating to Question Bank...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/questions`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "03-question-bank-view")

    // Test a pill filter on Question Bank
    console.log("[4] Testing Question Bank kind filter pills...")
    const singleChoicePill = page.locator('button:has-text("Single Choice")').first()
    if (await singleChoicePill.isVisible()) {
      await singleChoicePill.click()
      await page.waitForTimeout(1000)
      await capture(page, "04-question-bank-filtered")
    }

    // 5. NEW QUESTION VIEW & EDITOR
    console.log("\n[5] Navigating to Question Creator (New Question)...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/questions/new`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "05-new-question-form")

    // 6. BLUEPRINT STUDIO (NEW ASSESSMENT)
    console.log("\n[6] Navigating to Blueprint Studio (New Assessment)...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/new`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "06-blueprint-studio-new-assessment")

    // 7. AUTHORING SUITE
    console.log("\n[7] Navigating to Authoring Suite...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/authoring`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "07-authoring-suite")

    // 8. ASSESSMENT DETAIL VIEW (TEST PROFILE)
    console.log("\n[8] Navigating to Dashboard to locate an assessment...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, { waitUntil: "networkidle" })
    const detailLink = page.locator('a:has-text("Details")').first()
    await detailLink.waitFor({ state: "visible", timeout: 20000 })
    console.log("[8] Clicking Details on first assessment card...")
    await detailLink.click()
    await page.waitForURL((url) => url.pathname.includes("/assessments/") && !url.pathname.endsWith("/assessments"), { timeout: 30000 })
    await page.waitForSelector('h1, h2', { state: "visible", timeout: 20000 })
    await page.waitForTimeout(1500)
    await capture(page, "08-assessment-test-profile")

    // Check if builder button exists
    const builderBtn = page.locator('a:has-text("Edit Paper in Builder"), a:has-text("Builder")').first()
    if (await builderBtn.isVisible()) {
      console.log("\n[9] Navigating to Paper Builder...")
      await builderBtn.click()
      await page.waitForURL((url) => url.pathname.endsWith("/edit"), { timeout: 30000 })
      await page.waitForTimeout(2000)
      await capture(page, "09-assessment-builder")
    }

    // 10. RECENT ATTEMPT ANALYSIS (IF AVAILABLE)
    console.log("\n[10] Checking for completed attempts to verify Scorecard...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, { waitUntil: "networkidle" })
    const viewAnalysisLink = page.locator('a:has-text("View Analysis")').first()
    if (await viewAnalysisLink.isVisible()) {
      console.log("[10] Clicking View Analysis on attempt...")
      await viewAnalysisLink.click()
      await page.waitForURL((url) => url.pathname.includes("/analysis"), { timeout: 30000 })
      await page.waitForSelector('h1, h2, [data-scorecard]', { state: "visible", timeout: 20000 })
      await page.waitForTimeout(1500)
      await capture(page, "10-attempt-analysis-scorecard")
    }

    console.log("\n=== ALL MOCK TEST UI/UX VERIFICATION COMPLETED SUCCESSFULLY ===")
  } catch (err) {
    console.error("Verification failed:", err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main()

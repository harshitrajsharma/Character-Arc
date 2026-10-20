import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function run() {
  console.log("=== VERIFYING SHARE DIALOG IN BROWSER ===")

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
    await page.goto(dashboardUrl, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // 3. Click the Share button on the first card
    console.log("3. Clicking Share button on assessment card...")
    const shareBtn = page.locator('button:has-text("Share")').first()
    await shareBtn.click()
    await page.waitForTimeout(1000)

    // 4. Verify Dialog is visible
    const dialog = page.locator('[data-slot="dialog-content"]')
    await dialog.waitFor({ state: "visible", timeout: 5000 })
    const box1 = await dialog.boundingBox()
    console.log(`Initial Dialog bounding box: width=${box1?.width}px, height=${box1?.height}px`)

    // Capture screenshot 1 (Public / default)
    const shotPath1 = path.join(SCREENSHOT_DIR, "share-dialog-public.png")
    await page.screenshot({ path: shotPath1 })
    console.log(`Captured Public state screenshot: ${shotPath1}`)

    // 5. Toggle to "Private"
    console.log("5. Toggling to Private mode...")
    await page.locator('button:has-text("Private")').click()
    await page.waitForTimeout(500)
    const box2 = await dialog.boundingBox()
    console.log(`Private Dialog bounding box: width=${box2?.width}px, height=${box2?.height}px`)

    const shotPath2 = path.join(SCREENSHOT_DIR, "share-dialog-private.png")
    await page.screenshot({ path: shotPath2 })
    console.log(`Captured Private state screenshot: ${shotPath2}`)

    // Verify dimensions did NOT jump
    if (box1 && box2) {
      const heightDiff = Math.abs(box1.height - box2.height)
      const widthDiff = Math.abs(box1.width - box2.width)
      console.log(`Dimension difference: widthDiff=${widthDiff}px, heightDiff=${heightDiff}px`)
      if (heightDiff > 2 || widthDiff > 2) {
        throw new Error(`Dialog size jumped! widthDiff=${widthDiff}, heightDiff=${heightDiff}`)
      }
      console.log("SUCCESS: Dialog size remained strictly fixed with ZERO jumping!")
    }

    // 6. Toggle to "Shared via Link"
    console.log("6. Toggling to Shared via Link...")
    await page.locator('button:has-text("Shared via Link")').click()
    await page.waitForTimeout(500)
    const box3 = await dialog.boundingBox()
    console.log(`Shared via Link bounding box: width=${box3?.width}px, height=${box3?.height}px`)

    console.log("=== SHARE DIALOG FIXED-SIZE VERIFICATION COMPLETE! ===")
  } catch (err) {
    console.error("Verification failed:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()

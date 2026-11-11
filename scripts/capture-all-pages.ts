import { getBrowserTestConfig } from "./lib/browser-test-config"

import { chromium } from "playwright"
import path from "node:path"

const {
  baseUrl: BASE_URL,
  email: USER_EMAIL,
  password: USER_PASSWORD,
  workspaceSlug: WORKSPACE_SLUG,
} = getBrowserTestConfig()

const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function capture(page: any, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  console.log(`[Captured] ${name}.png -> ${filePath}`)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  try {
    // 1. Login
    console.log("Navigating to /login...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1000)
    await capture(page, "page-01-login")

    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')
    await page.waitForURL((url: any) => !url.pathname.includes("/login"), {
      timeout: 35000,
    })
    await page.waitForTimeout(2000)

    // 2. Dashboard
    console.log("Navigating to /dashboard...")
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "page-02-dashboard")

    // 3. Goals & Paths
    console.log("Navigating to /goals-paths...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/goals-paths`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(2000)
    await capture(page, "page-03-goals-paths")

    // 4. Exam Prep
    console.log("Navigating to /exam-prep...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/exam-prep`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(2000)
    await capture(page, "page-04-exam-prep")

    // 5. Tools Catalog
    console.log("Navigating to /tools...")
    await page.goto(`${BASE_URL}/tools`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)
    await capture(page, "page-05-tools-catalog")

    console.log("=== ALL PAGES CAPTURED SUCCESSFULLY ===")
  } finally {
    await browser.close()
  }
}

main().catch(console.error)

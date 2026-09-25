import { chromium } from "playwright"
import path from "node:path"
import { prisma } from "../lib/prisma"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/screenshots")

async function run() {
  console.log("=== VERIFYING UNIFIED TEST PROFILE HERO CARD IN BROWSER ===")

  // Find a published assessment in the workspace
  const assessment = await prisma.assessment.findFirst({
    where: {
      block: {
        workspace: { slug: WORKSPACE_SLUG },
      },
    },
    orderBy: { block: { createdAt: "desc" } },
    include: { block: true },
  })

  if (!assessment) {
    console.error("No assessment found in workspace!")
    process.exit(1)
  }

  const assessmentId = assessment.blockId
  const title = assessment.block.title
  console.log(`Found Assessment: ${assessmentId} ("${title}") - Status: ${assessment.status}`)

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(40000)

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Error] ${msg.text()}`)
    }
  })
  page.on("pageerror", (err) => console.error(`[Browser PageError]`, err))

  try {
    // 1. Authenticate
    console.log("1. Signing in via /login...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1000)
    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 40000 })
    console.log(`Signed in! Current URL: ${page.url()}`)
    await page.waitForTimeout(1500)

    // 2. Visit Workspace Test Detail View
    const detailUrl = `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}`
    console.log(`2. Navigating to Workspace Detail View: ${detailUrl}`)
    const detailRes = await page.goto(detailUrl, { waitUntil: "domcontentloaded" })
    console.log(`Workspace Detail status: ${detailRes?.status()}`)
    await page.waitForTimeout(2000)

    const workspaceShotPath = path.join(SCREENSHOT_DIR, "unified-workspace-test-profile.png")
    await page.screenshot({ path: workspaceShotPath, fullPage: true })
    console.log(`[Screenshot Saved] ${workspaceShotPath}`)

    // 3. Visit Public Share Landing Page (in authenticated app context)
    console.log("3. Testing Share Landing Page in app context...")
    const publicUrl = `${BASE_URL}/assessments/share/${assessmentId}`
    console.log(`Navigating to Share URL: ${publicUrl}`)
    const publicRes = await page.goto(publicUrl, { waitUntil: "domcontentloaded" })
    console.log(`Share page status: ${publicRes?.status()}`)
    await page.waitForTimeout(2000)

    const publicShotPath = path.join(SCREENSHOT_DIR, "unified-public-share-page.png")
    await page.screenshot({ path: publicShotPath, fullPage: true })
    console.log(`[Screenshot Saved] ${publicShotPath}`)

    console.log("\n=== ALL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===")
  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}

run().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})

import { chromium, type Page, type BrowserContext } from "playwright"
import path from "node:path"

const BASE_URL = "http://127.0.0.1:3000"
const USER_EMAIL = "sharmaharshitraj02@gmail.com"
const USER_PASSWORD = "TestPassword123!"
const WORKSPACE_SLUG = "personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d"
const SCREENSHOT_DIR = path.resolve(process.cwd(), process.env.E2E_SCREENSHOT_DIR ?? "scratch/screenshots")

async function capture(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: true })
  console.log(`[Screenshot Captured] ${name}.png`)
}

async function main() {
  console.log("=== STARTING FULL E2E BROWSER TEST ===")
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(40000)
  page.setDefaultNavigationTimeout(90000)

  page.on("console", (msg) => console.log(`[Browser ${msg.type()}] ${msg.text()}`))
  page.on("pageerror", (err) => console.error(`[Browser PageError]`, err))
  page.on("response", async (res) => {
    if (res.status() >= 400 && !res.url().includes("webpack-hmr")) {
      console.error(`[HTTP ${res.status()}] ${res.url()}`)
      try {
        const body = await res.text()
        console.error(`[HTTP ${res.status()} Body]`, body.slice(0, 500))
      } catch {}
    }
  })

  try {
    // -------------------------------------------------------------
    // STEP 1: SIGN IN VIA WEB FORM
    // -------------------------------------------------------------
    console.log("\n[Step 1] Navigating to Login page...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1000)
    await capture(page, "01-login-page")

    console.log("[Step 1] Filling credentials...")
    await page.fill('input[name="email"]', USER_EMAIL)
    await page.fill('input[name="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')

    console.log("[Step 1] Waiting for authentication...")
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 60000,
    })
    console.log(`[Step 1] Authenticated successfully! Current URL: ${page.url()}`)
    await page.waitForTimeout(1000)
    await capture(page, "02-after-login")

    // -------------------------------------------------------------
    // STEP 2: NAVIGATE TO MOCK TESTS DASHBOARD
    // -------------------------------------------------------------
    console.log("\n[Step 2] Navigating to Mock Tests Dashboard...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(1500)
    await capture(page, "03-mock-tests-dashboard")

    // -------------------------------------------------------------
    // STEP 3: CREATE NEW MOCK TEST WITH PAPER CLASSIFICATION
    // -------------------------------------------------------------
    console.log("\n[Step 3] Clicking 'Create Paper' button on dashboard...")
    const createPaperLink = page.locator('a:has-text("Create Paper"), a:has-text("Create First Paper")').first()
    if (await createPaperLink.isVisible()) {
      await createPaperLink.click()
    } else {
      await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/new`, {
        waitUntil: "domcontentloaded",
      })
    }
    await page.waitForURL((url) => url.pathname.endsWith("/assessments/new"), {
      timeout: 30000,
    })
    // Give React sufficient time to hydrate the client component
    await page.waitForTimeout(2500)

    console.log("[Step 3] Filling New Mock Test Form...")
    await page.fill('input[name="title"]', "JEE Advanced 2026 - Comprehensive Mock 1")
    const richEditor = page.locator('.tiptap, [contenteditable="true"]').first()
    if (await richEditor.isVisible()) {
      await richEditor.fill("Full-length mock exam simulating real CBT test conditions. Marking scheme: +1 for correct, 0 for incorrect.")
    }

    // Format & Paper Type
    const fullLengthRadio = page.locator('button[role="radio"]:has-text("Full-Length Mock")')
    if (await fullLengthRadio.isVisible()) {
      await fullLengthRadio.click()
      console.log("[Step 3] Selected 'Full-Length Mock' format")
    }

    // Taxonomy fields
    await page.fill('input[name="examTag"]', "JEE Advanced")
    await page.fill('input[name="subjects"]', "Physics, Chemistry")

    // Pacing & calculator
    await page.fill('input[name="durationMinutes"]', "180")
    await page.fill('input[name="totalMarks"]', "120")

    const calcSwitch = page.locator('button#calculatorAllowed, input#calculatorAllowed, button[role="switch"]#calculatorAllowed')
    if (await calcSwitch.isVisible()) {
      const isChecked = await calcSwitch.isChecked().catch(() => false)
      console.log(`[Step 3] calculatorAllowed isChecked: ${isChecked}`)
      if (!isChecked) {
        await page.click('label[for="calculatorAllowed"], button#calculatorAllowed, [role="checkbox"]')
      }
    }

    await page.waitForTimeout(500)
    await capture(page, "04-new-assessment-form-filled")

    console.log("[Step 3] Submitting form via 'Create Blueprint' button...")
    const createTestBtn = page.locator('button:has-text("Create Blueprint"), button:has-text("Create test")').first()
    await createTestBtn.scrollIntoViewIfNeeded()
    await createTestBtn.click()

    await page.waitForURL((url) => url.pathname.includes(`/assessments/`) && !url.pathname.endsWith("/new"), {
      timeout: 120000,
    })



    const detailUrl = page.url()
    console.log(`[Step 3] Mock test created! Current URL: ${detailUrl}`)
    const assessmentId = detailUrl.split("/assessments/")[1].split("/")[0]
    console.log(`[Step 3] Assessment ID: ${assessmentId}`)
    await page.waitForTimeout(1000)
    await capture(page, "05-assessment-detail-initial")

    // -------------------------------------------------------------
    // STEP 4: OPEN PAPER BUILDER & VERIFY PAPER CLASSIFICATION
    // -------------------------------------------------------------
    console.log("\n[Step 4] Opening Paper Builder...")
    const editPaperLink = page.locator('a:has-text("Edit Paper in Builder")').first()
    if (await editPaperLink.isVisible()) {
      await editPaperLink.click()
    } else {
      await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}/edit`, {
        waitUntil: "domcontentloaded",
      })
    }
    await page.waitForURL((url) => url.pathname.endsWith("/edit"), { timeout: 30000 })
    await page.waitForTimeout(1500)
    await capture(page, "06-builder-initial")


    // Verify paper classification fields in builder
    console.log("[Step 4] Verifying paper classification in builder...")
    const examTagInput = page.locator('#builder-examTag')
    if (await examTagInput.isVisible()) {
      const examTagValue = await examTagInput.inputValue()
      console.log(`[Step 4] Builder Exam Tag: "${examTagValue}"`)
    }

    // Add Section in Builder
    console.log("[Step 4] Adding a Section...")
    const addSectionBtn = page.locator('button:has-text("Add Section")').first()
    if (await addSectionBtn.isVisible()) {
      await addSectionBtn.click()
      const sectionDialog = page.locator('div[role="dialog"]')
      await sectionDialog.waitFor({ state: "visible", timeout: 5000 })
      await sectionDialog.locator('input').first().fill("Section 1: Core Physics & Chemistry")
      await sectionDialog.locator('button[type="submit"]').click()
      await sectionDialog.waitFor({ state: "hidden", timeout: 5000 })
      await page.waitForTimeout(800)
      console.log("[Step 4] Added section!")
    }

    // Add Question 1 from Bank
    console.log("[Step 4] Adding questions from Bank...")
    const addFromBankBtn = page.locator('button:has-text("Add from bank"), button:has-text("Add to"), button:has-text("Add questions from bank")').first()
    if (await addFromBankBtn.isVisible()) {
      await addFromBankBtn.click()
      const sheet = page.locator('div[role="dialog"]')
      await sheet.waitFor({ state: "visible", timeout: 5000 })
      const addBtn = sheet.locator('button:has-text("Add"):not([disabled])').first()
      if (await addBtn.isVisible()) {
        await addBtn.click()
        await page.waitForTimeout(600)
        console.log("[Step 4] Question 1 added from bank!")
      }
      // Add Question 2 in the same drawer session (find the next enabled Add button)
      const addBtn2 = sheet.locator('button:has-text("Add"):not([disabled])').first()
      if (await addBtn2.isVisible()) {
        await addBtn2.click()
        await page.waitForTimeout(600)
        console.log("[Step 4] Question 2 added from bank!")
      }
      // Close the bank drawer via Escape
      await page.keyboard.press("Escape")
      await sheet.waitFor({ state: "hidden", timeout: 5000 }).catch(async () => {
        const closeBtn = sheet.locator('button[aria-label*="Close"], button:has-text("Done")').first()
        if (await closeBtn.isVisible()) await closeBtn.click()
      })
      await page.waitForTimeout(800)
    }

    // Save Assessment in Builder
    console.log("[Step 4] Saving Assessment in Builder...")
    const saveBtn = page.locator('button:has-text("Save changes"), button:has-text("Save all")').first()
    if (await saveBtn.isVisible()) {
      const isEnabled = await saveBtn.isEnabled()
      console.log(`[Step 4] Save button is enabled: ${isEnabled}`)
      if (isEnabled) {
        await saveBtn.click()
        // Wait for save confirmation toast (must wait for both updateAssessment and saveQuestions actions to finish)
        console.log("[Step 4] Waiting for 'Mock test saved' toast...")
        await page.waitForSelector('text="Mock test saved"', { timeout: 60000 })
        await page.waitForTimeout(2000)
        console.log("[Step 4] Paper saved successfully with confirmation toast!")
      }
    }
    await capture(page, "07-builder-saved-with-questions")

    // -------------------------------------------------------------
    // STEP 5: PUBLISH ASSESSMENT
    // -------------------------------------------------------------
    console.log("\n[Step 5] Navigating to Detail View to Publish...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(2500)

    const publishBtn = page.locator('button:has-text("Publish")').first()
    if (await publishBtn.isVisible()) {
      console.log("[Step 5] Clicking Publish...")
      await publishBtn.click()
      await page.waitForSelector('button:has-text("Start Mock Test"), button:has-text("Start Test")', { timeout: 60000 })
      console.log("[Step 5] Test is published!")
    }
    await page.waitForTimeout(1000)
    await capture(page, "08-assessment-published")

    // -------------------------------------------------------------
    // STEP 6: START CBT ATTEMPT & TEST PLAYER
    // -------------------------------------------------------------
    console.log("\n[Step 6] Starting CBT Attempt...")
    const startTestBtn = page.locator('button:has-text("Start Mock Test"), button:has-text("Start Test"), button:has-text("Start test")').first()
    await startTestBtn.click()

    await page.waitForURL((url) => url.pathname.startsWith("/assessments/"), {
      timeout: 35000,
    })
    const examUrl = page.url()
    console.log(`[Step 6] Entered CBT Exam Room! URL: ${examUrl}`)
    const attemptId = examUrl.split("/assessments/")[1].split("/")[0].split("?")[0]
    console.log(`[Step 6] Attempt ID: ${attemptId}`)
    await page.waitForTimeout(2000)
    await capture(page, "09-cbt-room-initial")

    // Test Virtual Scientific Calculator
    console.log("[Step 6] Testing Virtual Scientific Calculator...")
    const calcToggle = page.locator('button[title*="Calculator"], button:has-text("Calculator")').first()
    if (await calcToggle.isVisible()) {
      await calcToggle.click()
      await page.waitForTimeout(1000)
      console.log("[Step 6] Opened Virtual Calculator")
      await capture(page, "10-cbt-calculator-open")

      // Close calculator
      const calcClose = page.locator('button[aria-label="Close Calculator"], button:has-text("✕")').first()
      if (await calcClose.isVisible()) {
        await calcClose.click()
      } else {
        await calcToggle.click()
      }
      await page.waitForTimeout(500)
    }

    // Answer questions in CBT player
    console.log("[Step 6] Answering question 1 using keyboard 1...")
    await page.keyboard.press("1")
    await page.waitForTimeout(800)

    const saveNextBtn = page.locator('button:has-text("Save & Next")').first()
    if (await saveNextBtn.isVisible()) {
      await saveNextBtn.click()
      await page.waitForTimeout(800)
    }

    console.log("[Step 6] Answering question 2 using keyboard 1...")
    await page.keyboard.press("1")
    await page.waitForTimeout(800)

    // Submit Attempt
    console.log("[Step 6] Submitting test attempt...")
    const submitBtn = page.locator('button:has-text("Submit")').first()
    await submitBtn.click()
    await page.waitForTimeout(1000)
    await capture(page, "11-cbt-submit-confirmation-modal")

    const confirmSubmitBtn = page.locator('div[role="dialog"] button:has-text("Submit Test")').last()
    await confirmSubmitBtn.click()

    console.log("[Step 6] Waiting for redirect to Analysis page...")
    await page.waitForURL((url) => url.pathname.includes("/analysis"), {
      timeout: 60000,
    })

    console.log(`[Step 6] Analysis page reached: ${page.url()}`)
    await page.waitForTimeout(2000)
    await capture(page, "12-scorecard-analysis")

    // -------------------------------------------------------------
    // STEP 7: SHARE ASSESSMENT (COMMUNITY HUB & CLONING RIGHTS)
    // -------------------------------------------------------------
    console.log("\n[Step 7] Returning to Dashboard for Sharing...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(2000)
    await capture(page, "13-dashboard-with-attempt")

    console.log("[Step 7] Opening Share Assessment Dialog...")
    const shareBtn = page.locator(`button:has-text("Share")`).first()
    if (await shareBtn.isVisible()) {
      await shareBtn.click()
      const shareDialog = page.getByRole('dialog', { name: 'Publish & Share Mock Test', exact: true })
      await shareDialog.waitFor({ state: "visible", timeout: 5000 })
      await page.waitForTimeout(800)
      console.log("[Step 7] Share Assessment Dialog is open!")
      await capture(page, "14-share-dialog-open")

      // Select PUBLIC (COMMUNITY HUB)
      const publicCard = shareDialog.locator('button:has-text("Community Hub")').first()
      if (await publicCard.isVisible()) {
        await publicCard.click()
        console.log("[Step 7] Selected 'Community Hub'")
      }
      await page.waitForTimeout(500)
      await capture(page, "15-share-dialog-public-selected")

      // Save sharing settings
      const saveShareBtn = shareDialog.locator('button:has-text("Save Settings")')
      if (await saveShareBtn.isVisible()) {
        await saveShareBtn.click()
        await shareDialog.waitFor({ state: "hidden", timeout: 35000 })
        console.log("[Step 7] Sharing settings saved!")
      }
    }

    // -------------------------------------------------------------
    // STEP 8: TEST PUBLIC COMMUNITY HUB PAGE (UNAUTHENTICATED)
    // -------------------------------------------------------------
    console.log("\n[Step 8] Opening Public Share Landing Page in Incognito Context...")
    const incognitoContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const publicPage = await incognitoContext.newPage()

    const publicUrl = `${BASE_URL}/assessments/share/${assessmentId}`
    console.log(`[Step 8] Navigating to Public URL: ${publicUrl}`)
    await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" })
    await publicPage.waitForTimeout(1500)
    await capture(publicPage, "16-public-community-landing-page")

    console.log("\n=== ALL E2E BROWSER TESTS COMPLETED SUCCESSFULLY! ===")
  } catch (error) {
    console.error("\n[E2E Test Failed]:", error)
    await capture(page, "error-state")
    throw error
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

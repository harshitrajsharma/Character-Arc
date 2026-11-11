import {
  getBrowserTestConfig,
  requireBrowserMutationOptIn,
} from "./lib/browser-test-config"

import { chromium, type Page, type BrowserContext } from "playwright"
import path from "node:path"
import assert from "node:assert/strict"
import { reviewAssessmentAuthoring } from "./e2e-assessment-authoring"
import { reviewBuilderSections } from "./e2e-builder-sections"
import { reviewLearningRelease } from "./e2e-release-review"
import { attachBrowserAuthDiagnostics } from "./lib/browser-auth-diagnostics"

const {
  baseUrl: BASE_URL,
  email: USER_EMAIL,
  password: USER_PASSWORD,
  workspaceSlug: WORKSPACE_SLUG,
} = getBrowserTestConfig()

const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  process.env.E2E_SCREENSHOT_DIR ?? "scratch/screenshots"
)

async function capture(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: true, caret: "initial" })
  console.log(`[Screenshot Captured] ${name}.png`)
}

async function main() {
  const reviewModes = [
    process.env.ASSESSMENT_SECTION_REVIEW_ID,
    process.env.ASSESSMENT_AUTHORING_REVIEW_ID,
    process.env.RELEASE_REVIEW === "1" ? "release" : undefined,
  ].filter(Boolean)
  if (reviewModes.length > 1)
    throw new Error("Choose exactly one browser review mode.")
  if (!reviewModes.length) requireBrowserMutationOptIn()
  console.log(
    process.env.RELEASE_REVIEW === "1"
      ? "=== STARTING READ-ONLY LEARNING RELEASE REVIEW ==="
      : process.env.ASSESSMENT_SECTION_REVIEW_ID
        ? "=== STARTING EXISTING-ASSESSMENT SECTION REVIEW ==="
        : process.env.ASSESSMENT_AUTHORING_REVIEW_ID
          ? "=== STARTING EXISTING-ASSESSMENT AUTHORING REVIEW ==="
          : "=== STARTING FULL E2E BROWSER TEST ==="
  )
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  const authDiagnostics = attachBrowserAuthDiagnostics(page, BASE_URL)
  page.setDefaultTimeout(40000)
  // Cold Turbopack routes can compile while the database/auth request is pending.
  // Keep navigation budgets consistent without relaxing any outcome assertions.
  page.setDefaultNavigationTimeout(120000)
  const hydrationErrors: string[] = []

  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      /hydrat|didn't match|does not match/i.test(msg.text())
    ) {
      hydrationErrors.push(msg.text())
    }
    console.log(`[Browser ${msg.type()}] ${msg.text()}`)
  })
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
    await page.waitForURL(
      (url) =>
        !url.pathname.includes("/login") || url.searchParams.has("error"),
      {
        timeout: 120000,
      }
    )
    if (new URL(page.url()).pathname === "/login") {
      throw new Error(
        "Authentication did not complete. Check the local server's auth connectivity; no test records were created."
      )
    }
    console.log(
      `[Step 1] Authenticated successfully! Current URL: ${page.url()}`
    )
    await page.waitForTimeout(1000)
    await capture(page, "02-after-login")

    // These modes never enter the fixture-creation suite.
    if (process.env.RELEASE_REVIEW === "1") {
      await reviewLearningRelease(page, BASE_URL, WORKSPACE_SLUG)
      assert.deepEqual(hydrationErrors, [])
      await authDiagnostics("release-review-passed")
      return
    }
    if (process.env.ASSESSMENT_SECTION_REVIEW_ID) {
      await reviewBuilderSections(
        page,
        BASE_URL,
        WORKSPACE_SLUG,
        process.env.ASSESSMENT_SECTION_REVIEW_ID
      )
      assert.deepEqual(hydrationErrors, [])
      return
    }
    if (process.env.ASSESSMENT_AUTHORING_REVIEW_ID) {
      await reviewAssessmentAuthoring(
        page,
        BASE_URL,
        WORKSPACE_SLUG,
        process.env.ASSESSMENT_AUTHORING_REVIEW_ID
      )
      assert.deepEqual(hydrationErrors, [])
      return
    }

    // -------------------------------------------------------------
    // STEP 2: NAVIGATE TO MOCK TESTS DASHBOARD
    // -------------------------------------------------------------
    console.log("\n[Step 2] Navigating to Mock Tests Dashboard...")
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForTimeout(1500)
    await capture(page, "03-mock-tests-dashboard")

    // Bank inspection keeps learning content ahead of library metadata.
    await page.goto(
      `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/questions`,
      { waitUntil: "domcontentloaded" }
    )
    await page.waitForLoadState("networkidle")
    const inspectedQuestion = page.locator("[data-question-card]").first()
    await inspectedQuestion
      .locator("button[aria-expanded][aria-controls]")
      .click()
    await inspectedQuestion
      .getByRole("heading", { name: "Answer key", exact: true })
      .waitFor()
    assert.equal(
      await inspectedQuestion
        .locator('[data-question-section="question"]')
        .count(),
      1
    )
    assert.equal(
      await inspectedQuestion
        .locator("[data-question-bank-summary] .rich-text")
        .count(),
      0
    )
    const inspectionBounds = await inspectedQuestion
      .locator('[data-question-view="inspection"]')
      .boundingBox()
    const libraryBounds = await inspectedQuestion
      .locator("footer")
      .boundingBox()
    assert.ok(
      inspectionBounds &&
        libraryBounds &&
        libraryBounds.y >= inspectionBounds.y + inspectionBounds.height
    )
    await page.goto(`${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments`, {
      waitUntil: "domcontentloaded",
    })
    await page.waitForLoadState("networkidle")

    // -------------------------------------------------------------
    // STEP 3: CREATE NEW MOCK TEST WITH PAPER CLASSIFICATION
    // -------------------------------------------------------------
    console.log("\n[Step 3] Clicking 'Create Paper' button on dashboard...")
    const createPaperLink = page
      .locator('a:has-text("Create Paper"), a:has-text("Create First Paper")')
      .first()
    if (await createPaperLink.isVisible()) {
      await createPaperLink.click()
    } else {
      await page.goto(
        `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/new`,
        {
          waitUntil: "domcontentloaded",
        }
      )
    }
    await page.waitForURL((url) => url.pathname.endsWith("/assessments/new"), {
      timeout: 120000,
    })
    // Give React sufficient time to hydrate the client component
    await page.waitForTimeout(2500)

    console.log("[Step 3] Filling New Mock Test Form...")
    await page.fill(
      'input[name="title"]',
      "JEE Advanced 2026 - Comprehensive Mock 1"
    )
    const richEditor = page.locator('.tiptap, [contenteditable="true"]').first()
    if (await richEditor.isVisible()) {
      await richEditor.fill(
        "Full-length mock exam simulating real CBT test conditions. Marking scheme: +1 for correct, 0 for incorrect."
      )
    }

    // Format & Paper Type
    const fullLengthRadio = page.locator(
      'button[role="radio"]:has-text("Full-Length Mock")'
    )
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

    const calcSwitch = page.getByRole("switch", {
      name: "On-screen calculator",
      exact: true,
    })
    if (!(await calcSwitch.isChecked())) await calcSwitch.click()
    assert.equal(await calcSwitch.isChecked(), true)

    await page.waitForTimeout(500)
    await capture(page, "04-new-assessment-form-filled")

    console.log("[Step 3] Submitting form via 'Create draft' button...")
    const createTestBtn = page
      .locator('button:has-text("Create draft")')
      .first()
    await createTestBtn.scrollIntoViewIfNeeded()
    await createTestBtn.click()

    await page.waitForURL(
      (url) =>
        url.pathname.includes(`/assessments/`) &&
        !url.pathname.endsWith("/new"),
      {
        timeout: 120000,
      }
    )

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
    const editPaperLink = page
      .locator('a:has-text("Edit Paper in Builder")')
      .first()
    if (await editPaperLink.isVisible()) {
      await editPaperLink.click()
    } else {
      await page.goto(
        `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}/edit`,
        {
          waitUntil: "domcontentloaded",
        }
      )
    }
    await page.waitForURL((url) => url.pathname.endsWith("/edit"), {
      timeout: 120000,
    })
    await page.waitForTimeout(1500)
    await capture(page, "06-builder-initial")

    // Dirty question creation must save explicitly and retain assessment context.
    await page
      .getByRole("main")
      .getByRole("button", { name: "Edit details", exact: true })
      .click()
    const settingsSheet = page.getByRole("dialog", {
      name: "Edit assessment details",
      exact: true,
    })
    const assessmentTitle = await settingsSheet
      .getByRole("textbox", { name: "Assessment title", exact: true })
      .inputValue()
    await settingsSheet
      .getByRole("textbox", { name: "Assessment title", exact: true })
      .fill(`${assessmentTitle} - draft`)
    await settingsSheet
      .getByRole("button", { name: "Done", exact: true })
      .click()
    await page
      .getByRole("button", { name: "New question", exact: true })
      .click()
    await page
      .getByRole("alertdialog", { name: "Save your changes?", exact: true })
      .getByRole("button", { name: "Save and continue", exact: true })
      .click()
    await page.waitForURL((url) => url.pathname.endsWith("/questions/new"), {
      timeout: 90000,
    })
    assert.ok(
      new URL(page.url()).pathname.endsWith(`/${assessmentId}/questions/new`)
    )
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "Add topics", exact: true }).click()
    const syllabusDialog = page.getByRole("dialog", {
      name: "Link syllabus coverage",
      exact: true,
    })
    await syllabusDialog
      .locator('[data-syllabus-results][aria-busy="false"]')
      .waitFor({ timeout: 60000 })
    assert.equal(
      await syllabusDialog
        .getByRole("button", { name: "Retry", exact: true })
        .count(),
      0
    )
    assert.ok(
      (await syllabusDialog.locator("[data-syllabus-results] li").count()) <= 30
    )
    const syllabusBounds = await syllabusDialog.boundingBox()
    assert.ok(syllabusBounds && syllabusBounds.height <= 672)
    await syllabusDialog
      .getByRole("button", { name: "Done", exact: true })
      .click()
    await page.goto(
      `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}/edit`,
      { waitUntil: "domcontentloaded" }
    )
    await page
      .getByRole("heading", { name: `${assessmentTitle} - draft`, exact: true })
      .waitFor()
    await page.waitForLoadState("networkidle")
    console.log(
      "[Step 4] Save and continue persisted draft metadata and retained question creation context."
    )

    // Verify paper classification fields in builder
    console.log("[Step 4] Verifying paper classification in builder...")
    const examTagInput = page.locator("#builder-examTag")
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
      await sectionDialog.waitFor({ state: "visible", timeout: 30000 })
      await sectionDialog
        .locator("input")
        .first()
        .fill("Section 1: Core Physics & Chemistry")
      await sectionDialog.locator('button[type="submit"]').click()
      await sectionDialog.waitFor({ state: "hidden", timeout: 5000 })
      await page.waitForTimeout(800)
      console.log("[Step 4] Added section!")
    }

    // Add Question 1 from Bank
    console.log("[Step 4] Adding questions from Bank...")
    const addFromBankBtn = page
      .locator(
        'button:has-text("Add from bank"), button:has-text("Add to"), button:has-text("Add questions from bank")'
      )
      .first()
    if (await addFromBankBtn.isVisible()) {
      await addFromBankBtn.click()
      const sheet = page.locator('div[role="dialog"]')
      await sheet.waitFor({ state: "visible", timeout: 5000 })
      const sectionSelect = sheet.getByRole("combobox", {
        name: "Add to section",
        exact: true,
      })
      if (await sectionSelect.isVisible()) {
        await sectionSelect.click()
        await page
          .getByRole("option", {
            name: "Section 1: Core Physics & Chemistry",
            exact: true,
          })
          .click()
      }
      const addBtn = sheet
        .getByRole("button", { name: "Add question", exact: true })
        .first()
      await addBtn.waitFor({ state: "visible", timeout: 60000 })
      if (await addBtn.isVisible()) {
        await addBtn.click()
        await page.waitForTimeout(600)
        console.log("[Step 4] Question 1 added from bank!")
      }
      // Add Question 2 in the same drawer session (find the next enabled Add button)
      const addBtn2 = sheet
        .getByRole("button", { name: "Add question", exact: true })
        .first()
      if (await addBtn2.isVisible()) {
        await addBtn2.click()
        await page.waitForTimeout(600)
        console.log("[Step 4] Question 2 added from bank!")
      }
      // Close the bank drawer via Escape
      await page.keyboard.press("Escape")
      await sheet
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(async () => {
          const closeBtn = sheet
            .locator('button[aria-label*="Close"], button:has-text("Done")')
            .first()
          if (await closeBtn.isVisible()) await closeBtn.click()
        })
      await page.waitForTimeout(800)
    }

    // Save Assessment in Builder
    console.log("[Step 4] Saving Assessment in Builder...")
    const saveBtn = page
      .locator('button:has-text("Save changes"), button:has-text("Save all")')
      .first()
    if (await saveBtn.isVisible()) {
      const isEnabled = await saveBtn.isEnabled()
      console.log(`[Step 4] Save button is enabled: ${isEnabled}`)
      if (isEnabled) {
        await saveBtn.click()
        // Wait for save confirmation toast (must wait for both updateAssessment and saveQuestions actions to finish)
        console.log("[Step 4] Waiting for assessment save confirmation...")
        await page
          .getByText("Assessment saved", { exact: true })
          .waitFor({ timeout: 60000 })
        await page.waitForTimeout(2000)
        console.log(
          "[Step 4] Paper saved successfully with confirmation toast!"
        )
      }
    }
    await capture(page, "07-builder-saved-with-questions")

    // -------------------------------------------------------------
    // STEP 5: PUBLISH ASSESSMENT
    // -------------------------------------------------------------
    console.log(
      "\n[Step 5] Reviewing and publishing without starting an attempt..."
    )
    const { prisma } = await import("../lib/prisma")
    assert.equal(await prisma.attempt.count({ where: { assessmentId } }), 0)
    await prisma.$disconnect()
    await page
      .getByRole("button", { name: "Review & publish", exact: true })
      .filter({ visible: true })
      .click()
    const reviewDialog = page.getByRole("alertdialog", {
      name: "Review assessment",
      exact: true,
    })
    await reviewDialog
      .getByRole("button", { name: "Publish assessment", exact: true })
      .click()
    await page
      .getByText("Assessment published", { exact: true })
      .waitFor({ timeout: 60000 })
    assert(page.url().endsWith(`/assessments/${assessmentId}/edit`))
    assert.equal(
      await prisma.attempt.count({ where: { assessmentId } }),
      0,
      "Publishing must not create an attempt"
    )
    await prisma.$disconnect()
    console.log("[Step 5] Published in place; zero attempts created.")
    await page.waitForTimeout(1000)
    await capture(page, "08-assessment-published")

    // A phone cannot save/start a live test, even from the builder.
    await page.setViewportSize({ width: 390, height: 844 })
    await page
      .getByRole("button", { name: "Test run", exact: true })
      .filter({ visible: true })
      .click()
    await page
      .getByRole("dialog", { name: "A larger screen is required", exact: true })
      .waitFor()
    assert.equal(
      await prisma.attempt.count({ where: { assessmentId } }),
      0,
      "A phone must not create an attempt"
    )
    await prisma.$disconnect()
    await page.getByRole("button", { name: "Got it", exact: true }).click()
    await page.setViewportSize({ width: 1440, height: 900 })

    // -------------------------------------------------------------
    // STEP 6: START CBT ATTEMPT & TEST PLAYER
    // -------------------------------------------------------------
    console.log("\n[Step 6] Starting CBT Attempt...")
    await page
      .getByRole("button", { name: "Test run", exact: true })
      .filter({ visible: true })
      .click()
    await page
      .getByRole("alertdialog", { name: "Start a test run?", exact: true })
      .getByRole("button", { name: "Start test run", exact: true })
      .click()

    await page.waitForURL((url) => url.pathname.startsWith("/assessments/"), {
      timeout: 120000,
    })
    const examUrl = page.url()
    console.log(`[Step 6] Entered CBT Exam Room! URL: ${examUrl}`)
    const attemptId = examUrl
      .split("/assessments/")[1]
      .split("/")[0]
      .split("?")[0]
    console.log(`[Step 6] Attempt ID: ${attemptId}`)
    assert.equal(
      await prisma.attempt.count({ where: { assessmentId } }),
      1,
      "Only the explicit test run creates an attempt"
    )
    await prisma.$disconnect()
    await page.waitForTimeout(2000)
    await capture(page, "09-cbt-room-initial")

    // Test Virtual Scientific Calculator
    console.log("[Step 6] Testing Virtual Scientific Calculator...")
    const calcToggle = page
      .locator('button[title*="Calculator"], button:has-text("Calculator")')
      .first()
    if (await calcToggle.isVisible()) {
      await calcToggle.click()
      await page.waitForTimeout(1000)
      console.log("[Step 6] Opened Virtual Calculator")
      await capture(page, "10-cbt-calculator-open")

      await page.setViewportSize({ width: 390, height: 844 })
      await page
        .getByRole("heading", {
          name: "Use a larger screen to continue",
          exact: true,
        })
        .waitFor()
      assert.equal(
        await page
          .getByRole("button", { name: "Close Calculator", exact: true })
          .count(),
        0,
        "The calculator must not bypass the small-screen restriction"
      )
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.locator(".cbt-exam-root").waitFor({ state: "visible" })

      // Close calculator
      const calcClose = page
        .locator('button[aria-label="Close Calculator"], button:has-text("✕")')
        .first()
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

    // Resizing keeps the same attempt/answers but disables live controls.
    const choices = page.locator(
      '.cbt-exam-root input[type="radio"], .cbt-exam-root input[type="checkbox"]'
    )
    const selectedBeforeResize = await choices.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).checked)
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page
      .getByRole("heading", {
        name: "Use a larger screen to continue",
        exact: true,
      })
      .waitFor()
    assert.equal(await page.locator(".cbt-exam-root").isVisible(), false)
    await page.keyboard.press("2")
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator(".cbt-exam-root").waitFor({ state: "visible" })
    assert.equal(page.url(), examUrl)
    assert.deepEqual(
      await choices.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).checked)
      ),
      selectedBeforeResize,
      "Answers must survive resize and blocked keyboard input"
    )

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

    const confirmSubmitBtn = page
      .locator('div[role="dialog"] button:has-text("Submit Test")')
      .last()
    await confirmSubmitBtn.click()

    console.log("[Step 6] Waiting for redirect to Analysis page...")
    await page.waitForURL((url) => url.pathname.includes("/analysis"), {
      timeout: 120000,
    })

    console.log(`[Step 6] Analysis page reached: ${page.url()}`)
    const benchmark = page.getByRole("region", {
      name: "Score against targets",
      exact: true,
    })
    await benchmark.waitFor()
    const recordedScore = await benchmark
      .locator("[data-benchmark-percentage]")
      .innerText()
    assert.match(recordedScore, /^-?[\d.,]+%$/)
    assert.ok(
      (
        await benchmark
          .getByRole("progressbar", {
            name: "Assessment score percentage",
            exact: true,
          })
          .getAttribute("aria-valuetext")
      )?.startsWith(`${recordedScore} score`)
    )
    assert.equal(await benchmark.locator("dl > div").count(), 2)
    assert.match(await benchmark.innerText(), /current assessment targets/i)
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

    // Exercise management only on the assessment created by this test run.
    const managedCard = page
      .locator("[data-assessment-card]")
      .filter({
        has: page.locator(
          `a[data-card-link][href$="/assessments/${assessmentId}"]`
        ),
      })
      .filter({ visible: true })
    const originalName = (await managedCard.locator("h3").innerText()).trim()
    for (const name of [`${originalName} - renamed`, originalName]) {
      await managedCard.hover()
      await managedCard.getByRole("button", { name: /^Rename / }).click()
      const renameDialog = page.getByRole("dialog", {
        name: "Rename assessment",
        exact: true,
      })
      await renameDialog
        .getByRole("textbox", { name: "Assessment name", exact: true })
        .fill(name)
      await renameDialog
        .getByRole("button", { name: "Save name", exact: true })
        .click()
      await renameDialog.waitFor({ state: "hidden", timeout: 30000 })
      await managedCard.getByRole("link", { name, exact: true }).waitFor()
    }
    await managedCard.hover()
    await managedCard.getByRole("button", { name: /^Delete / }).click()
    const deleteDialog = page.getByRole("alertdialog", {
      name: "Delete assessment?",
      exact: true,
    })
    await deleteDialog.waitFor()
    await capture(page, "assessment-delete-confirmation")
    await deleteDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click()
    await deleteDialog.waitFor({ state: "hidden" })
    console.log(
      "[Step 7] Hover rename persisted and restored; delete confirmation cancelled without changing the paper."
    )

    console.log("[Step 7] Opening Share Assessment Dialog...")
    await page.goto(
      `${BASE_URL}/workspace/${WORKSPACE_SLUG}/assessments/${assessmentId}`,
      { waitUntil: "domcontentloaded" }
    )
    const shareBtn = page.getByRole("button", {
      name: "Share",
      exact: true,
    })
    await shareBtn.waitFor({ state: "visible", timeout: 30000 })
    await page.waitForLoadState("networkidle")
    const overview = page.locator("[data-assessment-overview]")
    assert.equal(
      await overview
        .locator("dl > div")
        .filter({ has: page.locator("dt", { hasText: "Maximum marks" }) })
        .locator("dd")
        .innerText(),
      "2"
    )
    const candidateInstructions = page.getByRole("region", {
      name: "Candidate instructions",
      exact: true,
    })
    await candidateInstructions.waitFor()
    assert.equal(
      await candidateInstructions.locator("summary, details").count(),
      0,
      "Candidate instructions must be inline"
    )
    await page
      .getByRole("heading", { name: "Your attempts", exact: true })
      .waitFor()
    assert.equal(
      await page
        .getByRole("list", { name: "Your assessment attempts", exact: true })
        .locator("li")
        .count(),
      1
    )
    const scoreTrend = page.locator("[data-score-trend]")
    await scoreTrend.locator("summary").click()
    await scoreTrend
      .getByRole("region", { name: "Selected score result", exact: true })
      .waitFor()
    assert.match(await scoreTrend.innerText(), /One scored attempt/)
    const latestResult = await overview
      .locator("p")
      .filter({ hasText: "Latest result" })
      .innerText()
    const recordedPercentage = latestResult.match(/\(([\d.,−-]+%)\)/)?.[1]
    assert.ok(
      recordedPercentage,
      "The completed attempt must have a recorded percentage"
    )
    assert.equal(
      await scoreTrend.locator("[data-selected-percentage]").innerText(),
      recordedPercentage,
      "The score inspector must match the recorded result, including imperfect scores"
    )
    assert.equal(
      await scoreTrend
        .getByRole("link", { name: /Review selected result/ })
        .getAttribute("href"),
      await overview
        .getByRole("link", { name: "Review latest result", exact: true })
        .getAttribute("href")
    )
    assert.equal(
      await scoreTrend.locator("[data-score-chart]").count(),
      0,
      "One result must not imply a comparison trend"
    )
    await scoreTrend.locator("summary").click()
    if (await shareBtn.isVisible()) {
      await shareBtn.click()
      const shareDialog = page.getByRole("dialog", {
        name: "Share assessment",
        exact: true,
      })
      await shareDialog.waitFor({ state: "visible", timeout: 5000 })
      await page.waitForTimeout(800)
      console.log("[Step 7] Share Assessment Dialog is open!")
      await capture(page, "14-share-dialog-open")

      // Select PUBLIC (COMMUNITY HUB)
      const publicCard = shareDialog.getByRole("radio", {
        name: /Community Hub/,
      })
      if (await publicCard.isVisible()) {
        await publicCard.click()
        console.log("[Step 7] Selected 'Community Hub'")
      }
      await page.waitForTimeout(500)
      await capture(page, "15-share-dialog-public-selected")

      // Save sharing settings
      const saveShareBtn = shareDialog.locator(
        'button:has-text("Save settings")'
      )
      if (await saveShareBtn.isVisible()) {
        await saveShareBtn.click()
        await shareDialog.waitFor({ state: "hidden", timeout: 35000 })
        await overview
          .locator("[data-assessment-status]")
          .getByText("Public", { exact: true })
          .waitFor()
        await shareBtn.click()
        await shareDialog.waitFor()
        assert.equal(
          await shareDialog
            .getByRole("radio", { name: /Community Hub/ })
            .isChecked(),
          true,
          "Sharing state must refresh after save"
        )
        await shareDialog
          .getByRole("button", { name: "Cancel", exact: true })
          .click()
        console.log("[Step 7] Sharing settings saved!")
      }
    }

    // -------------------------------------------------------------
    // STEP 8: TEST PUBLIC COMMUNITY HUB PAGE (UNAUTHENTICATED)
    // -------------------------------------------------------------
    console.log(
      "\n[Step 8] Opening Public Share Landing Page in Incognito Context..."
    )
    const incognitoContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const publicPage = await incognitoContext.newPage()
    publicPage.setDefaultNavigationTimeout(90000)

    const publicUrl = `${BASE_URL}/assessments/share/${assessmentId}`
    console.log(`[Step 8] Navigating to Public URL: ${publicUrl}`)
    await publicPage.goto(publicUrl, { waitUntil: "domcontentloaded" })
    await publicPage
      .getByRole("heading", { name: originalName, exact: true })
      .waitFor({ timeout: 30000 })
    assert.equal(
      new URL(publicPage.url()).pathname,
      `/assessments/share/${assessmentId}`
    )
    await capture(publicPage, "16-public-community-landing-page")

    if (hydrationErrors.length > 0) {
      throw new Error(
        `Hydration errors detected: ${hydrationErrors.join("\n")}`
      )
    }
    console.log("\n=== ALL E2E BROWSER TESTS COMPLETED SUCCESSFULLY! ===")
  } catch (error) {
    console.error("\n[E2E Test Failed]:", error)
    await authDiagnostics("browser-review-failed")
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

import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import type { Page } from "playwright"
import { reviewSubjectNavigation } from "./e2e-subject-navigation-review"
import { reviewMcpSettings } from "./e2e-mcp-settings-review"
import { reviewSettingsRecovery } from "./e2e-settings-recovery-review"

/** Real navigation/read actions only. Mutations are blocked before transmission. */
export async function reviewLearningRelease(
  page: Page,
  base: string,
  workspace: string
) {
  const errors: string[] = [],
    blocked: string[] = [],
    layouts: object[] = []
  const actionTimes: object[] = []
  const starts = new Map<object, number>()
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      starts.set(request, Date.now())
    }
  })
  page.on("requestfinished", (request) => {
    const start = starts.get(request)
    if (start !== undefined) {
      const durationMs = Date.now() - start
      actionTimes.push({ path: new URL(request.url()).pathname, durationMs })
      console.log(
        `[Read action finished] ${new URL(request.url()).pathname} ${durationMs}ms`
      )
      starts.delete(request)
    }
  })
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/*", async (route) => {
    const request = route.request()
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      /"(?:expectedRevision|idempotencyKey)"/.test(request.postData() ?? "")
    ) {
      blocked.push(request.url())
      await route.abort()
    } else await route.continue()
  })
  const assertFits = async (label: string) => {
    const result = (await page.evaluate(
      "({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth })"
    )) as { width: number; height: number; scroll: number }
    assert.ok(result.scroll <= result.width + 1, `${label}: document overflow`)
    layouts.push({ label, ...result })
  }
  console.log("[Release review] Canonical home and subject Tests entry")
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" })
  await page.waitForURL((url) => url.pathname === `/workspace/${workspace}`)
  await page.getByRole("heading", { name: "Workspace", exact: true }).waitFor()
  assert.equal(
    await page.getByRole("link", { name: "Today", exact: true }).count(),
    0
  )
  const subjectLink = page.getByRole("link", { name: /^Tests for / }).first()
  await subjectLink.waitFor()
  const subjectHref = await subjectLink.getAttribute("href")
  if (!subjectHref) throw new Error("Subject test shortcut has no destination.")
  assert.ok(subjectHref.includes("stage=test"))
  await page.goto(new URL(subjectHref, base).href, { waitUntil: "networkidle" })
  const create = page
    .locator('main a[href*="/assessments/new?fromExam="]')
    .first()
  await create.waitFor()
  const createHref = await create.getAttribute("href")
  if (!createHref)
    throw new Error("Contextual assessment creation has no destination.")
  const creation = new URL(createHref, base)
  assert.ok(creation.searchParams.get("fromSubject"))

  // Discover real eligible papers without choosing or linking one.
  console.log(
    "[Release review] Search and inspect unassigned assessment catalog"
  )
  await page.getByRole("button", { name: "More", exact: true }).click()
  await page
    .getByRole("menuitem", { name: "Link existing assessment", exact: true })
    .click()
  const linking = page.getByRole("dialog", {
    name: "Link an assessment",
    exact: true,
  })
  await linking.waitFor()
  await linking.getByPlaceholder("Search by title").fill("Linear Algebra")
  await linking
    .getByText(/Linear Algebra.*GATE DA/)
    .first()
    .waitFor({ timeout: 90_000 })
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 640],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    const box = await linking.boundingBox()
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width + 1 &&
        box.y + box.height <= height + 1,
      `link dialog containment ${width}`
    )
    await assertFits(`link-dialog-${width}`)
    await page.screenshot({ path: `scratch/release-subject-link-${width}.png` })
  }
  await page.keyboard.press("Escape")
  await linking.waitFor({ state: "hidden" })

  // Contextual creation is prefilled, and Cancel stays in the subject workflow.
  console.log(
    "[Release review] Contextual create form, responsive actions and Cancel"
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(creation.href, { waitUntil: "networkidle" })
  await page
    .getByRole("heading", { name: "Create assessment", exact: true })
    .waitFor()
  const subjects = page.getByRole("textbox", {
    name: "Subjects (optional)",
    exact: true,
  })
  assert.ok((await subjects.inputValue()).trim())
  assert.match(
    await page
      .getByRole("combobox", { name: "Assessment type", exact: true })
      .innerText(),
    /Subject/i
  )
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [767, 900],
    [640, 900],
    [390, 844],
    [320, 640],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await assertFits(`subject-create-${width}`)
    const footer = page.locator("[data-assessment-create-actions]")
    await footer.scrollIntoViewIfNeeded()
    const box = await footer.boundingBox()
    const nav = page.getByRole("navigation", {
      name: "Mobile Navigation",
      exact: true,
    })
    if (width < 768) {
      const navBox = await nav.boundingBox()
      assert.ok(
        box && navBox && box.y + box.height <= navBox.y + 1,
        `create actions overlap navigation at ${width}`
      )
    }
    await page.screenshot({
      path: `scratch/release-subject-create-${width}.png`,
    })
  }
  await page.getByRole("link", { name: "Cancel", exact: true }).click()
  await page.waitForURL(
    (url) =>
      url.pathname === new URL(subjectHref, base).pathname &&
      url.searchParams.get("stage") === "test"
  )

  // Existing paper: verify context return through builder and question authoring.
  console.log(
    "[Release review] Existing assessment builder and contextual question authoring"
  )
  const assessmentId = process.env.E2E_EXISTING_ASSESSMENT_ID
  assert.match(
    assessmentId ?? "",
    /^[a-f0-9-]{36}$/i,
    "Set E2E_EXISTING_ASSESSMENT_ID to the existing Linear Algebra assessment."
  )
  const builder = new URL(
    `${base}/workspace/${workspace}/assessments/${assessmentId}/edit`
  )
  builder.searchParams.set("returnTo", subjectHref)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(builder.href, { waitUntil: "networkidle" })
  await page
    .getByRole("heading", { name: "Questions (30)", exact: true })
    .waitFor()
  const revision = await page
    .locator('[title="Assessment revision"]')
    .innerText()
  const status = await page.locator("[data-assessment-status]").innerText()
  await page.screenshot({ path: "scratch/release-contextual-builder-1440.png" })
  await page
    .getByRole("button", { name: "Subject tests", exact: true })
    .waitFor()
  assert.equal(
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .isDisabled(),
    true
  )
  await page
    .getByRole("button", { name: "Add questions", exact: true })
    .first()
    .click()
  const picker = page.getByRole("dialog", {
    name: "Add questions",
    exact: true,
  })
  await picker
    .getByRole("button", { name: "Create new question", exact: true })
    .click()
  await page.waitForURL((url) =>
    url.pathname.endsWith(`/assessments/${assessmentId}/questions/new`)
  )
  assert.equal(new URL(page.url()).searchParams.get("returnTo"), subjectHref)
  await page.getByRole("heading", { name: /New question/i }).waitFor()
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height })
    await assertFits(`contextual-question-create-${width}`)
    await page.screenshot({
      path: `scratch/release-contextual-question-${width}.png`,
    })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(builder.href, { waitUntil: "networkidle" })
  assert.equal(
    await page.locator('[title="Assessment revision"]').innerText(),
    revision
  )
  assert.equal(
    await page.locator("[data-assessment-status]").innerText(),
    status
  )
  await page.getByRole("button", { name: "Subject tests", exact: true }).click()
  await page.waitForURL(
    (url) => url.pathname === new URL(subjectHref, base).pathname
  )

  layouts.push(...(await reviewMcpSettings(page, base, workspace)))
  if (process.env.E2E_SUBJECT_REVIEW_PATH) {
    await reviewSubjectNavigation(
      page,
      base,
      workspace,
      process.env.E2E_SUBJECT_REVIEW_PATH
    )
  }
  if (process.env.E2E_SETTINGS_RECOVERY_REVIEW === "1") {
    await reviewSettingsRecovery(page, base, workspace)
  }
  assert.deepEqual(blocked, [])
  assert.deepEqual(errors, [])
  await writeFile(
    "scratch/release-workflow-browser.json",
    JSON.stringify(
      {
        passed: true,
        subjectHref,
        createHref,
        assessmentId,
        revision,
        status,
        layouts,
        blockedMutations: blocked,
        pageErrors: errors,
        actionTimes,
      },
      null,
      2
    )
  )
  console.log(
    "PASS: Workspace redirect, subject discovery/create/cancel/link-picker, contextual builder/question return and MCP settings; no records saved."
  )
}

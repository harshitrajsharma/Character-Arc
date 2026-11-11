import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import type { Page } from "playwright"

/** Existing assessment only. Temporary form edits are discarded; writes are blocked. */
export async function reviewBuilderSections(
  page: Page,
  base: string,
  workspace: string,
  assessmentId: string
) {
  assert.match(assessmentId, /^[0-9a-f-]{36}$/i)
  const url = `${base}/workspace/${workspace}/assessments/${assessmentId}/edit`
  const errors: string[] = [],
    blocked: string[] = []
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
      return
    }
    await route.continue()
  })
  await page.goto(url, { waitUntil: "networkidle" })
  await page
    .getByRole("heading", { name: "Questions (30)", exact: true })
    .waitFor()
  const revision = await page
    .locator('[title="Assessment revision"]')
    .innerText()
  const section = page.getByRole("region", {
    name: "Linear Algebra",
    exact: true,
  })
  const instructions = await section
    .getByRole("group", { name: "Section instructions", exact: true })
    .innerText()
  assert.match(instructions, /All matrices are real unless stated/)
  const collapse = section.getByRole("button", {
    name: "Collapse section Linear Algebra",
    exact: true,
  })
  assert.ok(await collapse.getAttribute("aria-controls"))
  await collapse.press("Space")
  const expand = section.getByRole("button", {
    name: "Expand section Linear Algebra",
    exact: true,
  })
  assert.equal(await expand.getAttribute("aria-expanded"), "false")
  await section.getByRole("list").waitFor({ state: "hidden" })
  assert.equal(
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .isDisabled(),
    true
  )
  // The most common action stays available when the section is collapsed.
  await section
    .getByRole("button", {
      name: "Add questions to Linear Algebra",
      exact: true,
    })
    .click()
  assert.match(
    await page
      .getByRole("combobox", { name: "Add to section", exact: true })
      .innerText(),
    /Linear Algebra/
  )
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await section
    .getByRole("button", {
      name: "Collapse section Linear Algebra",
      exact: true,
    })
    .waitFor()
  assert.equal(
    await section.getByRole("list").locator(":scope > li").count(),
    30
  )
  await section
    .getByRole("button", {
      name: "Actions for section Linear Algebra",
      exact: true,
    })
    .click()
  assert.equal(
    await page
      .getByRole("menuitem", { name: "Move section up", exact: true })
      .isDisabled(),
    true
  )
  assert.equal(
    await page
      .getByRole("menuitem", { name: "Move section down", exact: true })
      .isDisabled(),
    true
  )
  await page
    .getByRole("menuitem", { name: "Edit section", exact: true })
    .click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click()

  const layouts = []
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      theme === "dark"
    )
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [390, 844],
      [320, 640],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height })
      await section.locator("header").scrollIntoViewIfNeeded()
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }))
      assert.ok(
        dimensions.scroll <= width + 1,
        `document overflow at ${width} ${theme}`
      )
      for (const button of await section.locator("header button").all()) {
        const box = await button.boundingBox()
        assert.ok(
          box &&
            box.width >= 43 &&
            box.height >= 43 &&
            box.x >= 0 &&
            box.x + box.width <= width + 1,
          `section control containment at ${width}`
        )
      }
      const label = section
        .getByRole("button", {
          name: "Add questions to Linear Algebra",
          exact: true,
        })
        .locator("span")
      assert.equal(await label.isVisible(), width >= 640)
      await page.screenshot({
        path: `scratch/section-redesign-${theme}-${width}.png`,
      })
      layouts.push({ theme, ...dimensions })
    }
  }
  // Long instructions and an empty description are local edits only.
  await page.setViewportSize({ width: 390, height: 844 })
  await section
    .getByRole("button", {
      name: "Actions for section Linear Algebra",
      exact: true,
    })
    .click()
  await page
    .getByRole("menuitem", { name: "Edit section", exact: true })
    .click()
  const editor = page.getByRole("dialog")
  const longTitle =
    "Linear Algebra — Matrix methods, projections and vector spaces with a deliberately long section title"
  await editor.getByRole("textbox", { name: /^Title/ }).fill(longTitle)
  await editor
    .getByRole("textbox", { name: /Description/ })
    .fill(
      "Instructions line one.\nInstructions line two.\n" +
        "Read all choices carefully. ".repeat(20)
    )
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click()
  await editor.waitFor({ state: "hidden" })
  const longSection = page.getByRole("region", { name: longTitle, exact: true })
  assert.equal(
    await longSection.getByRole("list").locator(":scope > li").count(),
    30
  )
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  )
  await longSection
    .getByRole("button", {
      name: `Actions for section ${longTitle}`,
      exact: true,
    })
    .click()
  await page
    .getByRole("menuitem", { name: "Edit section", exact: true })
    .click()
  await editor.getByRole("textbox", { name: /Description/ }).fill("")
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click()
  await editor.waitFor({ state: "hidden" })
  assert.equal(
    await longSection
      .getByRole("group", { name: "Section instructions", exact: true })
      .count(),
    0
  )
  // Empty group behavior is exercised without saving a new database section.
  await page
    .getByRole("main")
    .getByRole("button", { name: "Add section", exact: true })
    .click()
  await editor
    .getByRole("textbox", { name: /^Title/ })
    .fill("Unsaved empty section")
  await editor.getByRole("button", { name: "Add section", exact: true }).click()
  const empty = page.getByRole("region", {
    name: "Unsaved empty section",
    exact: true,
  })
  await empty.getByText("No questions yet", { exact: true }).waitFor()
  await empty
    .getByRole("button", {
      name: "Add questions to Unsaved empty section",
      exact: true,
    })
    .click()
  assert.match(
    await page
      .getByRole("combobox", { name: "Add to section", exact: true })
      .innerText(),
    /Unsaved empty section/
  )
  await page.getByRole("button", { name: "Done", exact: true }).click()
  page.once("dialog", (dialog) => dialog.accept())
  await page.reload({ waitUntil: "networkidle" })
  await page
    .getByRole("heading", { name: "Questions (30)", exact: true })
    .waitFor()
  assert.equal(
    await page.locator('[title="Assessment revision"]').innerText(),
    revision
  )
  assert.equal(
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .isDisabled(),
    true
  )
  assert.equal(
    await section
      .getByRole("group", { name: "Section instructions", exact: true })
      .innerText(),
    instructions
  )
  assert.deepEqual(blocked, [])
  assert.deepEqual(errors, [])
  await writeFile(
    "scratch/section-redesign-browser.json",
    JSON.stringify(
      {
        layouts,
        revision,
        questionCount: 30,
        blockedWrites: blocked,
        pageErrors: errors,
        temporaryEditsDiscarded: true,
      },
      null,
      2
    )
  )
  console.log(
    "Builder section review passed: 10 theme/viewport cases, collapse/add/edit and local long/empty states; saved assessment unchanged."
  )
}

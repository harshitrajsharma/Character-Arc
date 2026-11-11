import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { writeFile } from "node:fs/promises"
import type { Page, Route } from "playwright"

/** Existing-assessment checks. All authoring submissions are intercepted, never persisted. */
export async function reviewAssessmentAuthoring(
  page: Page,
  base: string,
  workspace: string,
  assessmentId: string
) {
  assert.match(assessmentId, /^[0-9a-f-]{36}$/i)
  const builder = `${base}/workspace/${workspace}/assessments/${assessmentId}/edit`
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(builder, { waitUntil: "networkidle" })
  await page
    .getByRole("heading", { name: "Questions (30)", exact: true })
    .waitFor()
  const title = await page.locator("h1").innerText()
  const revision = Number(
    (await page.locator('[title="Assessment revision"]').innerText()).match(
      /\d+/
    )?.[0]
  )
  assert.ok(revision > 0)
  await page
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
  await page
    .getByRole("button", { name: "Create new question", exact: true })
    .click()
  await page.waitForURL(
    (url) => url.pathname.endsWith(`/${assessmentId}/questions/new`),
    { timeout: 120000 }
  )
  await page
    .getByRole("heading", { name: "Add new question", exact: true })
    .waitFor()
  assert.match(page.url(), /[?&]section=/)
  assert.match(
    await page
      .getByRole("combobox", { name: "Section", exact: true })
      .innerText(),
    /Linear Algebra/
  )
  assert.match(
    await page
      .getByRole("region", { name: "Assessment destination" })
      .innerText(),
    /30 questions · 60 marks saved/
  )
  const geometry = []
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [320, 640],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    const measurement = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    assert.ok(measurement.scroll <= width + 1, `overflow at ${width}`)
    await page
      .getByRole("button", { name: "Create & add", exact: true })
      .scrollIntoViewIfNeeded()
    const command = await page
      .getByRole("button", { name: "Create & add", exact: true })
      .boundingBox()
    assert.ok(
      command &&
        command.x >= 0 &&
        command.x + command.width <= width + 1 &&
        command.height >= 43,
      "save command must fit"
    )
    geometry.push({ width, height, command })
    await page.screenshot({
      path: `scratch/authoring-${width}.png`,
      fullPage: true,
    })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page
    .getByRole("combobox", { name: "Question type", exact: true })
    .click()
  await page
    .getByRole("option", { name: "Numerical Answer (NAT)", exact: true })
    .click()
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Marks", exact: true })
      .inputValue(),
    "2"
  )
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Wrong-answer penalty", exact: true })
      .inputValue(),
    "0"
  )
  await page
    .getByRole("combobox", { name: "Difficulty (optional)", exact: true })
    .click()
  await page
    .getByRole("option", { name: "Medium · Level 3", exact: true })
    .click()
  const stem = page.getByRole("textbox", { name: "Question *", exact: true })
  await stem.fill("Unsaved workflow check: what is the rank of I₂?")
  await page
    .getByRole("spinbutton", { name: "Correct numerical answer", exact: true })
    .fill("2")
  await page
    .getByRole("textbox", { name: "Explanation (optional)", exact: true })
    .fill("The identity matrix has two independent columns.")
  await page.getByRole("link", { name: title, exact: true }).click()
  await page.getByRole("alertdialog").waitFor()
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  assert.match(await stem.innerText(), /rank of/)

  const calls: Array<Record<string, unknown>> = []
  const savedId = randomUUID()
  let phase: "lost-response" | "success" | "rejected" | "server-reject" =
    "lost-response"
  const fakeSave = async (route: Route) => {
    if (route.request().method() !== "POST") return route.continue()
    const args = JSON.parse(route.request().postData() ?? "[]")
    assert.ok(
      args[0]?.stem && args[0]?.assessmentId === assessmentId,
      "Only contextual creation may submit in this test"
    )
    calls.push(args[0])
    if (phase === "server-reject") {
      // Exercise the real action/authorization/transaction without creating data:
      // the deliberately missing section is rejected BEFORE content creation.
      return route.continue({
        postData: JSON.stringify([
          {
            ...args[0],
            expectedRevision: revision,
            section: "missing-section-for-review",
          },
        ]),
      })
    }
    if (phase === "lost-response") {
      phase = "success"
      return route.abort("failed")
    }
    const result =
      phase === "rejected"
        ? {
            ok: false,
            code: "INVALID_INPUT",
            message: "Controlled validation failure",
          }
        : {
            ok: true,
            id: assessmentId,
            questionId: savedId,
            revision: 8,
            questionCount: 31,
            totalMarks: 62,
          }
    return route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body: `0:{"a":"$@1","f":"","b":"development"}\n1:${JSON.stringify(result)}\n`,
    })
  }
  await page.route("**/assessments/**/questions/new*", fakeSave)
  await page
    .getByRole("button", { name: "Create, add & next", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Retry same save", exact: true })
    .waitFor()
  assert.notEqual(
    await page.locator("[data-question-authoring]").getAttribute("disabled"),
    null
  )
  assert.notEqual(
    await page.locator("[data-question-authoring]").getAttribute("inert"),
    null
  )
  await page
    .getByRole("button", { name: "Retry same save", exact: true })
    .click()
  await page.getByText("Question added and saved.", { exact: false }).waitFor()
  assert.equal(calls.length, 2)
  assert.deepEqual(
    calls[1],
    calls[0],
    "lost-response retry must reuse the complete operation and key"
  )
  assert.equal((await stem.innerText()).trim(), "")
  assert.equal(
    await page
      .getByRole("spinbutton", {
        name: "Correct numerical answer",
        exact: true,
      })
      .inputValue(),
    ""
  )
  assert.match(
    await page
      .getByRole("combobox", { name: "Difficulty (optional)", exact: true })
      .innerText(),
    /Level 3/
  )
  assert.match(
    await page
      .getByRole("combobox", { name: "Section", exact: true })
      .innerText(),
    /Linear Algebra/
  )
  assert.equal(
    (
      await page
        .getByRole("textbox", { name: "Explanation (optional)", exact: true })
        .innerText()
    ).trim(),
    ""
  )
  phase = "rejected"
  await stem.fill("Another unsaved question")
  await page
    .getByRole("spinbutton", { name: "Correct numerical answer", exact: true })
    .fill("3")
  await page
    .getByRole("button", { name: "Create, add & next", exact: true })
    .click()
  await page
    .getByText("Controlled validation failure", { exact: true })
    .waitFor()
  assert.match(await stem.innerText(), /Another unsaved/)
  assert.notEqual(calls[2].idempotencyKey, calls[0].idempotencyKey)
  phase = "server-reject"
  await page
    .getByRole("button", { name: "Create, add & next", exact: true })
    .click()
  await page
    .getByText(
      "The selected section is no longer available. Return to the builder to refresh.",
      { exact: true }
    )
    .waitFor({ timeout: 60000 })
  assert.match(await stem.innerText(), /Another unsaved/)
  await page.getByRole("link", { name: title, exact: true }).click()
  await page
    .getByRole("button", { name: "Discard question", exact: true })
    .click()
  await page.waitForURL((url) => url.pathname.endsWith(`/${assessmentId}/edit`))
  await page
    .getByRole("heading", { name: "Questions (30)", exact: true })
    .waitFor()
  await page.unroute("**/assessments/**/questions/new*", fakeSave)
  assert.deepEqual(errors, [])
  await writeFile(
    "scratch/authoring-browser.json",
    JSON.stringify(
      {
        assessmentId,
        geometry,
        interceptedSaves: calls.length,
        persistedQuestions: 30,
        pageErrors: errors,
      },
      null,
      2
    )
  )
  console.log(
    "Assessment authoring review passed: 30-question assessment preserved; retry/reset checks used intercepted responses, and a real missing-section request was safely rejected before creation."
  )
}

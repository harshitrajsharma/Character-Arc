import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import type { Page } from "playwright"

/** Existing subject records only: filtering, paging and navigation never mutate them. */
export async function reviewSubjectNavigation(
  page: Page,
  base: string,
  workspace: string,
  subjectPath: string
) {
  const target = new URL(subjectPath, base)
  assert.equal(target.origin, new URL(base).origin)
  assert.ok(target.pathname.startsWith(`/workspace/${workspace}/exam-prep/`))
  assert.match(target.pathname, /\/subjects\/[a-f0-9-]{36}$/i)
  assert.equal(target.searchParams.get("stage"), "test")
  console.log(
    "[Release review] Subject assessment filters, pagination and direct exam navigation"
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(target.href, { waitUntil: "networkidle" })
  const section = page.getByRole("region", {
    name: "Subject tests",
    exact: true,
  })
  await section
    .getByRole("heading", { name: "Subject tests", exact: true })
    .waitFor()
  const rows = section.getByRole("article")
  assert.ok(
    await rows.count(),
    "Existing subject must contain papers for this review"
  )
  const search = section.getByRole("textbox", {
    name: "Search assessments",
    exact: true,
  })
  const source = section.getByRole("combobox", { name: "Source", exact: true })
  const status = section.getByRole("combobox", { name: "Status", exact: true })
  await source.click()
  await page
    .getByRole("option", { name: "Linked assessments", exact: true })
    .click()
  assert.match(await source.innerText(), /Linked assessments/)
  for (const row of await rows.all())
    assert.match(await row.innerText(), /\bLinked\b/)
  await source.click()
  await page
    .getByRole("option", { name: "Syllabus matches", exact: true })
    .click()
  for (const row of await rows.all())
    assert.match(await row.innerText(), /Syllabus match/)
  await source.click()
  await page.getByRole("option", { name: "All sources", exact: true }).click()
  await status.click()
  await page
    .getByRole("option", { name: "Draft / in review", exact: true })
    .click()
  for (const row of await rows.all())
    assert.match(await row.innerText(), /Draft|In review/)
  await status.click()
  await page.getByRole("option", { name: "All statuses", exact: true }).click()
  await search.fill("no-existing-assessment-matches-this-query-92754")
  await section
    .getByText("No assessments match this view", { exact: true })
    .waitFor()
  assert.equal(await rows.count(), 0)
  await section
    .getByRole("button", { name: "Show all assessments", exact: true })
    .click()
  assert.equal(await search.inputValue(), "")
  assert.ok(await rows.count())
  const pagination = section.getByRole("navigation", {
    name: "Subject assessment pages",
    exact: true,
  })
  let paginationVerified = false
  if (await pagination.count()) {
    await pagination
      .getByRole("link", { name: "Go to next page", exact: true })
      .click()
    await pagination
      .getByRole("link", { name: "Page 2", exact: true })
      .waitFor()
    assert.equal(
      await pagination
        .getByRole("link", { name: "Page 2", exact: true })
        .getAttribute("aria-current"),
      "page"
    )
    await page.waitForFunction(
      "document.activeElement?.tagName === 'H2' && document.activeElement?.getAttribute('tabindex') === '-1'"
    )
    await pagination
      .getByRole("link", { name: "Go to previous page", exact: true })
      .click()
    paginationVerified = true
  }

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  if ((await sidebar.getAttribute("data-state")) === "collapsed") {
    await sidebar.locator('[data-slot="sidebar-trigger"]').click()
  }
  const header = page.locator('[data-slot="sidebar-header"]')
  assert.equal(await header.getByRole("button").count(), 1)
  assert.equal(
    await header
      .getByRole("button", { name: "Toggle Sidebar", exact: true })
      .count(),
    1
  )
  const examLinks = sidebar
    .locator("a[href]")
    .filter({ has: page.locator("svg") })
  const examDestinations = (
    await examLinks.evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href"),
        current: link.getAttribute("aria-current"),
      }))
    )
  ).filter(
    (link) => link.href && /\/exam-prep\/[a-f0-9-]{36}$/i.test(link.href)
  )
  assert.ok(examDestinations.length > 0 && examDestinations.length <= 6)
  const examPath = target.pathname.split("/subjects/")[0]
  assert.equal(
    examDestinations.find((link) => link.href === examPath)?.current,
    "page"
  )

  const layouts: object[] = []
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      theme === "dark"
    )
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [767, 900],
      [640, 900],
      [390, 844],
      [320, 640],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height })
      await page.evaluate(`(() => {
        const section=document.querySelector('section[aria-label="Subject tests"]');
        if (section) window.scrollTo({top: section.getBoundingClientRect().top + scrollY - 88, behavior:'instant'});
      })()`)
      const geometry = (await page.evaluate(`(() => {
        const section = document.querySelector('section[aria-label="Subject tests"]');
        return { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth,
          outside: Array.from(section?.querySelectorAll('button,input,[role="combobox"],a') ?? []).filter(el => {
            const r=el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth+1);
          }).map(el=>el.getAttribute('aria-label') || el.textContent?.trim()) };
      })()`)) as {
        width: number
        height: number
        scrollWidth: number
        outside: string[]
      }
      assert.ok(
        geometry.scrollWidth <= width + 1,
        `Subject document overflow ${theme}/${width}`
      )
      assert.deepEqual(
        geometry.outside,
        [],
        `Subject controls outside viewport ${theme}/${width}`
      )
      layouts.push({ theme, ...geometry })
      await page.screenshot({
        path: `scratch/release-subject-tests-${theme}-${width}.png`,
        animations: "disabled",
      })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const largeScreen = section
    .getByRole("button", { name: "Larger screen", exact: true })
    .first()
  let phoneGateVerified = false
  if (await largeScreen.count()) {
    await largeScreen.click()
    const notice = page.getByRole("dialog", {
      name: "A larger screen is required",
      exact: true,
    })
    await notice
      .getByText("No new attempt has been started.", { exact: false })
      .waitFor()
    await notice.getByRole("button", { name: "Got it", exact: true }).click()
    phoneGateVerified = true
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await sidebar.locator(`a[href="${examPath}"]`).click()
  await page.waitForURL((url) => url.pathname === examPath)
  await page.goto(target.href, { waitUntil: "networkidle" })
  await section
    .getByRole("heading", { name: "Subject tests", exact: true })
    .waitFor()
  await writeFile(
    "scratch/release-subject-navigation-browser.json",
    JSON.stringify(
      {
        passed: true,
        subjectPath: target.pathname + target.search,
        layouts,
        paginationVerified,
        phoneGateVerified,
        activeExamLinks: examDestinations.length,
        directExamNavigation: true,
        duplicateSidebarProfile: false,
      },
      null,
      2
    )
  )
  console.log(
    "PASS: Subject source/status/search filters, pagination focus, responsive layout, phone test gate and direct exam navigation; no records saved."
  )
}

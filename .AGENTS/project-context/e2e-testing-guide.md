# End-to-End (E2E) Headless Browser Testing Guide

This document establishes the mandatory principles, execution commands, and troubleshooting standards for automated headless browser testing across Character Arc.

---

## 🎯 Purpose & Philosophy

Character Arc integrates complex full-stack Next.js App Router mechanics:
- Next.js Server Actions with Prisma transactions.
- Client-side navigation (`next/navigation` `router.push`).
- Interactive CBT simulation components (fullscreen modes, virtual scientific calculators, timers).
- Diagnostic scorecard visualizations (Question Performance Heatmaps, Sectional Analytics).
- Dual-tier authentication boundaries (private workspace routes under `app/(app)/` vs public unauthenticated routes under `app/`).

Unit tests and schema validations alone cannot verify that these components render properly, that action buttons respond, or that UI layouts adhere to our design tokens. **Automated end-to-end headless browser testing via Playwright is required to prove that features work completely in a real browser environment.**

---

## 🚀 Running the Automated E2E Browser Test

### 1. Prerequisites
Ensure the Next.js development server is running locally:
```bash
npm run dev
# Server should be responding at http://localhost:3000 (or http://127.0.0.1:3000)
```

### 2. Execute the Test Suite
Run the full headless browser test suite via `npx tsx`:
```bash
npx tsx scripts/e2e-browser-test.ts
```

When the user forbids creating fixture assessments, use the existing-assessment authoring review mode instead of the full mutation suite:

```powershell
$env:ASSESSMENT_AUTHORING_REVIEW_ID = '<existing-assessment-uuid>'
npx tsx scripts/e2e-browser-test.ts
```

This explicit mode currently checks the user's 30-question Linear Algebra assessment and its Linear Algebra section. It never enters assessment creation or starts an attempt. It intercepts question-save responses for repeat/reset/retry checks; a deliberately invalid-section request exercises real server rejection before question creation. The saved roster is checked again on return. This is focused browser coverage, not a full persisted creation/grading test pass. Use the normal suite in a separately authorized test environment for that coverage. If Windows sandbox browser cache paths differ, point `PLAYWRIGHT_BROWSERS_PATH` at the existing installed Playwright cache; no extra browser download is needed.

### 3. Safe release review

Credentials now come from ignored `.env.local` or explicit environment variables:
`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_WORKSPACE_SLUG` and optional
`E2E_BASE_URL`. Browser scripts do not contain real credentials or reset accounts.
The fixture-creating suite requires `E2E_ALLOW_MUTATIONS=1`; never enable it in a
personal workspace without explicit authorization. Use a dedicated disposable
database/account for persisted creation, grading and destructive tests.

For the connected Workspace → subject Tests → create/link → builder/question →
subject return journey, set `RELEASE_REVIEW=1` and
`E2E_EXISTING_ASSESSMENT_ID` before running the same entry command. This mode
cancels creation/linking, never starts an attempt and rejects mutation-shaped
Server Action requests. It checks the existing assessment's current saved
revision/status/roster; it must not assume an old draft snapshot is still live.
Only one review mode can be selected at a time. Workflow artifacts are written
to ignored `scratch/release-workflow-*` files. This is not a persisted grading
or create-and-attach certification.

Optional `E2E_SUBJECT_REVIEW_PATH` selects a populated existing subject's
canonical `?stage=test` URL. It checks Source/Status/search filters, local
pagination with heading focus, direct active-exam navigation, the phone test
gate and light/dark layouts at 320/390/640/767/768/844/1024/1440px. Capture the
actual Subject tests heading/rows below the app bar rather than only the page
top. Evidence is saved under ignored `scratch/release-subject-*`.

`npx tsx scripts/verify-authenticated-mcp-browser.ts` signs in through the web
form and reviews the settings/optional subject UI, then uses that verified
session's JWT only in memory for `/api/mcp` header authentication, stateless
initialize, cookie-only/foreign-workspace denial, paged discovery and bounded
`exam.list`, `assessment.list`, `attempt.list` calls. Synchronize the scoped tool
registry first. It creates no key or domain record, never saves cookies/JWTs,
and does not print credential headers. Successful reads create normal ToolRun
audit records. Reports use ignored `scratch/release-authenticated-mcp-*` paths.

Wait for real loading completion and viewport transitions before asserting
geometry. The development-only Next badge can cover a collapsed rail footer
icon: expand the actual sidebar before opening Workspace settings, instead of
forcing a click through the overlay. Never reset or delete real user data to
make browser verification pass.

Optional `E2E_SETTINGS_RECOVERY_REVIEW=1` adds one controlled HTTP 503 for the
settings read only. It verifies a visible Retry state, disables key creation
while data is unavailable, and retries the real authorized read without a
login redirect or key changes. It does not simulate an authenticated identity
or change the server's saved settings. The report is
`scratch/release-settings-recovery-browser.json`.

---

## 🛠️ Key Browser Automation Best Practices for Agents

### 1. Playwright Setup in Node.js
Always launch Chromium with headless mode enabled and sandboxing flags for CI/CLI stability:
```ts
import { chromium, type Page, type BrowserContext } from "playwright"

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
```

### 2. Intercepting Next.js SPA Client Transitions
> [!WARNING]
> In Next.js App Router, client-side route transitions (`router.push`) use browser History API state (`pushState`). They do NOT emit an HTTP document navigation `commit` event.
> **Never use `waitUntil: "commit"` with `page.waitForURL(...)` on SPA transitions**, as this will timeout.

**Correct Pattern:**
```ts
// Wait for URL predicate directly
await page.waitForURL((url) => url.pathname.includes("/mock-tests/"), {
  timeout: 30000,
})

// Or await a specific unique DOM element on the target page
await page.waitForSelector('h1:has-text("Mock Tests & Assessments")', {
  timeout: 30000,
})
```

### 3. Awaiting Server Action Completion via Toasts
When forms invoke async Server Actions (e.g., saving an assessment blueprint, adding question items, or publishing), do not rely solely on button spinner states. Instead, await the explicit Sonner confirmation toast:
```ts
// Click save
await page.click('button:has-text("Save Paper")')

// Reliably wait for server action success toast
await page.waitForSelector('text="Mock test saved"', { timeout: 60000 })
```

### 4. Testing Public / Unauthenticated Views (Incognito Context)
To verify that public landing pages (such as `/mock-test/share/[assessmentId]`) are accessible to anonymous guests without being intercepted by authentication redirects:
```ts
// Create an isolated fresh browser context with NO cookies or local storage
const incognitoContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const incognitoPage = await incognitoContext.newPage()

// Navigate directly to public URL
await incognitoPage.goto(`http://127.0.0.1:3000/mock-test/share/${assessmentId}`, {
  waitUntil: "domcontentloaded",
})

// Assert unauthenticated components exist (e.g. public leaderboard, Take Mock Test CTA)
await incognitoPage.waitForSelector('text="Cohort Test Leaderboard"', { timeout: 15000 })
await incognitoContext.close()
```

### 5. Capturing Visual Inspection Artifacts
Whenever running tests, capture full-page screenshots at key milestones into `scratch/screenshots/` and inspect them using `view_file` to confirm visual QA, alignment with the Character Arc design system, and responsive layout fidelity:
```ts
const filepath = path.join(SCREENSHOT_DIR, `${stepName}.png`)
await page.screenshot({ path: filepath, fullPage: true })
```

---

## 📋 Comprehensive Test Journey Covered

### Existing-assessment section review

For the section header/instructions redesign, set
`ASSESSMENT_SECTION_REVIEW_ID` to the existing Linear Algebra assessment UUID
before running `npx tsx scripts/e2e-browser-test.ts`. Do not set the authoring
review variable simultaneously. This mode checks the saved 30-question group,
collapse/add targeting, management cancellation, ten light/dark viewport cases,
long/blank instructions and an unsaved local empty section. It blocks Server
Action requests containing revision/idempotency mutation fields and discards
temporary local edits on reload, then verifies the original revision and roster.
It creates no assessment, question or attempt. Browser screenshots and results
are written under ignored `scratch/section-redesign-*`; this focused mode does
not replace persisted grading tests in an authorized fixture environment.

The automated suite in `scripts/e2e-browser-test.ts` executes and validates the following 8 phases:
1. **User Authentication:** Form filling, redirect verification, workspace hydration.
2. **Dashboard Overview:** Zero-CLS KPI metrics cards, filter ribbon, empty paper state.
3. **Blueprint Creation:** Full metadata taxonomy (format, target exam, subjects, pacing, calculator toggle).
4. **Assessment Builder:** Section composition, question selection from bank, draft persistence with toast verification.
5. **Publishing:** Question threshold validation, state transition to `PUBLISHED`, and detail view action bar.
6. **CBT Exam Room Simulation:** Fullscreen exam player, virtual scientific calculator keypad toggling, answering MCQ questions, submit confirmation dialog.
7. **Scorecard Diagnostics:** Automated scoring (`2/2 (100%)`), Question Performance Heatmap, sectional breakdown, step-by-step solution derivations.
8. **Community Distribution:** Share modal configuration (Private -> Community Hub with clone permissions), followed by incognito public verification of syllabus and live cohort leaderboard.


### Local development stability (2026-10-19)
- This workstation exhausted disk space through Turbopack's generated persistent cache. `next.config.ts` disables optional `experimental.turbopackFileSystemCacheForDev`; production build caching is unchanged. In-memory dev compilation remains available. Do not delete user/project source files to recover cache space.
- The full harness allows 90s for cold navigations and 60s for publication completion. Sharing selects the named Share assessment dialog rather than every role=dialog (Next's development overlay may also contain a dialog). Visibility uses native radios; select Community Hub by its radio name and save with Save settings. The overview checks effective question marks, inline candidate instructions, personal history and refreshed saved visibility before anonymous landing verification.
- The anonymous public-paper phase must assert the actual fixture heading and fail on a login redirect; merely taking a screenshot is not sufficient evidence.
- After moving routes, run `next typegen` before `tsc --noEmit` if generated `.next/types/validator.ts` still references an old path.
- The overview phase also expands Score trend for the suite's single evaluated attempt, verifies that its selected percentage/review destination match the recorded latest result, and asserts that one result does not render a comparison plot. Do not assume the automated answers earn 100%; bank question formats can differ. The separate score-trend browser matrix covers multi-result selection, mobile/light/dark layouts, negative/zero scores, contrast and scoped rendering failure; see [score-trend-ux-plan.md](./score-trend-ux-plan.md).

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

### 3. Resetting Test Data (Clean Slate)
If you need to test the journey from an empty state (0 mock tests / 0 attempts):
```bash
npx tsx --env-file=.env.local scratch/clean-assessments.ts
```

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
- The full harness allows 90s for cold navigations and 60s for publication completion. Sharing selects the named Publish & Share Mock Test dialog rather than every role=dialog (Next's development overlay may also contain a dialog).
- The anonymous public-paper phase must assert the actual fixture heading and fail on a login redirect; merely taking a screenshot is not sufficient evidence.
- After moving routes, run `next typegen` before `tsc --noEmit` if generated `.next/types/validator.ts` still references an old path.

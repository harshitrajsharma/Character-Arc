# Mock Tests & Community Hub Architecture

This document describes the design, data contracts, security boundaries, and UI/UX conventions of the **Mock Tests (`core.mock-tests@1.0.0`)** tool and its **Community Hub** platform.

---

## 🎯 Architecture Vision

The Mock Tests tool transforms messy study and practice habits into measurable examination performance. It serves two distinct layers:
1. **Private Workspace Assessment Engine:** Private test creation, section assembly, automated scoring, real-time CBT exam room simulation, and diagnostic performance analytics.
2. **Community Hub & Cohort Layer:** Public and unlisted test distribution, cross-workspace test discovery, live cohort leaderboards, and safe 1-click workspace cloning.

---

## 🏗️ Data Model & Contracts

### 1. Blueprint Schema (`Assessment.blueprint`)
All paper-level configuration, taxonomy, and distribution rules are stored in the JSON `blueprint` field:

```ts
export type AssessmentBlueprint = {
  // Section layout for CBT interface
  sections?: Array<{
    key: string
    title: string
    description?: string | null
  }>

  // CBT Virtual Calculator toggle (TCS iON style)
  calculatorAllowed?: boolean

  // 3-tier visibility control
  visibility?: "private" | "unlisted" | "public"

  // Forking / Cloning permissions (defaults to true)
  allowCloning?: boolean

  // Generic Competitive Taxonomy (Never hardcoded to a single exam)
  taxonomy?: {
    paperType?: "full_length" | "subject_wise" | "topic_wise" | "pyq"
    subjectScope?: "single_subject" | "multi_subject"
    subjects?: string[]
    examTag?: string | null // e.g. "GATE CS 2026", "JEE Advanced", "UPSC CSE"
  }
}
```

### 2. Supported CBT Question Kinds
Strictly limited to automatically evaluable question types replicating computer-based competitive exams:
- `SINGLE_CHOICE` (MCQ): Exactly 1 correct option. Full marks for correct, negative marks penalty for wrong.
- `MULTIPLE_CHOICE` (MSQ): Multiple correct options. Requires exact set match. No negative marking in standard Indian CBT.
- `NUMERIC` (NAT): Numerical answer with absolute or relative tolerance. No options; candidate enters number via virtual keypad.
- **Short Answer questions are explicitly disallowed** because they cannot be graded deterministically by the CBT engine.

---

## 🛠️ Tool Registry & Actions

All mutations are registered in `lib/tools/definitions/mock-tests/manifest.ts` and executed via `lib/tools/execute-tool-action.ts`:

1. `assessment.create`: Creates a draft assessment and root Block.
2. `assessment.update`: Updates title, duration, marks, instructions, benchmarks, and blueprint (including visibility and taxonomy).
3. `assessment.add-questions`: Sets the question roster, sections, marks, and negative marks.
4. `assessment.reorder-questions`: Safe two-phase question reordering.
5. `assessment.publish`: Validates question count (min 1) and transitions status to `PUBLISHED`.
6. `assessment.clone`: Deep copies an assessment and its questions into the calling workspace:
   - Verifies that the source paper is public, unlisted, or in the same workspace.
   - Deep duplicates the `Assessment` and `Block` with `DRAFT` status and `private` visibility.
   - Deep duplicates all `Question`, `QuestionOption`, and `QuestionSolution` rows into the target workspace so the user owns their questions and can edit them safely.
7. `attempt.create`: Starts a new timed test session.
8. `attempt.record-answer`: Records an answer in real time.
9. `attempt.submit`: Finalizes the attempt and invokes automated grading.

---

## 🎨 UI/UX & Design System Conventions (80/20 Rule)

Future agents working on the Mock Tests frontend MUST adhere to the following:

### 1. Palette & Accents
- **80% Neutral Base:** White cards (`bg-card`), neutral page canvas (`bg-background`), hairline zinc dividers (`border-border`), and solid black primary commands (`bg-foreground text-background font-bold`).
- **20% Purposeful Accents:**
  - **Sky Blue:** Full-Length Mocks (`border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300`).
  - **Emerald:** Subject Tests (`border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`) and high percentiles.
  - **Warm Amber:** Topic Drills (`border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`) and #1 Gold Medal rank.
  - **Cyan:** PYQ papers (`border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300`) and Calculator flag.
  - **STRICTLY ZERO violet or purple accents** in the Mock Tests tool.

### 2. Geometry & Radii
- Use pill geometry (`rounded-full`) for badges, chips, and segmented buttons.
- Use 8px/12px geometry (`rounded-lg` or `rounded-xl`) for cards, input fields, and panels.
- Do NOT use bubbly 24px/32px rounded corners on regular cards.

### 3. Dashboard Navigation & Layout
- The dashboard employs an integrated **Segmented Tab Switcher**:
  - `My Workspace Tests` (shows user's private/workspace tests)
  - `Community Hub` (shows public tests across all workspaces)
- Tab state is synchronized with `?tab=community` via `window.history.replaceState` and server `searchParams`.
- The 4 KPI metric cards preserve exact layout dimensions in both tabs to guarantee **zero Cumulative Layout Shift (CLS)**.
- Unified filter ribbon: Universal search + Paper Type pills + Secondary selects.

---

## 🌐 Assessment Route Architecture (`/assessments/[attemptId]` & `/workspace/[slug]/assessments`)

1. **Route Placement Inside `app/(app)`:**
   - Both workspace-scoped and global assessment routes are consolidated under `app/(app)`:
     - **Workspace Assessment Engine:** `app/(app)/workspace/[workspaceSlug]/assessments/` (`/assessments`, `/assessments/new`, `/assessments/[assessmentId]`, `/assessments/[assessmentId]/edit`, `/assessments/questions`, `/assessments/attempts/[attemptId]/analysis`).
     - **CBT Exam Room (`app/(app)/assessments/[attemptId]/page.tsx`):** Renders with a fullscreen overlay (`cbt-exam-root light fixed inset-0 z-50 overflow-hidden`) that takes full control of the viewport during an examination while retaining Next.js route integration.
     - **Community Share Landing (`app/(app)/assessments/share/[assessmentId]/page.tsx`):** Seamlessly integrates with the App Shell (`Navbar`, breadcrumbs, workspace context) and provides 1-click cloning and instant practice.
   - **Redirects & Typo-tolerance (`next.config.ts`):** 
     - `/mock-test/:path*` $\rightarrow$ `/assessments/:path*`
     - `/assesments/:path*` $\rightarrow$ `/assessments/:path*`
     - `/workspace/:slug/mock-tests/:path*` $\rightarrow$ `/workspace/:slug/assessments/:path*`
     - `/workspace/:slug/mock-test/:path*` $\rightarrow$ `/workspace/:slug/assessments/:path*`
     - `/workspace/:slug/assesments/:path*` $\rightarrow$ `/workspace/:slug/assessments/:path*`
2. **Paper Classification Boundary:**
   - Paper classification (Paper Type, Exam Tag, Subjects, Duration, Scientific Calculator toggle) belongs strictly in the **Blueprint / Assessment Builder phase** (`/assessments/new` and `/assessments/[assessmentId]/edit`).
   - The Share dialog (`ShareAssessmentDialog`) manages **Audience & Distribution** (Private, Shared via Link, Community Hub) and **Forking / Cloning permissions** (`allowCloning`), displaying the classification tags as read-only informational context.
3. **Automated Verification:**
   - The full lifecycle (Draft -> Questions -> Publish -> CBT Exam Room -> Virtual Calculator -> Submission -> Evaluated Scorecard -> Share to Community -> Incognito Landing Page) is verified end-to-end via Playwright in `scripts/e2e-browser-test.ts`.

---

## 🎴 Unified Test Profile Hero Card (`TestProfileHeroCard`)

Both the **Workspace Test Profile** (`/workspace/[slug]/assessments/[assessmentId]`) and the **Public Community Share Page** (`/assessments/share/[assessmentId]`) share the exact same **Monolithic Segmented Card** architecture (`components/tools/mock-tests/detail/test-profile-hero-card.tsx`):

1. **Outer Shell:**
   - `overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border antialiased`
2. **Segment 1 — Taxonomy & Identity:**
   - Top taxonomy bar: Paper Type pill (Sky for Full-Length, Emerald for Subject Test, Amber for Topic Drill, Cyan for PYQ), Exam Tag chip, Calculator allowance pill, Status/Revision pill (workspace) or Verified Community Paper badge (public), and publication timestamp.
   - Title in Plus Jakarta Sans (`font-heading font-bold text-2xl sm:text-3xl`).
   - Description / Instructions with rich HTML support.
   - Subject chips and Author attribution with avatar.
3. **Segment 2 — 4-Column Key Metrics Grid:**
   - `grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border bg-muted/15`.
   - Col 1: Questions & Structure (`FileTextIcon`, count in JetBrains Mono font, section breakdown in subtext).
   - Col 2: Duration & Pacing (`ClockIcon`, duration in mins or Untimed, dynamic pacing estimate `~Xm/q` in subtext).
   - Col 3: Maximum Marks (`TargetIcon`, formatted marks, standard negative marking subtext).
   - Col 4: Performance Cut-offs (passing % / distinction % in workspace mode) or Cohort Attempts & Avg Score % (in public mode).
4. **Segment 3 — Integrated Action & State Ribbon:**
   - Left: Active attempt banner if `in_progress` attempt exists (with timer icon and "Resume Attempt →" CTA), or contextual readiness status.
   - Right: High-contrast primary CTA (`bg-foreground text-background font-bold hover:bg-foreground/90 rounded-xl`) with secondary actions (`Edit Paper in Builder`, `Share & Distribute`, or `Clone to My Workspace`).
5. **Workspace 65/35 Split:**
   - Left Column (65%): Question Paper Roster (`QuestionPaperRoster`) with search, filter chips, and question preview.
   - Right Column (35%): Segmented Sidebar Card combining Score Trajectory Graph (Sky/Emerald palette), Blueprint Distribution, and Candidate Attempt History.


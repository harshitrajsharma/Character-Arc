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


### Assessment detail segmented layout (2026-10-18)
- The workspace assessment hero owns the full-width score trajectory as its final segment, after identity, metrics, and actions. Its optional children slot is workspace-only; public papers do not display private attempt history.
- Keep section blueprint and Attempt History in the sidebar beside the question paper. Render the score graph only once.
- The question-paper toolbar groups its heading/counts above responsive search and expansion controls. Search has an accessible label and a named clear action.
- Header identity separates publication/type from calculator metadata; metric borders adapt to two-column mobile and four-column desktop layouts.

### Assessment overview (2026-10-18)
- The workspace detail page contains the segmented assessment overview and percentage trajectory, topic coverage, and compact attempt history. Question stems/options are no longer rendered here; authoring and post-attempt review retain their own views.
- Coverage uses active workspace-scoped QuestionTarget blocks, deduplicates questions within each target, and explains overlapping counts. Missing mappings are explicit. A bounded three-level traversal of explicit syllabus relations provides subject/chapter context and links to a subject in Exam Prep when an exam relation exists; titles never imply coverage.
- Current question-mark sums are shown separately from a mismatched configured paper total. No stored marks are rewritten.
- Trajectory includes only evaluated attempts with known positive maximum marks. Values are score/maxScore percentages, not accuracy. Different totals carry a comparability notice; raw score deltas and personal-best claims were removed. History retains original score denominators and actual accuracy, including unknown values.
- History is newest first, with Review for submitted/evaluated attempts and Resume only for in-progress attempts. The header suppresses Start when an ongoing attempt exists.

### Question bank responsive UX (2026-10-19)
- `/workspace/[workspaceSlug]/assessments/questions` uses one segmented summary (2 columns on mobile, 4 on desktop) and one divided question list. Search and filters remain unframed; do not add cards around every section. Use existing neutral/cyan semantic tokens and success tokens only for correct answers.
- Below the large breakpoint, filters and sorting are behind a labeled disclosure with active-setting count. Desktop controls remain visible. Fields have labels, Select receives item labels, and mobile controls/options have 44px targets. Leave clearance for the fixed bottom navigation.
- The single creation action belongs in the header for populated banks and in the empty state for empty banks. Navigation uses Link semantics with buttonVariants. Viewer permissions suppress editing/creation.
- Scan rows prioritize question text, type, difficulty, paper usage, and update date. Preview buttons expose aria-expanded/aria-controls, complete prompts, all topics, explicit correct-answer text, and solutions. Wide math/tables scroll within previews. Avoid nested decorative cards.
- Search trims whitespace and matches visible question/option/solution text and topics. Sorting supports newest/oldest creation, recent updates, difficulty (unset last), and usage. Question-bank pagination now uses bounded server queries; see the pagination update below for URL filters, page sizes, and count semantics.


### Question bank card interactions and server pagination (2026-10-19)
- Each question summary is one full-area native disclosure button with aria-expanded/aria-controls and a visible keyboard focus outline. Edit is a separate link above the disclosure hit area; expanded answer/solution content is outside that area. Do not add nested buttons or a click handler to the entire article.
- Difficulty badges include Easy (levels 1–2), Medium (3), Hard (4), and Advanced (5), plus the original level. Cyan, amber, and neon semantic tokens distinguish difficulty; unset stays neutral. Meaning is always written in text.
- Topics occupy the left side of a full-width footer; paper usage and update date align right. Small screens stack these groups. Existing topic truncation/all-topics-on-preview behavior remains.
- The questions route verifies workspace membership and active installation before getQuestionBankPage. This new bounded Prisma query leaves the builder’s getQuestionBank function unchanged. Eligible questions remain DRAFT/PUBLISHED in the verified workspace.
- URL parameters: q, type, difficulty, usage, sort, page, size. Supported sizes are 10, 20 (default), and 50. Inputs are validated, pages clamp to valid bounds, all sorts include an ID tie-breaker, unset difficulty sorts last, and numerical answer zero is preserved.
- Search is submitted with Enter or the inline Search control, rather than sending requests on every keystroke. Database search uses case-insensitive contains on stored question/options/solution text and target titles; it does not strip HTML before matching. A future searchable plain-text field may improve rich-content phrase matching.
- Filters/search/size changes reset to page 1. Previous/Next controls show page count and result range; pending requests disable paging. Summary metrics describe the entire bank, independent of active filters. Do not restore client-only slicing or Show more as the bank’s pagination.

### Question bank pagination and preview depth follow-up (2026-10-19)
- The pager reuses the existing shadcn Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext and PaginationEllipsis primitives. No duplicate pagination component was added. Number links preserve URL filters, expose aria-current, and retain native modifier-click behavior; bounds and pending state use aria-disabled. Mobile hides neighboring numbers/ellipsis while retaining first/current/last and 44px targets.
- Question previews use bg-surface-inset plus inset-shadow-recessed to reveal a recessed well below the bg-card summary. Answer choices use a card surface inside that well, with existing success styling for correct choices.
- Expanded question-bank rich content uses horizontal-only overflow with additional vertical padding when inline KaTeX is present. This accommodates fractions that extend beyond the line box, preventing vertical scroll controls and clipped answers. Keep the collapsed prompt’s line clamp separate from expanded content.

### Question bank type and equation readability (2026-10-19)
- Type badges pair labels/icons with cyan for MCQ, neon for MSQ, amber for NAT; legacy kinds retain a neutral fallback. Difficulty keeps its own explicit label and level.
- Expanded preview math is 24px, scoped to KaTeX roots; a targeted important utility is needed because the vendor KaTeX stylesheet is unlayered. Inline-math content receives 12px vertical padding so fractions remain unclipped inside horizontal scrollers. Collapsed summaries and the exam player are unaffected.
- The Per page menu now composes existing shadcn Select/Trigger/Value/Content/Group/Item primitives, with named item values, collision-aware placement and 44px trigger/options. Page-size changes retain filters and reset to page1.


### Question authoring segmented workflow (2026-10-19)
- New/edit question forms use one divided card: Question setup, Question, Answer and key, Explanation. Setup uses labeled shadcn type/difficulty Selects plus optional syllabus coverage. Explanation starts collapsed for new questions; hiding it preserves its content.
- Edit/Preview work at every width; Split is desktop-only at 1280px and above. Preview avoids nested vertical scrolling. One sticky save footer clears mobile navigation. Save & return navigates to the bank/builder; Save & add another resets fields, targets and idempotency key on success.
- Formatting belongs in each rich editor toolbar, without duplicate outer snippet/preset toolbars. Labeled bulk entry sits beside rendered, keyboard-operable answer-key controls. MCQ/true-false retain one key; MSQ allows multiple. Removing options removes stale keys. Every displayed choice must be completed or removed before saving.
- The option parser preserves empty A-D markers, CRLF/tab-delimited markers, multiline math and a final bare marker without consuming the following option. Formatting preserves blank default templates.
- Topic selection uses one labeled checkbox event source. Weight and primary controls sit outside its label and must not toggle selection. Search resets on reopen; selections persist. Item types are explicit; coverage copy describes actual assessment/topic links without promising automatic proficiency updates.
- Numeric guidance reflects existing scoring tolerance (1% relative or 0.01 absolute, whichever is larger). Zero remains valid. Inline validation returns focus to missing prompt/answer content. Server Actions, persistence contracts, scoring and workspace authorization are unchanged.


### Editable math and image authoring (2026-10-19)
- Balanced dollar-delimited values, including numeric $100$, render as math. Unclosed currency and escaped dollars remain literal; code blocks/marks stay untouched. The shared tokenizer supplies source ranges to ProseMirror normalization.
- The lightweight editor normalizes loaded, externally synced, typed and mixed pasted formulas into editable inline/display atoms. Transactions preserve marks, valid block/list structure and mapped selections. Math editing opens the existing LaTeX dialog. Editor equations use 24px KaTeX roots; bulk options remain source text with rendered answer previews.
- Empty-content checks recognize equation-only/image-only HTML; validation and payload building must not strip these nodes as empty.
- Image toolbar supports validated file uploads and HTTPS URLs with required descriptions. Uploads use the new private Supabase Storage integration expressly authorized by the user. Setup, read access and lifecycle limits are documented in [question-image-storage.md](./question-image-storage.md). Do not expose service credentials or switch to a public bucket.


### Existing question saves and historical attempts (2026-10-19)
- Question-content synchronization retains option IDs by key and stages positions before reordering; referenced choices are not deleted. This fixes option-FK errors on ordinary edits.
- Since historical attempts currently read live question content rather than immutable question snapshots, substantive stem/type/option/key/solution changes are rejected once any attached paper has a started attempt (including unanswered questions). Create a new question for changed assessment content. Difficulty and syllabus targets may still update.
- Equivalent legacy-to-rich-editor paragraph/math serialization is allowed through a narrow canonical comparison. Such saves preserve original stored strings, option IDs and the entire existing solution/grading configuration; they do not rewrite historical content.


### Public paper landing boundary (2026-10-19)
- The `/assessments/share/[assessmentId]` landing page now lives under `app/(public)`, outside the unconditional authenticated `(app)` layout. Its URL is unchanged. Anonymous readers skip workspace-shell loading; signed-in users may load their workspace context after optional verified claims.
- Workspace pages, CBT attempts and mutation actions retain their existing authentication requirements. Public-page access still depends on paper visibility/status. Browser verification confirms public heading access without login, private workspace/attempt redirects, and unknown-paper 404.

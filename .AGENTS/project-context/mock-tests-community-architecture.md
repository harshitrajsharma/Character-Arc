# Mock Tests & Community Hub Architecture

This document describes the design, data contracts, security boundaries, and UI/UX conventions of the **Mock Tests (`core.mock-tests@1.2.0`)** tool and its **Community Hub** platform.

The November 2026 release connects this canonical assessment model to Exam Prep
subject/chapter Tests using the existing typed `Assessment.examBlockId` context.
Create/link, take/resume, evaluated review and validated return navigation are
documented in [subject assessment integration](./subject-assessment-integration.md).
Agent inventory and privacy boundaries live in [MCP readiness](./mcp-production-readiness.md).

---

## 🎯 Architecture Vision

The Mock Tests tool transforms messy study and practice habits into measurable examination performance. It serves two distinct layers:
1. **Private Workspace Assessment Engine:** Private test creation, section assembly, automated scoring, real-time CBT exam room simulation, and diagnostic performance analytics.
2. **Community Hub & Cohort Layer:** Public and unlisted test distribution, cross-workspace test discovery, live cohort leaderboards, and safe 1-click workspace cloning.

---

## 🏗️ Data Model & Contracts

### Shared app question presentation (2026-10-29)

The app's question bank, picker, builder, author previews and attempt review compose the `components/tools/mock-tests/questions/` family. QuestionCard owns the frame/disclosure/actions; QuestionView and its parts own metadata, rich content, choices and authorized solutions; AuthorQuestionPreview owns ephemeral practice response/reveal; QuestionReviewSummary supplies content/outcome/score/time/answer comparison for collapsed review. Presentation DTOs are independent of forms and repositories. Callers retain authorization, scoring, persistence and navigation. Solutions are explicit authorized props and never inferred from extra properties on a source question object. Full inventory, migration decisions and verification live in [question-presentation-plan.md](./question-presentation-plan.md). The dormant QuestionPaperRoster was subsequently removed; the live assessment detail page uses coverage, trajectory and attempt history.

The actual TCS iON player and in-exam paper dialog are explicitly outside this app-card family and retain their design and response behavior. No database, tool action or scoring contract changed for this consolidation.

### Shared assessment presentation boundaries (2026-10-29)

- Workspace detail uses a lean, authenticated getAssessmentOverviewAction plus optionally paper-filtered getAttemptHistoryAction. Metadata, effective question marks, grouped sections and ten-area coverage pages exclude question content and solutions. Each area's single context path is bounded to three same-workspace parent edges. Active attempt, latest evaluated result and latest five valid scored results are personal queries independent of paged history; real history totals and stable startedAt/id order remain visible. The five-result trend bound is shared with its presentation model. No grading/registry/schema contract changed.
- AssessmentPanel shares the segmented surface, while AssessmentOverviewCard owns workspace capabilities and TestProfileHeroCard owns only public discovery/acquisition. Drafts continue in the builder; viewers/archived papers do not offer mutation controls; zero-question papers cannot start. Full candidate instructions are inline. Section entries share one continuous segment. The final single flex metadata row places author/update/time/revision left and type/publication/visibility right. Marking/targets are labeled values. History and coverage share the URL/focus pagination controller, with independent page keys; initial skeleton, scoped history retry and a route error view complete loading/error states.
- Share assessment uses native labeled visibility radios, an accessible cloning switch/link field and a short-height-safe scrolling form with 44px commands. Cancelled edits reset on a new form session; saved settings revalidate through the existing action. The optional score trend compares five dated, percentage-labeled columns using the existing Chart/Recharts integration. It has keyboard/touch selection, native Prev/Next, an exact selected-result/review panel, percentage-point change and a mixed-total warning. Current targets stay in the marking section. Legacy positive penalty values are displayed according to the grader's existing clamp to zero, without rewriting stored data. Detailed chart requirements live in [score-trend-ux-plan.md](./score-trend-ux-plan.md).

- `assessment-metadata-fields.tsx` owns typed title, labels, timing/calculator, instructions and benchmark fields. Creation and BlueprintFormFields compose those parts with independent layouts, IDs, disclosure state and save controllers. `assessment-metadata-model.ts` centralizes normalization and validation; builder validation adapts its errors into existing focusable issue IDs. Creation still redirects to a new draft; builder still owns revision-aware metadata/roster saves and partial-failure recovery.
- Taxonomy constants live in the small `assessment-paper-types.ts` module. Rich editor skeletons are leaf components, so field placeholders do not statically import the editor.
- `components/shared/pagination-controls.tsx` and `lib/forms/pagination.ts` own visual navigation and bounded page windows. Library, attempt history and bank retain their own local/URL data paging and post-navigation focus timing. Pending/disabled links cannot navigate, including modified clicks; enabled links retain native modified-click behavior.
- `components/shared/filter-select-field.tsx` owns labeled Select composition; library and bank retain distinct filter controllers and responsive toolbars.
- `attempt-presentation.tsx` shares status, score and authorized destination presentation among workspace history, paper history and subject-linked attempts. Explicit IST formatting in `lib/dates/attempt-date.ts` avoids cross-surface date drift. Manual external results and scheduled plans remain separate domain records.
- No schema, Server Action contract, authorization, scoring or exam-player changes were introduced. The app-wide reuse audit records cleanup and intentional separations.

### Attempt analysis target comparison (2026-11-06)

AnalysisScorecard delegates its contained comparison pane to AnalysisBenchmark. It shows the server-supplied score percentage, an explicit target outcome, a bounded 0–100% Progress with target ticks and two labeled target summaries with percentage-point gaps. Met targets use text/icons and semantic success tokens; unmet targets use neutral/attention language. The rest of the segmented scorecard remains composed by AnalysisScorecard.

Targets are the assessment's **current** settings supplied by the existing analysis repository (33/70 defaults), not a historical target snapshot or official exam qualification. Equality counts as met; pending evaluation, non-finite scores, zero scorable marks and invalid/reversed targets do not produce a passed-target claim. Negative/over-100% percentages remain explicit in text and aria-valuetext while the graphic clamps to its labeled scale. This is presentation only: no score, grading, authorization, database or tool contract changed. Unit/render coverage checks comparison boundaries and unavailable states; responsive visual checks cover light/dark phone, tablet and desktop. Final evidence is recorded in PROJECT_LOGS.md.

### Builder question picker follow-up (2026-10-29)

The builder's section group uses `BuilderQuestionSection` for a title/totals
header, explicit collapse, direct section-targeted Add questions, secondary
management actions, labeled inline instructions and a padded question roster.
It owns presentation only; assessment-builder retains local edits, ordering,
collapse state and persistence. Blank instructions omit that segment and empty
groups show an add-content hint. This November 2026 refinement preserves the
existing question presentation, section/data contracts and live player.

#### Assessment-origin authoring audit (2026-11-10)

The original 30-question Linear Algebra authoring session exposed return-navigation-only use of `fromAssessmentId`. The approved follow-up now routes assessment-origin creation through `/assessments/[assessmentId]/questions/new`, with authorized assessment/section context around the same QuestionForm. Mock Tests 1.1.0 adds `assessment.create-question`: the authenticated Server Action and existing tool pipeline atomically save reusable content/solutions/targets plus its allocation and revision, with idempotent replay, compare-and-swap revision checks, workspace/installation/agent-access checks, section validation, no-existing-attempt protection and the 200-question limit. The registry synchronization script upgrades active installations; there is no schema migration or SQL/RPC path.

Create & add returns to the saved row; Create, add & next retains per-kind allocation/section defaults and optional difficulty reuse while clearing content/answers/targets and updating saved progress. Unknown save outcomes retain the operation key and freeze inputs for a same-operation retry; known validation/revision failures retain authored content for correction. Bank-origin creation remains bank-only; existing-content editing remains shared-content editing. The picker has explicit batch scores and carries its section through contextual creation. The complete journey, implementation and existing-assessment-only browser verification are recorded in [assessment-authoring-workflow-audit.md](./assessment-authoring-workflow-audit.md). The user's saved private Linear Algebra draft remains the only assessment used for this work.

The picker now has viewer/workspace/query-keyed TanStack Query caching, assessment-scoped UI memory, scroll restoration, skeleton/error/refresh states, shared author preview, individual and batch additions and compact short-height-safe layout. Question creation/editing invalidates the workspace bank prefix. Memory is client-only and is not persisted to browser storage. Explicit section targets and the parent roster's current ID set remain authoritative; selection alone never adds or saves a question.

The private `getBuilderQuestionBankAction` returns `BuilderQuestionBankPageData` (bank/filteredTotal/page/pageSize/totalPages/filters) through `getQuestionBankPage(..., { includeStats: false })`. This avoids the four unused dashboard counts. Default question-bank routes still receive the full statistics projection. Authorization, Prisma-first access, supported kinds, stable paging and existing assessment save actions are unchanged. Full behavior, tradeoffs and acceptance coverage: [builder-question-picker-ux-plan.md](./builder-question-picker-ux-plan.md).

### On-demand question syllabus picker (2026-10-29)

- New/edit QuestionForm no longer preloads the latest300 chapters/topics. Removed getTargetableBlocks and its obsolete DTO after checking callers. New forms load no syllabus list; edit forms receive only the question's existing targets and their labels from the authorized question-detail read. Selected metadata stays with local selection state, independent of result pages, and supplies chips/preview labels. Saves still send only blockId/weight/isPrimary; names/type/parent context never become trusted mutation fields.
- getSyllabusPickerPageAction validates workspace slug, search (max200 characters), chapter/topic filter and optional timestamp/UUID cursor, then verifies claims, workspace membership and the active Mock Tests installation via getMockTestsActionContext. The Prisma read scopes ACTIVE/unarchived blocks to that workspace and the existing chapter/topic types. Search runs on titles in the database before paging. Parent context is returned only for the same workspace. No SQL/RPC, RLS, schema or public tool-action changes.
- Each request reads at most31 lean rows, renders30 and uses the extra row only to signal another page. One stable context path follows at most three same-workspace active incoming syllabus edges, each limited to one parent, so duplicate chapter/topic names show exam/subject ancestry without a tree preload. The cursor anchors the last visible updatedAt/id pair with descending tie-breaking. Prev uses previously visited cursors; there is no OFFSET, global count or300-item search ceiling. Results represent current data, not a transaction snapshot across multiple requests. No production-scale query benchmark or search-index migration accompanies this change.
- Existing TanStack Query caches by viewer/workspace/normalized search/type/cursor with60-second freshness and5-minute inactive retention. Requests run only while Browse is open; search alone is debounced250ms. Fresh cached reopen is immediate; query identity isolates late responses. First/new-query loading uses decorative reduced-motion-aware skeletons; failures offer Retry, and same-query background refresh retains cached items. Memory stays in the provider, without browser-storage persistence.
- Browse and Linked views share one item row. Linked keeps all selected labels, weight/primary controls and removal available across filters/pages/close. The existing50-target save limit is enforced before adding another item. Initial focus targets the dialog title instead of opening a phone keyboard. The dialog is capped at min(42rem,100dvh -2rem), with one scrollable body and fixed Close/Done access, including the user's follow-up height feedback.

### Live assessment screen requirement (2026-10-29)

- The user explicitly approved restricting phones/small windows for taking assessments. Live CBT requires a viewport at least **1024 × 600 CSS pixels**, defined in `lib/tools/mock-tests/attempt-display.ts`. Visual QA at 768px showed clipped player metadata/actions, so tablet landscape is the supported minimum. Both dimensions matter: phone landscape is still too short. This is a viewport capability rule, not user-agent/device detection; larger tablet and desktop windows are supported.
- StartAttemptButton checks before calling createAttemptAction. Builder Test run checks before review and again immediately before any save/start operation, covering resizing while the confirmation is open. Unsupported screens get an explanation without creating an attempt or saving builder changes. Publishing, authoring, community cloning, browsing, history and analysis remain available at mobile widths.
- The canonical authenticated `/assessments/[attemptId]` route retains membership checks and redirects completed attempts to analysis. Its AssessmentExamRoom client boundary uses a hydration-safe external-store snapshot and shows a checking state until viewport capability is known. Direct/resume visits on small screens show recovery instructions and a native link back to the assessment without mounting the exam player.
- Once entered, the existing player stays mounted when the window becomes too small. It is hidden/inert; global exam shortcuts and its calculator/instructions/paper/submission/abandon portals are gated. Restoring the viewport restores answers and the same attempt. Time limits continue and may expire normally; resizing never pauses or abandons an attempt. The gate states this explicitly. Actual TCS iON question styling, grading and existing answer/deadline persistence are unchanged.
- This is an application UX requirement, not an authentication/security boundary. No viewport claim is accepted by the Server Actions, and no schema, database access, agent/tool contract or scoring rule changed. The gate adapts automatically to resize/rotation without a hard reload.

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

### Assessment identity and deletion actions (2026-10-24)
- `assessment.rename` requires assessmentId, expectedRevision and a 1–200 character title. It updates only Block identity/revision, preserving the paper configuration and historical question/attempt data.
- `assessment.delete` requires assessmentId and expectedRevision. It archives the assessment and root Block with archivedAt rather than deleting shared questions or historical attempts. In-progress attempts block deletion. Archived papers no longer qualify for library, subject projection or public landing queries.
- Both require blocks.write.owned and the active workspace installation. Handlers enforce scoped active assessment/type, agent-access restrictions, revision checks and atomic compare-and-swap within the existing audited transaction runtime. Overview list items now include revision. Server Actions revalidate assessment and Exam Prep views. Synchronize these definitions with db:sync-registry; no schema change is required.
- Workspace writer cards show Rename/Delete as floating top-right actions on hover/focus, with tooltips; touch/narrow layouts keep them visible. They open a rename form or explicit delete confirmation and never trigger the underlying card link.

### Assessment creation presentation (2026-10-25)

- `/assessments/new` presents Create assessment and creates an unpublished draft,
  then opens the existing question builder. Blueprint remains an internal JSON
  contract, not a separate user-facing creation stage. Sections are optional.
- Dedicated creation fields group identity/taxonomy and test settings, with
  optional instructions and score benchmarks collapsed initially. A sticky
  Create draft/Cancel bar respects mobile navigation and safe-area spacing.
- Creation uses the same max-w-6xl page width as the assessment dashboard/detail
  pages. Return navigation lives in the app-bar breadcrumbs, without a duplicate
  back link above the page title.
- Button and form-scoped keyboard submission use the same inline validation and
  first-invalid-field focus, expanding optional sections when needed. Numeric
  limits/precision and stored instructions length mirror the existing action.
  The rich editor exposes an actual named textbox; calculator uses one native
  label/switch interaction. Pending state blocks repeated requests.
- Existing create action, permissions, idempotency and persistence are unchanged.
  Creation and editing retain separate form surfaces with the same metadata
  contract. See assessment-creation-ux-plan.md
  for audit evidence, implementation notes and remaining physical-device QA.

### Assessment settings sheet (2026-10-25)

- Builder metadata editing uses an Assessment settings sheet with one form
  surface, separated by dividers. BlueprintFormFields no longer adds a nested
  rounded card, border, background or shadow. Section padding supplies the inset.
- The sheet title/description are screen-reader-only, with no visible header
  taking form space. The first section reserves room for the close control.
  Done stays fixed while the flexible form body scrolls. Done closes the sheet;
  the builder's existing Save changes command
  persists edits. Field values, validation and save contracts are unchanged.

### Question-first assessment builder (2026-10-25)

- The edit route uses the assessment title as h1, compact status/save feedback
  and an assembly summary. Questions are the main workspace; optional sections
  group their actual rows instead of occupying a separate dashboard. Section
  identifiers are hidden in normal views and optional advanced dialog controls.
- Desktop commands stay with a compact sticky header. Below lg there is one
  editing bar, above mobile app navigation/safe area below sm and at the bottom
  on tablets. It contains Add questions/Save; secondary preview/publish controls
  remain explicit. Main touch commands are 44px. Long rosters use content-visibility
  for offscreen row rendering; keyboard reorder alternatives remain available.
- Publication is a reviewed action that saves, validates and publishes in place.
  It does not create an attempt or change sharing. A separately confirmed Test run
  on published papers explicitly creates an attempt and opens CBT. Existing
  Server Actions and revision/started-attempt protections remain authoritative.
- Builder navigation guards dirty links and browser Back with Stay, Discard,
  or Save and continue; reload/exit uses the native beforeunload protection.
  New-question entry points retain fromAssessmentId. Question editing now uses
  that context for return navigation too. No silent autosave or discard.
- Validation mirrors metadata/decimal limits, reports field-level errors and
  expands/focuses the relevant control. Publish review lists blockers; a target
  marks mismatch is an advisory warning, preserving the current scoring contract.
  Metadata and roster are still separate existing actions. After a successful
  metadata save the client tracks its new revision even if roster save fails,
  retains local edits and explains the partial result for retry.
- getBuilderQuestionBankAction verifies workspace/installation context and
  calls the existing bounded getQuestionBankPage helper (20 items per page).
  Search/type/difficulty apply across the workspace bank rather than a first-200
  client snapshot. A builder-specific allowedKinds restriction omits unsupported
  short-answer creation while retaining existing CBT/legacy choice kinds. The
  edit route no longer eagerly serializes a whole question bank.
- Settings match creation: 200-character title, named rich editor, readable type
  labels, stored instructions length and precision limits, labeled calculator,
  44px fields and inline benchmark errors. Preserve the accepted headerless sheet.
- See assessment-builder-ux-plan.md for historical audit and implementation QA.

---

## 🎨 UI/UX & Design System Conventions (80/20 Rule)

Future agents working on the Mock Tests frontend MUST adhere to the following:

### 1. Palette & Accents
- Follow css-color-context.md and app/globals.css: neutral background/card/border
  roles, semantic primary commands, violet for structured learning context, and
  success/destructive/amber roles only for corresponding statuses or feedback.
- Older classification definitions retain legacy colored classes. New builder
  surfaces use semantic tokens rather than adding or copying hardcoded hues.

### 2. Geometry & Radii
- Use pill geometry (`rounded-full`) for badges, chips, and segmented buttons.
- Use 8px/12px geometry (`rounded-lg` or `rounded-xl`) for cards, input fields, and panels.
- Do NOT use bubbly 24px/32px rounded corners on regular cards.

### 3. Dashboard Navigation & Layout
- My papers, Community and Attempts use URL-backed tab navigation and router
  history. Separate pagination tracks paper collections and personal attempts.
- Search and compact labeled desktop filters replace the former KPI strip and
  pill ribbon; mobile/tablet retain a filter sheet. See assessment-dashboard-ux.md.

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
   - The full lifecycle (Draft -> Questions -> Review/publish -> Explicit test run -> CBT -> Submission -> Analysis -> Sharing -> Public landing) is verified via scripts/e2e-browser-test.ts. Database assertions verify zero attempts after publishing and one after the explicit test run.

---

## Assessment detail presentation (2026-10-29)

- Workspace detail has three segmented surfaces: compact overview, inline Instructions and structure, and Your attempts. AssessmentPanel shares the rounded neutral frame; action/data controllers remain specific to their workspace or public audience.
- AssessmentOverviewCard leads with the title and real summary, followed by one wrapping flex metadata row: attribution/update date/time/revision left, type/status/visibility right. Facts show question count, effective question marks, duration and calculator. A differing configured mark target is an advisory beside those facts. Drafts continue in the builder; published practice is explicit; archived/viewer mutation controls and zero-question Start are absent.
- Candidate instructions are always fully inline per user feedback. Marking uses labeled incorrect-answer/passing/distinction values. All section entries share one continuous segment. Syllabus coverage is paginated and preserves a bounded authorized context path/subject link per area, with actionable unmapped guidance for writers.
- Personal history is full-width and server-paginated with real totals, exact start times and shared status/result/action views. Active/latest/trend reads do not depend on the selected history page. Score trend is an optional five-column comparison with stored per-attempt maxima, dated percentage labels, keyboard/touch selection and an exact selected-result/review panel. Current targets stay in Marking and targets; the trend is not part of the identity hero.
- TestProfileHeroCard now handles only public acquisition, with existing clone/start/open callbacks and public cohort facts. It shares the frame/taxonomy constants, not workspace capabilities or personal data. The retired QuestionPaperRoster and other obsolete detail renderers remain removed.
- Full rationale, delivered contracts, responsive findings and verification: [assessment-detail-ux-plan.md](./assessment-detail-ux-plan.md).

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
- New/edit question headers rely on the global app-bar breadcrumbs for navigation; the redundant local Back to Question Bank icon was removed (2026-10-29). Heading and helper text align with the form content. Save & return keeps its existing bank/builder destination.
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

### Management-focused assessment cards (2026-10-24)
- Attempts now has a separate full personal-history read Server Action. It
  verifies membership, claims and active installation and paginates all statuses
  (including retained attempts on archived assessments) by workspace/user, ten
  per page. Count/rows share a RepeatableRead snapshot; startedAt desc/id desc
  gives deterministic chronological order. URL attemptPage drives database
  paging with range clamping. The overview's five recent attempts remain only
  for continuation, not the history boundary. UI groups each page by date in
  Asia/Kolkata, shows individual start times and preserves actual result states.
- The dashboard paginates loaded, filtered workspace/community results at 12
  papers per page. It preserves the per-workspace gallery/list preference in
  browser storage, with an in-memory fallback. Source queries remain bounded
  at 50 workspace papers/100 community candidates and visibly disclose these
  limits. No data contract or persistence migration accompanies UI pagination.
- Rename/delete are registered revision-checked Server Actions through the tool
  runtime. Delete archives the authorized root Block and existing Assessment
  details, retains questions/attempts, and rejects active attempts. Resolve the
  Block first so legacy cards missing Assessment details can be removed without
  recreating records. Workspace, installation, type and agent-access checks
  remain required; mismatched detail workspaces are rejected.
- Assessment library cards prioritize paper management. The entire card uses a native link: writable drafts open the builder and offer Edit test; published papers and read-only drafts open the assessment overview. Test-taking/resuming remains an independent secondary control above the link layer. Eligible community cloning is a separate direct action.
- Workspace cards show paper identity, question-duration-mark facts, and management/update information with grouped assessment type/publication/visibility. Community cards specialize the same grid/list component: available taxonomy or summary, structural facts, known type, cohort attempt count, publisher/workspace and publication date. They omit redundant Community/Public labels and expose a 44px "Copy paper" command using the existing clone pipeline; the full card opens its public detail. Missing taxonomy does not generate placeholder errors or inferred classifications. Sharing lives only on the individual paper page. No ratings, trust badges or personal-score claims are invented.
- The assessment engine remains separate from Exam Prep. The approved direction is contextual assessment workflows in Exam Prep and a central management library. Saved community collections, separate discovery, and progress contribution rules are planned work, not implemented data contracts. See [assessment-dashboard-ux.md](./assessment-dashboard-ux.md).

# Shared question presentation audit and plan

Reviewed and implemented 2026-10-29. The following records the original audit and the implemented shared app presentation contract. The actual TCS iON assessment-taking interface and in-exam question-paper dialog remain excluded and unchanged. No scoring or database contract changed.

## Implementation

- `questions/question-card.tsx` owns the common app frame, spacing, neutral border, disclosure target/chevron, action slot, contextual footer and expandable content. Bank, builder, picker, author previews, assessment details and review all compose this frame, rather than just sharing inner text. Disclosure and management targets are siblings; action clicks do not toggle the question. Collapsed summaries strip link markup so they cannot introduce nested keyboard navigation; full detail retains rich links.
- `questions/question-review-summary.tsx` adapts that frame to the review task: collapsed cards identify the question with an excerpt, explicitly say Correct/Incorrect/Skipped/Not graded, show awarded/available marks and recorded time, and compare the actual response with accepted answers (including option content and numeric zero). Expanded cards keep the outcome header and show the full question/solution once, without duplicated metadata. This supersedes the previous metadata-only collapsed rows. Review question-number lookups use a memoized index map, keeping numbering/search stable after filtering.
- `questions/question-types.ts` defines presentation-only content, allocation, response and authorized solution DTOs. No imports from Prisma, repository DTOs or the question form. Review explicitly maps `correctKeys`/`modelAnswer`; the form adapts string-valued draft fields and topic titles.
- `questions/question-view.tsx` owns summary, metadata, rich stem, option content, native response controls, explanation and solution presentation. Its discriminated modes are summary/readOnly/authorPreview/review. Callers retain navigation, authorization, allocation editing, scoring and persistence. Read-only mode never infers permission from answer fields present on a source question object; only the separate solution prop enables solution rendering.
- `questions/author-question-preview.tsx` replaces both previous interactive previews. Local practice state resets through a content/identity key rather than an effect; derived display values stay out of state. Correctness and explanation are gated by deliberate Reveal answer key. Reset clears response and reveal. Native radios/checkboxes preserve standard keyboard behavior; numeric zero and legacy written answers remain supported for app display.
- Migrated form preview and option content, builder preview/summary/answer content, bank summary/detail, builder picker, assessment-detail roster, analysis review and heatmap stem snippet. Existing RichContent math rendering remains the shared foundation. No new fetches, subscriptions, global state, dependencies or persistence paths were introduced; imports are direct and expensive rich rendering remains memoized by the existing renderer. Existing bounded bank loading and offscreen roster behavior remain.
- Builder, detail and analysis disclosures now use native buttons and expanded/control attributes. Builder management actions remain separate, have desktop tooltips and mobile menu labels; removal requests focus on the next question or Questions heading. Builder expansion distinguishes assessment-specific fields from shared bank content. Confirmation still removes only the assessment allocation, leaving the bank question intact.
- Styling uses semantic tokens and shared 8px choice geometry, readable metadata, 44px response/management targets, contained rich math/code/tables and textual answer states. Incomplete drafts have placeholders and disabled reveal when no solution exists. All actual exam markup, styles, controls and response logic are untouched.
- Optional long-roster search/type filters, move-to-position and Undo remain follow-up proposals, not features added by this consolidation.
- Cleanup: removed the obsolete `question-preview.tsx` adapter after the form switched directly to AuthorQuestionPreview, the unused `dashboard/dashboard-metrics-strip.tsx`, its unused stats/props types and `dashboard/index.ts`. The dashboard uses direct component/type imports. The inventory below records their historical locations, not files to restore.

### Review usage requirements added during implementation

The collapsed review must answer: Which question is this? How did I do? What did I answer? What was accepted? How many marks and how much time? Metadata-only rows failed that task. The shared review-summary composition now supplies those facts; expansion is reserved for reading the complete options and explanation. App design familiarity comes from the shared frame and reading hierarchy, with contextual data/actions, not identical contents in every screen.

### Question bank scan and inspection (2026-10-29)

The bank supports finding, inspecting and editing reusable questions. Collapsed cards need a compact prompt excerpt, type/difficulty, coverage and usage/update context. Expanded cards need the complete rich prompt exactly once, all options, the authorized answer key and explanation. The compact header excerpt must be replaced by metadata when expanded, rather than repeated above QuestionView. Edit remains an independent link and must not toggle disclosure. Full prompt content (including material after the collapsed two-line clamp, links, math, code, images and tables) stays in the read-only body.

The bank uses a descriptive identity row (Question number, shared type badge, explicit Difficulty) and a larger collapsed prompt. Expanded inspection is divided into labeled Question, Answer key and Explanation areas; the full prompt appears once, numeric accepted answers have a distinct neutral answer box, and choice correctness keeps the shared text/icons. Coverage, Usage and Updated are labeled in a quiet footer after the reading content, with Edit as a separate native link. Long coverage lists no longer precede the question.

QuestionInspectionView composes the existing stem/options/explanation with an extracted QuestionAcceptedAnswer primitive; there is no duplicate rich renderer or response/scoring logic. QuestionStem accepts a typography class override. QuestionCard adds optional footerPlacement=bottom while preserving header placement by default for other contexts. Existing standalone QuestionView, answer-visibility contracts and the TCS iON player keep their behavior. This usage-specific inspection composition is justified by the bank's scan/read/manage job rather than adding hide/show flags throughout the generic view.

## Verification

- Question-bank inspection follow-up passed ten light/dark browser layouts with explicit identity/Question/Answer key/Explanation/library-footer ordering, numerical and choice answers, one expanded prompt and independent Edit/disclosure behavior. Focused rendering tests now pass 10 tests/43 assertions. The required full assessment E2E passed, including its new bank-inspection check. Final TypeScript noEmit and formatting passed; detailed evidence is recorded in the 2026-10-29 project log and scratch/bank-hierarchy-* artifacts.

- Eight focused presentation regression tests cover implicit answer visibility, explicit reveal, wrong/correct review labels, accepted numeric zero, incomplete drafts, collapsed review usefulness, skipped/ungraded distinction and disclosure/action separation (33 assertions).
- Focused Playwright checks cover actual builder keyboard disclosure, shared preview/reveal and bank preview; 320/390/768/1440px containment; isolated browser fixtures for all five kinds, radio/checkbox behavior, reset, identity change, explicit explanation reveal and read-only solution exclusion; long rich text/math/code at four widths in light/dark. No hydration/page errors in the focused run. The fixture changes no persisted data.
- Required full assessment E2E passed: creation, save/assembly, publish without starting an attempt, explicit TCS iON test run, calculator/answering/submission, analysis, rename/restore, delete cancellation, sharing and anonymous landing. This suite creates its own named assessment/attempt fixture; existing GATE CSIT draft was only read by focused checks.
- Evidence: `scratch/shared-question-{tests,browser,typecheck,lint,format,format-check}.log`, the completed final full run in `scratch/shared-question-e2e-final.log`, and screenshots. Physical-device/screen-reader testing and bulk datasets were not performed; responsive browser checks are not device certification.

### Responsive shell follow-up

The analysis page exposed a pre-existing tablet overflow: the sidebar's flex content and workspace wrapper could not shrink to the available width. Added `min-w-0` at those content boundaries and the analysis page/scorecard, and allowed the analysis header and benchmark header to wrap. This keeps tables scrolling inside their existing container instead of widening the viewport. Browser containment checks wait for the responsive sidebar transition to settle; no artificial loading delay is added to the application.

## Purpose

Users should recognize the same question in the bank, builder, preview and results. Share content hierarchy, metadata, choice geometry, rich text, focus and feedback rules. Keep assessment assembly, response persistence and scoring in their existing owners. Explicit user scope: the actual assessment-taking experience keeps its current TCS iON design. The live player and its in-exam question-paper dialog are excluded from this refactor; do not migrate their markup, styles, controls or response logic.

## Pre-migration inventory

This table records the audit starting point. The old QuestionPreview file and internal StudentQuestionCard implementation have been removed; their callers now use AuthorQuestionPreview directly.

| Location | Current presentation | Proposed composition |
| --- | --- | --- |
| `components/tools/mock-tests/question-preview.tsx`, consumed by `question-form.tsx` | Stateful author preview, choices, numeric/text response, answer reveal, explanation; tied to form targets and repository block types | Author-preview adapter around shared interactive question view |
| `assessment-builder.tsx`: `StudentQuestionCard` | Second independent stateful preview, different marker/selection/header styles and reveal behavior | Same author-preview composition as the form |
| `assessment-builder.tsx`: `renderQuestionItem` | Collapsed summary, allocation editor, answer key, reorder/remove commands | Shared summary and read-only answer content inside builder-owned row/editor |
| `question-bank-view.tsx` | Bank cards and expanded question/answer/explanation content | Shared summary/detail with bank-owned selection and edit commands |
| `builder-question-picker.tsx` | Truncated stem, kind/difficulty, Add/Added | Shared compact summary with picker-owned Add action |
| `detail/question-paper-roster.tsx` | Collapsible paper questions, options, conditional answers and explanation | Shared read-only detail with existing access/reveal rules |
| `analysis-review-list.tsx` | Result rows, response/correctness, options, explanation, timing/marks | Shared review view; outcome/scoring data supplied by analysis |
| `attempt-player.tsx` | Active question, options, numeric keypad and TCS iON exam visual treatment | Inventory only; excluded, preserve existing design and behavior |
| `question-paper-dialog.tsx` | In-exam full paper and options with TCS iON styling and jump commands | Inventory only; excluded, preserve existing design and behavior |
| `analysis-scorecard.tsx` | Heatmap hover snippet and response summary, not a full question card | Reuse compact summary formatting only where appropriate; retain heatmap |

Paths above are relative to `components/tools/mock-tests/` unless fully qualified. Repository-wide question/stem/preview searches found the current question-display implementations in this tool. `question-form.tsx` also has option authoring previews: reuse choice content/markers there, but keep editing fields separate. Instruction-only RichContent consumers are not question views.

Existing shared foundation: `editor/rich-content.tsx` handles stored HTML/math rendering and memoization; `kind-labels.ts` handles kind labels and formatting. Retain these rather than introducing another renderer.

## Problems and workflow findings

- Kind/difficulty labels, typography, border radius, option markers and selection styling vary. Identical answer content has multiple JSX implementations.
- The form preview reports Correct/Incorrect immediately after selecting a choice even before answer reveal; builder preview gates feedback behind reveal. Standardize author preview to an explicit reveal/check action. Active attempts must never show correctness.
- Builder expansion exposes allocation fields and an answer key together, while editing the question content requires a separate navigation. Give the expanded area clear Question content / Assessment settings grouping and a visible Edit content action; explain shared-question impact before editing bank content.
- The title button expands only; the separate chevron toggles. Use one accessible disclosure trigger with consistent toggle behavior and `aria-expanded`/`aria-controls`, keeping reorder/remove outside it. Some other displays use clickable divs; replace these with keyboard-operable disclosures during migration.
- Reordering is limited to siblings in the current section. Label this clearly and add a move-to-position control for long sections; keep arrow buttons and mobile menu available. Changing section remains an allocation operation.
- Removal already uses confirmation and removes the assessment entry locally rather than deleting the bank question. Make that distinction explicit; consider Undo for local removals and maintain focus after removal.
- Existing dirty state, save/discard protection, target-mark advisory and independent publish/test-run flows are useful. Preserve them. Do not add autosave implicitly during visual consolidation.
- For long rosters, consider question search/type filters and expand/collapse all after the shared presentation is stable. Do not seed bulk questions into user workspaces just to demonstrate these.
- Mobile needs the same reading hierarchy, 44px actions, contained math/images/code and menus outside disclosure triggers. Keep management controls separate from response controls.

## Component boundary

Create a small `components/tools/mock-tests/questions/` family with one public `QuestionView` composition and reusable `QuestionSummary`, `QuestionMetadata`, `QuestionStem`, `QuestionOptions`/`QuestionResponse`, and `QuestionSolution` parts. This is one visual contract with purposeful compositions, not a single component with dozens of unrelated booleans.

- Summary: number, kind, optional difficulty, readable stem excerpt, optional marks/section/topics. Use stable metadata order, semantic tokens, 8px surfaces, and no white selected stripe.
- Detail: complete stem, options or typed response, optional solution. Reuse RichContent and one option marker treatment; semantic radio/checkbox behavior and correct keyboard handling in interactive modes.
- Review: explicit response, correctness text/icon, awarded marks and explanation. Never use color alone. Numeric zero is a valid answer; missing/ungraded differs from incorrect.
- Shell/actions: accept narrow composition slots for caller-owned actions and supplementary metadata. Row and contained preview are deliberate app layouts; do not require a card around every question.
- Appearance: default app tokens. No exam appearance variant is required: the actual TCS iON assessment player and in-exam paper dialog remain independent and unchanged.

Use a discriminated mode contract: `summary`, `readOnly`, `authorPreview`, `review`. Interactive author-preview response is controlled (`response`, `onResponseChange`); preview wrappers may own ephemeral practice state. Reset that state when switching question identity/revision. Do not fetch, mutate, calculate authoritative scores or navigate from the shared view. There is no live-attempt mode in this app-card contract.

Normalize source DTOs through small typed adapters: question identity/kind/stem/options/difficulty/topic titles; optional assessment allocation (number, marks, penalty, section); separate response and authorized solution/review data. Include all currently supported kinds: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, NUMERIC, SHORT_ANSWER. Preserve existing numeric/text answer semantics, tolerances and units where supplied by the source contract; do not invent a new scoring model.

**Answer safety:** hiding answer keys in JSX is insufficient. Read-only DTOs must respect existing audience permissions; the component cannot grant reveal access. Author/review solution data is supplied only by already-authorized callers. Do not reuse an author-preview DTO for exam delivery. Existing exam data boundaries remain outside this migration.

Avoid imports from `question-form` or Prisma/repository types in the shared presentation contract. Keep serialized server props plain, and client interaction wrappers local. No database, registry, SQL/RPC or Server Action contract change is needed merely to standardize presentation.

## Delivery order

1. Establish shared types/adapters and a visual fixture matrix. Agree on metadata order, marker geometry, disclosure and reveal behavior.
2. Consolidate the two interactive author previews first; preserve every supported question kind and explicit reveal/reset behavior.
3. Migrate builder summary/answer content, bank cards/details and picker. Keep allocation, reordering and removal in their current owners; improve disclosure semantics and tooltips alongside those call sites.
4. Migrate assessment paper roster and analysis review with their existing permissions, scoring output and navigation.
5. Reuse heatmap summary formatting where beneficial. Verify the TCS iON player and its paper dialog remain unchanged; do not integrate them with the app-card family.
6. Remove duplicated renderers only after each caller has passed verification. Record the final contract and migrated call sites in project context.

## Acceptance checks

- Consistent default presentation across form preview, builder preview, bank, picker, assessment-detail paper and results; compact variants documented. The actual TCS iON player and its paper dialog stay unchanged.
- All five kinds; empty draft/incomplete options; numeric zero; multi-select; long rich text, images, code and math; response reset on identity change.
- Preview gives no correctness feedback until deliberate reveal/check; read-only/review respects authorization. No changes to live attempt payloads or UI.
- Disclosures, radio/checkbox groups, focus restoration, action menus and screen-reader labels work with keyboard. Management actions do not accidentally select answers or toggle a row.
- 320/390/768/1440px, light/dark, reduced motion, no horizontal document overflow and stable metadata geometry.
- Save/discard, section assignment, sibling reorder, removal confirmation, bank selection and question-edit return context remain intact.
- Targeted lint/typecheck and required full `npx tsx scripts/e2e-browser-test.ts` after the migration; focused browser checks for each migrated surface. This plan is not a claim that those migrations/tests have run.

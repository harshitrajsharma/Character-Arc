# Assessment builder UX audit and fix plan

Reviewed and implemented 2026-10-25. Findings describe the original builder;
current implementation notes follow the historical audit and proposed plan.

## Purpose

Help an author assemble, organize and score an assessment, inspect the candidate
view, save a draft, then deliberately publish it. Taking a test is a separate
secondary action. Metadata already lives in the settings sheet; it should not
push the question-building task below a dashboard of repeated information.

Preserve current Next.js Server Actions, Prisma/tool execution, workspace and
installation checks, revisions, question ownership and attempt protections.
No schema, SQL/RPC, automatic publishing or scoring changes are proposed here.

## Evidence

- Source review: edit route, AssessmentBuilder, BlueprintFormFields, preview,
  bank picker, assessment actions, publishing handler and bank repository.
- Authenticated browser audit of the existing empty GATE CSIT draft at
  320/390/607/768/1024/1440px; inspected a separate populated two-question paper,
  expanded question controls, student preview, metadata sheet and bank picker.
- Measured geometry, visible actions, native links, labels and touch targets;
  captured scratch/builder-audit-*.png and scratch/builder-audit.log.
- Separate navigation probe changed a title only in browser state, then used
  the header New question link. It navigated without a prompt or assessment
  context, with zero Server Action POSTs. No edit was saved. Evidence:
  scratch/builder-navigation-audit.log. The initial audit's final navigation
  lookup timed out because its link selector did not match the button-role
  navigation anchor; the separate probe used the actual anchor.
- Publishing behavior was inspected in source, not executed. No assessments,
  questions or attempts were created, saved, removed or published by this audit.
- Reviewed Web Interface Guidelines:
  https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.
- Live screenshots used the current light theme. The supplied dark screenshot
  supports the same hierarchy findings; full dual-theme QA remains part of the
  implementation acceptance checks. Physical phone keyboard behavior and a
  large question-bank dataset were not simulated.

## Findings

| Priority | Issue | Evidence and proposed correction |
| --- | --- | --- |
| Critical | Mobile editor actions are covered by global navigation. | assessment-builder.tsx:2745 anchors the editing bar at bottom:0, z20. At 320px its y831–900 overlaps app navigation y835–900, z40. The 390px screenshot shows navigation instead of Save/Add/Publish. Offset above navigation and safe area, reserve matching bottom content space, verify focused fields remain visible. |
| High | Publish silently includes starting an attempt. | assessment-builder.tsx:1201 updates metadata, saves questions, publishes and calls createAttemptAction, then navigates to CBT. The visible draft label says Publish paper. Separate Save draft, Review/publish, and an explicit Test run action. Publishing should finish in authoring/details with confirmation, rather than create attempt history implicitly. Use existing separate actions; retain safeguards. |
| High | Leaving to create a question loses unsaved local edits. | Browser navigation probe confirmed no warning. Header New question also omits fromAssessmentId, unlike the empty-state/bank links. Route all question-creation entry points through one context-aware flow; offer Save and continue / Discard / Stay when dirty, and protect reload/exit. Do not silently autosave or discard. |
| High | Questions are below repeated introductory layers. | Empty draft Questions heading y990 at 1440px and y1330 at 320px. Large generic header, action strip, four stats, view selector, metadata card and empty sections precede it. Put actual assessment identity and question assembly first; reduce metadata to a compact summary/settings command. |
| High | Action availability conflicts across breakpoints. | Desktop Publish paper is enabled with zero questions; mobile Publish is disabled. Top actions use sm:flex while fixed actions use lg:hidden, so 640–1023px gets both. Use shared validation/action state and one responsive command presentation. Explain unavailable publishing with a visible reason. |
| High | Readiness is only a question-count badge. | assessment-builder.tsx:1752 uses entries.length to show Ready to publish; it does not reflect invalid marks, benchmarks or metadata. Replace with actionable validation results. Separate required blockers from optional warnings; a declared target mismatch must not silently redefine the existing scoring contract. |
| High | Validation is detached from the controls. | validateQuestionValues/validateBenchmarkValues and save validation primarily emit toasts. Errors in a closed sheet or far-down question do not receive first-error focus. Title/marks precision/duration limits are not fully mirrored. Map errors to controls, open the relevant section, focus/scroll to the problem, and preserve values on failures. |
| Medium | Blueprint terminology and generic header obscure identity. | edit/page.tsx:21,49 and builder heading say Edit Blueprint/Edit Paper Blueprint; actual assessment title is repeated lower down. Use the assessment title as h1 and a small Assessment builder context label. Keep internal blueprint JSON terminology in code only. |
| Medium | Optional sections dominate the empty state. | Large No sections yet card precedes the separate No questions empty state, with repeated Add section/Add from bank commands. Show one useful question empty state and an optional Add section command. Existing sections should group their questions, avoiding a separate section-card dashboard. |
| Medium | Section copy overpromises and exposes internal identifiers. | Copy claims timed sections although the stored section contract has key/title/description, no independent timer. Section keys appear as badges and raw keys appear as preview headings. Show human titles; hide keys from normal authoring. Describe sections as optional organization. |
| Medium | Controls are crowded and undersized on touch. | Section commands are 28px, question reorder/remove 36px, settings 32px, metadata inputs40px and type select36px. Use 44px touch hit areas; collapse secondary actions into a labeled menu on narrow screens. Keep keyboard reorder alternatives already present. |
| Medium | Keyboard and accessible-name gaps remain. | Question summary buttons at builder:1369 and preview navigation at :606 remove focus outlines without replacement. Bank search has no label; type/difficulty/topic controls have no labels. The settings rich textbox has no associated name. Add names, descriptions, focus rings and explicit error relationships. |
| Medium | Metadata editing diverges from creation. | BlueprintFormFields title max120 vs action/create200; raw paper type display; visible-text instructions counter vs stored HTML limit; wrapper editor label; crowded two-column rows. Bring field contracts and terminology into parity while retaining the newly compact, headerless sheet and fixed Done footer. |
| Medium | Question bank is limited without an explicit boundary. | Edit route loads getQuestionBank, repository.ts:990 takes the newest200; picker filters/maps that client list with no paging. Older questions become undiscoverable once the bank grows. Reuse the existing paged question-bank query through an authorized Server Action and bounded result pages. No new SQL/RPC. |
| Medium | Student preview needs a clearer contract. | It is a layout/answer-key inspection mode, while Test run creates a real attempt. Existing preview headers can show section keys. Label the distinction explicitly, use section titles, support compact question navigation and show mode state. Do not present layout preview as a full CBT simulation. |
| Lower | Repeated small badges create noise. | Revision, taxonomy, pass/distinction, duration and target marks appear across strips/cards; many labels are10–11px. Keep count/assembled marks/save status in one compact summary; move less-used configuration to settings. Use semantic color tokens instead of scattered raw status colors. |

No horizontal document overflow was observed at the six default empty-draft
widths or the three populated widths. The principal responsive defects are
overlap, duplicated commands and vertical hierarchy, not a universally broken
grid. Long unbroken content, 200% zoom, 65+ questions and physical touch/keyboard
devices need dedicated regression checks during implementation.

## Proposed page structure

1. **Identity and editing commands:** actual assessment title, Draft/Published,
   Saved/Unsaved/Saving state; Settings, Preview and Save draft. Compact heading,
   not an icon-led generic banner. Publication is a deliberate secondary command
   until the author reaches review. Keep revision available in secondary details.
2. **Assembly summary:** question count, current marks vs optional target,
   duration, and Review issues only when relevant. Avoid a full four-tile KPI row.
3. **Question workspace:** Add questions as one entry point with From bank and
   Create question choices. Empty state here explains the next useful step.
   Optional sections group the actual questions; Unassigned remains supported.
   Each compact question row shows number, stem excerpt, type, marks/penalty and
   section. Expand one to edit allocation or open content editing. Keep reorder
   and remove commands discoverable without a wall of tiny icons.
4. **Preview/review:** layout preview preserves assembly context and local draft
   state; publishing review lists actual blockers and warnings with links back
   to fields. A separately labeled Test run explains that it creates an attempt.
5. **Mobile command bar:** above global bottom navigation and safe area, with
   Add questions and Save as the common commands. Preview/publish live in clear
   secondary controls; no duplicated top/bottom actions on tablet widths.

Desktop may add a compact sticky section outline once the content is long.
Start with a clear single-column assembly surface; a permanent second dashboard
column is not required. Mobile keeps the same task order and uses menus/sheets
for secondary operations. Preserve the settings sheet changes already accepted.

## Implementation sequence

1. **Workflow reliability:** fix mobile overlap and breakpoint duplication;
   unify action guards; separate publication from attempt creation; protect dirty
   navigation and preserve assessment context for new questions.
2. **Page hierarchy:** assessment-specific heading, compact status/summary,
   question-first empty state, sections integrated into the roster, concise copy.
3. **Editing quality:** named controls, visible focus and 44px targets, inline
   validation/focus, contract parity with creation, safe pending/error feedback.
4. **Scale and preview:** paged/searchable bank with selection counts and explicit
   insertion context, readable section names, long-roster navigation and honest
   layout-preview/test-run separation. Reuse strict actions/data protections.

## Acceptance checks

- 320/390/607/768/1024/1440px and 200% zoom, both themes: no overflow or covered
  commands/fields, no tablet duplicates, at least 44px touch command targets.
- Empty draft shows a usable Add questions action in the first viewport; optional
  empty sections do not displace the question task.
- Dirty navigation by header, breadcrumb, question creation, reload and Back
  offers an appropriate recovery choice. Discard only with explicit user choice.
- Save retains values on failure; title/timing/marks/instructions/benchmark and
  question allocation errors focus the actual field and expand hidden surfaces.
- Publish saves/validates and publishes without creating an attempt; only an
  explicit test-run command starts CBT. Existing revision/conflict and started
  attempt editing restrictions remain enforced.
- Existing draft/published, zero/one/65+ questions, optional/multiple sections,
  long titles/stems/math/images and a bank larger than 200 items remain usable.
- Keyboard-only question selection, reorder, removal confirmation, settings,
  bank search/paging and preview have names and visible focus.
- TypeScript, focused lint, responsive browser checks and full required
  scripts/e2e-browser-test.ts after implementation. Update tests to assert the
  intentional separation of publish and test run, not simply rename selectors.

The initial analysis did not run mutation E2E. Verification of the subsequent
implementation is recorded below and in PROJECT_LOGS.md.

## Implemented behavior and verification

- Replaced the generic header, KPI strip, repeated metadata card and separate
  section dashboard with assessment identity, compact assembly facts and a
  question-first workspace. Desktop commands stay in the normal page header;
  mobile/tablet get one Add questions/Save bar above the app navigation. Optional
  sections contain their actual question rows; section keys are advanced-only.
- Follow-up feedback (2026-10-29): the assessment identity/action header scrolls
  normally at every breakpoint. Removed desktop sticky position, top offset,
  overlay layer, backdrop and sticky-only padding; the app navigation and narrow
  action bar retain their independent behavior.
- Additional feedback (2026-10-29): Draft/Published is a readable status pill
  beside the title, with save/revision metadata below. Edit details replaces
  Settings. Question editing guidance sits below the Questions heading/actions,
  before the roster, so it remains discoverable with long assessments. The Add
  questions picker now uses the implemented cache/loading/preview/batch workflow
  documented in builder-question-picker-ux-plan.md.
- Separated reviewed publication from a confirmed Test run. Publication remains
  in the builder, preserves sharing settings and creates no attempt. The full
  E2E checks the database count is zero after publishing and one only after
  starting the explicit test run, then completes CBT and result analysis.
- Added dirty-link/Back navigation choices and native reload/exit protection.
  Save and continue persists before navigation; create/edit question entry points
  carry the assessment return context. Read-only browser probes exercised Stay,
  Discard, reload cancellation, and full E2E exercised Save and continue.
- Metadata and question allocation validation now use field errors, first-error
  focus and automatic sheet/row expansion. Settings use readable types, a named
  rich editor, 200-character title limit, decimal precision checks and 44px fields.
  Target marks mismatches are warnings. Save tracks each acknowledged revision
  and explains a partial metadata/roster result without discarding local edits.
- Bank search/type/difficulty now query authorized workspace data in bounded
  20-item pages. The edit route no longer eagerly loads the newest 200 questions.
  Unsupported short-answer questions are excluded from the builder picker.
  Large offscreen rosters use content-visibility; rich preview renders formatted
  instructions and readable section titles.
- Responsive checks passed 320/390/607/768/1024/1440px in both themes with first-screen
  Add questions, one visible Save and no navigation overlap or horizontal overflow.
  Separate populated checks covered expanded rows, narrow menus, preview, advanced
  section identifiers, question return navigation, long titles, CSS 200% zoom
  containment and reload protection. No existing assessment edits were saved.
- Evidence: scratch/builder-refactor-browser.log, builder-populated-browser.log,
  builder-sections-browser.log and screenshots; focused validation tests and
  full-suite results are in builder-validation-tests.log and builder-refactor-e2e.log.
  TypeScript and targeted lint/formatting passed. The builder's old render-time
  ref mutation and the section dialog's state-reset effect were removed.
- A controlled failure of the second save request verified the partial-save
  message, retained edits and successful retry using the acknowledged metadata
  revision. Only an E2E-created fixture was renamed, then restored; evidence:
  scratch/builder-save-retry.log.
- Physical-phone keyboard/safe-area behavior still needs device QA. A 65-question
  assessment and a bank larger than 200 were not seeded into the user's workspace;
  no claim is made that those dataset sizes were exercised in the live browser.
  The bounded query/offscreen-rendering paths are implemented for those cases.

### Live test display policy follow-up (2026-10-29)

Authoring, preview and publication remain responsive. Actual Test run requires
a 1024×600 CSS-pixel viewport, shared with the normal Start attempt flow. The
builder checks before opening the test confirmation and immediately before
saving/starting, so a phone or a resized confirmation cannot create an attempt
or save changes. The canonical live exam route also gates direct/resume visits;
the existing player retains answers and its running deadline across resize.
See mock-tests-community-architecture.md for the full viewport policy.

### Section group redesign (2026-11-10)

A section identifies a question group, shows its live question/mark totals,
contains shared candidate instructions and lets authors add, collapse or manage
that group. The former full-width pill looked like an input; instructions were
unlabeled and the first question touched the section boundary. Adding to a
section was hidden in its overflow menu.

`BuilderQuestionSection` now owns only this presentation: a normal title/totals
header, explicit 44px collapse control, direct Add questions action and secondary
management menu. The mobile add control uses an accessible icon and tooltip;
desktop retains its text label. Instructions stay inline in a labeled segment,
respect line breaks and disappear when absent. The question roster has its own
padded segment; empty groups explain how to add content. Collapsing retains the
title, totals and actions; adding to a collapsed group reopens it with that
section selected in the picker.

The builder retains ownership of roster/order, collapsed view state, local
edits, authorization and persistence. Existing question cards, section dialogs,
grading and the live exam player are unchanged. A focused existing-assessment
browser mode covers layout, collapse/add, long instructions and local empty
sections while blocking persistence and discarding edits; actual results are
recorded in PROJECT_LOGS.md.

# Assessment creation UX audit and improvement plan

Reviewed and implemented 2026-10-25. Findings below describe the original page;
the implementation notes at the end describe the current behavior.

## The page's job

Create a draft assessment in the current workspace, then take the author to the
question builder. Publishing is a later, explicit action. The current create
handler already persists DRAFT and routes to the editor; this is not a separate
"blueprint" product or a mandatory four-step wizard. Sections are optional.

Keep the existing Prisma/Server Action/tool execution architecture, draft
creation, idempotency, workspace permissions and stored configuration contract.
The internal blueprint object does not need to be renamed to improve UI copy.

## Evidence and scope

- Inspected new/page.tsx, new-assessment-form.tsx, blueprint-form-fields.tsx,
  ToolPageHeader, the rich editor, create action/handler and builder behavior.
- Authenticated read-only browser audit at 320, 390, 607, 768, 1024 and 1440px.
- Also exercised invalid shortcut submission, a benchmark conflict, the editor
  label, and long unbroken exam/subject labels. No create request was sent.
- Evidence: scratch/new-assessment-audit.log and
  scratch/new-assessment-audit-*.png. No hydration console errors or page errors.
- Reviewed the Web Interface Guidelines at
  https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.

## Confirmed findings

| Priority | Finding | Consequence / evidence |
| --- | --- | --- |
| High | "Create Test Blueprint", "New Blueprint", "Blueprint Preview" and the CTA expose internal terminology. | Users intend to create an assessment. Saving a draft and opening question authoring is not explained consistently. |
| High | Optional instructions and formatting appear before type, exam/subject labels and test settings. | A large editor, math shortcut guide and secondary settings consume the first viewport and increase perceived effort. |
| High | The only create command is inside the preview, after the entire form below lg. | At 390px the document is about 2952px high and the button starts around 2545px; at 768px it starts around 2079px. At 1024px the sticky sidebar makes it reachable around 531px. |
| High | "Ready to Create" checks only a nonblank title. | The badge remains visible at the same time as a distinction/passing conflict. It also does not account for invalid timing or marks. |
| High | Validation feedback differs between native submit and the global shortcut. | Ctrl+Enter with an empty title shows a toast but leaves focus on duration and sets no field aria-invalid. Some errors appear only in toasts. |
| High | Instructions label targets an editor wrapper rather than a named editable control. | Clicking the label does not focus editing; role-based lookup finds no textbox named Instructions. |
| Medium | Paper Format initially displays `full_length`. | The select is missing the human-readable item mapping used by the improved dashboard filters. |
| Medium | Copy implies more functionality than these metadata fields supply. | Exam tag and subjects are free-text taxonomy, not syllabus linking. Paper type descriptions imply enforced structure/distribution; the form stores a classification. |
| Medium | Four-stage workflow presents Sections as a distinct compulsory stage. | Questions can exist without sections; builder behavior is more flexible than the diagram suggests. |
| Medium | Main fields and submit are 40px; select/toolbar controls can be smaller. | Touch controls miss the product's 44px target. The mobile page also auto-focuses title; physical keyboard/viewport effects require device QA. |
| Medium | The header has a large icon, repeated context and a long title. | It takes substantial mobile space; the description aligns to the icon edge rather than the title. Mobile has no clear in-content return link. |
| Medium | Preview repeats settings and uses small labels such as "Dynamic" and "Benchmarks 33% / 70%". | These do not clearly explain how totals are derived or which number means what. Keyboard hints remain visible on touch-sized layouts. |
| Medium | Form limits are inconsistent across surfaces. | Creation title caps at 120 while the Server Action accepts 200; visible instructions text is counted while the server validates stored string length. Marks input permits arbitrary decimals while the action has a two-decimal contract. |
| Lower | Type/status color classes bypass semantic design tokens, and a calculator wrapper adds a separate div click handler around the Switch. | Styling and interaction patterns diverge from the current product system; preserve the functional native switch while simplifying its hit area. |

No horizontal document overflow was observed at the six default widths or with
long exam/subject labels. This is primarily a hierarchy/reachability problem,
not evidence that the page's responsive grid is entirely broken. The browser
audit does not simulate a physical phone's on-screen keyboard.

## Recommended structure

Use one focused, segmented form rather than a persistent form-plus-preview
dashboard. Cap reading width around 760–880px; use paired fields on wide screens
where helpful and stack them on phones. Reuse existing primitives and tokens.

1. Compact header: explicit Back to assessments link, "Create assessment", then
   "Create a draft, then add questions. Publish when you're ready."
2. Basic details: assessment title, human-readable assessment type, optional
   exam and subject labels. Describe labels as organization, not syllabus links.
3. Test settings: optional duration, total marks and calculator setting. Explain
   blank duration as Untimed and blank marks as Calculated from questions.
4. Instructions: optional disclosure. Load/show the existing rich editor when
   expanded; retain its math and formatting capabilities without leading with
   them. Preserve typed content when collapsed.
5. Advanced settings: configurable passing/distinction benchmarks, collapsed
   initially. Keep existing defaults and validation; do not imply these are
   official exam cutoffs. Customizing them is optional, not a new data contract.
6. Action bar: Back/Cancel navigation and "Create draft"; brief next-step helper
   "Next: add questions". Keep one creation command reachable on mobile and
   desktop. Its safe-area offset must account for fixed workspace navigation,
   with enough form padding so no field/error is covered.

Remove the persistent duplicated preview and "Ready to Create" badge. If a
summary is later retained, it should be a secondary disclosure and must not own
the only submit command. Replace the four-stage stepper with a small truthful
"Details → Questions & optional sections → Publish" explanation, or simply the
next-step helper. Neither requires a new wizard or route structure.

## Interaction and validation plan

- Use one submit path for the button and keyboard shortcut, preserving server
  validation, request locking, idempotency and the existing builder redirect.
- Show errors beside their fields with associated messages and aria-invalid;
  focus/scroll to the first invalid control. Expand a collapsed section if it
  contains an error. Toasts can supplement, rather than replace, field feedback.
- Connect the actual editable control to the instructions label. Use one
  correctly labeled switch interaction with an adequate touch target.
- Keep 44px main controls and mobile actions, visible focus, readable helper
  text, and semantic status colors. Avoid tiny font counters and uppercase
  micro-labels as primary instructions.
- Desktop may focus title initially; mobile should not automatically invoke
  the keyboard. Hide keyboard shortcut hints on touch-first layouts.
- Align client/server limits and units deliberately; preserve current settings
  on failed submission. Pending text should read "Creating draft…"; success
  should say "Draft created" and explain that question editing opens next.
- Do not add autosaving, public sharing, scoring changes, schema migrations or
  new syllabus-linking behavior as part of this UI refactor.

## Implementation order

1. Fix terminology, select labels, validation/readiness contradictions and
   editor label/focus behavior.
2. Restructure the header and form; move optional content into disclosures and
   give the creation action an independent reachable footer.
3. Apply responsive spacing/targets, semantic styling and truthful helper text.
4. Verify both creation and the existing edit/builder route: shared
   BlueprintFormFields is also used in authoring, so presentation changes must
   not silently alter saved assessment metadata.

## Acceptance checks for the implementation

- At 320/390/607/768/1024/1440px, the create action is discoverable and reachable
  without scrolling through every optional field; no horizontal overflow or
  fixed-navigation collisions. Test long titles/labels and 200% zoom.
- Actual phone keyboard opening/closing does not cover fields or the action.
- The title describes an assessment; all user-facing breadcrumb/action/toast
  copy describes a draft and the next step accurately.
- Empty/whitespace title, invalid duration/marks, benchmark conflicts and long
  instructions produce consistent field errors and first-error focus via both
  click and Ctrl/Cmd+Enter. Pending state prevents duplicate creation.
- Instructions are named/focusable for assistive technology; controls work by
  keyboard and touch. Collapsed section values survive disclosure changes.
- Title/type/taxonomy/timing/marks/calculator/instructions/benchmarks persist
  correctly; the created paper remains DRAFT and opens the builder. Publication
  is still explicit and later.
- Run TypeScript, targeted ESLint, focused responsive/keyboard browser checks
  and the mandated scripts/e2e-browser-test.ts suite after implementation.

## Implemented draft creation flow

- Replaced Blueprint terminology and the large preview/stepper with a compact
  Create assessment header and truthful draft/next-step copy. Following feedback,
  the page uses the assessment area's max-w-6xl container and app-bar breadcrumbs
  rather than a second in-content return link. Cancel remains in the action bar.
- Dedicated creation form presents Basic details, Test settings, optional
  Instructions and optional Score benchmarks. Shared builder settings remain
  unchanged. Type selects display human-readable labels; taxonomy stays free text.
- Creation placeholders and helper text are assessment-neutral: use prompts to
  enter a title, exam/course label and comma-separated subjects, without named
  exams or subject examples.
- One sticky Create draft/Cancel bar remains reachable above mobile navigation.
  Main inputs/actions are 44px; paired desktop fields stack on narrow screens.
  The page does not autofocus a control on load.
- Submit and the form-scoped Ctrl/Cmd+Enter shortcut share inline validation,
  first-error focus and disclosure expansion. Instructions retain their value
  while collapsed, and the actual editable textbox has a label, descriptions
  and invalid state. Raw stored instructions, title, timing, numeric precision
  and benchmark limits follow the existing action contract.
- Pending state locks repeat submissions. Existing Server Action, workspace
  authorization, idempotency, DRAFT persistence and editor redirect are preserved;
  publishing remains a later explicit action. No schema or registry changes.
- Focused browser verification passed light/dark layouts at all six widths,
  error focus, keyboard submission, disclosure retention, accessible editor and
  calculator label behavior, without hydration/page errors. A separate real-save
  check verified every setting and one request/assessment on double submission,
  then archived only its own verification draft. Physical phone keyboard behavior
  remains a device QA check; desktop viewport emulation cannot establish it.
- TypeScript, targeted ESLint and source formatting passed. Full required
  assessment E2E passed creation through authoring, publication, CBT, analysis,
  management, sharing and anonymous public landing. Evidence is recorded in
  scratch/assessment-create-{browser,save,typecheck,lint,e2e}.log.

# Assessment authoring workflow audit

Session: 2026-11-10. The original authoring journey and findings below were recorded before implementation. The user subsequently approved the fixes; the implementation notes at the end describe current behavior. Only the actual Linear Algebra assessment is used for browser verification; no additional assessments may be created.

## Assessment and intended job

- Existing assessment: `30c56bf7-bd9e-46dc-975e-c37a83ddb7ae`, Linear Algebra — GATE DA Subject Test 1.
- Workspace: `personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d`.
- Requested deliverable: 30 original questions, subject-test classification, worked answers. Working configuration: 90 minutes, 60 marks, scientific calculator; one Linear Algebra section. MCQ/MSQ/NAT groups have ten questions each.
- The author's job is to build this assessment. A newly authored question should enter the intended assessment/section with clear allocation settings; workspace-bank reuse is a secondary outcome.

## Observed journey

1. My papers → Create Paper → Create assessment. Entered title, Single Subject Test, GATE DA label, Linear Algebra subject, 90 minutes/60 target marks, calculator and candidate instructions. Create draft opened this assessment's builder.
2. Added a Linear Algebra section. This changed the local builder state to Unsaved changes and required Save changes before leaving.
3. Section actions → Add questions showed Add to section = Linear Algebra. Create question navigated to `/assessments/questions/new?fromAssessmentId=30c56bf7-bd9e-46dc-975e-c37a83ddb7ae`.
4. The new page used Question bank → New Question breadcrumbs, a Question bank kicker, generic library helper text and no visible assessment title/section/allocation summary. Its footer offered Save & add another / Save & return to builder.
5. Entered the first original MCQ, difficulty, four choices, correct answer and explanation. Save & return to builder successfully saved the question, but returned to a builder still showing **0 questions / 0 marks**. The saved question was in the workspace bank; it had not been attached.
6. Reopened Add from bank, searched for “dimension of W”, and found the new question. Add to section now showed **Unassigned**, so Linear Algebra had to be selected again. Add question finally produced **1 question / 1 mark**, with Unsaved changes.
7. Expanded the attached question to set 2 marks and −0.67 penalty, then saved the builder. The saved result showed **1 question / 2 marks**, correct section, answer key and explanation.
8. Continued the same assessment's question-creation route. The form started again at MCQ / difficulty Not set. A new NAT required changing type, difficulty and opening the explanation editor.
9. Save & add another saved the new NAT in the bank and cleared the authoring form. **Question type was preserved; difficulty reset to Not set and the explanation editor collapsed.** The screen gave no assessment-roster count or attachment confirmation.

10. Created the remaining original MCQ/MSQ/NAT questions using Save & add another. After all 30 bank saves, Save & return to builder still returned to **1 attached question / 2 marks**: only the first question, which had been attached manually. The workspace bank had increased from 12 to 42 questions. None of the pre-existing 12 were selected or edited.
11. Reopened the bank picker, selected Linear Algebra as the destination and selected 20 new questions on the first page. Add selected added them locally and retained the sheet; the footer explicitly requested saving the builder. Selected the remaining nine new questions on page two and added those. Done returned to the roster in the intended Q1–Q30 order.
12. The assembled roster initially totaled **31 marks**: the previously edited first question carried 2, while the other 29 defaulted to 1. Expanded every row, checked its question/answer key/explanation against the authored source, set 2 marks, set MCQ penalties to −0.67 and MSQ/NAT penalties to 0, and confirmed Linear Algebra section membership.
13. Save changes completed with **Draft · Saved · Revision 7**, **30 questions**, **60 marks / 60 target**, **90 min**. The Linear Algebra section showed **30 questions · 60 marks**. All 30 row IDs were distinct; keys, numerical answers, explanations and allocation controls had been checked individually through the UI.
14. Review & publish opened Review assessment with **30 questions · 60 marks · 90 minutes** and Cancel / Publish assessment. It explicitly stated that publishing does not start a test or change sharing. Cancelled this review without publishing or starting an attempt; the deliverable remains a complete saved private draft.
15. Reopened Edit details and verified Single Subject Test, GATE DA, Linear Algebra, 90 minutes, 60 target marks, enabled on-screen calculator, full candidate instructions and practice-only benchmark wording. Closed the sheet without edits and left the saved builder open.

These observations were made while doing the user's real authoring task. No additional assessments, disposable fixtures, direct database/API calls, publication or test attempts were used. “Recorded workflow” here means the chronological action/state record and screenshots below; no video capture was made.

## Delivered assessment

- [Open the saved builder](http://localhost:3000/workspace/personal-14e77ece-6df3-4d5f-bbc9-e90015c4250d/assessments/30c56bf7-bd9e-46dc-975e-c37a83ddb7ae/edit).
- 30 newly authored questions: Q1–10 MCQ, Q11–20 MSQ, Q21–30 NAT. Every question has an answer key and worked explanation; all carry 2 marks. MCQ incorrect-answer penalty is −0.67, disclosed as rounded in the candidate instructions; MSQ/NAT have no negative marking.
- One Linear Algebra section, 90-minute duration, 60 marks and an enabled scientific calculator. Instructions identify the paper as independent original practice and explain question types, scoring, aids and notation.
- Topics include spaces/subspaces, independence, matrices, systems, determinants, rank/nullity, orthogonality/projections, eigenvalues, quadratic forms, LU and SVD. Syllabus target links were intentionally left empty because the two matching chapter results did not expose enough ancestry to choose safely; this does not prevent authoring or saving.
- Final status: **private draft, saved revision 7**. Publication remains a separate deliberate action. No attempt exists from this authoring session.

## Confirmed issues

| Priority | Issue | User impact |
| --- | --- | --- |
| P1 | Assessment-origin creation looks like global bank authoring. | Authors lose the paper/section context and cannot tell what the save will affect. |
| P1 | Save & return to builder saves only to the bank. | Returning to zero questions violates the expected create-and-add outcome and requires a second discovery/add workflow. |
| P1 | Selected section is not retained across the creation/return journey. | Newly created questions risk being unassigned or placed in the wrong section. |
| P1 | Question save and roster save are separate, with different persistence boundaries. | “Saved” can refer to the bank while the desired assessment still lacks the question, or its allocation remains unsaved. |
| P2 | Marks/penalty are unavailable during contextual creation and default to 1/0 when added. | A two-mark test requires repeated expansion and editing after question creation. |
| P2 | Save & add another retains type but clears difficulty and collapses explanation. | Repeated authoring requires reconfiguration and reopening the same controls; no visible batch progress is provided. |
| P2 | Syllabus search returned two indistinguishable “Linear Algebra — Chapter” choices. | Their exam/subject ancestry cannot be determined from the displayed result. No ambiguous link was selected. |
| P2 | Saving the builder temporarily replaced the working canvas with the app shell. | The author loses reading position and a clear in-place saving state while awaiting the response. |
| P2 | Assessment-list skeleton appeared while loading the creation route. | Loading feedback describes a different view from the destination being opened. |

The existing reusable question form, type-specific key validation, worked-explanation editor, disabled pending-save controls, section picker and explicit builder dirty state are useful foundations. The problem is the orchestration/context contract around them.

## Source corroboration and conditional risks

- `questions/new/page.tsx` accepts only `fromAssessmentId`, hardcodes Question Bank / New Question breadcrumbs and passes that identifier to the shared QuestionForm without fetching assessment identity or a destination section. The builder's `newQuestionHref` carries the assessment ID only; the picker destination is not included.
- `QuestionForm.submitQuestion` uses `fromAssessmentId` to choose the return URL. Creation calls `createQuestionAction` with question content/targets/idempotency data, invalidates the bank query and navigates or resets. There is no attachment/allocation payload or attachment call in that successful path. This matches the observed bank-only saves; it is not a rendering-only problem.
- The reset branch explicitly clears difficulty, explanation disclosure, targets and answer content while retaining type. Preserve answer clearing; improve the configurable session defaults and destination feedback.
- The error branch generates a new idempotency key. An ambiguous response after a committed write could therefore allow a fresh retry to create a duplicate. This is a **source-review risk**, not a failure reproduced against the user's records. The implementation must retain a stable operation identity through an uncertain outcome and resolve/retry that operation safely.

## Proposed workflow

1. Keep bank authoring and assessment authoring as two explicit contexts around the **same QuestionForm/editor/validation components**. Do not duplicate the question form.
2. Assessment → Add questions should offer **Create new** and **Use existing** as clear peer paths. Creating from a section preselects that section.
3. Use a full-width contextual assessment route for substantial rich-text authoring, e.g. `/assessments/[assessmentId]/questions/new`. Breadcrumbs and a compact normal-flow header show the assessment, selected section and current roster/marks. The global bank route remains appropriate when the author starts in the bank. A narrow sheet is not the default for this large editor.
4. Contextual authoring includes allocation controls: section, marks and negative marks, with reusable per-type defaults. Clearly distinguish shared question content from assessment-only allocation settings. State that the new question will also be available in the workspace bank.
5. Primary commands become **Create & add** and **Create, add & next**. Their successful outcome includes the question in the intended roster. Resolve dirty builder edits through the existing Save and continue / Discard / Stay guard before entering this route. Coordinated create-and-attach then saves the question plus allocation; the return screen shows Saved and reveals/highlights the added row with current count/marks. Existing-bank selection can retain its local roster staging, but must explicitly say additions need Save changes. Bank-only creation keeps its own Save terminology.
6. Keep type, section and allocation defaults during repeated authoring; allow a clearly visible reuse-difficulty choice. Clear stem/options/key/explanation to avoid copying answers accidentally. Keep the explanation surface readily available during an explanation-heavy authoring session. Show saved/attached progress and the destination throughout.
7. Use existing Next.js Server Actions, verified workspace claims and Prisma-first transactions for coordinated creation/attachment. Validate assessment membership/section, revision and idempotency. Handle revision conflicts without losing authored content or creating duplicate/orphan questions. Do not use Supabase RPCs, triggers, SQL business logic or a separate write path.
8. Existing-bank selection remains bounded/searchable/paginated. Preserve the assessment/section target; provide batch allocation defaults and a deterministic addition order. Adding a bank question must not require editing its shared content.
9. Show exam → subject → chapter/topic context for syllabus results, including duplicate titles. Return only bounded authorized ancestry metadata, not a full syllabus tree.
10. Retain the builder canvas and focus while saving; use a visible pending/saved/error state. Match loading skeletons to the actual destination. Preserve authored text on validation/server/navigation errors.

## Implementation order and completion criteria

1. **Fix context and persistence first.** Add an authenticated assessment-authoring route/controller around the existing form, carry a validated section target, and implement the coordinated question/allocation action through existing services. Do not ship renamed buttons while leaving bank-only behavior behind them. Success must show both a saved bank question and its assessment allocation exactly once; a failed operation must leave no half-created record.
2. **Make repeated authoring efficient.** Add per-session section/type/marks/penalty defaults, explicit difficulty reuse and an attached-count summary. Clear all answer-bearing fields between questions. Preserve authored content and stable operation identity through pending/error/retry states. Editing an existing shared question remains a separate action with a clear reuse warning; creating from an assessment does not clone or alter unrelated bank questions.
3. **Improve assembly and discovery.** Preserve destination context through picker pagination and back navigation, expose batch allocation defaults and deterministic order, and disambiguate syllabus results with bounded ancestry. Selection counts distinguish selected, already in assessment and newly added items.
4. **Verify responsive behavior and recovery.** On phone, keep a single-column authoring surface and save commands clear of global navigation/keyboard/safe area. On tablet, avoid compressed split panels; keep Split optional at the existing desktop breakpoint. Rich text, math, long titles and feedback must not cause document overflow or trap scroll. Verify keyboard focus, first-error navigation, pending controls, Back/reload protection and destination-specific skeletons.
5. **Acceptance checks.** Starting from a saved assessment/section, create one of each type and verify the roster, section, marks, key and explanation without reopening the bank; Save & next must increment the attached count each time. Exercise duplicate submission, lost response, stale revision, unauthorized assessment/section, validation errors and navigation cancellation in an isolated authorized test environment. Keep publication separate from test-taking and verify it creates zero attempts. A later implementation should run the repository's required E2E suite only in such an environment; this audit does not authorize extra fixture assessments in the user's workspace.

## Review and validation plan

- Continue creation, attachment, order, allocation editing and review using **this assessment only**. Do not run a fixture-creation E2E script against the workspace for this audit.
- Completed: actual save/return and save/next outcomes; all three question types; all 30 answer keys/explanations and row allocations; final saved roster/section totals; calculator/duration/instructions; publication review and cancellation. This is UI authoring verification, not execution of the grader or a complete automated E2E pass.
- For a later implementation, cover transactional failure, stale revisions, duplicate submission, workspace/section authorization and unsaved navigation with focused tests; use a controlled test environment only when separately authorized. Do not modify the user's existing questions merely to exercise failures.
- Desktop workflow and screenshots were observed. Phone/tablet, physical keyboard, assistive technology, fault injection and full grader execution were not exercised in this authoring session; the responsive/recovery items above are future acceptance requirements.

## Evidence

- `scratch/algebra-workflow-01-builder.jpg`: saved first allocation and builder context.
- `scratch/algebra-workflow-02-global-question-form.jpg`: global question-bank framing despite the assessment-origin query parameter.
- `scratch/algebra-workflow-03-all-questions-created.jpg`: creation form after the 30 bank saves.
- `scratch/algebra-workflow-04-return-before-attachment.jpg`: return showing only the first manually attached question.
- `scratch/algebra-workflow-05-batch-selection.jpg`: first page of 20 selected new questions.
- `scratch/algebra-workflow-06-saved-roster.jpg` and `scratch/gate-da-linear-algebra-created.jpg`: final saved 30-question/60-mark builder.
- `scratch/algebra-workflow-07-publish-review.jpg`: final publication review, cancelled without publishing.
- `scratch/algebra-workflow-08-saved-details.jpg`: saved metadata/instructions sheet.
- Browser action/state trace in this chat records the original 0-question return, subsequent bank selection, section reset, 1/2-mark allocation changes and save-next reset behavior.
- `scratch/gate-da-linear-algebra-30.json`: local backup of the 30 authored question stems/keys/explanations; application records are created through browser UI only.
- `scratch/algebra-authoring-progress.json` and `scratch/algebra-verified-roster.json`: UI creation ledger and per-row key/explanation/allocation checks. Scratch evidence remains ignored and is not application source.

## Implemented follow-up (2026-11-10)

- Added `/assessments/[assessmentId]/questions/new`, reusing QuestionForm and the existing rich editors/validation/preview. Its authorized lean read supplies assessment identity, revision, count/marks, valid sections and per-kind allocation defaults from at most 200 allocation rows. It does not preload question text/solutions or the syllabus. Breadcrumbs stay inside the assessment; legacy bank URLs with `fromAssessmentId` redirect here. Ordinary bank creation and editing of reusable bank content remain separate contexts.
- Added `assessment.create-question` in Mock Tests 1.1.0 and the matching authenticated Next.js Server Action. The existing audited/idempotent tool pipeline runs destination authorization/revision reservation, reusable question content/solution/targets, allocation and result completion within one Prisma transaction. The block update compares the expected revision; stale writers cannot append. Missing/foreign/archived assessments, invalid sections, existing attempts, invalid allocations and the 200-question cap prevent creation. Agents additionally require the assessment's existing agent-access flag. No schema, SQL/RPC/RLS or grading/player changes.
- **Create & add** returns to and focuses the saved row in the builder. **Create, add & next** reports the saved roster count/marks, preserves section/type/per-kind scores and optional difficulty reuse, clears all answer-bearing fields/targets, keeps explanations available and focuses the next prompt. Content is also saved in the reusable workspace bank. New allocation controls explicitly apply to this assessment only; values are visible before submission.
- Dirty assessment navigation still uses Save and continue / Discard / Stay. The question form now protects unsaved content on links, Back and reload. Expected action failures retain editable content; revision conflicts refresh authorized context while retaining the question. An unconfirmed transport result freezes authoring and allocation controls and offers Retry same save with the same operation/key/mode. A successful save starts a fresh operation. This avoids replacing a key immediately after an uncertain outcome.
- The bank picker exposes Create new question before the existing-question path, retains the section in creation navigation and supports explicit per-question batch marks/penalty. Additions from the bank remain local until Save changes and disclose that boundary. Selection/deduplication/pagination/cache behavior remains caller-owned. Builder saves now run in a React transition, and cache invalidation targets pages rather than the whole assessment layout. Matching loading views cover assessment creation, bank question creation and contextual creation; contextual failures have retry/return navigation.
- Syllabus discovery retains its 30-row page/31-row lookahead limit and loads one stable authorized path through at most three incoming syllabus edges per result. The actual duplicate Linear Algebra results now show **GATE CSIT 2027 › Engineering Mathematics** versus **GATE DA 2027 › Engineering Mathematics**. No syllabus link was changed during verification.
- The standard E2E entry point has an explicit `ASSESSMENT_AUTHORING_REVIEW_ID` mode. It uses the existing assessment, checks navigation/section/defaults, responsive layout, guarded leaving, clearing/reuse/progress and unknown-result retries with controlled responses. A deliberately invalid section can exercise the real action's rejection before content creation. This mode bypasses the fixture-creating suite and preserves the 30-question assessment. A normal full mutation-suite run still requires a separately authorized test environment.

Final validation evidence and limitations are recorded chronologically in PROJECT_LOGS.md. Runtime implementation is complete; this document's earlier proposed workflow and original counts remain historical evidence rather than descriptions of the previous bug as current behavior.

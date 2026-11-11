# Assessment detail page: UX review and improvement plan

Reviewed and implemented 2026-10-29. The findings below record the original audit; the shipped structure and subsequent user feedback are recorded here and in PROJECT_LOGS.md.

## Implemented behavior and follow-up decisions

- Preserved rounded neutral segmented surfaces through AssessmentPanel, with a compact AssessmentOverviewCard, Instructions and structure, and full-width Your attempts. User feedback supersedes the original disclosure proposal: candidate instructions are always inline and complete. All exam sections form one continuous list within their segment, without a separate bordered header or individually segmented entries.
- The final metadata row is one wrapping flex row with author/update date and time/revision on the left and assessment type/publication/visibility on the right. This supersedes an intermediate request to right-align attribution as well. Marking uses labeled values for Incorrect answer, Passing target and Distinction target, rather than burying the percentages in prose.
- Maximum marks is the actual sum of question allocations. A differing configured target is separately explained beside the facts, without changing grading or stored settings. Incorrect-answer facts reflect the grader's existing non-positive penalty rule, including legacy positive stored values that the grader treats as zero. Configured targets are explicitly separate from official exam cutoffs.
- getAssessmentOverviewAction verifies workspace/installation/claims and uses Prisma with a consistent read transaction. It returns lean identity/settings, grouped section/count/mark facts, ten coverage areas per page, an independently resolved personal active attempt/latest evaluated result and the latest five valid scored attempts. It never selects/serializes question stems/options/solutions/responses. Each visible coverage area has at most one stable context path, traversing at most three authorized parent edges; subject links retain the actual Exam Prep destination. No entire syllabus expansion or cross-workspace ancestor data is returned.
- getAttemptHistoryAction now accepts an optional validated assessment filter and returns true totals/page bounds, stable startedAt/id ordering, ordinal attempt numbers and elapsed duration. Shared personal scope constrains workspace, user and assessment on every history/activity read. Active/latest/trend queries are independent of the selected history page. Removed the obsolete ten-row getAssessmentAttempts query and its unused DTO.
- History uses shared attempt status/result/action views and shared URL pagination. Coverage uses the same URL/focus controller; independent query keys preserve each other's page state. Existing records stay visible while URL navigation is pending, with a loading status on the collection controls. A matching Suspense skeleton covers initial detail loading; history failure offers a scoped Retry without replacing assessment details. Next.js navigation/auth errors are rethrown rather than swallowed. The route also has a sanitized recoverable error view using the installed Next.js retry API.
- Eligibility is explicit: drafts continue in the builder, writable published papers may edit/share/start or resume, viewers have no mutation controls, archived papers remain read-only, and zero-question papers cannot start. Server authorization remains authoritative. The supported exam viewport and actual TCS iON player behavior are unchanged.
- Score trend is an optional, five-result column comparison with percentage labels, dated columns and a latest-selected result panel. Keyboard/touch selection and native Prev/Next expose exact stored marks, timestamp, percentage-point change and the corresponding analysis link independently of history paging. A mixed-total warning preserves comparison context; targets remain in Marking and targets rather than competing plot lines. Zero/negative/over-100% scores are preserved, one result is inspectable without implying a trend, and empty data renders no plot. The follow-up [score-trend-ux-plan.md](./score-trend-ux-plan.md) supersedes the original chart proposal below.
- Share assessment now has labeled native visibility radios, a named copy-permission switch and share-link field, 44px commands, a scrolling short-height-safe body and fixed footer. Unsaved private sharing cannot produce an enabled copy command. A fresh form session per opening/revision resets cancelled edits without effect-driven state copies; origin uses a hydration-safe browser snapshot. Saving continues through the existing revision-aware sharing action and route revalidation.
- Removed the dead workspace branch and duplicated configuration maps from TestProfileHeroCard. It now owns only public discovery/acquisition, sharing the segmented frame and existing taxonomy constants with the workspace overview. Public clone/open/start callbacks, cohort facts and the separate public landing controller remain in place. No schema, SQL/RPC, RLS, grading or tool-registry change was made.

## Scope and design direction

Workspace route: `/workspace/[workspaceSlug]/assessments/[assessmentId]`. Reviewed the published GATE DA diagnostic assessment ending `9625ade5-1f2f-41d4-bbe1-2d2c13a330c2`, its full page and Share dialog. Read the existing GATE CSIT draft to check long candidate instructions. The public share landing and actual TCS iON exam room have separate jobs; preserve their contracts when changing shared presentation.

The user explicitly likes the rounded, segmented assessment card. Keep its neutral surface, outer border, internal dividers, typography family and clear action contrast. Improve grouping and reading order. Do not introduce a new visual theme, leading KPI dashboard, extra sticky header, local Back button or unnecessary page tabs. Global breadcrumbs remain the navigation anchor. Use the semantic colors in `app/globals.css` and the existing taxonomy/status primitives.

## What this page is for

This is the overview and control centre for one assessment. It should answer, in order:

1. **What is this assessment?** Title, concise description, type/exam/subjects where supplied, publication status and visibility.
2. **Can I use or manage it?** Available actions depend on workspace role, lifecycle, readiness and personal active attempt. Managing the paper and taking a test are distinct intentions.
3. **What are the rules and contents?** Actual questions/marks, duration or untimed state, calculator, instructions, sections, marking configuration and linked syllabus.
4. **What have I done here?** My active attempt, latest result and complete chronological attempt history for this paper, with optional score trend.

The central assessment library remains management-first. This page is where sharing belongs and where an explicit Start/Resume action can be offered after inspecting one paper. Personal history must never be presented as cohort analytics. A community/public visitor's acquisition/sign-in flow must not silently inherit workspace management actions.

## What already works

- The segmented neutral frame is readable in light and dark themes. The page uses the same max-w-6xl family as other assessment pages.
- The primary start control already checks the supported exam viewport and gives phone users a Larger screen notice before creating an attempt. Keep the existing 1024×600 CSS-pixel policy; browsing, management and results stay responsive.
- History uses shared attempt-status/result/action components. Chart percentages correctly use each stored attempt's own maximum, and a mixed-total warning already exists. Keep these safeguards and the exact-value alternative to the graph.
- Coverage shows real linked/unmapped questions and warns that linked-topic totals can overlap. Native disclosure/link semantics are useful.
- The Share dialog stays inside the viewport and retains scrollable content plus reachable footer controls on tested narrow and landscape layouts. Its problem is prioritization, copy and control semantics, rather than an unbounded popup.

## Findings and evidence

Browser-confirmed means observed on existing data; source-confirmed means a conditional path established in code, not a claim that a matching viewer/archived/large-history fixture was exercised.

| Priority | Finding | Evidence | Planned resolution |
| --- | --- | --- | --- |
| P0 | Maximum Marks says **50**, while the selected paper's current questions total **4**. The discrepancy is only explained in coverage below the large chart. This confuses the assessment's current scoring maximum with a configured target. | Browser; `detail/test-profile-hero-card.tsx:350`, `detail/assessment-coverage.tsx:18`, submission scoring in `lib/tools/mock-tests-handlers.ts` | Display effective question marks as the test maximum and label the configured target separately when different. Put the advisory beside the facts/actions with an Edit assessment route for writers. Preserve existing advisory/publish policy; do not silently change grading or historical denominators. |
| P0 | Instructions become a three-line hero description with no full reading view. The GATE CSIT draft renders an instruction heading that repeats its title; its instruction content is 388px tall but clipped to 81px on the phone check. | Browser; `detail/test-profile-hero-card.tsx:165`, `:246` | Use summary for the short description. Provide a separately labeled full candidate-instructions disclosure using RichContent, without a line clamp when open. Never invent timed/full-length behavior when description is absent. |
| P0 | “Standard negative penalty” is unconditional. “Performance Cut-offs” and per-question pacing overstate what configured benchmarks and a simple duration/count calculation mean. | Browser/source; `detail/test-profile-hero-card.tsx:157`, `:360`, `:368` | Remove assumed penalty/pacing statements. Summarize actual allocation penalties where reliable; show mixed rules or defer to instructions for complex configurations. Label thresholds as configured targets, rather than official exam cutoffs. Move them out of the primary metric row. |
| P0 | Published Start is outside the canWrite condition; the non-published writer branch also includes archived papers and offers Edit/Publish. “Ready” checks publication alone. Backend authorization still applies; this is misleading UI eligibility, not evidence of an authorization bypass. | Source; `detail/test-profile-hero-card.tsx:440`, `:462`, `:493`, `:505` | Derive presentation capabilities explicitly from authorized role, draft/published/archived state, actual readiness and active attempt. Keep Server Actions authoritative. Archived stays read-only; draft goes to the builder; viewer has no mutation controls. |
| P0 | Paper history loads only ten personal attempts, discards the real total and displays loaded length as the total. The graph and active-attempt detection consume that same truncated array. An older active attempt can be omitted. | Source; `lib/tools/definitions/mock-tests/repository.ts:628`, `:643`; `detail/attempt-history-list.tsx:38`; hero `:144` | Return a paginated contract with true total/range; look up active attempt independently of history pages. Fetch a bounded, explicitly labeled evaluated trend independently. Do not automatically abandon/pause an older attempt or create a replacement during navigation. |
| P1 | One hero mixes paper identity, operational actions and a large personal analytics panel. On desktop the initial hero is 885px; at a 390px viewport it is 1275px and at 320px it is 1460px. Recent result and coverage are far below it. | Browser; `mock-test-detail-view.tsx:33` | Keep the overview compact. Move chart into Your attempts; show a small active/latest-result summary near the overview. Use the three-part structure below. |
| P1 | Publication appears but visibility does not. Missing taxonomy becomes “Standard Mock Test” here and “Full-Length Mock” in Share. Author/avatar/revision/date compete with more useful facts. | Browser/source; `detail/test-profile-hero-card.tsx:188`; `share-assessment-dialog.tsx` | Show publication and actual visibility together, with optional type/context. Use a neutral missing-type label or omit it consistently. Put author/revision/dates in quiet secondary metadata. Never infer full-length classification. |
| P1 | History cards are tall for repetitive attempts: attempt number/status, three metrics, generic “Score recorded”, then another action row. Date lacks time, latest result is hard to reach, and no paper-specific pagination is exposed. | Browser; `detail/attempt-history-list.tsx:45` | Compact rows with attempt identity, date/time, explicit status, score/percentage and Review/Resume. Secondary timing/accuracy can remain clearly labeled. Use ten rows per page and shared pagination with Prev/Next text and true range. |
| P1 | Coverage is short and passive beside a very tall history column; all three selected-paper questions are unmapped. Section count is shown but actual section structure/instructions are absent. | Browser; `detail/assessment-coverage.tsx:24`; `mock-test-detail-view.tsx:55` | Group instructions, sections and syllabus into assessment details. Make unmapped state actionable for writers, informative for readers. Show section names and allocated question/mark facts rather than a redundant count alone. Give history full usable width. |
| P1 | The mobile SVG requires internal horizontal scrolling: a 480px graph in a 356px container at a 390px viewport. Desktop labels/actions shrink to small text; most hero controls are 40px high and active Resume is 28px. | Browser/source; graph `:59`, hero `:419`, `:467` | Maintain 44px project action targets. Use a compact responsive trend and retain accessible exact values. Avoid a phone-wide chart as a mandatory reading step; a labeled score-trend disclosure can keep history nearby. |
| P1 | Share is named “Publish & Share Mock Test” for an already published paper. A redundant large identity panel and three large visibility tiles push clone/link controls deep into the dialog. Clone switch/link field lack associated accessible labels; visibility selection is visual without radio/pressed semantics. | Browser/source; `share-assessment-dialog.tsx:153`, `:215`, `:297`, `:323` | Rename to Share assessment; compact title/context, labeled visibility radio group, labeled clone permission and share-link field. Reflect what saving actually changes and explain the real access/copy flow. Keep scroll/close/footer behavior and frosted semantic surfaces. |
| P2 | Overview loads full authoring question content/options/solutions to compute structural/coverage facts on the client. Detail and personal reads run sequentially. There is no detail-specific loading layout in the route folder. | Source; `lib/tools/definitions/mock-tests/repository.ts:451`; route `page.tsx:29`; `mock-test-detail-view.tsx` | Add a lean authorized overview projection/aggregates; preserve the builder's full DTO. Parallelize independent reads after authorization where appropriate. Add a matching detail skeleton and scoped history loading/retry/empty states. Bound coverage/history data. |

Component paths beginning `detail/` are relative to `components/tools/mock-tests/`. These references describe the audit snapshot and can move during implementation.

## Recommended page structure

### 1. Assessment overview: keep the segmented card

- **Identity segment:** title first, short summary, one grouped type/publication/visibility row and optional exam/subject context. Quiet author/updated/revision metadata. Long titles wrap naturally.
- **Facts segment:** Questions, effective marks, duration/Untimed and calculator. Sections may be a short structural fact. Replace four dense KPI-like blocks with clearly labeled facts; use a two-by-two grid on phones where suitable. Configured benchmarks belong in detailed rules.
- **Actions segment:** writer management group (Edit assessment, Share) and a distinct personal test action. Ready/read-only/unsupported-screen explanations must match actual state. Show target-mark discrepancy here. Sharing is available only in permitted states.
- **Personal shortcut when relevant:** compact active-attempt callout or latest-result link; do not insert another telemetry strip. Resume identifies the attempt and its start time. Starting remains explicit, and timed-attempt copy states when the timer starts only where true.

### 2. Instructions and structure

- Full candidate instructions in a labeled disclosure immediately after the overview. Its open state has no truncation. A short excerpt may introduce long content; “Read instructions” must reveal all rich text. Missing instructions get honest copy, not fabricated rules.
- Section structure and topic coverage can use two desktop columns inside a segmented details surface; stack in that order on phones. Keep names, question/mark counts, mapping context and links readable. Do not render the entire question bank or authorized answer key on this overview.
- Unmapped topics are an incomplete-coverage state, not a broken assessment. Writers receive an Edit coverage route to the existing builder flow; readers get an explanation. Topic overlaps remain explicit. Large target lists need bounded disclosure or paging, not unlimited repeated rows.

### 3. Your attempts

- Scope explicitly to the signed-in person's attempts on this assessment.
- Present active/latest result succinctly; show no fabricated best-score or improvement KPI.
- Make Score trend an optional disclosure near results. Label its exact bounded range, e.g. “Latest ten evaluated attempts”. At zero evaluated attempts show a short empty state; at one show the first result without implying a trend. Keep exact values available and historical maximum-mark warnings.
- Use a compact, full-width chronological list with ten rows per page, stable newest-first order, real total and “1–10 of N attempts”. Keep Prev/Next text on phones and URL-backed page state for Back/refresh. Reuse the existing history pagination/presentation family.
- In-progress, submitted-awaiting-evaluation and evaluated are distinct states. Date/time distinguishes repeated same-day attempts. Review and Resume remain independent accessible links. Do not call missing scores zero or render ungraded attempts as incorrect.

This keeps task controls early without forcing every visitor to read a graph. It also removes the current empty-column imbalance. The same document order works on mobile; no new sticky page header or horizontal mobile tabs are required.

## Action and state rules

| Context | Management | Personal practice/result |
| --- | --- | --- |
| Writable draft | Edit assessment / continue building; publishing follows existing readiness/revision checks | No Start action; compact history only if retained records exist |
| Writable published, no active attempt | Edit assessment and Share | Explicit Start when supported and ready; otherwise explain the real restriction |
| Published with authorized active attempt | Permitted management follows existing active-attempt constraints | Resume identified attempt; no competing new-attempt shortcut |
| Workspace viewer | Read permitted overview/instructions | No unauthorized start/edit/share mutation; retained personal result access follows server policy |
| Archived | Read-only historical reference | Retained review where authorized; no new attempt or Edit/Publish controls |
| Phone/insufficient viewport | Browsing, permitted management and review remain usable | Show larger-screen requirement before any start mutation; direct/resume gate keeps the existing timer/answer-preservation contract |

Implement these as explicit typed capabilities consumed by the workspace composition. Do not copy authorization logic into a generic card or treat viewport gating as security. Verify how an existing active attempt is handled after lifecycle/role changes against the existing server policy before exposing a recovery action.

## Data and component plan

1. Keep workspace/claims/installation checks in Next.js. Add a lean overview read: identity, lifecycle/visibility/revision, instructions, taxonomy, rules, effective allocation totals, section and coverage facts. Do not serialize answer keys/explanations simply to count questions. Keep full editor data separate.
2. Extend/reuse the existing personal history query with an optional validated assessment filter, or share its bounded repository query while retaining separate typed projections. Use workspace+assessment+user scoping on every page and startedAt/id descending order. Return items/total/page/pageSize/totalPages in a consistent transaction. Clamp invalid/out-of-range pages.
3. Query the user's active attempt independently of the current history page; latest evaluated result and bounded trend also remain independent. Fetch only what is displayed. Historical score/maxScore remain authoritative. Current benchmark lines must say current configured targets and must not rewrite historic outcomes.
4. Reuse shared AttemptStatusBadge, AttemptResultSummary, AttemptAction, pagination, date formatting, RichContent, taxonomy/status helpers and supported-display notice. A small overview/facts composition is appropriate; one generic component owning public acquisition, workspace mutations and personal-history state is not.
5. Retain a shared visual frame for workspace/public assessment profiles where useful, but separate their action controllers and data permissions. Remove obsolete graph/history props only after checking every caller. Do not duplicate question or rich-text renderers.
6. URL backs history page state. Keep cached loading/error state scoped to the authorized user/workspace/assessment. On first fetch use the relevant skeleton; on refresh retain accurate existing content with a busy indicator. No artificial delay or page-wide skeleton for a small history-page request.
7. Verify Share updates immediately refresh visible visibility/revision and do not reset to old props. Current actions already revalidate routes; the audit has not established a stale-sharing bug. Test behavior before adding a second refresh mechanism.

No schema migration, SQL function/trigger, Supabase RPC or RLS policy is proposed. Review Next.js's installed guide before changing fetching/loading behavior.

## Delivery order and acceptance

1. **Truth and eligibility:** mark totals/target distinction, instructions separation, actual rules, publication/visibility, role/lifecycle capabilities and independently resolved active attempt. Preserve current grading, explicit-start and exam-screen contracts.
2. **Structure:** compact segmented overview, clear details, full-width personal history and contextual actions. Then compact Share using the same primitive and semantic surfaces.
3. **Scale and interaction:** authorized lean reads, paginated history, independently bounded trend, coverage bounds, skeleton/retry/empty states and reusable date/action components.
4. **Verification:** focused unit/contract checks for new capability/query logic; browser journeys for the states below; required full `npx tsx scripts/e2e-browser-test.ts` after implementation. Do not write tests that merely mirror spacing classes.

Acceptance matrix:

- Writer/viewer; draft/published/archived; zero questions; incomplete/invalid readiness; missing taxonomy;50-target/4-effective-marks discrepancy; untimed; calculator on/off; mixed per-question penalties; long/no instructions; sections absent/present; unmapped/overlapping/large coverage.
- Zero/one/more-than-ten attempts; latest result; active attempt outside first history page; submitted ungraded; zero/negative/fractional scores; different historical maxima; stable ties/page bounds; refresh/Back; authorized empty/error/retry states.
- Phones at 320/390px, tablet at 768px, supported tablet at 1024px, desktop at 1471px and short landscape; light/dark; long titles; rich text/math/tables; no document overflow; no clipped focus or hidden actionable footer. Touch targets of 44px follow the project design system.
- Keyboard disclosures, focus restoration, native links, correctly labeled sharing switch/input/radio group, readable chart alternative, reduced motion and screen-reader names. Do not assert contrast compliance without measuring the relevant pairs.
- Shared public landing remains correct; phone Start creates zero attempts; direct/resume gating and actual TCS iON exam flow remain unchanged. User assessments are not published/started/edited just to demonstrate the new design.

## Implementation verification

- Focused unit/render tests passed 18 tests/76 assertions, covering role/lifecycle eligibility, zero-question and active-attempt behavior, shared personal scope, page bounds, stored score denominators, legacy penalty normalization and existing shared question presentation.
- Read-only Playwright passed twelve light/dark responsive layouts and four sharing viewport checks. Verified inline long instructions, a single metadata flex row, labeled marking values, continuous section entries, truthful mark target/advisory, exact historic score values, draft actions, larger-screen notice, named sharing controls and cancelled-state reset. No document/graph overflow, mutation requests, page errors or hydration mismatches; captures inspected. Evidence: scratch/detail-implementation-browser.{log,json}, detail-final-*.png.
- A separate read-only browser pass verified actual server paging on the workspace history, ten attempt rows on page two, native Back, heading focus, preserved sibling query state, paper-filtered out-of-range clamping, reachable share-link input in the scroll body, Escape focus return and the bounded syllabus subject link. Zero mutations/page errors. Evidence: scratch/detail-pagination-browser.log.
- Required full assessment E2E passed, including its new effective-mark/inline-instructions/personal-history checks and saved-sharing refresh assertion, plus all existing creation/builder/picker/publish, phone gate, actual exam/calculator/submission, analysis, management, sharing and anonymous-public-page stages. Final TypeScript noEmit, targeted lint without warnings, formatting and scoped diff checks passed. Evidence: scratch/detail-implementation-{e2e,tests,typecheck,lint,format,diff-check}.log.
- The full suite uses named test fixtures; focused checks did not save existing user assessments. Viewer/archived paths have capability tests rather than dedicated persisted browser fixtures. No physical-device, assistive-technology, large-data latency benchmark or production build was performed.

## Original review verification and limits

- Read-only Playwright checked twelve page layouts: light/dark × 1471×902, 1024×768, 768×1024, 390×844, 320×640, 844×390. No horizontal document overflow was recorded. The chart itself needs horizontal scrolling on phones.
- Opened/cancelled Share at 1471/390/320px and 844×390 landscape. Dialog stayed within the viewport; footer controls were reachable but 36px high. Inspected light/dark desktop/phone page captures and Share/long-instruction phone captures.
- Confirmed Larger screen notice on a 390px viewport with zero assessment action requests. Reviewed the existing draft without saving/publishing. Recorded zero page errors and hydration mismatches, and zero assessment mutations during the audit.
- Selected paper has only three attempts and no mapped coverage rows. More-than-ten history, viewer/archived action paths and large coverage are source findings requiring fixtures during implementation. Mapped-coverage keyboard expansion was skipped on this selected paper because no mapped rows exist. Graph exact-value links were exercised; no claim of physical-device or screen-reader certification.
- Evidence: ignored `scratch/assessment-detail-ux-audit.{ts,json,log}`, `detail-audit-{light,dark}-{1471,390}.png`, `detail-audit-share-{390,844}.png`, `detail-audit-draft-mobile.png`. Existing tests/runtime were not changed for this audit.
- Accessibility review criteria: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), retrieved 2026-10-29; the project's 44px targets and semantic color rules additionally apply. These criteria inform labels, keyboard/focus, semantics, wrapping and loading feedback; they do not establish formal conformance from screenshots alone.

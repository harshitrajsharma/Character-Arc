# Component reuse audit — 2026-10-29

## Scope and decision criteria

This document records the original audit and the subsequent approved implementation. The audit itself made no runtime changes; implementation status is recorded below. Existing unrelated uncommitted work was preserved.

Indexed 459 source files across `app`, `components`, `lib`, `hooks` and `types`, including imports/re-exports, literal dynamic imports and function bodies. The component directory contains 265 source files (including helpers/types/tests), 53 of which are UI primitives. These counts are not counts of mounted React components. Similarity scanning identified candidates; caller tracing and responsibility checks determined the recommendations below.

Read-only browser inspection covered 17 authenticated routes at 1440px and 390px: Today, workspace, tools, Goals overview, Arc creation, Exam Prep overview/detail, a populated subject, exam creation, assessment library/community/attempts, question bank, assessment creation/builder/detail and analysis. Also captured login, signup and password recovery. The successful authenticated captures returned 200, recorded no page-error events and had no document-width overflow at the measured widths. This is rendering evidence, not exhaustive interaction/accessibility verification.

The subject `?stage=test` deep-link inspection timed out; the base subject succeeded on retry. Arc detail/edit had no populated fixture and were source-reviewed only. An exam details dialog was inspected, but a later settings/planner/global-dialog pass failed authentication before reaching its targets. Those recommendations are source-based. No live exam was started and no domain forms were submitted. Screenshot instrumentation/PWA warnings mean these checks must not be represented as a clean console or hydration test suite. Physical devices, assistive technology, every modal and every component state were not covered.

Consolidate when components own the same responsibility, vocabulary, state contract and accessibility behavior. Share smaller presentation parts when workflows differ. Remove obsolete branches rather than building an abstraction around unused code. Visual resemblance alone does not establish duplication.

## Prioritized active candidates

Paths below are relative to the repository root.

| Priority | Existing implementations | Decision and target | What must remain separate |
| --- | --- | --- | --- |
| High | `components/tools/mock-tests/new-assessment-form.tsx` and `blueprint-form-fields.tsx` | Share typed assessment identity, timing, instructions and benchmark field sections, plus normalization/validation helpers. Both define title/type/labels/subjects/duration/marks/calculator/instructions. Field help, IDs, validation and numeric conversion can drift. | Creation controller creates a draft and redirects. Builder controller tracks revisions, dirty metadata, roster and partial-save recovery. Keep those controllers/actions separate. Creation and builder rendered; settings sheet source-reviewed. |
| High | `components/tools/mock-tests/dashboard/assessment-pagination.tsx`, `attempt-history-pagination.tsx`, bank pagination inside `question-bank-view.tsx` | Share a page-window helper and `PaginationControls` presentation: range, ellipsis, accessible current/disabled state, touch targets and labels. Existing `ui/pagination` already supplies base primitives. | Local array paging, URL/server paging, pending state and post-fetch focus timing differ. Picker pagination can reuse buttons without adopting a numbered-page UI. Library, attempts and bank rendered. |
| Medium | `components/settings/settings-dialog.tsx`, `tools/exam-prep/exam-settings-dialog.tsx`, `subjects/settings/subject-settings-dialog.tsx` and its form | Share a settings layout with title/navigation/content/footer slots. The repeated sidebar, scroll region, large dialog geometry and responsive navigation should have one implementation. | Global profile/team/MCP settings, exam configuration and subject targets have distinct schemas, permissions, save behavior and dirty-state requirements. Dialog interactions not verified in this pass. |
| Medium | `dashboard/dashboard-filter-toolbar.tsx` (`FilterSelect`) and `question-bank-view.tsx` (`BankSelect`); analogous picker controls | Extract a small labeled select field using the existing Select primitive, with explicit IDs, options, disabled state and size. | Keep full toolbars separate. Library has responsive sheet/inline filters; bank uses server search/usage/page-size semantics; picker manages a bounded selection workflow. Library and bank rendered. |
| Medium | `dashboard/recent-attempts-table.tsx`, `detail/attempt-history-list.tsx`, `exam-prep/subjects/tests/linked-assessment-row.tsx` | Share status badge, score and resume/review action presentation through a typed adapter. Consider an AttemptRow only after those pieces prove common. Align deliberate timestamp policy: dashboard currently specifies Asia/Kolkata while detail uses locale defaults. | Workspace chronological history, one-paper history and subject-linked attempts have different grouping/navigation. Manual external results and scheduled plans are different records, not interchangeable CBT attempts. Workspace/detail rendered; subject row source-reviewed. |
| Medium | `components/tools/tool-catalog-card.tsx`, `tool-catalog-detail.tsx`, `dashboard/current-arc-grid.tsx`; navigation consumers | Move repeated tool icon/category/presentation maps into a small pure tool-presentation module. Sidebar/mobile should not import a mapping from a card implementation. | Discovery/install cards, installed entity rows and current activity cards have different purposes. Keep their components. Catalog/dashboard/sidebar/mobile rendered; catalog detail source-reviewed. |
| Medium | `components/navigation/navbar-data.ts`, AppSidebar and MobileBottomBar destination construction | Reuse the existing destination resolver and active-route helpers. Source currently has Home/Today label differences and mobile selects the first membership while sidebar considers route workspace. Verify multi-workspace behavior before changing it. | Keep topbar/sidebar/mobile renderers: density, More drawer and navigation affordances differ. Route mismatch is a source finding, not a reproduced multi-workspace defect. |
| Low | Exam countdown/detail date helpers; editor math renderers | Share pure helpers, not entire components. `exam-countdown.tsx` and `exam-detail-header.tsx` repeat exam-start calculation; use canonical date-only parsing from `lib/dates/local-date.ts`. `editor/math-extensions.tsx` and `editor/legacy-math.ts` repeat KaTeX rendering options. | Preserve date-only versus timestamp semantics and timezone policy. Preserve Tiptap node views/edit controls versus read-only math rendering; retain bounded caching where appropriate. |
| Low | Goals/Exam Prep lifecycle groups, SubjectCard/ProgressOverview/ArcProgressPanel progress tracks | Optional grouped-list presentation and accessible progress-meter reuse. Existing ToolListRow/ToolPageHeader already provide useful sharing. | Keep lifecycle data controllers and progress calculations distinct. Coverage, completion and test scores are different metrics. Do not create one universal entity card or statistics controller. |

### Why field sections are a better boundary than a universal form

The assessment create form and builder edit fields represent the same assessment metadata, but their surrounding workflows are materially different. Shared field sections should receive typed values, change handlers, IDs and errors. They should not fetch, navigate, authorize or save. Keep revision handling, server action calls and failure recovery in each caller. Avoid a single component with many `isCreate`, `isEdit`, `isSheet` and `shouldRedirect` flags.

### Existing question reuse

The active bank, builder, picker, author preview and analysis now compose `questions/question-card.tsx`, `question-view.tsx`, `author-question-preview.tsx` and `question-review-summary.tsx`. Their task-specific wrappers should remain: bank needs reuse/edit context, builder needs allocation/actions, and review needs outcome/response comparison. The actual TCS iON assessment player and its in-exam paper dialog intentionally remain separate.

The live assessment detail page uses TestProfileHeroCard, ScoreTrajectoryGraph, AssessmentCoverage and AttemptHistoryList. It does **not** mount QuestionPaperRoster. The earlier shared-question migration of that roster therefore did not change the currently rendered detail page. Do not retain or resurrect the dormant roster just to demonstrate reuse.

## Unused/obsolete component candidates

Found 17 non-primitive, non-test component files with no production import path from the app, totaling approximately 3,347 source lines. Symbol/reference checks also found no live callers. This is a deletion shortlist, not proof of bundle savings or permission to delete everything automatically. Recheck imports, exports, scripts and dynamic consumers immediately before removal.

| Files | Current replacement / rationale |
| --- | --- |
| `components/navigation/context-breadcrumbs.tsx` | Active NavbarBreadcrumbs and breadcrumb context supply appbar navigation. |
| `components/sidebar/nav-actions.tsx`, `nav-secondary.tsx` | Unmounted sidebar implementations, including static/demo actions. |
| `components/tools/exam-prep/exam-countdown-summary.tsx` | Active ExamCountdown owns official/expected dates and schedule state. |
| `components/tools/exam-prep/exam-settings-form.tsx` | Active ExamSettingsDialog owns exam editing. This older large form repeats draft/types/action/field logic. Remove the inactive branch before considering shared settings helpers. |
| `components/tools/exam-prep/subjects/dialogs/edit-chapter-dialog-wrapper.tsx`, `edit-chapter-dialog.tsx` | Wrapper only points to the obsolete dialog. Active syllabus uses SyllabusItemActions. Old dialog also contains an incomplete persistence note. |
| `components/tools/exam-prep/subjects/syllabus/sortable-chapter-item.tsx`, `topic-actions.tsx` | Active SyllabusChapterCard owns sorting; SyllabusItemActions supports chapter/topic actions. |
| `components/tools/exam-prep/subjects/tests/scheduled-test-card.tsx`, `scheduled-tests-section.tsx`, `test-record-card.tsx`, `test-records-section.tsx` | SubjectTestView/ChapterTestView use UnifiedTestsSection and its rows/dialogs. An identical confirmAction implementation survives in the old scheduled section; deleting that branch is preferable to extracting dead logic. |
| `components/tools/mock-tests/detail/mock-test-header.tsx`, `mock-test-telemetry-card.tsx`, `question-paper-roster.tsx` | Live detail view uses the newer hero/trajectory/coverage/history composition. |
| `components/tools/mock-tests/question-heatmap.tsx` | Active analysis heatmap is implemented inside AnalysisScorecard. |

Also inspect the unused exported RecommendationsSkeleton in the active recommendations section: the live route skeleton has its own geometry. An unused export should be removed if confirmed, rather than merging route-specific skeletons because their names match.

Do not mass-delete unused `components/ui` primitives. They are a reusable toolkit, not automatically duplicate domain implementations. Inspect dependent custom helpers after removing dead branches; for example, the old settings form is the only known consumer of FormFooter.

## Similar components that should stay separate

| Pair/family | Assessment |
| --- | --- |
| Actual exam player versus app QuestionCard/QuestionView | Explicit product requirement. Live exam navigation, timer, autosave and answer visibility differ from author/review surfaces. Keep player design and payload boundaries. |
| SubjectCard and SortableSubjectCard | Healthy composition: one renders content; the other supplies drag sensors, transforms and pointer/focus behavior. |
| SubjectTestView and ChapterTestView | Thin scope adapters already share UnifiedTestsSection. Removing named wrappers brings little benefit and can obscure context. |
| CreateArcForm and ArcEditForm | Already share ArcDirectionEditor, ArcOptionalContext and draft contracts. Creation's cover/theme/success flow differs from editing/persisting an existing Arc. |
| DatePickerField, ExamDatePicker and core DatePicker | Core calendar is already shared. Controlled ISO-string field/error/hidden-input integration differs from a defaultValue/form-action adapter. Generalize adapters only when an additional real consumer needs it. |
| MarkdownBlockEditor and RichTextEditor | BlockNote writes Markdown; Tiptap writes rich HTML/math/images/tables. A merged editor would change content contracts, not just remove duplicate UI. Keep MarkdownContent and RichContent format adapters too. |
| Route skeletons | Exam Prep row layout and tools grid require different loading geometry, even where markup similarity is high. Share Skeleton primitives, not an inaccurate universal page skeleton. |
| AuthInput/PasswordInput and Input | Styled adapter plus isolated password visibility is reasonable reuse. Sign-in/signup/recovery actions and stages remain separate. |
| Dialog/Sheet/Drawer; Tabs/ToggleGroup/SegmentedSelector | Different interaction/accessibility semantics or deliberate adapters. Similar styles are not sufficient grounds to merge. |
| UpNextCard/StudyPathTimeline and RecommendationSubjectRow | One selects the next topic activity; the other prioritizes subjects across an exam. Optional shared phase/status helpers only. |
| ToolCatalogCard, ToolListRow and CurrentArcGrid | Discovery/install, domain entity management and cross-tool activity need distinct information and actions. Share tool metadata rather than whole cards. |
| SubjectStats and ProgressOverview | Evidence/counts and progress coverage complement one another. A shared meter is plausible; one combined statistics component is not necessary. |
| Delete/archive dialogs across tools | Arc archive preserves history; exam delete removes dependent data; assessment removal blocks active attempts; syllabus actions affect local entities. Existing AlertDialog is the right shared layer. Keep domain mutation/confirmation content separate. |
| Landing Reveal and AuthReveal | Viewport entry and authentication mount transitions differ. Low-value small-file similarity does not justify losing trigger/reduced-motion semantics. |
| Progress meter and progress stepper | Read-only evidence versus user mutation control. Separate responsibilities. |

## Browser observations relevant to reuse

- Question bank cards now visibly share the question presentation family while retaining Edit/reuse/topic context. Continue composing this family rather than introducing another bank-only question renderer.
- Assessment creation presents a focused full-width form; its field sections can share content with settings without forcing page and sheet to have identical framing.
- The populated mobile subject page has compact progress summaries, evidence statistics and horizontally browsable next activities. Those surfaces communicate different information despite all being card-shaped.
- Live assessment detail is a hero/statistics/coverage/history layout, confirming that dormant detail roster files are not the current screen.
- The settings-shell recommendation depends on source geometry/caller inspection. The later authentication failure prevents claiming visual verification of all settings variants.

## Recommended implementation order

1. Recheck and remove the 17 obsolete files and newly orphaned helpers in a focused cleanup. Do not change live behavior or delete UI primitives merely for low usage.
2. Extract shared assessment metadata field sections and normalization. Preserve create/edit lifecycle and revision/error recovery.
3. Extract pagination presentation/page-window helper and labeled filter-select field. Preserve each caller's routing, pending and focus behavior.
4. Consolidate settings layout after rendering all three variants. Keep save/data ownership with each domain.
5. Share attempt display parts, tool metadata/navigation resolution and pure date/math helpers. Verify timezone and multi-workspace behavior explicitly.
6. Reassess low-priority grouped-list/progress reuse after the stronger consolidations. Leave legitimate adapters/wrappers in place.

Acceptance for implementation: repeat production reference checks, TypeScript and targeted lint; run meaningful normalization/pagination tests; exercise save errors, pending state, keyboard focus, disclosures and narrow-screen navigation. Run the repository's full Playwright suite for substantial UI/routing changes. Check both themes and 320/390/768/1440px. Preserve Server Action authorization, server/client boundaries, question solution permissions, domain record distinctions and the TCS iON player. Prefer direct imports and narrow pure modules; avoid broad client barrels or importing form/editor dependencies into unrelated views.

## Evidence

- `scratch/component-audit-scan.mjs`, `component-audit-inventory.json`, `component-audit-scan.log`: static inventory/import graph and similarity candidates.
- `scratch/audit-application-rendering.ts`, `component-audit-browser-complete.json`, `component-audit-browser-complete.log`: route/width rendering probes.
- `scratch/component-audit-*.png`: desktop/mobile/auth screenshots, exam details dialog and failed deep-link capture.
- `scratch/audit-component-dialogs.ts`, `component-audit-dialogs.log`: attempted follow-up dialog probe; failed authentication, not successful dialog coverage.

Scratch evidence is local/ignored. This document records durable conclusions. Full mutation E2E was not rerun for this audit-only change.

## Approved implementation — 2026-10-29

- Rechecked the production import graph and removed all 17 obsolete component files listed above. Removed the unused RecommendationsSkeleton export/body; preserved route-specific skeletons and the UI primitive toolkit.
- Added shared assessment metadata field sections, typed values/errors, validation and normalization. BlueprintFormFields is now an adapter; creation retains progressive optional sections and its own submission lifecycle. Builder metadata and roster actions/revisions remain separate. Paper type constants no longer require importing a form implementation.
- Added PaginationControls/page-window helper and FilterSelectField; library, history and question bank retain their paging/search/data/focus adapters. Picker's compact bounded pagination remains appropriate to its selection workflow.
- Added SettingsDialogContent, SettingsHeader, SettingsNavigation, SettingsBody, SettingsPanel and SettingsFooter. Global, exam and subject settings compose these; all domain state/actions/confirmations remain in their callers. Navigation now has visible keyboard focus and 44px minimum targets, with mobile horizontal scrolling. Content no longer creates nested main landmarks.
- Base DialogContent clips full-bleed header/footer backgrounds to its rounded popup outline. Tall generic forms must provide their own viewport height cap and scrolling, as the section dialog does; full-screen/custom settings retain their existing sizes and internal scroll regions. Select/menu popups use portals rather than relying on visible overflow through the dialog frame.
- Added shared attempt status/result/action parts and explicit IST date/time formatting. Kept workspace grouping, single-paper numbering and linked assessment rows. Scheduled plans/manual external results retain their own models and actions.
- Moved tool icon/category maps to `lib/tools/presentation.ts` and updated all consumers, including app pages and navigation. Sidebar/mobile now use the same destination and route-workspace resolver. Retained the dashboard's curated activity badges: they express domain activity rather than the catalog icon/category contract, so collapsing these into one icon lookup would lose meaning.
- Reused canonical date-only parsing and timestamp parsing; shared the bounded KaTeX render/cache helper between editor nodes and legacy read-only adapters. Markdown and HTML editors remain separate. Split rich-editor skeletons into a leaf module with direct consumer imports.
- Reassessed optional generic lifecycle-group/progress abstractions and left them out: existing ToolListRow and domain views already share the meaningful presentation boundary. A new universal group/card/controller would add configuration without removing duplicated responsibilities. Intentional separations in the table above remain in place.
- Regression/browser verification results are recorded in PROJECT_LOGS.md after implementation checks complete. No data/model/action permissions or TCS iON player code was changed.

Final verification passed: formatting, TypeScript, targeted lint, 50 tests/118 assertions, full assessment Playwright E2E and 64 focused light/dark responsive checks at 320/390/768/1440px. The focused run verified paging pending/disabled/focus behavior, field validation and all three settings layouts, with no recorded page errors/hydration mismatches. The earlier audit-only settings coverage limitation was therefore resolved during implementation. Cold compilation and host memory caused intermediate failures; final checks ran sequentially, and E2E navigation budgets now accommodate cold compilation without removing outcome assertions. See PROJECT_LOGS.md for exact coverage, fixture side effects and remaining physical-device/build limitations.

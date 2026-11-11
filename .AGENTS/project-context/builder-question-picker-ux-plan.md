# Add questions sheet — usage review and improvement plan

Reviewed and implemented 2026-10-29. Findings below describe the previous picker; current behavior is recorded in the implementation notes.

## Purpose

Help an assessment author find suitable existing workspace questions, inspect enough content to choose confidently, add several to the correct section, and return to assembly without losing their place. Additions affect the local builder draft; persistence still requires Save changes. Creating a new question is a secondary escape path and must retain the existing unsaved-navigation guard.

The sheet is a selection tool, not a second question-bank management page or a practice exam. Do not introduce editing/deletion controls or the TCS iON player here. Use the shared app QuestionCard/QuestionView family, adapted for selection.

## Evidence and limits

Read picker, caller, shared question frame, Sheet primitive, query provider and authorized bank action/repository. Reviewed current browser rendering at 1440×902, 768×1024, 390×844, 320×640, 390×480 and 844×390. Opened/closed/search-filtered the sheet, inspected list scroll, delayed one search request and counted bank requests. No questions/sections were added and no assessment was saved.

- At 390×844 the results region was 437px tall; 320×640 left 233px.
- At 390×480 only 73px remained for results. This is a short-viewport proxy, not a physical mobile-keyboard test.
- At 844×390 the results region collapsed to 16px and the footer bottom reached y=483, outside the 390px viewport. The screenshot confirms that navigation/actions are clipped. No horizontal document overflow was measured.
- Closing/reopening reset results scroll from 400 to 0 and made one additional bank request after the debounce interval. Search text survived reopening. Source also preserves kind/difficulty/page in the still-mounted picker, but SheetContent DOM is remounted and reopening retriggers its effect.
- The initially focused element was the search input. On phones this may bring up the keyboard immediately; physical-device behavior was not tested.
- Delayed search showed `aria-busy=true`, old result cards, loading text and zero skeletons. No preview controls were rendered. No page-error events were recorded.
- Only 11 matching questions were available in the fixture. Multi-page scroll behavior is a source finding, not a rendered multi-page test. The optional section selector was source-reviewed; the measured layout had no section selector, so that control can further reduce result space.

Source anchors are relative to the repository root. Accessibility review used the [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), alongside the local Character Arc design system.

## Prioritized findings

| Priority | Location | Problem and user consequence | Resolution |
| --- | --- | --- | --- |
| P1 | `components/tools/mock-tests/builder-question-picker.tsx:132`, `:247`; `components/ui/sheet.tsx` | Header, filters and two footer rows are non-shrinking. In short/landscape viewports they consume the sheet, hide questions and push footer commands offscreen. A section selector adds more height. | Compact chrome; hide pagination when there is one page; collapse secondary filters on narrow/short layouts. Provide a short-height fallback with one scrollable body containing filters/results so fixed regions cannot exceed the viewport. Keep essential actions reachable. |
| P1 | Picker `:62–89` | Every reopen schedules a request; there is no query-keyed freshness cache. State survives only while the builder component survives. Last data alone is not a cache. | Use the existing TanStack Query provider, scoped to viewer/workspace and normalized search/type/difficulty/page. Honor its existing 60s freshness policy initially. Reopen fresh results immediately; refresh stale data unobtrusively and invalidate after question creation/editing. |
| P1 | Picker `:201–245` | First load is nearly blank except text. New search/filter/page requests leave old cards visible but disabled, with no visual relationship to the new query. | Use 3–4 shared-card-shaped Skeleton rows for first/new-query loading. Preserve valid cached content for same-query background refresh with a small updating indicator. Clearly distinguish pending, empty, first-load error and refresh error. |
| P1 | Picker `:225–243`; `questions/question-view.tsx:101` | Cards expose type/difficulty plus a two-line stem excerpt. There is no way to inspect full wording, options or the answer before adding. Topic context in the DTO is unused. | Shared QuestionCard disclosure with full QuestionView, options, topic labels and an explicit author answer-key reveal. Keep explanations optional. Selection and preview must be separate keyboard/touch targets. Do not require answering the question to inspect it. |
| P2 | Picker state `:51–60`, pagination `:249–273`; caller `assessment-builder.tsx:574` | Query/filters/page remain in component state, but results scroll is lost on reopen. Page/filter changes do not explicitly reset the list to its beginning. Global Add questions resets the target section. | Preserve scroll per query/page when reopening; reset to the top when changing query/filter/page after results commit. Respect explicit section entry points and validate remembered targets against current sections. Never silently add to a deleted or unrelated section. |
| P2 | Picker `:228–240` | One full-width card plus a separate bottom Add button produces tall, repetitive rows; large assemblies require one click per question. Already-added items continue consuming browsing space. | Compact metadata/stem/action arrangement. Consider multi-select with a single Add selected (N) command and selection across pages. Keep live duplicate prevention from the parent roster. An Available-only filter is useful, but it must affect server counts/paging, not only hide rows in the loaded page. |
| P2 | Picker `:207–209`, `:261` | Matching results, total draft count and pagination are mixed. Page 1 of 1 plus Prev/Next always consumes a footer row. | Separate results range/total from assessment membership. Hide single-page navigation. Announce additions and loading once; keep the live status outside an aria-busy region so it is not delayed until loading finishes. |
| P2 | Picker `:90–118`; `components/shared/filter-select-field.tsx` | Picker keeps another local Select wrapper and omits SelectGroup around items. | Reuse FilterSelectField for the same labeled-control behavior while retaining the picker-specific toolbar. Use Field/FieldGroup and grouped Select items. |
| P2 | Picker `:136–144`; `actions/builder-bank-actions.ts:10` | Search input has no maxLength; action rejects strings over 500 characters. Users get a generic load failure instead of useful field feedback. | Normalize/debounce search text only, enforce/explain the shared 500-character limit. Filter changes and page navigation should not inherit an artificial typing debounce. Add clear search and reset filters. |
| P2 | `lib/tools/mock-tests/question-bank-page.ts:102–112`; builder action `:20–40` | Picker reuses the full bank-page fetch, including five counts and dashboard statistics it does not display, then fetches rows after the counts. Every debounced search pays this cost. | Reuse authorized repository filtering/serialization but provide a lean picker projection: relevant count, bounded page and required preview fields. Preserve stable sort, supported kinds and membership checks. Avoid computing full bank statistics for this sheet. |

## What “remember/memoize” should mean here

React.memo alone does not preserve an unmounted scroll container, avoid effect-based refetches or cache network results. The parent already keeps BuilderQuestionPicker mounted, so closing the sheet currently retains its state values.

Use three distinct layers:

1. **UI state:** query/type/difficulty/page, expanded previews and results scroll remain with the current assessment editing session. Explicit section entry points override target selection. Persist only small versioned filter preferences to session storage if a create-question round trip must survive remounting; key them by workspace/assessment and never persist question/answer payloads to browser storage.
2. **Data cache:** use the installed QueryProvider rather than adding a second cache implementation. Bound freshness, scope keys to identity/workspace, and clear/invalidate when relevant identity/data changes. The current provider already specifies a 60-second stale time.
3. **Rendering:** consider memoizing individual expensive rich-preview rows only if profiling shows useful savings. Avoid wrapping the entire sheet in memo and presenting that as the loading fix. Inputs should remain responsive; debounce only server search.

## Proposed structure and interaction

- Compact title/close row; a short unsaved-draft explanation.
- Search with clear action. Desktop shows type/difficulty controls inline; narrow/short layouts use an expandable Filters control with active count and reset, within the same sheet rather than another stacked sheet. Show a labeled target section when sections exist.
- Results range/count, followed by shared question rows. Collapsed rows identify content, type, level and topics. Disclosure reveals full content/options, with authorized answer-key reveal. Existing questions say Added to assessment with a non-color indicator.
- Retain quick individual Add in the first implementation. Treat batch selection as a second phase: selected IDs survive query/page changes, Add selected (N) commits to the local roster in one operation, and the footer clearly separates selected-to-add from already-added counts. Closing alone must never add or save selected questions.
- One compact footer for essential commands. Pagination appears only when needed and uses accessible shared navigation controls adapted to this picker. Create question stays secondary and keeps the unsaved-navigation guard. Closing/reopening the same query restores the previous list position.
- No new universal form/card/controller. Reuse FilterSelectField, QuestionCard/QuestionView, Skeleton and paging primitives; put query/cache behavior in a small picker hook and keep roster mutation in AssessmentBuilder.

## Loading, error and accessibility requirements

- First load/new query: stable-height skeleton cards, decorative/aria-hidden and reduced-motion aware; one polite status outside the busy results region.
- Cached reopen: immediate valid results, no skeleton flash. Background refresh preserves content; show a small updating status. First-load failure offers Retry; refresh failure retains usable cached results with a retry notice.
- Avoid showing an old query's cards as if they match newly selected filters. Cache/query identity determines whether stale content is safe to display or should be replaced by a skeleton.
- Prevent duplicate additions using the current parent added-ID set, including when cached results return. Query responses must not overwrite newer filters/results.
- Keyboard-operable preview and selection, descriptive action labels, visible focus, 44px touch targets, announced additions and focus recovery after loading/navigation.
- Desktop can focus search on open. On phones, prefer a non-input initial focus target so opening the picker does not immediately sacrifice results space to the keyboard. Users can deliberately tap search. Verify this on a physical device before claiming keyboard coverage.
- Real short-height/keyboard layouts must keep Close and the primary add action reachable; a single scrollable body is preferable to clipping non-shrinking chrome.

## Implementation order and acceptance

1. Fix short-viewport layout and single-page pagination; keep current individual-add behavior.
2. Introduce scoped query caching, remembered scroll and proper loading/error states. Normalize search, remove debounce from paging/filters, invalidate after create/edit.
3. Add shared preview disclosure, topic context and clear addition feedback; replace local Select wrapper.
4. Optimize the authorized picker data projection. Add server-side Available-only/topic filters only when their count/query contracts are defined.
5. Introduce batch selection if large-paper assembly warrants it, with a single parent add-many update and explicit pending-versus-added states.

Acceptance: repeated reopen without needless fresh fetch, preserved query/page/scroll, correct invalidation, delayed/racing responses, first-load and refresh failures, no duplicate additions, two real result pages, clear Add-to-section behavior and create-question navigation protection. Verify 320/390/768/1440px, landscape and short viewport, light/dark, keyboard/focus, reduced motion and physical keyboard/safe-area behavior. Run full E2E for the eventual implementation; this review did not introduce runtime picker changes.

Evidence: `scratch/picker-ux-audit.ts`, `picker-ux-audit.json`, `picker-ux-audit.log` and `picker-audit-*.png`. Temporary probes are local/ignored.

## Implemented behavior

- Picker remains a native Base UI Sheet using the shared QuestionCard/QuestionView, FilterSelectField, Field/FieldGroup and Skeleton primitives. Header/footer are compact; all filters, result status, cards and optional pagination share a single scrollable body. Secondary filters collapse below 1000px. One-page navigation is omitted. Short portrait/landscape layouts retain reachable Close/Create/Done/Add commands without clipping the footer.
- `use-builder-question-bank.ts` uses the existing QueryProvider. Data keys include verified viewer ID, workspace, normalized search, kind, difficulty and page. Results are fresh for 60 seconds and evict after 5 minutes unobserved; remembered picker UI/selection is scoped to viewer/workspace/assessment and evicts after 30 minutes away. Closing remembers filters/page/scroll/expanded rows/pending selection; SPA navigation to/from question creation retains that memory. Hard reload resets this in-memory state. No question/answer payloads or preferences are written to local/session storage.
- First/new-query loading uses four decorative reduced-motion-aware skeleton cards; fresh cached reopen is immediate. Same-query background refresh retains results, with a separate updating/error status and Retry. Status is outside the busy result region. Search is limited to 500 characters and is the only debounced input. Query-key isolation prevents a late response replacing a newer query's results.
- Scroll restoration occurs when the portal's scroll element attaches and after data commits. Initial focus goes to the sheet title at every breakpoint: focusing an offscreen search input on reopen previously reset the restored scroll. Search is the next keyboard destination, and phones do not automatically focus an input. Physical keyboard/IME behavior still requires device QA.
- Shared card disclosure shows full wording/options/topics; answer key/explanation is supplied only after explicit reveal from the already-authorized author DTO. Native checkbox selection remains separate from disclosure. Single Add and multi-select/Add selected (N) both remain available. Selection survives filters/pages/close and cannot include an ID already in the parent roster. Parent adds a batch once, preserving section ordering and duplicate protection. Adds are local until Save changes, with announced feedback.
- Named-section entry points set the target. A global reopen retains a still-valid target, and additions validate it against current sections. Deleted/invalid targets resolve to Unassigned. Create question retains the existing Save/Discard/Stay navigation guard.
- Builder action requests a lean repository projection with one relevant count plus bounded rows rather than five dashboard count operations. Default full-bank queries retain their existing statistics contract; the internal picker action now returns BuilderQuestionBankPageData without total/stats. Membership/installation checks, supported kinds, stable sort, page size 20 and server-side validation remain intact. No SQL/RPC/schema/scoring changes.
- Successful question create/update invalidates the workspace's builder-bank query prefix. Viewer identity remains part of each data key. The edit page keys the builder by viewer/assessment so state cannot carry to another assessment identity.
- Additional feedback implemented: readable 32px Draft/Published status beside the assessment title, save/revision metadata separated below, guidance immediately below Questions controls and before the roster, and Edit details wording/accessibility title. Builder header remains in normal document flow. Shared sheet backdrops use transparent blur; sheet shells use semantic bg-popover/80 and stronger blur, without a black scrim. Ordinary dialogs retain their existing overlay treatment.
- Optional Available-only/topic filters remain future extensions: they require explicit server count/filter contracts rather than hiding only currently loaded rows. Batch selection, previews, core filters/cache/loading and the lean data projection are implemented.

Verification and evidence are recorded in PROJECT_LOGS.md. Full assessment E2E passed; focused checks use existing authorized rows and controlled multi-page responses rather than seeding a large question bank into the user's workspace.

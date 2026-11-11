# Assessment dashboard UX plan

Updated 2026-10-25 following management, responsive controls and pagination feedback.

## Purpose and priority

Manage created assessments, community assessments and personal attempt history, with
discovery as a separate future library capability. Taking a test is secondary.
Exam Prep subject/chapter pages provide the contextual study workflow; the
assessment library owns paper management without duplicating paper records.

## Loading states (2026-10-27)

- Route loading uses the same max-w-6xl shell, compact header/actions, three-tab
  strip, responsive toolbar and segmented assessment cards as the live page.
  Removed placeholders for the retired KPI tiles and filter-pill ribbon.
- Tab navigation has a dedicated transition separate from community copying.
  The requested tab selects immediately; only its filters/content are replaced
  while the URL-backed data request completes. The header and tab strip remain
  usable. When navigation completes, the URL is authoritative, including Back.
- My papers/Community loading uses gallery or list placeholders according to
  the remembered view. Attempts uses chronological row placeholders. Existing
  cards/attempt results are not presented as if they belonged to the pending tab.
- Shared skeletons are decorative/noninteractive, expose a single polite loading
  status and busy region, use semantic tokens and disable pulse for reduced motion.
  Do not introduce an artificial minimum delay for cached/instant navigation.

1. Compact title and task description; Question Bank and writer-only Create
   Paper actions. Mobile actions fit one row and have 44px targets.
2. An unfinished-attempt callout when loaded recent history contains one and the
   user can write. Do not claim that its timer is actively running.
3. My papers, Community and Attempts are separate accessible views. Reflect the
   selected view in the URL, including direct access with `?tab=attempts`.
4. Search stays visible in paper views. Type, status/scope and sorting appear
   inline on desktop and in a bottom sheet on smaller screens. Active settings
   and reset remain visible outside the sheet.
5. Show the paper collection or full paginated attempt history. Do not bury results below all
   papers. No leading KPI strip or irrelevant paper filters in Attempts.

## Card structure

- Identity: type, explicit publication status, linked title, exam and subjects.
- Facts: labeled questions, duration and configured marks; no nested metric card.
- Management: draft setup guidance or last update. Writable drafts open directly
  in the assessment builder through the native stretched title link and show an
  independent Edit test action. Drafts do not offer Take test or Resume. Readers
  retain overview navigation without an editing action. Published cards open
  the overview; taking or resuming a test is an independent secondary action
  layered above the link. Personal-best and cohort-score
  telemetry belongs in results/analysis, not the paper card.
- Assessment type, publication and neutral visibility appear together below the
  metric segment, matching the user-approved reference. The row wraps safely on
  narrow screens. The title leads the card body. Sharing belongs exclusively to the individual
  assessment page; the library has no Share button or sharing dialog. Eligible
  community copying remains a direct labeled button.
- The full-card link preserves keyboard, modifier-click and open-in-new-tab
  behavior. Never implement this with a click handler on the card or nest the
  test/clone controls inside the link. Keyboard focus outlines the card, while
  secondary controls keep their own focus state.
- Workspace cards with write permission expose a floating top-right Rename/Delete toolbar
  on desktop hover or keyboard focus; narrow screens use a vertical three-dot menu. Controls
  have real tooltips and independent hit areas. Rename uses a labeled dialog;
  Delete always opens a confirmation. Community/viewer/archived cards omit this
  toolbar. Duplicate remains unavailable.

## Management action contract

- Confirmation footers inherit the popup's bottom corner radii through the
  shared AlertDialogFooter primitive, keeping the footer background inside the
  rounded silhouette without clipping button focus outlines.

- `assessment.rename` changes only the root Block title and revision. It must
  preserve paper settings, questions, solutions and attempt data.
- `assessment.delete` is a retained-record deletion: archive both the assessment
  and its root Block, including archivedAt, so it disappears from the library,
  subject projections and public access. Questions and attempt rows remain.
  Reject deletion while in-progress attempts exist. The confirmation explains
  these consequences; do not imply permanent erasure or a Trash/Undo workflow.
- Management resolves the authorized root Block first. Legacy library blocks
  without Assessment details can still be renamed or deleted; deletion archives
  the Block without inventing assessment settings. Existing details must belong
  to the same workspace. An already archived detail row does not prevent cleanup
  of its still-active library Block. Missing details already display as drafts.
- Both are registered deterministic tool actions with blocks.write.owned and
  expectedRevision. Server Actions verify workspace write context; transactional
  handlers check workspace, installation, block type, active lifecycle, agent
  access and optimistic revision. Compare-and-swap prevents stale writes.
- Overview DTOs include the current numeric Block revision for these actions.
  Audit/idempotency uses the existing tool runtime. Registry synchronization is
  required; no schema migration, SQL policy, trigger or RPC is involved.

Publication and visibility are separate. Zero-question papers cannot offer
Start. Workspace viewers cannot start, edit, share or clone into the workspace.
Resume requires a known active attempt and write permission. Archived papers
offer viewing only. Missing taxonomy means exam/subject metadata is unspecified;
it does not prove that no question targets or syllabus relationships exist.

The approved next library structure is My assessments, a saved/imported
Community collection, Recent attempts and Discover. Current implementation
still has three views and uses Community for browsing; a saved collection
requires an explicit save/import contract before adding another tab.

## Responsive contract

- Community cards are discovery-oriented: title, available exam/subjects (or
  summary), questions/duration/marks, known paper type, total attempt count,
  publisher/workspace attribution and publication date. Missing taxonomy does
  not repeat placeholder errors. Do not infer taxonomy from titles.
- Omit redundant Community/Public badges in the community tab and keep ratings,
  personal scores and trust claims out unless their contracts exist. Attempts
  are cohort activity, not unique users or the current user's attempts.
- The whole community card opens its public paper page. "Copy paper" is an
  independent 44px action that uses the existing clone-to-workspace pipeline,
  with an in-place copying state; publisher-disabled copying is explicit and
  workspace viewers have no copy command. The footer wraps at narrow widths
  to retain complete publication dates. Grid/list retain the same permissions.

- One paper column on mobile, two on tablet, three on wide desktop. Contain long
  titles and subjects within cards.
- Mobile filters do not consume the initial viewport. Sheet controls, close and
  actions have 44px targets.
- At lg (1024px) and above, search, type, status (workspace) or subject scope
  (community), sorting and view controls share one aligned row with proportional
  columns. Search gets extra space; fields use consistent 44px heights and 8px
  corners, visible labels and contained values rather than oversized pills.
  The Filters sheet trigger is hidden at these widths. Smaller screens retain
  the sheet; both layouts reuse one filter field definition and the same state.
- The results header shows a plain loaded paper count, or matching paper count
  while filtered. The footer separately shows the current page range.
- Below md, writable cards use a 44px vertical three-dot menu with labeled
  Rename/Delete commands. Titles reserve space beside the menu; desktop retains
  the hover/focus icon toolbar. Both invoke the same existing dialogs/actions.
- Assessment pagination keeps Prev/Next text on narrow screens, with the current
  page between them. Desktop also shows neighboring/first/last page numbers.
- Grid/list controls are desktop-only. List mode falls back to cards on mobile.
  Both modes reuse the same card and action/permission logic. Desktop list rows
  group title/context/type/status/visibility on the left, readable three-column
  metrics in the middle, and the update date/action on the right. Tablet uses
  two columns and a full-width footer; durations stay on one line. List metrics
  have no separate tinted column.
- Take test and Resume use the filled neutral primary variant for clear surface
  and text contrast in both themes, retaining 44px targets and independent hit
  areas above the full-card link. Community Clone sits with footer actions so it
  cannot overlap list columns.
- Attempt history groups each page's rows by calendar date (Asia/Kolkata), with
  individual start times, aligned result/action columns and mobile stacking.
  Retain raw score denominators and percentages; submitted results await
  evaluation and abandoned attempts say Not completed. Review links include
  the attempt timestamp in accessible names. Leave fixed-navigation clearance.
- Use neutral semantic surfaces, violet assessment identity and success tokens
  for publication/evaluation. No pulsing statuses or decorative progress bars.

## Existing data boundaries

- My papers and Community paginate their filtered/sorted loaded results in groups
  of 12 with shared shadcn pagination controls and a result range. Search, type,
  status/scope and sort changes reset the relevant page; deletion clamps an
  out-of-range page. Page navigation returns focus to the results heading.
- Gallery/list preference is stored per workspace in browser localStorage and
  shared across My papers and Community. useSyncExternalStore supplies a stable
  gallery server snapshot; denied storage falls back to memory for the session.
  Mobile continues to show gallery cards without overwriting the preference.
- This is presentation pagination of the bounded overview snapshot, not a new
  server pagination contract. Existing 50-paper/100-candidate notices remain;
  pages do not expose older records outside those query bounds.

- Overview returns at most 50 recently updated workspace papers and five recent
  personal attempts for banner/card continuation. The Attempts tab uses a
  separate authorized getAttemptHistoryAction with no recent-history cutoff:
  all personal workspace attempts, including retained archived-paper attempts,
  ordered by startedAt desc then id desc, ten per database page. The action
  verifies claims, workspace membership and active installation, scopes count
  and rows to the same workspace/user, and reads them in RepeatableRead.
- History URLs use ?tab=attempts&attemptPage=N. Invalid/nonpositive pages default
  to one; high pages clamp to the final page. Native paging hrefs support reload
  and modifier-click; normal navigation uses a transition with loading status,
  boundary guards and focus return. Tabs derive from the URL so history
  Back/Forward stays consistent. Paper pagination remains client-side and bound
  by its existing source limits; these limits do not apply to attempt history.
- Community retrieval considers up to 100 recent candidates and then filters
  visibility. Do not present it as an exhaustive catalogue.
- Assessment `attemptsCount` is cohort activity. `myBestPercentage` measures
  score, not answer accuracy. Do not infer personal activity from cohort counts.
- Active continuation is inferred from the five loaded recent attempts. A
  separate authorized query is a future improvement for older unfinished
  sessions. This refactor leaves repository, persistence and scoring unchanged.
- Submitted results show Awaiting evaluation; abandoned attempts never offer
  Resume. Evaluated results preserve original score denominators.

## Verification

PaginationLink uses a native anchor with shared buttonVariants classes rather
than a Button render-slot wrapper. This keeps server/client class generation
identical and preserves link semantics. Hydration checks must collect console
errors as well as pageerror events, including hard reloads with saved list/grid.

Check search/reset, empty results, filters, tabs, detail-page sharing, permission visibility
and list-to-mobile fallback. Inspect light/dark at 320/390/768/1440px, 44px
targets, first-card placement, long content and horizontal containment. Run
TypeScript, targeted ESLint and the full E2E suite. Keep evidence in ignored
`scratch/assessment-redesign/` and `scratch/assessment-redesign-*.log`.

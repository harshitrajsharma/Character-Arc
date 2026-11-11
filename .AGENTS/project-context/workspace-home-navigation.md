# Workspace home and navigation — 2026-11-10

## Purpose and information architecture

Workspace is the single authenticated starting point for studying and managing
assessments. Today is no longer a parallel dashboard. The home must make the
next useful destination visible without requiring a tool submenu: exams,
subjects and their tests; assessment drafts/published papers; question bank;
community discovery; personal attempt continuation and results.

`/workspace` resolves the authorized personal workspace (or first membership)
and redirects to the canonical `/workspace/[workspaceSlug]`. Saved `/dashboard`
links redirect through that resolver. Signed-in landing, default safe auth next,
brand navigation and confirmation fallback use Workspace. Explicit deep links
continue to work. No workspace ID is inferred from untrusted client state.

## Home composition

1. Workspace identity and role-eligible New exam / Create assessment commands.
2. A personal in-progress attempt, when present, with Resume and a timer/screen
   requirement explanation. It uses the existing attempt; it never starts one.
   Resume requires write access; read-only members see an access explanation.
3. Direct Exam Prep, My assessments, Question bank, Community and Attempt history
   shortcuts, filtered by active tool installation.
4. Three recently updated exams, each with up to three ordered subject links and
   a direct Tests link. Tests use the shared `subjectTestsHref` contract and open
   `?stage=test` within the canonical subject route. All exams/all subjects remain
   available through explicit links.
5. Four recently updated assessment papers, routing editable drafts directly to
   the builder and published/read-only papers to their detail view.
6. Up to four recent personal attempts with existing shared status/score/action
   presentation and a full-history link. A pinned active attempt is omitted from
   the recent list to avoid duplication. Zero scores remain actual zero scores.
   Review is available only for evaluated results; submitted/abandoned attempts
   show awaiting-evaluation/not-completed text rather than unavailable links.

The home does not load syllabus trees, question stems, options, solutions,
assessment blueprints or unrelated Goals & Paths summaries. It is a launchpad,
not a second copy of the tools' management screens.

## Data and authorization

`lib/workspaces/workspace-home.ts` reuses verified workspace identity and active
installation reads, then runs independent bounded Prisma projections in
parallel. Exam and paper rows are scoped to their active installation and
workspace; subject edges/endpoints are constrained to the same workspace and
the registered exam-to-subject relation/type. Archived exam states and archived
blocks are excluded. Attempt reads additionally scope to the current user; a
separate take-one active lookup prevents an older ongoing test from disappearing
behind newer completed attempts.

The UI hides creation/edit commands for VIEWER, while canonical destinations
retain their own server authorization. No mutation, SQL/RPC, schema, registry or
grading contract is introduced. Missing tools get setup guidance and catalog
access instead of dead tool links. Route skeletons match the home geometry and
the workspace error boundary offers a retry without discarding saved data.

## Sidebar and mobile navigation

- Desktop omits the workspace/profile switcher at the user's request. Account
  identity remains in the global app bar, and the sidebar header contains only
  the collapse control. A bounded Active exams group exposes up to six recent
  active, non-archived exams from the current authorized workspace/installation;
  the main Exam Prep link still opens the full inventory. Exam links show the
  selected state throughout their subject routes and remain labeled by tooltips
  in the collapsed rail. No syllabus trees are fetched for navigation.
  Workspace, Exam Prep and Assessments are direct destinations. Question bank,
  Community and Attempt history are visible in a separate assessment-library
  group. Other installed tools remain usable in a lower-priority group; Goals &
  Paths itself is unchanged. Catalog and workspace settings live in the footer.
- Collapsed rail controls have labels/tooltips and the selected destination has
  `aria-current`. Workspace is active on its home only; a subject/tool path does
  not simultaneously mark the Workspace home as selected.
- Mobile prioritizes Workspace, Exam Prep, Assessments and More, filtered by
  installed tools. More includes workspace switching, other tools, catalog,
  settings, appearance and sign-out. Commands have 44px minimum targets and long
  workspace labels remain contained.
- Bottom navigation remains available below 768px, matching the existing mobile
  sidebar breakpoint. App content bottom padding uses the same breakpoint. This
  closes the former 640–767px gap with neither sidebar nor bottom navigation.
  Assessment/footer integration offsets are maintained by the release root.
- Navbar/search/menus resolve the workspace in the current route rather than
  always acting on the first membership. Workspace switching encodes slugs and
  shows the actual current workspace; misleading unimplemented shortcut labels
  have been removed.

## Removed obsolete code

The Today-only hero, metric strip, quick actions, Arc grid and dashboard data
aggregator had no remaining consumers after both home routes were replaced.
They were removed, along with the duplicate sidebar workspace-tree component.
The compatibility route remains; no Goals & Paths tool code or user data was
deleted.

## Verification

Focused navigation and render tests cover installed destinations, workspace
selection/active-route boundaries, direct subject/builder/results links, zero
scores, VIEWER commands, missing-tool setup and existing-attempt continuation.
The release root owns integrated TypeScript, production build and browser QA,
including 320/390/640/767/768/desktop widths, both themes, expanded/collapsed
sidebar and the mobile More menu. Final exact results belong in PROJECT_LOGS.md.

Focused verification completed: `bun test tests/tools/workspace-home.test.tsx
tests/tools/component-reuse.test.tsx` passed 14 tests / 61 assertions. Scoped
ESLint across the touched TS/TSX files passed with zero warnings, and the
scoped Prettier check passed. Evidence is in ignored
`scratch/workspace-{tests,lint,format-check}.log`. No browser fixture or persisted
user-data mutation was performed by this workstream.

Read-only Playwright QA completed on 2026-11-11 using the configured existing
account and matching Chromium 1254. All 24 light/dark viewport/sidebar cases
passed: 1440×900, 1024×768, 768×1024, 767×900, 640×900, 390×844, 320×640 and
844×390, with both rail states at desktop widths. Verified canonical dashboard
redirect, direct subject-test shortcuts, no Today link, no document overflow or
out-of-bounds commands, reachable short-height sidebar footer, mobile navigation
and 44px targets, contained More dialog/current workspace link, actual switcher
selection, clock mode toggle and keyboard search-to-Question-bank navigation.
Mutation-shaped Server Action POSTs were blocked; none were attempted. No page
or hydration errors occurred. Desktop/full-page, phone, tablet, short landscape
and More captures were visually inspected. Initial harness-only corrections
removed a transpiler helper from browser evaluation and used the command
palette's actual option role. Browser cache replacement during the dependency
upgrade briefly required system Chrome; the final pass used matching Chromium.
Evidence: `scratch/release-home-browser.{json,log}`, `release-home-*.png` and
`workspace-{lint-final,format-check-final}.log`. No new assessment, question,
publication, test attempt or user-record change was made.

QA-driven navigation polish adds direct Question bank, Community and Attempt
history commands to global search. The clock now shows AM/PM only in 12-hour
mode, avoiding invalid combinations such as 23:59 PM. Two available exam cards
share two columns rather than leaving a third desktop column empty.

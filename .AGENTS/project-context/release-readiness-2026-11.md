# Exam Prep / Assessment release readiness — November 2026

## Scope and acceptance

This release implements the user's coordinated learning workflow, Workspace
home/navigation and MCP readiness request, plus the final public landing page
redesign. Goals & Paths feature work is out
of scope. Existing user data and unrelated worktree changes are preserved;
no application deployment or history rewrite is performed. The user subsequently
authorized pushing the completed, verified code to the existing GitHub repository.

| Requirement                 | Implementation                                                                                                                            | Evidence gate                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Subject-owned test workflow | Existing typed assessment study context, validated create/link/unlink, subject/chapter Take/Resume/Edit/Review and return navigation      | Subject integration contracts + existing-assessment browser journey |
| Workspace as home           | Canonical workspace resolver, legacy dashboard redirect, bounded launchpad data and direct useful destinations                            | Home tests + real responsive navigation QA                          |
| Sidebar refactor            | Direct tool/library access, no redundant profile/workspace switcher, bounded active exam links, mobile navigation through 767px           | Sidebar/exam-link browser inspection at desktop/phone/short heights |
| Subject Tests usability     | Separated metadata/actions/result band; independent search/source/status filters; shared pagination and focus recovery                    | Combined filter tests + actual DBMS subject browser checks          |
| MCP authorization           | Current membership/role, active release/install/grants, full typed agent-visible ancestry and actor-owned indirect targets                | Privacy, credential, dispatcher and protocol regressions            |
| Reliable MCP operations     | Stable retry keys, exact-input legacy replay, bounded inventories including personal attempt history, no answer keys on live attempts     | Replay/concurrency, bounded-read and analysis-access regressions    |
| Deployment checks           | Environment validation, RLS isolation verification, production dependency audit, generated Prisma client, real production build and smoke | Release logs listed below; final results entered after execution    |

Landing acceptance additionally requires an honest study-product story,
functional CTAs and anonymous light/dark, keyboard and no-JavaScript review.

Implementation details live in [subject integration](./subject-assessment-integration.md),
[Workspace/navigation](./workspace-home-navigation.md),
[installation lifecycle](./tool-installation-lifecycle.md) and
[MCP readiness](./mcp-production-readiness.md).

## Security and operational changes

- Browser sessions require verified claims and a current matching Supabase user.
  Root Proxy refreshes auth cookies on request and response, protects workspace
  routes and avoids caching protected/refreshed responses. Authentication
  outages fail closed. Safe return paths reject external authorities,
  backslashes, control characters and malformed encoding.
- Evaluated-only attempt analysis is enforced before querying answer keys in
  both the web and tool paths. Submitted, abandoned and active attempts have
  no solution read path; corresponding UI links reflect that state.
- First personal-workspace provisioning alone creates default installations
  and grants in the same transaction. Existing sign-ins do not reactivate tools
  or override denied/constrained grants. Explicit installation owns repair.
- Transient auth transport/429/5xx failures fail closed with a recoverable
  unavailable error or no-store proxy 503, rather than proving logout. Invalid,
  deleted and mismatched identities still lose access. Optional
  `AUTH_DIAGNOSTICS=1` records stage/name/status/code only. Failed settings reads
  expose Retry and unavailable key metadata; stale requests cannot replace a
  later request's workspace data.
- Read-only database metadata inspection found RLS disabled on `mcp_tokens`
  and `tool_run_payloads`. The fixed deployment isolation command enabled it
  on those two tables; all 41 public tables then had RLS enabled and zero
  policies. No business records, triggers, RPCs or custom policies changed.
- Real test-account credentials were removed from nine tracked browser scripts
  and moved to ignored local test configuration. The obsolete script that reset
  real login passwords through SQL was deleted without execution. Existing Git
  history still contains previously committed credentials: rotate the test
  login before public exposure. No password or token was rotated in this work.
- A maintenance dry run found three legacy token display fields retaining
  recoverable secrets. Conditional Prisma transactions masked those fields;
  a follow-up scan found zero. Key hashes, ownership, access and revocation
  state are preserved, so configured client keys remain valid.
- Runtime dependencies were patched, including Next 16.4.6, Tiptap 3.33.1,
  Sharp 0.35.5 and Zod 4.6.7. The shadcn CLI is a build/dev dependency. Production
  npm audit reached zero advisories; remaining development-only transitive
  advisories are tracked separately instead of applying forced major downgrades.
- Fonts are vendored, licensed local assets, so a build does not download from
  Google Fonts. CI pins its third-party actions to verified release commits,
  uses Node 22 and Bun 1.3.13, and builds with non-secret placeholders.

## Verification record

Evidence is kept in ignored `scratch/`, not committed as generated fixtures.
Focused MCP/privacy coverage reached 82 tests / 401 assertions. The integrated
`npm run verify` passed Prisma/manifests, TypeScript, runtime lint and 538
isolated tests / 1781 assertions on the initial integrated snapshot. The final
frozen landing/auth/PWA source passes `npm run verify` with 557 tests / 1843
assertions (`release-push-verify.log`), including TypeScript and runtime lint.

- `release-verify-final.log`: Prisma/manifests, TypeScript, runtime lint, isolated
  full unit suite. Bun `--isolate` prevents cross-file mock contamination.
- `release-push-verify.log`: final frozen-source integration including landing,
  auth recovery and PWA privacy. All gates pass; 557 tests / 1843 assertions.
- `release-registry-sync-final.log`: scoped Exam Prep 1.12.0 and Mock Tests 1.2.0
  registry/release synchronization, with Goals & Paths untouched.
- `release-home-browser.json`: 24 read-only responsive home/nav cases across
  light/dark desktop, tablet, phone and short landscape layouts.
- `release-workflow-browser.json`, `release-workflow-e2e-combined.log`: connected
  subject workflow, cancel-only create/link, contextual question navigation,
  saved assessment preservation, settings secrecy and responsive bounds.
- `release-subject-navigation-browser.json`: final sidebar/subject filter and
  reusable-pagination interaction/visual checks (when generated by the harness).
- `release-database-isolation-fix.log`: 41 protected public tables, no policies.
- `release-production-audit-final.json`: zero production advisories after final
  lockfile synchronization; installed non-optional packages match the npm lock.
- `release-full-audit-final.json`: 13 development-only advisories (2 low,
  10 moderate, 1 high) in CLI/lint dependencies; no forced breaking downgrade.
- `release-authenticated-mcp-browser.json`: real UI-verified session supplied
  in memory as a Bearer header, cookie-only/foreign-workspace denial, stateless
  initialize, two discovery pages and bounded exam/assessment/attempt reads.
  This writes only ordinary read ToolRun audits, not domain records or keys.
- `release-token-prefix-{dry-run,sanitize,verified}.log`: three recoverable
  display fields masked; zero remain, with existing key validity retained.
- Production build and local production smoke results are appended to this
  record and PROJECT_LOGS after execution; they are not implied by unit tests.

Live browser checks cancel before saving and do not start attempts, create
assessment fixtures or publish content. The existing Linear Algebra assessment
was originally a draft, but authoritative review now finds it PUBLISHED,
Revision 8, 30 questions; tests preserve that current state rather than restoring
an old snapshot. Existing DBMS subject records support navigation/filter QA.
Successful persisted grading/create-and-attach is covered by transaction/unit
contracts and earlier authorized evidence, not newly exercised against the
personal workspace. Supabase authentication/database connectivity was
intermittent; early pending reads and login failures are retained in logs.
One production run redirected to Login during settings, while an instrumented
full rerun passed with cookies present, an unexpired token and no clearing.
A separate user-lookup diagnostic initially called native Response.status as
a function and mislabeled its own TypeError as a network failure; that probe
is not valid network evidence and its harness is corrected. The user also
confirmed deliberately signing out in the in-app browser; the installed SDK's
default sign-out scope is global. The exact earlier redirect cause was not
proven and is not mislabeled as a fixed cookie-loss defect.

## Deployment boundary

Use the root README and `.env.example`. A deployment needs its own public HTTPS
origin, Supabase Auth redirect configuration, runtime/migration database URLs
and optional private image bucket key. Review/back up the target database and
its migration history; do not reset or blindly baseline it. No application
schema migration was introduced by this release.

MCP is ready for personal clients supporting header-based Bearer credentials
and stateless Streamable HTTP. OAuth-only connectors, fine-grained/expiring
PAT scopes, hosted-client interoperability certification, production load
testing and host-level ingress limits are explicit deployment limits. The app
does not pretend a process-local limiter protects distributed serverless nodes.
The documented dry-run/apply maintenance command can be repeated to verify no
future legacy recoverable display prefixes are introduced.

Physical-device and assistive-technology certification have not been performed.
Goals & Paths was retained, without a feature redesign or registry sync.

PWA follow-up closes a real private-page Cache API boundary: only public static
assets and a generic offline notice are cached, legacy Character Arc caches
are purged, development removes its own worker/cache, and no authenticated
HTML/RSC/API/signed URLs enter Cache API. Fourteen focused tests and a synthetic
real Chromium probe pass; see [PWA cache security](./pwa-cache-security.md).

## Final frozen-source gate — 2026-11-11

- `release-push-build.log`: Node 22.23.4, Prisma generation and the optimized
  Next 16.4.6 build passed, including TypeScript, all 16 static pages and the
  dynamic route inventory. No ignored type/build errors.
- `release-push-verify.log`: schema, three manifests, TypeScript, runtime lint
  and all 557 isolated tests / 1843 assertions passed.
- `release-final-frozen-e2e.log`: required Playwright entrypoint passed on the
  actual production artifact at loopback port 3100, including the connected
  workflow, unchanged Published Revision 8 / 30-question assessment, 16 subject
  layouts, paging/filter/navigation and a controlled settings 503 → visible
  Retry → successful real authorized reload. No unexpected page/hydration
  errors, keys or domain mutations; the deliberate 503 resource error is expected.
- `release-final-landing-review.log` and `landing-browser.json`: final production
  landing passed 12 light/dark layouts, preview/keyboard/FAQ/navigation and
  no-JavaScript visibility. Representative desktop and phone captures inspected.
- `release-final-mcp-boundaries.log`: all four production unauthenticated MCP
  security checks passed; authenticated inventory evidence is recorded above.
- The corrected final auth diagnostic returned HTTP 200 with matching identity,
  present cookies and an unexpired token. No credentials or IDs were recorded.
- Staged-file review found no local credential values, credential patterns,
  scratch artifacts, environment secrets or generated dependencies; staged
  whitespace checks passed. Only the placeholder `.env.example` is included.

The user's authorized GitHub push uses the existing `main` branch and remote;
no application hosting deployment or destructive history rewrite is included.

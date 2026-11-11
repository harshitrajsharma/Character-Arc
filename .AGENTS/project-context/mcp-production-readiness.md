# MCP production readiness

Implemented 2026-11-11 for the Exam Prep / Assessment release. MCP remains an
adapter to the authenticated Next.js/Prisma tool pipeline. It does not install
tools, expand grants, run SQL RPCs or create credentials during discovery.

## Supported connection

- Endpoint: `/api/mcp`, stateless Streamable HTTP with JSON responses.
- Protocol negotiation: 2025-11-25, 2025-06-18 and 2025-03-26. Missing subsequent
  protocol header uses 2025-03-26 compatibility behavior.
- Send `Authorization: Bearer <agent-key>` (or `x-api-key`), `Content-Type:
  application/json` and `Accept: application/json, text/event-stream`.
- Supabase access-token Bearer credentials are also verified with `getUser`.
  They may select an active membership through `x-workspace-id`; an invalid
  explicit selection never falls back to another workspace.
- Personal agent keys are bound to one workspace and their creator's current
  membership. Removed members, archived workspaces, revoked tokens and
  unsupported installation releases fail closed.
- Cookie-only authentication and credentials in URL query parameters are not
  supported. A browser session cannot silently become an MCP principal.
- Standalone GET streams and DELETE sessions return 405. No session ID is
  issued. The old `/api/mcp/sse` and `/api/mcp/messages` paths return 410 rather
  than accepting process-memory session capabilities on a serverless deployment.
- This release supports clients with custom authorization headers. OAuth-only
  connectors, OAuth discovery and the deprecated SSE transport are unsupported;
  the UI must not claim universal client compatibility.

## Authorization and credential corrections

| Previous issue | Implemented behavior |
| --- | --- |
| Discovery fell back to every manifest on missing installations or DB failure | Only active matching versions and canonically equal trusted manifests with permitted actions are returned; malformed/drifted releases and errors never grant capabilities |
| Tool calls could install/reactivate tools and rewrite grants | Calls resolve existing installations only; the web installation workflow owns grants |
| PAT authentication impersonated OWNER | Current active membership and actual role are loaded on every request |
| Invalid tokens fell through to a logged-in cookie | Explicit authentication failure stays a failure |
| Complete token secrets were stored in `keyPrefix` and listed to members | New keys store SHA-256 hashes plus masked prefixes; list DTOs mask legacy values too |
| MCP URLs embedded secrets | Connection UI separates endpoint and Bearer header; URL secrets are rejected |
| Any editor could create integration access | Only owners create/revoke keys, inside authorized Prisma transactions; maximum 50 active keys |
| SSE sessions were process-local and messages trusted the session ID | Stateless transport; no memory-session module remains |
| Malformed id-less messages were silently accepted | JSON-RPC structure and IDs are validated before notification handling |
| Every mutation retry received a random key | A required `_idempotencyKey` is scoped/hashed with actor, workspace and action; retries retain the same key and arguments |
| Schemas lost composition and validation metadata | Complete trusted input schemas are preserved, with explicit mutation retry metadata and tool annotations |
| Runtime errors could expose SQL/connection details | Unexpected/tool-run failures use generic tool errors; known validation/access/revision messages remain actionable |

Creating a key displays its secret once. Closing settings or switching workspace
loses that recoverable copy. Existing keys remain valid; no tokens were created,
rotated or revoked during this work. The release coordinator's maintenance dry
run found three legacy rows with recoverable display prefixes. Conditional
Prisma transactions masked those three fields without changing hashes,
ownership, permissions or revocation state; a follow-up scan found zero
remaining recoverable prefixes. Redacted list DTOs also protect future reads.

The trusted dispatcher also validates current block agent access after membership,
release and grant checks for every non-web Exam Prep / Mock Tests invocation.
Direct IDs, reorder arrays, question targets and study-context IDs use a single
batched, typed existence query with active same-workspace installation and full
exam → subject → chapter → topic ancestry checks. Actor-owned schedule, manual
result and attempt IDs are resolved before checking their backing blocks. A
detached visible subject may be attached to a visible exam; this explicitly
establishes an ancestry edge rather than requiring one to already exist.
Cascading syllabus deletions reject hidden descendants, and agent submission
cannot write progress evidence to hidden question targets. Agent cloning retains
the community use case: a foreign source must be active, agent-visible, published,
public/unlisted and allow cloning. Ordinary web workflows keep their own existing
authorization. Read-only permission evaluation includes the root block type so a
bounded read with no write effects can satisfy the existing constrained grant.

Completed creation retries recheck visibility of their returned blocks. Legacy
Exam Prep mutation retries are normalized through the existing transactional
ToolRun records; current authorization is checked before content-bearing replay.
Exact completed deletion/detach retries return only an actor-bound acknowledgment,
without former content or descendant IDs. Archived workspaces cannot pass the
dispatcher's current membership check. These application checks introduce no SQL
policies, schema or credential changes.

## Tools and bounded data

The TypeScript manifests are still the source of truth. Releases are
`core.exam-prep@1.12.0` and `core.mock-tests@1.2.0`. The dispatcher has a trusted
binding for every first-party action, verified by a regression test. MCP also
checks that binding before advertising a capability.

New discovery actions:

- `exam.list`: agent-visible exam IDs/titles, revisions and timestamps.
- `subject.list`: shared subject IDs, optionally constrained to an authorized exam.
- `subject.get-context`: one subject and a page of chapters; `chapterId` switches
  to that chapter's topics after validating the typed parent relation.
- `assessment.list`: agent-visible paper summaries, state, configured marks,
  question count and visible study-context IDs. No keys or solutions.
- `attempt.list`: the acting user's chronological history or active attempts,
  optionally filtered by assessment, status or title. Pages use immutable
  `startedAt`/ID ordering and return only evaluated scores, dates and elapsed
  time. Active agent-visible same-workspace assessment blocks constrain every
  query; no responses, answer text, solutions, metadata or another user's
  attempt IDs enter this summary.
- `question.list`: current actor's authored question summaries for reuse;
  400-character stem previews and option counts, without solutions or answer keys.

The previously unbound reads now have actual compatibility bindings:

- `exam.get-context` returns exam metadata and a bounded subject page; it does
  not promise an unbounded nested syllabus tree. Continue with cursor and
  `subject.get-context`.
- `subject.get-progress` uses canonical progress rules/policy and current-user
  manual TestRecord evidence. Its visible-syllabus rollup is capped at 200
  chapters, 500 topics and 500 results. Above those safety limits it explicitly
  returns `complete: false` and `progress: null`, never a partial full-rollup
  claim. CBT attempts remain separate evidence, matching the current web model.
- `exam.get-weak-topics` validates the full typed exam→subject→chapter→topic
  ancestry. It scans a bounded topic page, returns below-complete items sorted
  within that page, and supplies a continuation cursor. Test stage uses only
  this actor's assessment proficiency; other stages use subject progress targets.
  It is not a global-ranked weakest-topic query across an unlimited tree.

Inventory pages read at most 51 rows and return at most 50, default 25.
Keyset cursors and typed relation boundaries preserve workspace/installation
and agent-access checks on every page. Tool discovery itself returns 40 tools
per page. Read actions use explicit `readOnly: true` effects with no fabricated
block writes; their normal ToolRun audit record is the only persistence.
The legacy question-roster, analysis and weak-topic reads also declare their
actual read-only effects. Unscoped subject inventory requires a visible exam
ancestor. Assessment context IDs are batch-validated through their entire typed
study ancestry before inclusion; a visible leaf under a hidden parent is not
disclosed as a usable context.

## Mutation retry behavior

After validating current membership, installation, trusted release and grants,
the dispatcher normalizes retries for the legacy raw-key Exam Prep mutation
handlers. Their transaction already commits the ToolRun and domain change
atomically under the unique installation/idempotency-key constraint. A repeated
non-web call now returns the committed result rather than a wrapped uniqueness
failure; a concurrent loser looks up that same winner without executing another
mutation. The saved actor, workspace, action, handler, release, invocation source
and canonical input must all match. A key cannot be reused with changed arguments.

Normal replay validates current target and output-block access before returning
any former IDs. Deleted/detached targets cannot always be resolved through a live
syllabus tree, so their exact actor-bound retry returns only an opaque
`completed: true, replayed: true` receipt with the original run ID. It never
returns cached titles, descendant IDs or former private metadata. Incomplete
runs and missing/malformed payloads fail closed. Existing web behavior and modern
`st1_`/`mt1_` reservation handlers keep their own retry protocols; this adapter
does not change Goals & Paths handlers.

Legacy exam subject recommendations now cap graph/result work at 2000 records,
filter agent-hidden descendants and recompute cached progress from the visible
subset before generating suggestions. Personal weak-topic reads in assessment
analysis similarly filter active agent-visible source blocks for MCP, while
web reads retain their existing behavior. Live attempt analysis is gated by the
canonical evaluated-only guard implemented in the release's security work.

## Transport limits and deployment settings

- Maximum incoming JSON body: 1 MiB, enforced both by Content-Length and a
  streaming byte counter. UTF-8/JSON/content-type/Accept errors are explicit.
- Origin validation occurs before auth/data access. `MCP_ALLOWED_ORIGINS` accepts
  comma-separated exact origins; `NEXT_PUBLIC_SITE_URL` supplies the application
  origin. No wildcard or opaque `null` origin is accepted. No-Origin desktop or
  server clients still require credentials. Production must configure the site
  URL; arbitrary request Host headers do not authorize browser origins.
- Responses use `Cache-Control: no-store`, `nosniff` and origin-varying CORS.
- Authentication outages return a generic service-unavailable failure instead
  of falling through to another credential source.
- Apply ingress/WAF limits for authentication abuse, concurrent requests and
  long-running actions on the deployment host. There is no misleading
  process-local rate limiter pretending to coordinate across serverless instances.
- Workspace PATs are long-lived until revoked and are not per-tool/per-action
  scoped tokens. Installation grants and block agent access constrain them.
  Public third-party distribution still needs OAuth consent, fine-grained token
  scopes/expiry and a real client interoperability/load review. This release
  does not claim those missing capabilities.

## Verification and operational commands

`npx tsx scripts/verify-mcp-endpoint.ts` is safe without a key: it checks denial,
Origin, URL-secret and legacy transport boundaries. Set `MCP_API_KEY` explicitly
for optional authenticated initialize/notification/discovery checks. It never
queries the DB for credentials, creates tokens, executes domain mutations or
prints secret-bearing URLs. The old credential-recovering challenger harness
now delegates to this safe verifier.

`npx tsx scripts/sanitize-mcp-prefixes.ts` is a dry run by default. An explicit
`--apply` replaces only recoverable legacy display prefixes with masked values;
hashes, ownership, permissions and revocation state are unchanged. It scans in
100-row pages, uses conditional updates to avoid overwriting concurrent changes,
and prints counts only. The release coordinator applied it to three legacy
display fields after the dry run. The CLI loads ignored `.env.local` before
Prisma and requires a configured database URL instead of a local default.

Focused evidence is under ignored `scratch/mcp-*`: protocol/security, route,
credential transaction, bounded inventory and read-privacy regressions plus the
live unauthenticated HTTP verifier. Root owns integrated TypeScript/build,
registry synchronization and browser inspection of the connection settings.
No hosted MCP client/OAuth interoperability certification or production load
test has been performed. Unit tests mock services rather than generating real
credentials or changing the user's assessments.

Primary protocol references checked for this implementation:
[Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
[tools and errors](https://modelcontextprotocol.io/specification/2025-11-25/server/tools),
and [Supabase verified getUser](https://supabase.com/docs/reference/javascript/auth-getuser).
The lightweight Supabase changelog fetch was attempted but unavailable; no
Supabase configuration, SDK contract or RLS policy was introduced by this work.

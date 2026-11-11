# Character Arc

An Exam Prep and Assessment workspace that people can use directly or through
authorized AI agents. Built with Next.js App Router, TypeScript, Prisma,
Supabase Auth/PostgreSQL, Tailwind and shadcn/ui.

## Local setup

Use Node 22 (22.12 or newer) and Bun 1.3.13 for the isolated unit suite.
`package-lock.json` is the deployment dependency lock.

```sh
npm ci
# Copy .env.example to .env.local and supply your own project credentials.
npm run check:env
npm run db:generate
npm run dev
```

Existing databases must match `prisma/schema.prisma`. Database access stays in
the authenticated Next.js/Prisma layer. Supabase provides PostgreSQL and Auth.
RLS must be enabled with **zero policies** on every public application table.
Do not add Supabase RPCs, business-logic triggers or public REST policies.

Workspace is the signed-in home. Exam Prep subject **Tests** exposes canonical
assessments, create/link controls, continuation and evaluated results. The
Assessment library manages papers, community discovery and attempt history.
The exam player requires a viewport of at least 1024 × 600.

Installed-app support caches public assets and an offline notice only. Private
study pages, responses and results require an online verified request; see
[PWA cache security](.AGENTS/project-context/pwa-cache-security.md).

## Verification

```sh
npm run verify
npm audit --omit=dev --audit-level=low
npm run build
npm run db:check-isolation
```

`verify` validates Prisma and all manifests, type-checks, lints application code
and runs isolated unit tests. Isolation prevents one test file's module mocks
from altering another file's dependencies. CI performs these checks and a
production build using build-only placeholder configuration.

Real browser verification needs a running server and an authorized account in
`.env.local`. The full suite creates records and requires
`E2E_ALLOW_MUTATIONS=1`. For a non-mutating release review:

```sh
RELEASE_REVIEW=1 E2E_EXISTING_ASSESSMENT_ID=<existing-id> npm run test:e2e
```

Use your shell's environment-variable syntax. Read the
[E2E guide](.AGENTS/project-context/e2e-testing-guide.md) for coverage and safe
existing-assessment modes. Do not create fixtures in a real personal workspace
without authorization.

## Deployment

Deploy as a Node.js application supporting Next.js Server Actions, not a static
export. Set the public Supabase URL/publishable key and exact public HTTPS
`NEXT_PUBLIC_SITE_URL` **before building**. Keep database and storage secrets
server-only. Configure matching Site URL and confirmation/redirect URLs in
Supabase Auth. Optional question images need the documented
[private bucket setup](.AGENTS/project-context/question-image-storage.md).

For an existing database, back it up and review its migration history before
running `npx prisma migrate deploy`. Never reset, blindly baseline, or use
`db push` against production. This release changes no application schema.
After applying the intended schema and before exposing the app:

```sh
npm run check:env -- --production
npm run db:secure-isolation
npm run db:check-isolation
npm run db:sync-registry -- --tool=core.exam-prep --tool=core.mock-tests
npm run build
npm start
```

The isolation command only enables RLS on the two previously unprotected audit
and token tables. The checker inspects all public tables and rejects policies
or disabled RLS; it never rewrites user records. Scoped registry synchronization
updates the two tool definitions/releases without changing Goals & Paths.
Active installations and explicit grants remain authoritative. Signing in
does not reactivate tools or override denied grants.

Set host-level request/concurrency limits and monitor auth/database errors.
Optional `AUTH_DIAGNOSTICS=1` logs redacted auth stage/status codes. Known
authentication-service outages fail closed with retry recovery; invalid
identities still require signing in again.
Rotate previously committed test-login credentials before public use; deleting
source literals does not remove Git history. Legacy MCP display prefixes can
be masked with `npx tsx scripts/sanitize-mcp-prefixes.ts --apply` after reviewing
its default dry run. Tokens are never recovered into application UI.

## AI agent connection

Create a workspace agent key from **Settings → AI & Agents** as a workspace
owner. Copy the secret once and configure a compatible client with:

```text
Endpoint: https://your-app.example/api/mcp
Authorization: Bearer <your-agent-key>
```

MCP uses stateless Streamable HTTP and the same authorized tool pipeline as the
web app. Mutations require a stable `_idempotencyKey`; retry with the same key
and arguments. Current membership, active installations, grants and block
agent-access flags constrain access. OAuth-only clients and legacy SSE are not
supported; clients need custom authorization headers. See
[MCP readiness](.AGENTS/project-context/mcp-production-readiness.md) for the tool
inventory, transport limits and known interoperability scope.

`npx tsx scripts/verify-mcp-endpoint.ts` checks unauthenticated boundaries.
An explicitly supplied `MCP_API_KEY` additionally enables read-only protocol and
discovery verification. It never creates keys or performs domain mutations.

Architecture, release evidence and operational limits live in
[project context](.AGENTS/project-context/README.md).

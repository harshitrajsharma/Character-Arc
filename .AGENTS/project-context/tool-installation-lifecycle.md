# Tool installation and first-sign-in lifecycle

## Consent boundary

Since 2026-11-11, reading a workspace or verifying a session must not install,
reactivate, upgrade or regrant a tool. DISABLED/REMOVED rows and missing
installations remain unavailable until an owner uses the explicit catalog
installation flow. Existing permission effects and constraints remain
authoritative, including an explicit DENY.

## New personal workspace setup

`ensureUserProvisioned` is the request-cached server entry point around the
injectable `provisionUserIdentity` lifecycle. Profile creation/optional missing
display metadata and personal-workspace membership repair remain as before.
Only the transaction that creates a new personal workspace supplies initial
tool setup:

1. Create the personal workspace and OWNER membership.
2. Read the enabled default core definitions with published versions matching
   the trusted local registry.
3. Create the available core installations and seed their declared default
   permission grants in the same transaction.

The default keys remain Exam Prep, Goals & Paths and Assessments; this is shared
lifecycle hardening, not a change to any tool's business model. An intentionally
disabled/unavailable registry entry is skipped. A permission-write/database
failure aborts the new-workspace transaction instead of becoming silent
grantless success. A concurrent creation loser reuses the committed winning
workspace without applying defaults a second time.

`provisionDefaultCoreTools` is called nowhere on existing-workspace visits.
Existing grantless legacy installations are not automatically expanded on
sign-in; an explicit authorized install/repair operation is required if their
owner wants the declared defaults restored.

## Shared grant seeding

Both initial setup and `installTool` use `ensureToolDefaultGrants` with trusted
TypeScript-manifest defaults. Missing grants are created. Existing grant rows
use `update: {}` so re-enabling an installation does not reset a customized deny
or constraint. Explicit installation still verifies the workspace owner and
requested available published release, then activates/upgrades the installation
within its transaction. The tool execution pipeline retains its independent
release/manifest/grant validation.

## Read helpers and recovery

`readActiveToolInstallation` performs only a tenant-scoped read of an ACTIVE
installation for an enabled definition and published release. It throws
`ToolInstallationUnavailableError` with a safe catalog recovery destination
when unavailable; it contains no installation or grant writes.

`getActiveToolInstallation` first verifies the caller's workspace membership
and provides this fail-closed result to shared Server Action contexts.
`requireActiveToolInstallation` is the page wrapper: after the same authorized
read, it redirects an unavailable-tool page to the catalog. Shared Exam Prep,
Assessment and subject-link action contexts use the error-returning boundary,
so a missing tool does not turn an ordinary action failure into NEXT_REDIRECT.

## Verification boundary

Isolated tests exercise existing/new/concurrent workspace paths, atomic
permission-failure propagation, missing/disabled/removed tool reads, exact
workspace filters and preservation of customized grants. Tests use injected
Prisma-shaped clients and no real records or fixtures. They establish the
transaction boundary and application behavior, not a new live signup or a
database fault-injection certification. Integrated type/lint/browser/build
results belong in PROJECT_LOGS.md.

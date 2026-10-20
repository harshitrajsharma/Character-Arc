# App-wide image handling plan

Requested and approved by the user on 2026-10-19: Supabase Storage is the image provider for the whole app. Finish and verify question authoring first, then implement the shared layer below. This plan is not an authorization to add SQL business logic, custom RLS policies, RPCs or Edge Functions.

## Product contract

Users should be able to upload, paste/drop, describe, preview, replace and reuse an image without learning storage concepts. Images remain available wherever the user intentionally saved or shared them. Removing an image from one field must not break another usage. A paper clone must own its images independently. Alt descriptions belong to each usage, since one image can serve different purposes.

## 1. Shared upload and delivery foundation

- Extract provider-specific code from question-image-storage into server-only `lib/assets/` services; reuse FileObject as stable asset identity.
- Standard image policy: PNG/JPEG/WebP, 5 MiB input/output, decoded-pixel bound, server decode/rotation/metadata removal/WebP encoding. Define per-purpose profiles for avatars, covers and diagrams; keep diagrams readable. SVG remains excluded initially.
- Configure private Supabase bucket(s), service credential and environment validation. Keep each asset's stored bucket/path authoritative so a config change cannot hide old files.
- Introduce a durable `/api/assets/[id]` read endpoint and retain `/api/question-images/[id]` as a compatibility alias. Stored content never embeds signed URLs or service credentials.
- Expose the same scoped asset operations to MCP/agent callers through the existing tool registry. Plan reserve/upload/finalize metadata contracts rather than large base64 tool payloads. Agent reads must use verified workspace/token scopes; browser-cookie access alone is insufficient. Any temporary upload/read URLs are delivery credentials, never persisted content URLs.
- Define workspace quotas, upload rate/concurrency limits and idempotent upload reservations before broad rollout. All claims/workspace permission checks and persistence remain in Next.js Server Actions/Prisma transactions.

## 2. Explicit asset usages and access rules

- Add a Prisma AssetUsage model relating FileObject to the owning entity, field/slot, workspace and purpose (question prompt/option/explanation, block cover, avatar). Add asset dimensions/encoding metadata as needed. Use indexes/uniqueness to avoid duplicate references.
- Sanitize rich HTML against the supported schema on the server for both website and MCP writes; never trust client editor sanitization alone. Reject unsafe image/link protocols and executable attributes.
- When saving content, parse managed image URLs, validate ownership or legitimate clone provenance, and synchronize usages in the same transaction as the content. Do not authorize files through substring matching or arbitrary embedded URLs.
- Private usages follow workspace/entity membership. Public/unlisted usages follow their parent publication rules. Explanation usages follow result-access policy, never merely the public visibility of a paper.
- Decide historical-attempt access after privatization, archival and content edits. Preserve authorized result evidence while revoking unrelated public access. Never use shared file URL possession as permission.

## 3. One image picker across the app

- Shared picker: choose file or paste/drop, preview, description, replace/remove, clear upload progress/errors/retry. Later add a scoped reusable-image library.
- Explicit purpose limits and crop controls where useful: square avatars and cover crops; no mandatory crop for exam diagrams.
- Keep save actions disabled only while required uploads are pending. Preserve text edits on failure. Do not present technical bucket/key details in normal product UI.
- Roll out first to question prompts/explanations and an individual rich option editor, then assessment/subject/block covers and profile avatars where supported.

## 4. Lifecycle and independence

- Clone assessment assets into the destination workspace and rewrite every managed reference, with validation, idempotency and cleanup if cloning fails. No cross-workspace URL-based permission grants.
- Replacing/removing content detaches its usage; shared assets remain while another authorized usage exists.
- Retain abandoned uploads for a defined grace period (proposed 24 hours, configurable). Mark deletion pending and retry failed provider deletions through a Next.js-managed scheduled process. Keep cleanup auditable and bounded.
- Add minimal storage accounting/admin visibility for workspace usage and failed uploads/deletions. Respect account/workspace deletion and retention rules.

## 5. Migration and acceptance

- Backfill usages from current rich HTML and existing FileObject cover/source references. Preserve legacy URLs while consumers migrate; external HTTPS images remain external and should be clearly identified.
- Test: successful upload/read/reopen; corrupt/oversized/SVG input; unauthorized cross-workspace read/write; anonymous public vs private visibility; no answer-image leaks; replacement/reuse; clone independence; publication revocation; historical results; abandoned upload cleanup/retries; mobile accessibility and limits.
- Do not describe image handling as production-ready until a configured Storage environment passes real upload/download tests. The local question-image provider was configured and passed real upload/read/save/reopen and anonymous-denial checks on 2026-10-19. App-wide usage tracking, clone independence, cleanup and deployment configuration remain pending.

## Recommended next deliverable

Build phases 1 and 2 together behind the question-image interface, including real configured upload tests. Then ship the shared picker and migrate other app surfaces. Complete clone independence and cleanup before enabling images broadly in community distribution.

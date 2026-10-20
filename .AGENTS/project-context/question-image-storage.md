# Question image storage

Supabase Storage was explicitly authorized by the user on 2026-10-19 as an addition to the existing PostgreSQL/Auth usage. This does not authorize SQL business functions, RLS policies or Edge Functions. All image validation and authorization remain in Next.js/Prisma.

## Deployment setup

1. Create a PRIVATE Supabase Storage bucket named `character-arc-question-images` (or select a different private bucket with `SUPABASE_QUESTION_IMAGES_BUCKET`). Allow image/webp objects and a 5 MiB file-size ceiling.
2. Configure `SUPABASE_SECRET_KEY` in server-only environment configuration (legacy `SUPABASE_SERVICE_ROLE_KEY` remains a fallback). Never use a NEXT_PUBLIC prefix or put this key in browser code. Existing NEXT_PUBLIC_SUPABASE_URL selects the project.
3. Restart the application after environment changes. Server Actions accept 6 MB multipart bodies; the action enforces 5 MiB input/output limits.
4. No public bucket or browser upload policy is required. The server uploads/downloads with its service credential; the app checks workspace write/read permissions.

Local setup completed on 2026-10-19 for the existing Character Arc Supabase project: the private bucket is configured with a 5 MiB limit and image/webp MIME restriction, and the existing server secret is stored only in ignored `.env.local`. The provider SDK confirmed those settings. A real browser uploaded PNG through the editor, received server-encoded WebP, saved a question with its syllabus topic, and reopened the persisted image. Owner reads returned 200 with private/no-store headers; anonymous reads returned 404. The isolated verification question, FileObject and provider object were removed afterward. Deployment environments must separately configure the server secret; local configuration does not provision hosting environment variables.

## Upload contract

`uploadQuestionImageAction(workspaceSlug, formData)` accepts a `file` field and returns `{src, fileId}` on success or `{error}` for expected validation/storage failures. Authentication failures retain the normal auth flow; unexpected backend details stay server-side. It verifies claims/workspace write access and tool installation, checks PNG/JPEG/WebP signatures against MIME and 5 MiB size, decodes up to 20 megapixels with Sharp, strips metadata and re-encodes WebP. SVG, data URLs and arbitrary upload formats are excluded. FileObject transitions UPLOADING to READY; failed uploads are removed where possible and marked FAILED.

The editor asks for an image description, displays upload/errors, and prevents saving a question while an upload is pending. HTML stores a durable relative URL `/api/question-images/[fileId]`, never a signed URL or inline base64. Ordinary HTTPS external image links remain supported.

## Read access

The proxy returns only READY, non-deleted WebP files in the configured private bucket. Workspace members may read their workspace's images. A source-workspace question's stem/option image may be read when it appears in a published public/unlisted assessment. Explanation assets additionally require source membership or the requesting user's own submitted/evaluated attempt. References from a different workspace cannot grant access. Responses use no-store, nosniff and inline WebP headers.

## Remaining lifecycle work

- Cross-workspace paper clones currently retain original image URLs and source access rules. They need asset copy/rewrite for independent ownership; do not weaken the read proxy to arbitrary cross-workspace references.
- Uploads abandoned before question save remain private FileObject records. A retention/garbage-collection job is still needed; do not delete assets merely because an editor closes.
- No image delete/replace asset-library UI is introduced. Tiptap can remove image nodes from question content; that does not immediately remove stored files.

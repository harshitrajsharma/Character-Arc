# Tool Versioning Guide

When creating or updating AI-powered tools (like `goals-paths` or `exam-prep`), we use a central TypeScript Tool Registry and dynamic database synchronization. **We no longer use raw SQL migrations or Supabase RPCs for tool versioning.**

## What NOT to do:
1. **Never write raw SQL migrations for tool updates.** Tool manifests and versions are now completely managed in TypeScript.
2. **Never manually mutate `tool_releases` or `tool_installations` in the database.** The sync script handles these updates automatically.
3. **Do not use `$manifest$` blocks in SQL.**

## What TO do:
1. **When bumping a tool's version:**
   - Update `version: "1.x.x"` in the tool's `manifest.ts` (or within `lib/tools/registry.ts`).
   - Run the dynamic registry synchronization script to update the database:
     ```bash
     bun prisma db seed
     ```
     This script (`lib/tools/sync-registry.ts`) will automatically:
     - Detect the new version.
     - Insert the new release into `tool_releases`.
     - Update all existing active `tool_installations` to point to the new release ID.
2. **Update Handlers:** If necessary, update the business logic in `execute-tool-action.ts` (or the corresponding Next.js Server Action) to handle any new fields or actions introduced in the version bump.

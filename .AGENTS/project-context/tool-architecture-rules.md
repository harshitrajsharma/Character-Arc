# Tool Architecture & Data Layer Rules

This document outlines the strict architecture for creating, registering, and syncing Tools within the Character Arc application.

**CRITICAL RULE: The Next.js application (Prisma + TypeScript) is the absolute single source of truth. Do NOT write custom PostgreSQL triggers, RPCs, or manually edit SQL migrations.**

## 1. Tool Manifests (The Source of Truth)
Every tool must define its entire configuration (metadata, block types, relation types, and actions) in a static TypeScript manifest file. 
- **Location:** `lib/tools/definitions/[tool-name]/manifest.ts`
- **Format:** Must use `parseToolManifest` from `@/lib/tools/contracts` to ensure type-safety.
- **Why:** This ensures that configuration lives in version control and is strongly typed. Do not hardcode block definitions into the database directly.

## 2. Tool Registry
Once a manifest is created, it must be registered in the central tool registry.
- **Location:** `lib/tools/registry.ts`
- **Action:** Import the manifest and add it to the `firstPartyManifests` Map. This exposes the tool to the rest of the application via `listFirstPartyToolManifests()`.

## 3. Database Synchronization (The "Seed")
We do NOT use a traditional `seed.ts` file filled with dummy data or hardcoded inserts. Instead, we use a dynamic Synchronization Script.
- **Location:** `lib/tools/sync-registry.ts`
- **How it works:** The script calls `listFirstPartyToolManifests()`, iterates over every registered tool, and idempotently `upserts` its definitions, `BlockTypes`, and `BlockRelationTypes` into the Prisma database.
- **Execution:** This script is mapped to the standard Prisma seed command in `package.json` (`"prisma": { "seed": "bun run lib/tools/sync-registry.ts" }`). It runs automatically when resetting the database (`npx prisma db push` or `npx prisma migrate reset`). It can also be imported and run dynamically from a server action if needed.

## 4. Backend Execution Logic
Tool actions (e.g., creating an Arc, submitting an Exam) must be written as Prisma Transactions inside Next.js Server Actions or API routes.
- **Location:** e.g., `lib/tools/goals-paths-handlers.ts`
- **Rule:** Never use `supabase.rpc(...)`. Build the logic natively in TypeScript using `prisma.$transaction`. Handle authorization natively in the application layer by verifying ownership via `prisma.workspaceMember` lookups (e.g., using `requireVerifiedClaims`).

## 5. User Provisioning
User setup is handled lazily in the application layer, avoiding fragile SQL database triggers.
- **Location:** `lib/auth/provision.ts` (`ensureUserProvisioned`)
- **Rule:** Do NOT use `on_auth_user_created` postgres triggers. The application guarantees the user has a Profile and a Personal Workspace by running the provisioning transaction upon session verification.

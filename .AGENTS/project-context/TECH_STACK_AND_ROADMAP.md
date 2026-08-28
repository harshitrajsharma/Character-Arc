# Character Arc: Tech Stack and Build Roadmap

## Decision Summary

Use PostgreSQL, not MongoDB or another primary NoSQL database.

The product is relational and analytical by nature. Exams contain subjects, chapters, and topics. Assessments contain questions. Attempts contain responses. Responses produce evidence that updates topic progress and skills. Tools, permissions, connectors, sync rules, and users also have strict relationships.

PostgreSQL gives the project:

- Foreign keys and constraints for correctness.
- Transactions for submitting an attempt and updating its outcomes atomically.
- Joins and aggregations for dashboards and analytics.
- Strong indexing for user, exam, topic, and time-based queries.
- JSONB for the small areas where tool-specific configuration is intentionally flexible.
- A future path to full-text search and `pgvector` without adding a separate database early.

Use JSONB only for flexible configuration, generation metadata, provider payloads, and provenance. Do not put the core Exam Prep, assessment, attempt, progress, or permission model into generic JSON documents.

## Selected Stack

### Existing frontend

- Next.js 16 App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- shadcn/ui using the existing `base-luma` Base UI configuration.
- Lucide icons.
- Server Components by default; Client Components only for interactive controls, quiz state, charts, timers, and browser APIs.

### Application backend

- Next.js Route Handlers for REST, MCP, webhooks, auth callbacks, file downloads, and connector callbacks.
- Server Actions for mutations that are used only by the Character Arc web UI.
- A server-only data access layer for session verification, ownership checks, and safe DTOs.
- Domain services containing the actual business logic shared by Server Actions, Route Handlers, MCP tools, background jobs, and CLI-backed sync operations.
- Zod schemas at every external boundary.

Pages and Server Components should call the data access or domain layer directly. They should not make HTTP requests to the app's own Route Handlers.

### Database and ORM

- PostgreSQL as the system of record.
- Stable Prisma ORM, not an early-access Prisma release.
- Supabase Postgres for local and hosted databases.
- Prisma is the absolute source of truth for the schema.
- We use a central TypeScript Tool Registry (`lib/tools/registry.ts`) and a dynamic synchronization script (`lib/tools/sync-registry.ts`) via Prisma seed to automatically populate the database.
- Next.js Server Actions with `prisma.$transaction` for all business logic.
- We NO LONGER use custom PostgreSQL triggers or RPCs for logic or tool definitions.
- Use UUID or CUID-style application-generated identifiers rather than user-visible sequential IDs.

### Authentication and authorization

- Supabase Auth using `@supabase/ssr` and `@supabase/supabase-js`.
- Google sign-in plus one simple fallback login method.
- Cookie-based SSR sessions and PKCE-compatible authentication flows.
- Central authorization functions such as `requireUser`, `requireToolAccess`, and `requireResourceOwner`.
- Every user-owned table must include `user_id` directly or have an unambiguous ownership path.
- Proxy-based redirects are only an optimistic convenience. Secure checks must happen again in the data access layer and every mutation endpoint.
- Enable RLS on every table exposed through the Supabase Data API.
- Never expose the Supabase secret or service-role key to browser code.
- Prisma runs only on the server. If its database role can bypass RLS, the server data-access layer must still enforce ownership and permission checks for every query and mutation.

### AI generation

- Vercel AI SDK for provider abstraction, structured output, tool calling, streaming, and model switching.
- Zod schemas for generated quizzes, flashcards, syllabus structures, and mock tests.
- Character Arc AI uses application-funded model access only for paid plans and demos.
- External AI applications use Character Arc through MCP or REST and pay their own model costs.
- AI output is always validated and recorded with provider, model, prompt version, source type, timestamps, and review status.

### MCP and public API

- Official `@modelcontextprotocol/sdk` package.
- Stateless Streamable HTTP MCP transport for the first remote implementation.
- REST endpoints for CLI, connectors, and integrations that do not speak MCP.
- MCP and REST adapters call the same domain services as the web application.
- Personal access tokens with explicit scopes for the initial phase.
- Use OAuth-based authorization and token rotation before a production public launch.

### Background work

- Inngest for durable background jobs when file parsing and multi-step AI generation are introduced.
- Use it for syllabus ingestion, question-paper parsing, large mock-test generation, wiki ZIP creation, connector sync, and later Career Compass research.
- Keep short operations in the request path. Do not add a background job for every normal database mutation.

### Files and documents

- Supabase Storage with private buckets for uploaded syllabi, question papers, generated exports, and temporary wiki ZIP files.
- PostgreSQL stores file metadata, ownership, privacy level, status, hashes, and provenance; binary content stays in object storage.
- Place storage access behind a small `FileStore` interface to preserve future portability.
- Never expose a permanent public URL for a private user document.

### Local wiki and CLI

- A shared TypeScript `wiki` package for OKF generation, parsing, validation, indexing, template installation, privacy classification, and sync planning.
- A Node-compatible CLI so users do not need Bun installed.
- Suggested CLI libraries: Commander for commands, Inquirer-style prompts for guided setup, `yaml` for frontmatter, and a ZIP library for export.
- The web download, AI-agent setup, and CLI setup paths must all use the same wiki package.
- Deterministic code, not an LLM, enforces validation, migrations, privacy filtering, and sync selection.

### Testing and quality

- Vitest for domain services, validators, scoring, progress calculations, and wiki logic.
- Playwright for authentication, quiz attempts, mock-test submission, tools installation, privacy preview, and responsive UI.
- Seeded fixtures for GATE Computer Science so the demo never depends on live AI generation.
- ESLint, TypeScript checks, Prettier, and a production build in CI.
- Add Sentry or OpenTelemetry after the core demo is stable.

### Deployment

- Vercel for the Next.js application and remote MCP endpoint.
- Supabase for PostgreSQL, Auth, and private Storage.
- Inngest Cloud for durable jobs.
- A separate worker or service is not required for the initial phase.

## Application Structure

Keep the existing Next.js application at the repository root and add shared packages without introducing Turborepo yet.

```text
app/
|-- (auth)/
|-- (app)/
|   |-- dashboard/
|   |-- tools/
|   |-- exam-prep/
|   |-- skills/
|   |-- connectors/
|   `-- settings/
|-- api/
|   |-- auth/
|   |-- v1/
|   |-- mcp/
|   |-- inngest/
|   `-- downloads/
`-- generated/

components/
|-- ui/
|-- shell/
|-- charts/
`-- domain/

modules/
|-- auth/
|-- tools/
|-- exam-prep/
|-- assessments/
|-- skills/
|-- wiki/
|-- connectors/
`-- ai/

lib/
|-- db/
|-- dal/
|-- supabase/
|-- files/
|-- jobs/
`-- observability/

packages/
|-- contracts/
|-- wiki/
`-- cli/

prisma/
|-- schema.prisma
`-- seed.ts

supabase/
|-- config.toml
|-- migrations/
`-- seed.sql
```

Route files and UI components should remain thin. A module owns its schemas, repositories, services, permissions, calculations, and tests.

## Database Shape

### Platform and security

- Supabase-managed `auth.users` identities and a public `Profile` table.
- `ToolInstallation`: which tools a user installed and their configuration.
- `ToolPermission`: which context slices and actions an installed tool may access.
- `ConnectorConnection`: encrypted connection metadata and status for external services.
- `ApiCredential`: hashed external-agent tokens, scopes, expiration, and revocation.
- `AuditEvent`: important agent, privacy, sync, and account actions.
- `BackgroundJob`: user-visible status for ingestion and generation jobs.

### Wiki and privacy

- `WikiBundle`: local bundle identity, profile version, and last successful sync.
- `WikiSyncRecord`: hashes and versions of concepts that the user approved for sync.
- `SyncedOutcome`: approved structured outcomes when no existing domain table is appropriate.
- Local wiki entries may be `LOCAL_ONLY`, but that value never represents cloud-stored content. Cloud blocks use visibility plus explicit agent access.

Do not upload the contents of local-only concepts. The cloud may know that a bundle exists without knowing the content of excluded files.

### Exam Prep

- `Exam` and `ExamBlueprint`.
- `Subject`, `Chapter`, and `Topic`.
- `TopicPrerequisite` and weightage metadata.
- `SourceDocument` for syllabus and question-paper provenance.
- `Question`, `QuestionOption`, and `QuestionTopic`.
- `Assessment` and `AssessmentQuestion` for quizzes and mock tests.
- `Attempt` and `AttemptResponse`.
- `StudyActivity` and `RevisionEvent`.
- `TopicProgress` as the current projection.
- `ProgressEvidence` as immutable evidence explaining why progress changed.

### Skills and future paths

- `Skill` as a reusable definition.
- `UserSkill` as the user's current derived state.
- `SkillEvidence` linking attempts, activities, credentials, or approved agent assessments.
- `Goal`, `GoalSkill`, and later `CareerPathSkill`.

### AI provenance

- `GenerationJob` for generation state, cost, and failure information.
- `GeneratedArtifact` for the validated output and its schema version.
- `ArtifactSource` for user files, official sources, past papers, or AI-only generation.
- `PromptTemplateVersion` so generated content remains reproducible and auditable.

## Data Modeling Rules

- Use the workspace-scoped Block model documented in `GENERIC_BLOCK_MODEL.md` for openable, linkable domain entities.
- Use normal typed tables for stable domain concepts.
- Use JSONB for optional metadata and provider-specific payloads, not as a substitute for schema design.
- Keep attempts, responses, evidence, and audit events immutable after finalization.
- Store current progress as a projection that can be recalculated from evidence.
- Submit an assessment in one transaction: finalize responses, calculate score, create evidence, and update progress.
- Include `createdAt`, `updatedAt`, and appropriate status timestamps.
- Add compound indexes based on actual access patterns, especially `(user_id, status)`, `(user_id, created_at)`, and domain ownership paths.
- Use soft deletion only where recovery or audit requirements justify it. Do not add it mechanically to every table.
- Never create one universal `ToolData` table that stores every installed tool as opaque JSON.

## Build Roadmap

Each phase should end with a working vertical slice. Do not start the next large feature while the current slice cannot be demonstrated reliably.

### Phase 0: Foundation decisions

1. Confirm the Supabase project, local Supabase workflow, Prisma version, and Vercel deployment account.
2. Add an environment variable example without real credentials.
3. Establish `modules`, `lib`, `packages`, and Prisma folders.
4. Add CI commands for lint, typecheck, tests, and build.
5. Create a seeded demo-user strategy.

Done when a clean checkout can install, build, and connect to an empty database.

### Phase 1: Identity, database, and app shell

1. Configure Supabase Auth, Postgres, Storage, and local development.
2. Install stable Prisma and connect it to Supabase Postgres for server-only access.
3. Push the Prisma schema and populate the database using the dynamic sync script (`lib/tools/sync-registry.ts`).
4. Integrate Supabase SSR authentication.
5. Build the authenticated application shell with sidebar navigation.
6. Create the Tools catalog, tool installation state, and permissions summary.
7. Add server-only DAL functions and ownership checks.

Done when a user can sign in, install Exam Prep, refresh, and see the installation persist.

### Phase 2: Exam Prep structure

1. Implement Exam, Subject, Chapter, Topic, and Skill as Page types with typed extensions.
2. Implement generic page relations and the typed `exam_subject_config` relation extension.
3. Port and refine the useful Character Arc progress concepts.
4. Add exam blueprint fields for duration, sections, marks, question types, and negative marking.
5. Seed one excellent GATE Computer Science catalog in which subjects can be reused by multiple exams.
6. Build the exam overview and syllabus explorer.
7. Add personal page state and manual progress activity recording.

Done when a user can inspect an exam and navigate from exam to subject, chapter, and topic with real persisted state.

### Phase 3: Assessment engine without AI

1. Add question-bank, assessment, attempt, response, and evidence models.
2. Build the quiz and mock-test player.
3. Implement deterministic scoring, negative marking, timing, and final submission.
4. Build the results analysis page.
5. Update topic progress from immutable attempt evidence.
6. Add tests for scoring and transaction behavior.

Done when the seeded demo supports a complete mock test from start through analysis without calling an AI model.

### Phase 4: AI-generated learning content

1. Define versioned Zod schemas for quizzes, flashcards, and mock tests.
2. Add the AI provider abstraction through Vercel AI SDK.
3. Generate content against an existing topic and exam blueprint.
4. Validate question counts, marks, options, answer keys, and blueprint totals.
5. Record AI provenance and label generated content clearly.
6. Add a review-and-publish step before a generated assessment becomes attemptable.
7. Move longer generation work to Inngest.

Done when AI can generate a valid assessment, invalid output is rejected, and a user can review and attempt the valid result.

### Phase 5: Skill Graph and progress outcomes

1. Add skills, user skills, and evidence relations.
2. Map exam topics and preparation abilities to skills.
3. Derive ratings from attempts and activities instead of arbitrary AI scores.
4. Build the Skill Graph and weak-area queue.
5. Add transparent explanations showing the evidence behind each rating.

Done when submitting a mock test visibly changes relevant skill evidence and next-step recommendations.

### Phase 6: External-agent access

1. Extract shared Zod contracts and domain service calls.
2. Add scoped personal access tokens.
3. Build REST endpoints for core exam and progress operations.
4. Build a stateless Streamable HTTP MCP endpoint.
5. Expose a small, intentional tool set such as:
   - `get_exam_context`
   - `get_weak_topics`
   - `create_quiz_draft`
   - `publish_quiz`
   - `get_attempt_analysis`
   - `recommend_next_activity`
6. Audit every external tool call.

Done when an external AI agent can read permitted context, create a quiz draft, and see the stored outcome without direct database access.

### Phase 7: Local LLM-wiki

1. Build the shared OKF and Character Arc-profile library.
2. Generate a personalized wiki ZIP from installed tools.
3. Add validation, indexes, links, privacy metadata, and safe starter templates.
4. Add the copyable AI-agent setup prompt.
5. Build the CLI commands `init`, `validate`, `status`, and `sync --preview`.
6. Demonstrate selective sync with local-only content excluded.

Done when download, AI setup, and CLI setup produce equivalent valid bundles, and the sync preview proves private content stays local.

### Phase 8: Connectors

1. Build the connector registry and OAuth connection state.
2. Start with one useful connector, preferably Google Calendar or Todoist.
3. Require explicit scopes and tool-level permission grants.
4. Add sync status, last-sync time, errors, and disconnect behavior.
5. Move connector synchronization to background jobs.

Done when Exam Prep can read an explicitly permitted schedule signal without giving the connector access to unrelated tool data.

### Phase 9: Career Compass

1. Add career paths, eligibility, sources, deadlines, fit factors, and required skills.
2. Build sourced research ingestion and verification status.
3. Connect Career Compass to selected Skill Graph evidence.
4. Build comparison, ranking, and roadmap views.
5. Keep volatile opportunity data dated, sourced, and confidence-labeled.

Done when a user can compare a small number of verified paths and convert one into a roadmap without exposing unrelated private context.

### Phase 10: Platform expansion

1. Add goals, planning, habits, health, finance, and other domain tools one at a time.
2. Define the internal tool manifest and installation contract.
3. Add versioned migrations for tool schemas and wiki templates.
4. Build billing for Character Arc AI and premium tools.
5. Replace initial personal access tokens with production OAuth authorization.
6. Add rate limits, quotas, security review, backups, deletion workflows, and incident monitoring.
7. Only then design the public user-created tool marketplace.

## MVP Cut Line

### Must build

- Supabase Auth, PostgreSQL, Storage, RLS, and Prisma foundation.
- Workspace, Block, Block Type, Block Relation, and typed-extension foundation.
- Authentication and app shell.
- Tools catalog with Exam Prep installed.
- Exam and syllabus explorer.
- Complete quiz or mock-test attempt and analysis loop.
- AI generation with strict schema validation and provenance.
- Skill or weak-topic outcomes derived from the attempt.
- One external-agent MCP flow.
- Downloadable local wiki plus privacy-aware sync preview.

### Build if time remains

- Flashcard generation and saving.
- Rich Skill Graph visualization.
- AI-agent wiki setup prompt and working CLI initialization.
- One lightweight connector.

### Show as future direction

- Full Career Compass research system.
- Many connectors.
- General life-management tools.
- Continuous bidirectional wiki sync.
- User-created tool marketplace.
- Native desktop and mobile applications.

## First Implementation Sequence

The first coding sequence should be:

1. Configure Supabase locally and create the hosted project.
2. Add Supabase SSR authentication and the profiles table.
3. Establish the Prisma schema as the absolute source of truth for Page, Page Type, Page Relation, tags, tool installation, ownership, and indexes.
4. Generate the Prisma client and push changes using Prisma migrate.
5. Add the secure data-access layer.
6. Build the application shell and Tools page.
7. Add Exam, Subject, Chapter, Topic, and Skill extensions.
8. Seed reusable GATE Computer Science catalog data.
9. Build Exam Prep navigation and personal progress views.
10. Add the assessment and attempt schema.
11. Build a deterministic seeded quiz before adding AI.
12. Add attempt analysis and progress evidence.
13. Integrate AI generation against the already-tested assessment schema.

This order prevents AI generation, MCP, and local-wiki work from being built on top of an unstable domain model.

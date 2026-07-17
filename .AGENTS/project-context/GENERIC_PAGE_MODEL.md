# Superseded: Generic Page Model

> This draft is retained for design history only. The implemented architecture is documented in [GENERIC_BLOCK_MODEL.md](./GENERIC_BLOCK_MODEL.md) and uses non-null workspaces plus blocks.

# ProgressApp 2.0: Generic Page Model

## Core Decision

Use a hybrid model:

- A generic `Page` is the shared identity, navigation, permission, linking, tagging, and presentation unit.
- Typed extension tables store fields and rules that belong to a specific page type.
- Typed operational tables store high-volume or transactional records such as attempts, responses, scoring, sync state, permissions, and audit events.

This gives ProgressApp a reusable platform without reducing the entire product to unvalidated JSON.

## What Should Be a Page

A record should be a page when a user or agent may reasonably open it, link to it, organize it, discuss it, or view outcomes about it.

Good page types:

- Generic page.
- Exam.
- Subject.
- Chapter.
- Topic.
- Skill.
- Goal.
- Career path.
- Study plan.
- Flashcard deck.
- Quiz or mock test definition.
- Project.
- Habit or routine.

Records that should not be pages:

- Attempt response.
- Question option.
- Session or token.
- Tool permission.
- Connector credential.
- Audit event.
- Background-job step.
- Metric snapshot.
- Sync hash.

These records support pages but do not need page-level navigation or customization.

## Shared Page Tables

### `page_types`

Registry of developer-provided page types.

Suggested fields:

- `id`
- `key`, such as `exam`, `subject`, `topic`, or `skill`
- `name`
- `tool_key`
- `icon`
- `schema_version`
- `is_system`
- `created_at`

For the hackathon, page types are developer-defined. User-defined page types belong to the future tool marketplace.

### `pages`

Shared identity and presentation fields.

Suggested fields:

- `id`
- `page_type_id`
- `owner_id`, nullable for trusted system catalog pages
- `scope`: `SYSTEM` or `USER`
- `title`
- `slug`
- `summary`
- `status`
- `privacy_level`
- `icon`
- `cover_file_id`
- `properties` JSONB for optional presentation metadata only
- `created_by`
- `created_at`
- `updated_at`
- `archived_at`

Stable domain fields should not be hidden inside `properties`.

### `page_relations`

Directed graph connecting any two pages.

Suggested fields:

- `id`
- `owner_id`, nullable for system catalog relations
- `from_page_id`
- `to_page_id`
- `relation_key`, such as `includes`, `requires`, `supports`, `targets`, or `related_to`
- `position`
- `properties` JSONB for optional relation metadata
- `created_at`
- `updated_at`

Add a uniqueness rule covering the owner or system scope, source page, destination page, and relation key.

### `tags` and `page_tags`

Tags provide flexible filtering and discovery.

Tags are useful for labels such as:

- Computer Science.
- Competitive exam.
- High priority.
- Mathematics.
- Revision required.

Tags should not replace meaningful domain relationships.

## Exams and Subjects

An Exam and a Subject are both pages. Their relationship is many-to-many:

```text
Exam page --includes--> Subject page
```

The same Subject page can therefore belong to GATE, UGC NET, university exams, or a user's custom study plan.

Do not model exam membership only as a tag. An exam-subject relationship needs structured fields such as:

- Exam-specific weightage.
- Expected marks.
- Section.
- Display order.
- Required or optional status.
- Syllabus version.
- Valid-from and valid-until dates.
- Official-source reference.

Store those fields in an `exam_subject_config` typed extension keyed by the corresponding `page_relations.id`.

Suggested structure:

```text
pages
  GATE CSE                 type=exam
  Operating Systems       type=subject
  UGC NET Computer Sci.   type=exam

page_relations
  GATE CSE -> Operating Systems      relation=includes
  UGC NET -> Operating Systems       relation=includes

exam_subject_config
  gate-os relation     weightage=9, position=4
  net-os relation      weightage=6, position=7
```

This reuses one subject identity while preserving different exam contexts.

## Typed Page Extensions

### `exam_pages`

One-to-one with `pages` when the page type is `exam`.

Fields may include:

- `page_id`
- `conducting_body`
- `exam_date`
- `duration_minutes`
- `total_marks`
- `negative_marking_rules`
- `blueprint_version`

### `subject_pages`

One-to-one with `pages` when the page type is `subject`.

Fields may include:

- `page_id`
- `canonical_code`
- `discipline`
- `default_description`

### `topic_pages`, `skill_pages`, and `goal_pages`

Each adds only the stable typed fields needed by its domain. Shared title, privacy, status, tags, links, and ownership remain in `pages`.

The application service must validate that an extension matches the page's registered type.

## Canonical Pages and Personal State

ProgressApp needs to distinguish shared definitions from personal outcomes.

Examples of system pages:

- The official GATE Computer Science exam definition.
- A canonical Operating Systems subject.
- A canonical Process Scheduling topic.

Examples of user pages:

- A private custom exam.
- A personal goal.
- A private career decision.
- A custom study plan.

Use `user_page_state` for a user's relationship with either a system or user page.

Suggested fields:

- `user_id`
- `page_id`
- `state`, such as `ACTIVE`, `PAUSED`, or `COMPLETED`
- `progress_percent`
- `confidence`
- `priority`
- `pinned`
- `last_activity_at`
- `properties` JSONB for lightweight user preferences

Evidence and domain projections remain the source of truth for calculated progress. `user_page_state` is a current summary, not an untraceable AI opinion.

## Page Content

ProgressApp is not primarily a Notion replacement. The first version should give pages a summary, structured properties, relations, and purpose-built tool views.

A `page_blocks` system can be added later for lightweight rich content:

- `id`
- `page_id`
- `parent_block_id`
- `block_type`
- `position`
- `content` JSONB

Do not make blocks a prerequisite for Exam Prep, Skill Graph, assessments, or analytics.

## Outcomes and Evidence

Use a generic immutable `progress_evidence` table to connect outcomes to pages:

- `id`
- `user_id`
- `page_id`
- `source_type`
- `source_id`
- `evidence_key`
- `numeric_value`
- `properties` JSONB
- `recorded_at`

Examples:

- A mock-test response provides evidence for an Operating Systems topic page.
- A completed project provides evidence for a React skill page.
- A verified credential provides evidence for a degree or certification page.

Typed projections such as `topic_progress` and `user_skill` calculate current state from this evidence. Do not force every analytical query through a generic EAV table.

## Tools and Pages

Each installed tool declares:

- Which page types it provides.
- Which relation types it understands.
- Which typed extensions it owns.
- Which actions it exposes to agents.
- Which page and outcome views it renders.
- Which permissions it needs.

Examples:

- Exam Prep provides Exam, Subject, Chapter, Topic, Assessment, and Deck page types.
- Career Compass provides Career Path and Career Decision page types.
- Skill Graph provides Skill pages and evidence-based skill projections.

Uninstalling a tool must not immediately delete its pages or outcomes. The user can archive them, export them, or reinstall the tool later.

## Supabase Ownership and RLS

- Supabase Auth owns identities in `auth.users`.
- `profiles.id` references `auth.users.id`.
- Every user-owned page, relation, state, evidence record, and operational record includes a direct `user_id` or `owner_id` suitable for indexing and authorization.
- Enable RLS on every table exposed through the Supabase Data API.
- Owner policies use `TO authenticated` plus `(select auth.uid()) = user_id` or the matching owner column.
- Update policies require both `USING` and `WITH CHECK`, plus a SELECT policy.
- System catalog pages are readable but writable only by trusted server operations.
- Never expose the Supabase secret or service-role key to the browser.

Because the application uses Prisma on the server, authorization must also be enforced in the server data-access layer. A privileged Prisma database connection can bypass RLS, so RLS cannot be the only defense for server-side operations.

## Supabase and Prisma Responsibilities

Use Supabase for:

- PostgreSQL hosting.
- Authentication and cookie-based sessions.
- Storage.
- RLS and Data API protection.
- Realtime later, only where it improves the product.

Use Prisma for:

- Server-side typed database access.
- Relations and transactions in domain services.
- Generated TypeScript database types.

Use `@supabase/ssr` and `@supabase/supabase-js` for Auth and Storage. Do not use Prisma in Client Components.

Choose one migration authority. For this project, use Supabase SQL migrations as the source of truth because RLS policies, storage policies, functions, and extensions are not fully represented by the Prisma schema. After applying migrations, keep the Prisma schema synchronized and regenerate Prisma Client.

Do not maintain independent Prisma Migrate and Supabase migration histories for the same schema.

## Initial Implementation Cut

Build only these page types first:

- `generic`
- `exam`
- `subject`
- `chapter`
- `topic`
- `skill`
- `assessment`

Build these relation types first:

- `includes`
- `requires`
- `targets`
- `related_to`

Build these typed extensions first:

- `exam_pages`
- `subject_pages`
- `exam_subject_config`
- `assessment_pages`
- `topic_progress`
- `user_skill`

This is generic enough to prove the platform while remaining small enough to implement and test during the hackathon.

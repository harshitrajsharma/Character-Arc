# ProgressApp 2.0: Workspace and Block Model

## Core Decision

ProgressApp uses a hybrid relational model:

- `Workspace` is the non-null tenancy and authorization boundary.
- `Block` is the shared identity for durable, openable knowledge entities.
- `BlockRelation` connects reusable entities without duplicating them.
- Typed extension tables hold stable domain-specific fields.
- Typed operational tables hold attempts, responses, permissions, and other transactional records.
- Immutable evidence explains changes to rebuildable progress and skill projections.

This gives tools a generic platform while keeping important behavior strict and queryable.

## Workspaces

Every cloud record with user or catalog data belongs to a workspace.

- `SYSTEM`: trusted catalogs such as canonical exams, subjects, and public tool definitions.
- `PERSONAL`: the private workspace created for one user at signup.
- `SHARED`: future families, classrooms, teams, and collaborative spaces.

`WorkspaceMember` stores the role `OWNER`, `EDITOR`, or `VIEWER`. A non-null `workspace_id` removes ambiguous nullable ownership and makes uniqueness, indexing, and RLS predictable.

## What Is a Block

A record should be a block when a user or agent may open it, link to it, organize it, discuss it, or view outcomes about it.

Initial block types:

- Generic
- Exam
- Subject
- Chapter
- Topic
- Skill
- Goal
- Career path
- Study plan
- Flashcard deck
- Assessment

Records that are not blocks:

- Question options
- Attempts and responses
- Tool grants
- Connector credentials
- Audit events
- Background-job steps
- Progress evidence

These records support blocks but need strict transactional schemas instead of block-level customization.

## Block Structure

`BlockType` is a developer-controlled registry. Tool-provided keys should be namespaced in the future.

`Block` stores shared identity and presentation fields:

- `workspace_id`
- `block_type_id`
- optional `parent_block_id`
- title, slug, summary, and optional body
- status and visibility
- explicit agent-access permission
- position, icon, and cover file
- limited JSONB properties and a schema version
- creator, origin tool installation, and timestamps

Stable fields used for filtering, authorization, relationships, or analytics must remain typed columns. JSONB is for optional metadata, not a replacement for relational design.

## Hierarchy and Graph Relations

Use `parent_block_id` for visual containment:

```text
GATE Computer Science
`-- Engineering Mathematics
    `-- Linear Algebra
```

Use `BlockRelation` for semantic reuse:

```text
GATE CSE   --includes--> Engineering Mathematics
ISRO CS    --includes--> Engineering Mathematics
```

`BlockRelationType` defines the key, optional source and target block types, cardinality, and inverse key. Database triggers reject cross-workspace edges and invalid registered endpoints.

`ExamSubjectConfig` extends an `includes` relation with exam-specific weightage, marks, section, syllabus version, validity dates, and provenance.

## Typed Extensions

Typed extensions use the block ID as their primary key:

- `ExamBlock`
- `SubjectBlock`
- `Assessment`

Database triggers verify that each extension is attached to the matching registered block type. New extensions should be introduced only when a domain has stable fields or rules that do not belong in generic properties.

## Assessments

Assessment content is intentionally relational:

- `Question`
- `QuestionOption`
- `QuestionTarget`
- `AssessmentQuestion`
- `Attempt`
- `AttemptResponse`
- `AttemptResponseOption`

Answer keys and explanations live in server-only `QuestionSolution` and `QuestionSolutionOption` tables. Their RLS is enabled without authenticated client policies so browser-readable question rows never expose correct answers.

Attempts become effectively immutable after submission. Submission, deterministic scoring, evidence creation, and projection updates should run in one database transaction through a domain service.

## Progress and Skills

`ProgressEvidence` is immutable and answers why a rating changed. It can reference assessment attempts, study activity, projects, credentials, agent decisions, imports, or manual evidence.

`TopicProgress` and `UserSkill` are fast, rebuildable projections. They are not the source of truth and should be recalculated when scoring rules change.

`UserBlockState` stores lightweight personal workflow state such as active, paused, complete, pinned, priority, and last activity.

## Tools

Tools are versioned:

- `ToolDefinition` is the stable identity.
- `ToolRelease` stores a versioned manifest and schema contract.
- `ToolInstallation` pins one release in a workspace.
- `ToolGrant` stores explicit allow or deny permissions.

Uninstalling a tool must not immediately delete blocks or outcomes. The origin installation is nullable so content can remain archived, exported, or reactivated.

## Privacy Boundary

Cloud blocks use visibility plus explicit agent access:

- `PRIVATE`
- `WORKSPACE`
- `PUBLIC`
- `allow_agent_access`

`LOCAL_ONLY` is not a cloud database value. It belongs in the local LLM-wiki manifest and means the content must never be uploaded.

## Database Ownership

- Supabase Auth owns identities in `auth.users`.
- `profiles.id` has a SQL foreign key to `auth.users.id`.
- The signup trigger creates a profile, personal workspace, and owner membership.
- Supabase SQL migrations under `supabase/migrations` are the single executable migration history.
- Prisma defines the application model and provides server-only typed queries.
- PostgreSQL SQL handles RLS, Auth triggers, checks, and cross-record validation that Prisma cannot express.

Do not create an independent Prisma Migrate history for the same database.

## Initial Query Indexes

Indexes target the first real access patterns:

- workspace, parent, and position for block trees
- workspace, block type, status, and update time for block lists
- source or target block and relation type for graph traversal
- user, status, and time for attempts and personal state
- user, block, and occurrence time for evidence
- user and proficiency or rating for weak-area views

Use cursor pagination for large time-ordered lists. Add JSONB or full-text indexes only after a measured query requires them.

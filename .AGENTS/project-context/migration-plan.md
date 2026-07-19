# Database Logic to Prisma Migration Plan

> [!NOTE]
> **ACHIEVED/DONE**
> This migration has been fully completed. The product now uses Prisma as the absolute source of truth, Next.js Server Actions with `prisma.$transaction` for business logic, and `lib/tools/sync-registry.ts` for database synchronization.
> Supabase PostgreSQL RPCs and custom SQL migrations for tool definitions and business logic have been removed.

## Objective
Convert all raw Supabase PostgreSQL RPC functions currently used by the application into Next.js Server Actions backed by Prisma.

## Scope of Rewrite

### 1. `install_tool`
- **Current Location:** `lib/tools/install-tool.ts` calls `supabase.rpc("install_tool")`
- **Target:** Rewrite in TypeScript using Prisma. It must:
  - Create the installation row in `ToolInstallation`.
  - Copy necessary `ToolGrant`s for permissions based on the manifest.

### 2. Goals-Paths Tool Handlers
- **Current Location:** `lib/tools/execute-tool-action.ts` calls RPCs like `execute_goals_paths_create_arc_v3_1`, `execute_goals_paths_arc_update_v2`, `execute_goals_paths_arc_content_v1`.
- **Target:** Write Prisma transactions directly inside `executeCreateArc`, `createArcUpdateExecutor`, and `createArcContentExecutor` in `execute-tool-action.ts` (or extract to a dedicated goals-paths handler file).

### 3. Exam-Prep Tool Handlers
- **Current Location:** `lib/tools/execute-tool-action.ts` calls RPCs like `execute_exam_prep_create_exam_v1`, `execute_exam_prep_create_subject_v1`, etc.
- **Target:** Replace `createExamPrepExecutor` with specific Prisma implementations for each action key (`exam.create`, `subject.create`, `chapter.create`, `topic.create`, `topic.set-learning`, `topic.record-*`).

## Process / Strategy

1. **Subagent 1: Tool Installation logic** - Analyze `install_tool.sql` and rewrite `lib/tools/install-tool.ts` to use Prisma.
2. **Subagent 2: Goals-Paths logic** - Analyze `goals_paths_tool_foundation.sql` (and variations) and rewrite handlers in `execute-tool-action.ts` using Prisma.
3. **Subagent 3: Exam-Prep logic** - Analyze `exam_prep_tool_foundation.sql` and rewrite exam prep handlers in `execute-tool-action.ts` using Prisma.
4. **Validation/Testing** - After the subagents complete, perform local tests on `Create Exam` and `Create Arc` buttons to verify that the Prisma implementations function identically to the previous SQL versions without triggering constraint errors.

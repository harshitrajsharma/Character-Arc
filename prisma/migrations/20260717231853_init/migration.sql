-- CreateEnum
CREATE TYPE "workspace_kind" AS ENUM ('system', 'personal', 'shared');

-- CreateEnum
CREATE TYPE "workspace_role" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "block_kind" AS ENUM ('entity', 'container', 'content');

-- CreateEnum
CREATE TYPE "block_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "block_visibility" AS ENUM ('private', 'workspace', 'public');

-- CreateEnum
CREATE TYPE "user_block_status" AS ENUM ('not_started', 'active', 'paused', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "relation_cardinality" AS ENUM ('one_to_one', 'one_to_many', 'many_to_many');

-- CreateEnum
CREATE TYPE "file_status" AS ENUM ('uploading', 'ready', 'failed', 'deleted');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('draft', 'in_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "question_kind" AS ENUM ('single_choice', 'multiple_choice', 'true_false', 'numeric', 'short_answer');

-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('draft', 'in_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('in_progress', 'submitted', 'evaluated', 'abandoned');

-- CreateEnum
CREATE TYPE "evidence_source_type" AS ENUM ('assessment_attempt', 'study_activity', 'project', 'credential', 'manual', 'agent', 'import');

-- CreateEnum
CREATE TYPE "tool_release_status" AS ENUM ('draft', 'published', 'deprecated');

-- CreateEnum
CREATE TYPE "tool_installation_status" AS ENUM ('active', 'disabled', 'removed');

-- CreateEnum
CREATE TYPE "tool_grant_effect" AS ENUM ('allow', 'deny');

-- CreateEnum
CREATE TYPE "tool_run_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "onboarding_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by_id" UUID,
    "kind" "workspace_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "workspace_role" NOT NULL DEFAULT 'viewer',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "block_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tool_definition_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "block_kind" NOT NULL DEFAULT 'entity',
    "icon" TEXT,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "block_type_id" UUID NOT NULL,
    "parent_block_id" UUID,
    "created_by_id" UUID,
    "cover_file_id" UUID,
    "origin_tool_installation_id" UUID,
    "origin_tool_run_id" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "status" "block_status" NOT NULL DEFAULT 'active',
    "visibility" "block_visibility" NOT NULL DEFAULT 'private',
    "allow_agent_access" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_relation_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inverse_key" TEXT,
    "source_block_type_id" UUID,
    "target_block_type_id" UUID,
    "cardinality" "relation_cardinality" NOT NULL DEFAULT 'many_to_many',
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_relation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "relation_type_id" UUID NOT NULL,
    "from_block_id" UUID NOT NULL,
    "to_block_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_tags" (
    "workspace_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_tags_pkey" PRIMARY KEY ("block_id","tag_id")
);

-- CreateTable
CREATE TABLE "user_block_states" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "status" "user_block_status" NOT NULL DEFAULT 'not_started',
    "progress_percent" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "last_activity_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_block_states_pkey" PRIMARY KEY ("user_id","block_id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "uploaded_by_id" UUID,
    "bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "sha256" TEXT,
    "status" "file_status" NOT NULL DEFAULT 'uploading',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_blocks" (
    "block_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "exam_code" TEXT,
    "conducting_body" TEXT,
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(8,2),
    "blueprint_version" INTEGER NOT NULL DEFAULT 1,
    "negative_marking_rules" JSONB NOT NULL DEFAULT '{}',
    "official_url" TEXT,
    "verified_at" TIMESTAMPTZ(3),

    CONSTRAINT "exam_blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "subject_blocks" (
    "block_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "canonical_code" TEXT,
    "discipline" TEXT,

    CONSTRAINT "subject_blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "chapter_blocks" (
    "block_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,

    CONSTRAINT "chapter_blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "topic_blocks" (
    "block_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,

    CONSTRAINT "topic_blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "exam_subject_configs" (
    "relation_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "section" TEXT,
    "weightage" DECIMAL(5,2),
    "expected_marks" DECIMAL(8,2),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "syllabus_version" TEXT,
    "source_url" TEXT,
    "valid_from" DATE,
    "valid_until" DATE,

    CONSTRAINT "exam_subject_configs_pkey" PRIMARY KEY ("relation_id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "block_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "exam_block_id" UUID,
    "status" "assessment_status" NOT NULL DEFAULT 'draft',
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(8,2),
    "instructions" TEXT,
    "blueprint" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "authored_by_id" UUID,
    "source_file_id" UUID,
    "kind" "question_kind" NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "stem" TEXT NOT NULL,
    "difficulty" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_solutions" (
    "question_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "explanation" TEXT,
    "numeric_answer" DECIMAL(18,6),
    "text_answer" TEXT,
    "grading_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_solutions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "question_solution_options" (
    "workspace_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_option_id" UUID NOT NULL,

    CONSTRAINT "question_solution_options_pkey" PRIMARY KEY ("question_id","question_option_id")
);

-- CreateTable
CREATE TABLE "question_targets" (
    "workspace_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_targets_pkey" PRIMARY KEY ("question_id","block_id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "section" TEXT,
    "position" INTEGER NOT NULL,
    "marks" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "negative_marks" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "attempt_status" NOT NULL DEFAULT 'in_progress',
    "score" DECIMAL(10,2),
    "max_score" DECIMAL(10,2),
    "correct_count" INTEGER,
    "incorrect_count" INTEGER,
    "unanswered_count" INTEGER,
    "time_spent_seconds" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "evaluated_at" TIMESTAMPTZ(3),

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_text" TEXT,
    "is_correct" BOOLEAN,
    "awarded_marks" DECIMAL(8,2),
    "time_spent_seconds" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "answered_at" TIMESTAMPTZ(3),

    CONSTRAINT "attempt_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_response_options" (
    "workspace_id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "question_option_id" UUID NOT NULL,

    CONSTRAINT "attempt_response_options_pkey" PRIMARY KEY ("response_id","question_option_id")
);

-- CreateTable
CREATE TABLE "progress_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "attempt_id" UUID,
    "source_type" "evidence_source_type" NOT NULL,
    "source_id" TEXT,
    "evidence_key" TEXT NOT NULL,
    "numeric_value" DECIMAL(10,4),
    "max_value" DECIMAL(10,4),
    "confidence" DECIMAL(5,2),
    "properties" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_progress" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "proficiency" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("user_id","block_id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_block_id" UUID NOT NULL,
    "rating" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "last_assessed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("user_id","skill_block_id")
);

-- CreateTable
CREATE TABLE "tool_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_releases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tool_definition_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "tool_release_status" NOT NULL DEFAULT 'draft',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "manifest" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "tool_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_installations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "installed_by_id" UUID,
    "tool_definition_id" UUID NOT NULL,
    "tool_release_id" UUID NOT NULL,
    "status" "tool_installation_status" NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "installed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(3),

    CONSTRAINT "tool_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,
    "effect" "tool_grant_effect" NOT NULL DEFAULT 'deny',
    "constraints" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "installation_id" UUID,
    "tool_release_id" UUID NOT NULL,
    "actor_id" UUID,
    "action_key" TEXT NOT NULL,
    "handler_version" TEXT NOT NULL,
    "invocation_source" TEXT NOT NULL DEFAULT 'web',
    "status" "tool_run_status" NOT NULL DEFAULT 'queued',
    "idempotency_key" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "input_hash" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "output" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_created_by_id_idx" ON "workspaces"("created_by_id");

-- CreateIndex
CREATE INDEX "workspaces_kind_archived_at_idx" ON "workspaces"("kind", "archived_at");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_role_idx" ON "workspace_members"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "block_types_key_key" ON "block_types"("key");

-- CreateIndex
CREATE INDEX "block_types_tool_definition_id_idx" ON "block_types"("tool_definition_id");

-- CreateIndex
CREATE INDEX "block_types_kind_is_system_idx" ON "block_types"("kind", "is_system");

-- CreateIndex
CREATE INDEX "blocks_workspace_id_parent_block_id_position_idx" ON "blocks"("workspace_id", "parent_block_id", "position");

-- CreateIndex
CREATE INDEX "blocks_workspace_id_block_type_id_status_updated_at_idx" ON "blocks"("workspace_id", "block_type_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "blocks_created_by_id_idx" ON "blocks"("created_by_id");

-- CreateIndex
CREATE INDEX "blocks_cover_file_id_idx" ON "blocks"("cover_file_id");

-- CreateIndex
CREATE INDEX "blocks_origin_tool_installation_id_idx" ON "blocks"("origin_tool_installation_id");

-- CreateIndex
CREATE INDEX "blocks_origin_tool_run_id_idx" ON "blocks"("origin_tool_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_workspace_id_slug_key" ON "blocks"("workspace_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "block_relation_types_key_key" ON "block_relation_types"("key");

-- CreateIndex
CREATE INDEX "block_relation_types_source_block_type_id_target_block_type_idx" ON "block_relation_types"("source_block_type_id", "target_block_type_id");

-- CreateIndex
CREATE INDEX "block_relations_workspace_id_from_block_id_relation_type_id_idx" ON "block_relations"("workspace_id", "from_block_id", "relation_type_id", "position");

-- CreateIndex
CREATE INDEX "block_relations_workspace_id_to_block_id_relation_type_id_idx" ON "block_relations"("workspace_id", "to_block_id", "relation_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "block_relations_workspace_id_relation_type_id_from_block_id_key" ON "block_relations"("workspace_id", "relation_type_id", "from_block_id", "to_block_id");

-- CreateIndex
CREATE INDEX "tags_workspace_id_name_idx" ON "tags"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "tags_created_by_id_idx" ON "tags"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_workspace_id_slug_key" ON "tags"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "block_tags_workspace_id_tag_id_idx" ON "block_tags"("workspace_id", "tag_id");

-- CreateIndex
CREATE INDEX "user_block_states_workspace_id_user_id_status_last_activity_idx" ON "user_block_states"("workspace_id", "user_id", "status", "last_activity_at");

-- CreateIndex
CREATE INDEX "user_block_states_block_id_idx" ON "user_block_states"("block_id");

-- CreateIndex
CREATE INDEX "file_objects_workspace_id_status_created_at_idx" ON "file_objects"("workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "file_objects_uploaded_by_id_idx" ON "file_objects"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "file_objects_sha256_idx" ON "file_objects"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_bucket_storage_path_key" ON "file_objects"("bucket", "storage_path");

-- CreateIndex
CREATE INDEX "exam_blocks_workspace_id_exam_code_idx" ON "exam_blocks"("workspace_id", "exam_code");

-- CreateIndex
CREATE INDEX "subject_blocks_workspace_id_canonical_code_idx" ON "subject_blocks"("workspace_id", "canonical_code");

-- CreateIndex
CREATE INDEX "chapter_blocks_workspace_id_idx" ON "chapter_blocks"("workspace_id");

-- CreateIndex
CREATE INDEX "topic_blocks_workspace_id_idx" ON "topic_blocks"("workspace_id");

-- CreateIndex
CREATE INDEX "exam_subject_configs_workspace_id_section_idx" ON "exam_subject_configs"("workspace_id", "section");

-- CreateIndex
CREATE INDEX "assessments_workspace_id_status_published_at_idx" ON "assessments"("workspace_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "assessments_exam_block_id_idx" ON "assessments"("exam_block_id");

-- CreateIndex
CREATE INDEX "questions_workspace_id_status_kind_created_at_idx" ON "questions"("workspace_id", "status", "kind", "created_at");

-- CreateIndex
CREATE INDEX "questions_authored_by_id_idx" ON "questions"("authored_by_id");

-- CreateIndex
CREATE INDEX "questions_source_file_id_idx" ON "questions"("source_file_id");

-- CreateIndex
CREATE INDEX "question_options_workspace_id_question_id_idx" ON "question_options"("workspace_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_key_key" ON "question_options"("question_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_position_key" ON "question_options"("question_id", "position");

-- CreateIndex
CREATE INDEX "question_solutions_workspace_id_question_id_idx" ON "question_solutions"("workspace_id", "question_id");

-- CreateIndex
CREATE INDEX "question_solution_options_workspace_id_question_id_idx" ON "question_solution_options"("workspace_id", "question_id");

-- CreateIndex
CREATE INDEX "question_solution_options_question_option_id_idx" ON "question_solution_options"("question_option_id");

-- CreateIndex
CREATE INDEX "question_targets_workspace_id_block_id_is_primary_idx" ON "question_targets"("workspace_id", "block_id", "is_primary");

-- CreateIndex
CREATE INDEX "assessment_questions_workspace_id_assessment_id_section_pos_idx" ON "assessment_questions"("workspace_id", "assessment_id", "section", "position");

-- CreateIndex
CREATE INDEX "assessment_questions_question_id_idx" ON "assessment_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_id_question_id_key" ON "assessment_questions"("assessment_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_id_position_key" ON "assessment_questions"("assessment_id", "position");

-- CreateIndex
CREATE INDEX "attempts_workspace_id_user_id_status_started_at_idx" ON "attempts"("workspace_id", "user_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "attempts_assessment_id_submitted_at_idx" ON "attempts"("assessment_id", "submitted_at");

-- CreateIndex
CREATE INDEX "attempt_responses_workspace_id_attempt_id_idx" ON "attempt_responses"("workspace_id", "attempt_id");

-- CreateIndex
CREATE INDEX "attempt_responses_question_id_idx" ON "attempt_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_responses_attempt_id_question_id_key" ON "attempt_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "attempt_response_options_workspace_id_response_id_idx" ON "attempt_response_options"("workspace_id", "response_id");

-- CreateIndex
CREATE INDEX "attempt_response_options_question_option_id_idx" ON "attempt_response_options"("question_option_id");

-- CreateIndex
CREATE INDEX "progress_evidence_workspace_id_user_id_block_id_occurred_at_idx" ON "progress_evidence"("workspace_id", "user_id", "block_id", "occurred_at");

-- CreateIndex
CREATE INDEX "progress_evidence_attempt_id_idx" ON "progress_evidence"("attempt_id");

-- CreateIndex
CREATE INDEX "progress_evidence_source_type_source_id_idx" ON "progress_evidence"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "topic_progress_workspace_id_user_id_proficiency_last_practi_idx" ON "topic_progress"("workspace_id", "user_id", "proficiency", "last_practiced_at");

-- CreateIndex
CREATE INDEX "user_skills_workspace_id_user_id_rating_last_assessed_at_idx" ON "user_skills"("workspace_id", "user_id", "rating", "last_assessed_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_definitions_key_key" ON "tool_definitions"("key");

-- CreateIndex
CREATE INDEX "tool_definitions_enabled_name_idx" ON "tool_definitions"("enabled", "name");

-- CreateIndex
CREATE INDEX "tool_releases_tool_definition_id_status_published_at_idx" ON "tool_releases"("tool_definition_id", "status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_releases_tool_definition_id_version_key" ON "tool_releases"("tool_definition_id", "version");

-- CreateIndex
CREATE INDEX "tool_installations_workspace_id_status_idx" ON "tool_installations"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "tool_installations_installed_by_id_idx" ON "tool_installations"("installed_by_id");

-- CreateIndex
CREATE INDEX "tool_installations_tool_release_id_idx" ON "tool_installations"("tool_release_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_installations_workspace_id_tool_definition_id_key" ON "tool_installations"("workspace_id", "tool_definition_id");

-- CreateIndex
CREATE INDEX "tool_grants_workspace_id_effect_idx" ON "tool_grants"("workspace_id", "effect");

-- CreateIndex
CREATE INDEX "tool_grants_installation_id_effect_idx" ON "tool_grants"("installation_id", "effect");

-- CreateIndex
CREATE UNIQUE INDEX "tool_grants_installation_id_permission_key_key" ON "tool_grants"("installation_id", "permission_key");

-- CreateIndex
CREATE INDEX "tool_runs_workspace_id_status_created_at_idx" ON "tool_runs"("workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "tool_runs_actor_id_created_at_idx" ON "tool_runs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "tool_runs_tool_release_id_action_key_created_at_idx" ON "tool_runs"("tool_release_id", "action_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tool_runs_installation_id_idempotency_key_key" ON "tool_runs"("installation_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_types" ADD CONSTRAINT "block_types_tool_definition_id_fkey" FOREIGN KEY ("tool_definition_id") REFERENCES "tool_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_block_type_id_fkey" FOREIGN KEY ("block_type_id") REFERENCES "block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_parent_block_id_fkey" FOREIGN KEY ("parent_block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_cover_file_id_fkey" FOREIGN KEY ("cover_file_id") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_origin_tool_installation_id_fkey" FOREIGN KEY ("origin_tool_installation_id") REFERENCES "tool_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_origin_tool_run_id_fkey" FOREIGN KEY ("origin_tool_run_id") REFERENCES "tool_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relation_types" ADD CONSTRAINT "block_relation_types_source_block_type_id_fkey" FOREIGN KEY ("source_block_type_id") REFERENCES "block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relation_types" ADD CONSTRAINT "block_relation_types_target_block_type_id_fkey" FOREIGN KEY ("target_block_type_id") REFERENCES "block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relations" ADD CONSTRAINT "block_relations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relations" ADD CONSTRAINT "block_relations_relation_type_id_fkey" FOREIGN KEY ("relation_type_id") REFERENCES "block_relation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relations" ADD CONSTRAINT "block_relations_from_block_id_fkey" FOREIGN KEY ("from_block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_relations" ADD CONSTRAINT "block_relations_to_block_id_fkey" FOREIGN KEY ("to_block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_tags" ADD CONSTRAINT "block_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_tags" ADD CONSTRAINT "block_tags_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_tags" ADD CONSTRAINT "block_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block_states" ADD CONSTRAINT "user_block_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block_states" ADD CONSTRAINT "user_block_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block_states" ADD CONSTRAINT "user_block_states_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_blocks" ADD CONSTRAINT "exam_blocks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_blocks" ADD CONSTRAINT "exam_blocks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_blocks" ADD CONSTRAINT "subject_blocks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_blocks" ADD CONSTRAINT "subject_blocks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_blocks" ADD CONSTRAINT "chapter_blocks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_blocks" ADD CONSTRAINT "chapter_blocks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_blocks" ADD CONSTRAINT "topic_blocks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_blocks" ADD CONSTRAINT "topic_blocks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_relation_id_fkey" FOREIGN KEY ("relation_id") REFERENCES "block_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subject_configs" ADD CONSTRAINT "exam_subject_configs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_exam_block_id_fkey" FOREIGN KEY ("exam_block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_authored_by_id_fkey" FOREIGN KEY ("authored_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_solutions" ADD CONSTRAINT "question_solutions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_solutions" ADD CONSTRAINT "question_solutions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_solution_options" ADD CONSTRAINT "question_solution_options_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_solution_options" ADD CONSTRAINT "question_solution_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_solutions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_solution_options" ADD CONSTRAINT "question_solution_options_question_option_id_fkey" FOREIGN KEY ("question_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_targets" ADD CONSTRAINT "question_targets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_targets" ADD CONSTRAINT "question_targets_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_targets" ADD CONSTRAINT "question_targets_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("block_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("block_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_responses" ADD CONSTRAINT "attempt_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_response_options" ADD CONSTRAINT "attempt_response_options_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_response_options" ADD CONSTRAINT "attempt_response_options_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "attempt_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_response_options" ADD CONSTRAINT "attempt_response_options_question_option_id_fkey" FOREIGN KEY ("question_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_evidence" ADD CONSTRAINT "progress_evidence_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_evidence" ADD CONSTRAINT "progress_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_evidence" ADD CONSTRAINT "progress_evidence_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_evidence" ADD CONSTRAINT "progress_evidence_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_block_id_fkey" FOREIGN KEY ("skill_block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_releases" ADD CONSTRAINT "tool_releases_tool_definition_id_fkey" FOREIGN KEY ("tool_definition_id") REFERENCES "tool_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_installations" ADD CONSTRAINT "tool_installations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_installations" ADD CONSTRAINT "tool_installations_installed_by_id_fkey" FOREIGN KEY ("installed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_installations" ADD CONSTRAINT "tool_installations_tool_definition_id_fkey" FOREIGN KEY ("tool_definition_id") REFERENCES "tool_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_installations" ADD CONSTRAINT "tool_installations_tool_release_id_fkey" FOREIGN KEY ("tool_release_id") REFERENCES "tool_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_grants" ADD CONSTRAINT "tool_grants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_grants" ADD CONSTRAINT "tool_grants_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "tool_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "tool_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_tool_release_id_fkey" FOREIGN KEY ("tool_release_id") REFERENCES "tool_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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

-- Server-only solution tables keep answer keys out of browser-readable question rows.
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

CREATE TABLE "question_solution_options" (
    "workspace_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_option_id" UUID NOT NULL,

    CONSTRAINT "question_solution_options_pkey" PRIMARY KEY ("question_id", "question_option_id")
);

CREATE INDEX "question_solutions_workspace_id_question_id_idx" ON "question_solutions"("workspace_id", "question_id");
CREATE INDEX "question_solution_options_workspace_id_question_id_idx" ON "question_solution_options"("workspace_id", "question_id");
CREATE INDEX "question_solution_options_question_option_id_idx" ON "question_solution_options"("question_option_id");

ALTER TABLE "question_solutions"
ADD CONSTRAINT "question_solutions_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "question_solutions_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_solution_options"
ADD CONSTRAINT "question_solution_options_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "question_solution_options_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "question_solutions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "question_solution_options_question_option_id_fkey"
FOREIGN KEY ("question_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supabase Auth owns account identities. Prisma cannot express this cross-schema reference.
ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_id_auth_users_fkey"
FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Domain checks that are intentionally enforced by PostgreSQL, independent of the caller.
ALTER TABLE "workspaces"
ADD CONSTRAINT "workspaces_personal_creator_check"
CHECK ("kind" = 'system' OR "created_by_id" IS NOT NULL);

CREATE UNIQUE INDEX "workspaces_one_personal_per_creator_key"
ON "workspaces"("created_by_id")
WHERE "kind" = 'personal';

ALTER TABLE "blocks"
ADD CONSTRAINT "blocks_not_own_parent_check"
CHECK ("parent_block_id" IS NULL OR "parent_block_id" <> "id"),
ADD CONSTRAINT "blocks_position_check"
CHECK ("position" >= 0),
ADD CONSTRAINT "blocks_archive_state_check"
CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL));

ALTER TABLE "block_relations"
ADD CONSTRAINT "block_relations_not_self_check"
CHECK ("from_block_id" <> "to_block_id"),
ADD CONSTRAINT "block_relations_position_check"
CHECK ("position" >= 0);

ALTER TABLE "user_block_states"
ADD CONSTRAINT "user_block_states_progress_check"
CHECK ("progress_percent" IS NULL OR "progress_percent" BETWEEN 0 AND 100),
ADD CONSTRAINT "user_block_states_confidence_check"
CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100),
ADD CONSTRAINT "user_block_states_priority_check"
CHECK ("priority" BETWEEN 0 AND 100);

ALTER TABLE "file_objects"
ADD CONSTRAINT "file_objects_size_check"
CHECK ("size_bytes" IS NULL OR "size_bytes" >= 0);

ALTER TABLE "exam_blocks"
ADD CONSTRAINT "exam_blocks_duration_check"
CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
ADD CONSTRAINT "exam_blocks_marks_check"
CHECK ("total_marks" IS NULL OR "total_marks" >= 0);

ALTER TABLE "exam_subject_configs"
ADD CONSTRAINT "exam_subject_configs_weightage_check"
CHECK ("weightage" IS NULL OR "weightage" BETWEEN 0 AND 100),
ADD CONSTRAINT "exam_subject_configs_marks_check"
CHECK ("expected_marks" IS NULL OR "expected_marks" >= 0),
ADD CONSTRAINT "exam_subject_configs_dates_check"
CHECK ("valid_until" IS NULL OR "valid_from" IS NULL OR "valid_until" >= "valid_from");

ALTER TABLE "assessments"
ADD CONSTRAINT "assessments_duration_check"
CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
ADD CONSTRAINT "assessments_marks_check"
CHECK ("total_marks" IS NULL OR "total_marks" >= 0),
ADD CONSTRAINT "assessments_publish_state_check"
CHECK ("status" <> 'published' OR "published_at" IS NOT NULL);

ALTER TABLE "questions"
ADD CONSTRAINT "questions_difficulty_check"
CHECK ("difficulty" IS NULL OR "difficulty" BETWEEN 1 AND 5),
ADD CONSTRAINT "questions_publish_state_check"
CHECK ("status" <> 'published' OR "published_at" IS NOT NULL);

ALTER TABLE "question_options"
ADD CONSTRAINT "question_options_position_check"
CHECK ("position" >= 0);

ALTER TABLE "question_targets"
ADD CONSTRAINT "question_targets_weight_check"
CHECK ("weight" > 0);

ALTER TABLE "assessment_questions"
ADD CONSTRAINT "assessment_questions_position_check"
CHECK ("position" >= 0),
ADD CONSTRAINT "assessment_questions_marks_check"
CHECK ("marks" >= 0 AND "negative_marks" >= 0);

ALTER TABLE "attempts"
ADD CONSTRAINT "attempts_score_check"
CHECK ("max_score" IS NULL OR "max_score" >= 0),
ADD CONSTRAINT "attempts_counts_check"
CHECK (
  ("correct_count" IS NULL OR "correct_count" >= 0)
  AND ("incorrect_count" IS NULL OR "incorrect_count" >= 0)
  AND ("unanswered_count" IS NULL OR "unanswered_count" >= 0)
  AND ("time_spent_seconds" IS NULL OR "time_spent_seconds" >= 0)
),
ADD CONSTRAINT "attempts_submission_state_check"
CHECK ("status" IN ('in_progress', 'abandoned') OR "submitted_at" IS NOT NULL);

ALTER TABLE "attempt_responses"
ADD CONSTRAINT "attempt_responses_time_check"
CHECK ("time_spent_seconds" IS NULL OR "time_spent_seconds" >= 0);

ALTER TABLE "progress_evidence"
ADD CONSTRAINT "progress_evidence_confidence_check"
CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100),
ADD CONSTRAINT "progress_evidence_max_value_check"
CHECK ("max_value" IS NULL OR "max_value" > 0);

ALTER TABLE "topic_progress"
ADD CONSTRAINT "topic_progress_ranges_check"
CHECK ("proficiency" BETWEEN 0 AND 100 AND "confidence" BETWEEN 0 AND 100),
ADD CONSTRAINT "topic_progress_evidence_count_check"
CHECK ("evidence_count" >= 0);

ALTER TABLE "user_skills"
ADD CONSTRAINT "user_skills_ranges_check"
CHECK ("rating" BETWEEN 0 AND 100 AND "confidence" BETWEEN 0 AND 100),
ADD CONSTRAINT "user_skills_evidence_count_check"
CHECK ("evidence_count" >= 0);

-- Reject cross-workspace references without introducing duplicate ORM-visible foreign keys.
CREATE OR REPLACE FUNCTION "public"."enforce_same_workspace"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  reference_id uuid;
  reference_workspace_id uuid;
BEGIN
  reference_id := NULLIF(to_jsonb(NEW) ->> TG_ARGV[2], '')::uuid;

  IF reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT workspace_id FROM public.%I WHERE %I = $1',
    TG_ARGV[0],
    TG_ARGV[1]
  )
  INTO reference_workspace_id
  USING reference_id;

  IF reference_workspace_id IS NULL THEN
    RAISE EXCEPTION 'referenced % row % does not exist', TG_ARGV[0], reference_id;
  END IF;

  IF reference_workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'cross-workspace reference from % to % is not allowed', TG_TABLE_NAME, TG_ARGV[0];
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  rule record;
BEGIN
  FOR rule IN
    SELECT * FROM (VALUES
      ('blocks', 'blocks', 'id', 'parent_block_id'),
      ('blocks', 'file_objects', 'id', 'cover_file_id'),
      ('blocks', 'tool_installations', 'id', 'origin_tool_installation_id'),
      ('block_relations', 'blocks', 'id', 'from_block_id'),
      ('block_relations', 'blocks', 'id', 'to_block_id'),
      ('block_tags', 'blocks', 'id', 'block_id'),
      ('block_tags', 'tags', 'id', 'tag_id'),
      ('user_block_states', 'blocks', 'id', 'block_id'),
      ('exam_blocks', 'blocks', 'id', 'block_id'),
      ('subject_blocks', 'blocks', 'id', 'block_id'),
      ('exam_subject_configs', 'block_relations', 'id', 'relation_id'),
      ('assessments', 'blocks', 'id', 'block_id'),
      ('assessments', 'blocks', 'id', 'exam_block_id'),
      ('questions', 'file_objects', 'id', 'source_file_id'),
      ('question_options', 'questions', 'id', 'question_id'),
      ('question_solutions', 'questions', 'id', 'question_id'),
      ('question_solution_options', 'question_solutions', 'question_id', 'question_id'),
      ('question_solution_options', 'question_options', 'id', 'question_option_id'),
      ('question_targets', 'questions', 'id', 'question_id'),
      ('question_targets', 'blocks', 'id', 'block_id'),
      ('assessment_questions', 'assessments', 'block_id', 'assessment_id'),
      ('assessment_questions', 'questions', 'id', 'question_id'),
      ('attempts', 'assessments', 'block_id', 'assessment_id'),
      ('attempt_responses', 'attempts', 'id', 'attempt_id'),
      ('attempt_responses', 'questions', 'id', 'question_id'),
      ('attempt_response_options', 'attempt_responses', 'id', 'response_id'),
      ('attempt_response_options', 'question_options', 'id', 'question_option_id'),
      ('progress_evidence', 'blocks', 'id', 'block_id'),
      ('progress_evidence', 'attempts', 'id', 'attempt_id'),
      ('topic_progress', 'blocks', 'id', 'block_id'),
      ('user_skills', 'blocks', 'id', 'skill_block_id'),
      ('tool_grants', 'tool_installations', 'id', 'installation_id')
    ) AS rules(local_table, reference_table, reference_key, local_key)
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_same_workspace(%L, %L, %L)',
      rule.local_table || '_' || rule.local_key || '_workspace_guard',
      rule.local_table,
      rule.reference_table,
      rule.reference_key,
      rule.local_key
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."validate_tool_installation_release"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  release_definition_id uuid;
BEGIN
  SELECT tool_definition_id INTO release_definition_id
  FROM public.tool_releases
  WHERE id = NEW.tool_release_id;

  IF release_definition_id IS DISTINCT FROM NEW.tool_definition_id THEN
    RAISE EXCEPTION 'tool release % does not belong to tool definition %', NEW.tool_release_id, NEW.tool_definition_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tool_installations_release_guard"
BEFORE INSERT OR UPDATE ON "tool_installations"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_tool_installation_release"();

CREATE OR REPLACE FUNCTION "public"."validate_solution_option"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  option_question_id uuid;
BEGIN
  SELECT question_id INTO option_question_id
  FROM public.question_options
  WHERE id = NEW.question_option_id;

  IF option_question_id IS DISTINCT FROM NEW.question_id THEN
    RAISE EXCEPTION 'question option % does not belong to question %', NEW.question_option_id, NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "question_solution_options_question_guard"
BEFORE INSERT OR UPDATE ON "question_solution_options"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_solution_option"();

-- Validate registered block and relation types at the database boundary.
CREATE OR REPLACE FUNCTION "public"."enforce_block_extension_type"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  actual_type_key text;
BEGIN
  SELECT block_types.key
  INTO actual_type_key
  FROM public.blocks
  JOIN public.block_types ON block_types.id = blocks.block_type_id
  WHERE blocks.id = NEW.block_id AND blocks.workspace_id = NEW.workspace_id;

  IF actual_type_key IS DISTINCT FROM TG_ARGV[0] THEN
    RAISE EXCEPTION 'block % must have block type %, found %', NEW.block_id, TG_ARGV[0], actual_type_key;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "exam_blocks_type_guard"
BEFORE INSERT OR UPDATE ON "exam_blocks"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_block_extension_type"('exam');

CREATE TRIGGER "subject_blocks_type_guard"
BEFORE INSERT OR UPDATE ON "subject_blocks"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_block_extension_type"('subject');

CREATE TRIGGER "assessments_type_guard"
BEFORE INSERT OR UPDATE ON "assessments"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_block_extension_type"('assessment');

CREATE OR REPLACE FUNCTION "public"."validate_block_relation_endpoints"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  expected_source uuid;
  expected_target uuid;
  actual_source uuid;
  actual_target uuid;
BEGIN
  SELECT source_block_type_id, target_block_type_id
  INTO expected_source, expected_target
  FROM public.block_relation_types
  WHERE id = NEW.relation_type_id;

  SELECT block_type_id INTO actual_source FROM public.blocks WHERE id = NEW.from_block_id;
  SELECT block_type_id INTO actual_target FROM public.blocks WHERE id = NEW.to_block_id;

  IF expected_source IS NOT NULL AND expected_source <> actual_source THEN
    RAISE EXCEPTION 'invalid source block type for relation %', NEW.relation_type_id;
  END IF;

  IF expected_target IS NOT NULL AND expected_target <> actual_target THEN
    RAISE EXCEPTION 'invalid target block type for relation %', NEW.relation_type_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "block_relations_endpoint_guard"
BEFORE INSERT OR UPDATE ON "block_relations"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_block_relation_endpoints"();

-- Keep updated_at reliable for writes made outside Prisma.
CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'workspaces', 'block_types', 'blocks', 'block_relation_types',
    'block_relations', 'tags', 'user_block_states', 'file_objects', 'questions', 'question_solutions',
    'topic_progress', 'user_skills', 'tool_definitions', 'tool_installations', 'tool_grants'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  END LOOP;
END;
$$;

-- Create a profile and private personal workspace for every new Supabase Auth user.
CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  personal_workspace_id uuid;
  resolved_name text;
BEGIN
  resolved_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'My Workspace');

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspaces (created_by_id, kind, name, slug)
  VALUES (NEW.id, 'personal', resolved_name, 'personal-' || NEW.id::text)
  RETURNING id INTO personal_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (personal_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_auth_user"();

-- Backfill profiles and personal workspaces if Auth users already exist when this migration runs.
INSERT INTO "profiles" ("id", "display_name", "avatar_url")
SELECT
  users.id,
  NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
  NULLIF(users.raw_user_meta_data ->> 'avatar_url', '')
FROM "auth"."users" AS users
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "workspaces" ("created_by_id", "kind", "name", "slug")
SELECT
  profiles.id,
  'personal',
  COALESCE(NULLIF(profiles.display_name, ''), 'My Workspace'),
  'personal-' || profiles.id::text
FROM "profiles"
WHERE NOT EXISTS (
  SELECT 1
  FROM "workspaces"
  WHERE workspaces.created_by_id = profiles.id AND workspaces.kind = 'personal'
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
SELECT workspaces.id, workspaces.created_by_id, 'owner'
FROM "workspaces"
WHERE workspaces.kind = 'personal' AND workspaces.created_by_id IS NOT NULL
ON CONFLICT ("workspace_id", "user_id") DO NOTHING;

-- Security-definer helpers avoid recursive RLS checks on workspace_members.
CREATE OR REPLACE FUNCTION "public"."can_read_workspace"(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = target_workspace_id
      AND (
        workspaces.kind = 'system'
        OR workspaces.created_by_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members
          WHERE workspace_members.workspace_id = target_workspace_id
            AND workspace_members.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION "public"."can_write_workspace"(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = target_workspace_id
      AND workspaces.kind <> 'system'
      AND (
        workspaces.created_by_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members
          WHERE workspace_members.workspace_id = target_workspace_id
            AND workspace_members.user_id = (SELECT auth.uid())
            AND workspace_members.role IN ('owner', 'editor')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION "public"."can_admin_workspace"(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = target_workspace_id
      AND workspaces.kind <> 'system'
      AND (
        workspaces.created_by_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members
          WHERE workspace_members.workspace_id = target_workspace_id
            AND workspace_members.user_id = (SELECT auth.uid())
            AND workspace_members.role = 'owner'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION "public"."can_read_workspace"(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."can_write_workspace"(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."can_admin_workspace"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."can_read_workspace"(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."can_write_workspace"(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION "public"."can_admin_workspace"(uuid) TO authenticated, service_role;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "block_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "block_relation_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_solutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_solution_options" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON "profiles"
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = "id");

CREATE POLICY "profiles_insert_own" ON "profiles"
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = "id");

CREATE POLICY "profiles_update_own" ON "profiles"
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = "id")
WITH CHECK ((SELECT auth.uid()) = "id");

CREATE POLICY "workspaces_select_allowed" ON "workspaces"
FOR SELECT TO authenticated
USING (public.can_read_workspace("id"));

CREATE POLICY "workspace_members_select_allowed" ON "workspace_members"
FOR SELECT TO authenticated
USING (public.can_read_workspace("workspace_id"));

CREATE POLICY "block_types_read" ON "block_types"
FOR SELECT TO authenticated USING (true);

CREATE POLICY "block_relation_types_read" ON "block_relation_types"
FOR SELECT TO authenticated USING (true);

CREATE POLICY "tool_definitions_read" ON "tool_definitions"
FOR SELECT TO authenticated USING ("enabled");

CREATE POLICY "tool_releases_read" ON "tool_releases"
FOR SELECT TO authenticated USING ("status" = 'published');

-- Workspace content is readable by members and globally readable from the system workspace.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'blocks', 'block_relations', 'tags', 'block_tags', 'file_objects',
    'exam_blocks', 'subject_blocks', 'exam_subject_configs', 'assessments',
    'questions', 'question_options', 'question_targets', 'assessment_questions',
    'tool_installations', 'tool_grants'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY workspace_select ON public.%I FOR SELECT TO authenticated USING (public.can_read_workspace(workspace_id))',
      table_name
    );
  END LOOP;
END;
$$;

-- Personal outcome tables stay private even when they refer to system-workspace content.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_block_states', 'attempts', 'progress_evidence', 'topic_progress', 'user_skills'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY user_select ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)',
      table_name
    );
  END LOOP;
END;
$$;

ALTER TABLE "attempt_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attempt_response_options" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempt_responses_user_access" ON "attempt_responses"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "attempts"
    WHERE attempts.id = attempt_responses.attempt_id
      AND attempts.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "attempt_response_options_user_access" ON "attempt_response_options"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "attempt_responses"
    JOIN "attempts" ON attempts.id = attempt_responses.attempt_id
    WHERE attempt_responses.id = attempt_response_options.response_id
      AND attempts.user_id = (SELECT auth.uid())
  )
);

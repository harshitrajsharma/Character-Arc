-- CreateEnum
CREATE TYPE "scheduled_test_scope" AS ENUM ('subject', 'chapter', 'multi_chapter');

-- CreateEnum
CREATE TYPE "scheduled_test_status" AS ENUM ('planned', 'scheduled', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "test_records" ADD COLUMN     "attempted_at" TIMESTAMPTZ(3),
ADD COLUMN     "scheduled_test_id" UUID,
ADD COLUMN     "scope" "scheduled_test_scope";

-- CreateTable
CREATE TABLE "scheduled_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "exam_subject_relation_id" UUID,
    "title" TEXT NOT NULL,
    "scope" "scheduled_test_scope" NOT NULL,
    "status" "scheduled_test_status" NOT NULL DEFAULT 'planned',
    "scheduled_for" DATE,
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(8,2),
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "last_rescheduled_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancellation_reason" TEXT,
    "legacy_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_test_chapters" (
    "scheduled_test_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "scheduled_test_chapters_pkey" PRIMARY KEY ("scheduled_test_id","chapter_id")
);

-- CreateTable
CREATE TABLE "test_record_chapters" (
    "test_record_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_record_chapters_pkey" PRIMARY KEY ("test_record_id","chapter_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_tests_legacy_key_key" ON "scheduled_tests"("legacy_key");

-- CreateIndex
CREATE INDEX "scheduled_tests_workspace_id_exam_id_subject_id_user_id_sta_idx" ON "scheduled_tests"("workspace_id", "exam_id", "subject_id", "user_id", "status", "scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_tests_installation_id_idx" ON "scheduled_tests"("installation_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_user_id_status_scheduled_for_idx" ON "scheduled_tests"("user_id", "status", "scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_tests_exam_id_idx" ON "scheduled_tests"("exam_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_subject_id_idx" ON "scheduled_tests"("subject_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_exam_subject_relation_id_idx" ON "scheduled_tests"("exam_subject_relation_id");

-- CreateIndex
CREATE INDEX "scheduled_test_chapters_chapter_id_idx" ON "scheduled_test_chapters"("chapter_id");

-- CreateIndex
CREATE INDEX "scheduled_test_chapters_workspace_id_chapter_id_idx" ON "scheduled_test_chapters"("workspace_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_test_chapters_scheduled_test_id_position_key" ON "scheduled_test_chapters"("scheduled_test_id", "position");

-- CreateIndex
CREATE INDEX "test_record_chapters_chapter_id_idx" ON "test_record_chapters"("chapter_id");

-- CreateIndex
CREATE INDEX "test_record_chapters_workspace_id_chapter_id_idx" ON "test_record_chapters"("workspace_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_record_chapters_test_record_id_position_key" ON "test_record_chapters"("test_record_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "test_records_scheduled_test_id_key" ON "test_records"("scheduled_test_id");

-- CreateIndex
CREATE INDEX "test_records_exam_id_idx" ON "test_records"("exam_id");

-- CreateIndex
CREATE INDEX "test_records_subject_id_idx" ON "test_records"("subject_id");

-- CreateIndex
CREATE INDEX "test_records_chapter_id_idx" ON "test_records"("chapter_id");

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "tool_installations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_tests" ADD CONSTRAINT "scheduled_tests_exam_subject_relation_id_fkey" FOREIGN KEY ("exam_subject_relation_id") REFERENCES "block_relations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_test_chapters" ADD CONSTRAINT "scheduled_test_chapters_scheduled_test_id_fkey" FOREIGN KEY ("scheduled_test_id") REFERENCES "scheduled_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_test_chapters" ADD CONSTRAINT "scheduled_test_chapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_test_chapters" ADD CONSTRAINT "scheduled_test_chapters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_scheduled_test_id_fkey" FOREIGN KEY ("scheduled_test_id") REFERENCES "scheduled_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep these public-schema tables inaccessible through Supabase's Data API.
-- Prisma uses the privileged application connection and performs authorization
-- in Server Actions, so the tables intentionally have no RLS policies.
ALTER TABLE "scheduled_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_test_chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_record_chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_records" ENABLE ROW LEVEL SECURITY;

-- AddForeignKey
ALTER TABLE "test_record_chapters" ADD CONSTRAINT "test_record_chapters_test_record_id_fkey" FOREIGN KEY ("test_record_id") REFERENCES "test_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_record_chapters" ADD CONSTRAINT "test_record_chapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_record_chapters" ADD CONSTRAINT "test_record_chapters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

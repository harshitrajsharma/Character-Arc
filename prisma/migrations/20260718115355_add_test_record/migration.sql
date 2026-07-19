-- CreateTable
CREATE TABLE "test_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "subject_id" UUID,
    "chapter_id" UUID,
    "title" TEXT NOT NULL,
    "marks_obtained" DECIMAL(8,2) NOT NULL,
    "total_marks" DECIMAL(8,2) NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_records_workspace_id_user_id_chapter_id_idx" ON "test_records"("workspace_id", "user_id", "chapter_id");

-- CreateIndex
CREATE INDEX "test_records_workspace_id_user_id_subject_id_idx" ON "test_records"("workspace_id", "user_id", "subject_id");

-- CreateIndex
CREATE INDEX "test_records_workspace_id_user_id_exam_id_idx" ON "test_records"("workspace_id", "user_id", "exam_id");

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `blueprint_version` on the `exam_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `exam_date` on the `exam_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `negative_marking_rules` on the `exam_blocks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "exam_schedule_status" AS ENUM ('expected', 'announced', 'confirmed', 'postponed', 'cancelled');

-- AlterTable
ALTER TABLE "exam_blocks" DROP COLUMN "blueprint_version",
DROP COLUMN "exam_date",
DROP COLUMN "negative_marking_rules",
ADD COLUMN     "expected_end_date" DATE,
ADD COLUMN     "expected_start_date" DATE,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "official_end_at" TIMESTAMPTZ(3),
ADD COLUMN     "official_start_at" TIMESTAMPTZ(3),
ADD COLUMN     "pattern_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "schedule_status" "exam_schedule_status" NOT NULL DEFAULT 'expected',
ADD COLUMN     "scoring_rules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "target_rank" INTEGER,
ADD COLUMN     "timezone" TEXT;

-- CreateIndex
CREATE INDEX "exam_blocks_workspace_id_schedule_status_expected_start_dat_idx" ON "exam_blocks"("workspace_id", "schedule_status", "expected_start_date");

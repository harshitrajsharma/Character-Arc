/*
  Warnings:

  - You are about to drop the column `expected_marks` on the `exam_subject_configs` table. All the data in the column will be lost.
  - You are about to drop the column `valid_from` on the `exam_subject_configs` table. All the data in the column will be lost.
  - You are about to drop the column `valid_until` on the `exam_subject_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exam_subject_configs" DROP COLUMN "expected_marks",
DROP COLUMN "valid_from",
DROP COLUMN "valid_until";

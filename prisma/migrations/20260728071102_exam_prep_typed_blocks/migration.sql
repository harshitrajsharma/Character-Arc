-- CreateEnum
CREATE TYPE "foundation_level" AS ENUM ('Beginner', 'Moderate', 'Advanced');

-- AlterTable
ALTER TABLE "chapter_blocks" ADD COLUMN     "is_important" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "exam_blocks" ADD COLUMN     "exam_date" DATE,
ADD COLUMN     "target_marks" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "subject_blocks" ADD COLUMN     "foundation_level" "foundation_level" NOT NULL DEFAULT 'Beginner';

-- AlterTable
ALTER TABLE "topic_blocks" ADD COLUMN     "is_important" BOOLEAN NOT NULL DEFAULT false;

/*
  Warnings:

  - You are about to drop the column `input` on the `tool_runs` table. All the data in the column will be lost.
  - You are about to drop the column `output` on the `tool_runs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tool_runs" DROP COLUMN "input",
DROP COLUMN "output";

-- CreateTable
CREATE TABLE "tool_run_payloads" (
    "tool_run_id" UUID NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "error" JSONB,

    CONSTRAINT "tool_run_payloads_pkey" PRIMARY KEY ("tool_run_id")
);

-- AddForeignKey
ALTER TABLE "tool_run_payloads" ADD CONSTRAINT "tool_run_payloads_tool_run_id_fkey" FOREIGN KEY ("tool_run_id") REFERENCES "tool_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

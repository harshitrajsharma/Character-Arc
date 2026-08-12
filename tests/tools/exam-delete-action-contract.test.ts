// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  resolveToolAction,
  validateToolActionInput,
} from "@/lib/tools/action-contract"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"

const examId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"

describe("Exam Prep permanent delete action contract", () => {
  test("declares a permanent exam delete action", () => {
    const resolved = resolveToolAction(examPrepManifest, "exam.delete")
    expect(resolved.success).toBe(true)
  })

  test("accepts only the exam identifier", () => {
    expect(
      validateToolActionInput(examPrepManifest, "exam.delete", { examId })
    ).toEqual({ success: true, data: { examId } })
    expect(
      validateToolActionInput(examPrepManifest, "exam.delete", {
        examId,
        softDelete: true,
      }).success
    ).toBe(false)
  })
})

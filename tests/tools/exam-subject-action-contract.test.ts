// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  resolveToolAction,
  validateToolActionInput,
} from "@/lib/tools/action-contract"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"

const examId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
const subjectId = "68a0111e-43d0-4464-83c0-a5132c6bd4f6"

describe("Exam Prep shared-subject action contracts", () => {
  test("declares attach and detach actions", () => {
    expect(
      resolveToolAction(examPrepManifest, "exam.attach-subject").success
    ).toBe(true)
    expect(
      resolveToolAction(examPrepManifest, "exam.detach-subject").success
    ).toBe(true)
  })

  test("accepts only identifiers and weightage for attach", () => {
    const attachInput = {
      examId,
      subjectId,
      weightage: 25,
    }
    const detachInput = { examId, subjectId }

    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.attach-subject",
        attachInput
      )
    ).toEqual({ success: true, data: attachInput })
    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.detach-subject",
        detachInput
      )
    ).toEqual({ success: true, data: detachInput })
  })

  test("rejects the removed expected-marks input", () => {
    expect(
      validateToolActionInput(examPrepManifest, "exam.attach-subject", {
        examId,
        subjectId,
        weightage: 25,
        expectedMarks: 20,
      }).success
    ).toBe(false)
  })

  test("requires both identifiers for attach and detach", () => {
    for (const actionKey of [
      "exam.attach-subject",
      "exam.detach-subject",
    ]) {
      expect(
        validateToolActionInput(examPrepManifest, actionKey, { subjectId })
          .success
      ).toBe(false)
      expect(
        validateToolActionInput(examPrepManifest, actionKey, { examId }).success
      ).toBe(false)
    }
  })
})

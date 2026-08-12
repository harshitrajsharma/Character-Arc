// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import {
  resolveToolAction,
  validateToolActionInput,
} from "@/lib/tools/action-contract"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"

const examId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"

describe("Exam Prep update action contracts", () => {
  test("declares exam.update and exam.update-settings actions", () => {
    expect(resolveToolAction(examPrepManifest, "exam.update").success).toBe(
      true
    )
    expect(
      resolveToolAction(examPrepManifest, "exam.update-settings").success
    ).toBe(true)
  })

  test("accepts a minimal exam.create input", () => {
    const input = { title: "My UPSC preparation" }
    expect(
      validateToolActionInput(examPrepManifest, "exam.create", input)
    ).toEqual({
      success: true,
      data: input,
    })
  })

  test("accepts valid exam.update input", () => {
    const input = {
      examId,
      title: "Updated Title",
      summary: "Updated summary",
      expectedStartDate: "2027-01-01",
      targetMarks: 80,
    }
    expect(
      validateToolActionInput(examPrepManifest, "exam.update", input)
    ).toEqual({
      success: true,
      data: input,
    })
  })

  test("accepts valid exam.update-settings input", () => {
    const input = {
      examId,
      examCode: "GATE-2027",
      conductingBody: "IIT",
      durationMinutes: 180,
      totalMarks: 100,
      officialUrl: "https://gate.iitk.ac.in",
      scoringRules: {
        correctMarks: 4,
        incorrectMarks: -1,
        unansweredMarks: 1,
      },
    }
    expect(
      validateToolActionInput(examPrepManifest, "exam.update-settings", input)
    ).toEqual({
      success: true,
      data: input,
    })
  })

  test("rejects positive incorrect-answer marks", () => {
    expect(
      validateToolActionInput(examPrepManifest, "exam.update-settings", {
        examId,
        scoringRules: { incorrectMarks: 1 },
      }).success
    ).toBe(false)
  })
})

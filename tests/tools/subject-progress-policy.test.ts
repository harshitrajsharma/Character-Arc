// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import {
  defaultSubjectProgressPolicy,
  normalizeSubjectProgressPolicy,
  validateSubjectProgressPolicy,
} from "@/lib/tools/exam-prep/progress/policy"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"
import { validateToolActionInput } from "@/lib/tools/action-contract"

describe("Subject Progress Policy", () => {
  test("defaultSubjectProgressPolicy has correct defaults", () => {
    expect(defaultSubjectProgressPolicy).toEqual({
      revisionTarget: 3,
      practiceTarget: 3,
      highYieldRevisionTarget: 5,
      highYieldPracticeTarget: 5,
      chapterTestTarget: 1,
      subjectTestTarget: 1,
    })
  })

  test("normalizeSubjectProgressPolicy handles null and empty", () => {
    expect(normalizeSubjectProgressPolicy(null)).toEqual(defaultSubjectProgressPolicy)
    expect(normalizeSubjectProgressPolicy(undefined)).toEqual(defaultSubjectProgressPolicy)
    expect(normalizeSubjectProgressPolicy({})).toEqual(defaultSubjectProgressPolicy)
  })

  test("normalizeSubjectProgressPolicy completes partial settings with defaults", () => {
    expect(normalizeSubjectProgressPolicy({ revisionTarget: 10 })).toEqual({
      ...defaultSubjectProgressPolicy,
      revisionTarget: 10,
      highYieldRevisionTarget: 10,
    })
  })

  test("normalization never makes high-yield targets weaker than standard targets", () => {
    expect(
      normalizeSubjectProgressPolicy({
        revisionTarget: 8,
        practiceTarget: 7,
        highYieldRevisionTarget: 3,
        highYieldPracticeTarget: 4,
      })
    ).toEqual({
      ...defaultSubjectProgressPolicy,
      revisionTarget: 8,
      practiceTarget: 7,
      highYieldRevisionTarget: 8,
      highYieldPracticeTarget: 7,
    })
  })

  test("normalizeSubjectProgressPolicy falls back to defaults for invalid setting structures", () => {
    expect(normalizeSubjectProgressPolicy({ revisionTarget: 101 })).toEqual(defaultSubjectProgressPolicy)
    expect(normalizeSubjectProgressPolicy({ practiceTarget: -1 })).toEqual(defaultSubjectProgressPolicy)
  })

  test("validateSubjectProgressPolicy accepts valid settings", () => {
    const valid = {
      revisionTarget: 4,
      practiceTarget: 4,
      highYieldRevisionTarget: 6,
      highYieldPracticeTarget: 6,
      chapterTestTarget: 2,
      subjectTestTarget: 2,
    }
    expect(validateSubjectProgressPolicy(valid)).toEqual(valid)
  })

  test("validateSubjectProgressPolicy throws error on invalid settings", () => {
    expect(() => validateSubjectProgressPolicy({ revisionTarget: 101 })).toThrow()
    expect(() => validateSubjectProgressPolicy({ chapterTestTarget: -5 })).toThrow()
    expect(() =>
      validateSubjectProgressPolicy({
        revisionTarget: 8,
        practiceTarget: 7,
        highYieldRevisionTarget: 3,
        highYieldPracticeTarget: 4,
        chapterTestTarget: 1,
        subjectTestTarget: 1,
      })
    ).toThrow()
  })

  test("action manifest accepts valid subject.update-settings input", () => {
    const subjectId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
    const validSettings = {
      subjectId,
      revisionTarget: 5,
      practiceTarget: 5,
      highYieldRevisionTarget: 10,
      highYieldPracticeTarget: 10,
      chapterTestTarget: 2,
      subjectTestTarget: 2,
    }

    const validation = validateToolActionInput(examPrepManifest, "subject.update-settings", validSettings)
    expect(validation.success).toBe(true)
    if (validation.success) {
      expect(validation.data).toEqual(validSettings)
    }
  })

  test("action manifest rejects invalid subject.update-settings input", () => {
    const subjectId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"

    // Invalid target values (out of range)
    const invalidSettings = {
      subjectId,
      revisionTarget: 101,
      practiceTarget: 5,
      highYieldRevisionTarget: 10,
      highYieldPracticeTarget: 10,
      chapterTestTarget: 2,
      subjectTestTarget: 2,
    }

    const validation = validateToolActionInput(examPrepManifest, "subject.update-settings", invalidSettings)
    expect(validation.success).toBe(false)
  })
})

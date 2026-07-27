// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  clampProgress,
  getSubjectCategory,
  getCanonicalSubjectProgress,
} from "@/components/tools/exam-prep/subjects/progress-helper"
import type { SubjectWithRelations } from "@/types/progressapp/domain"

describe("Subject Overview Progress & Category Canonical Path", () => {
  describe("clampProgress", () => {
    test("handles normal percentages", () => {
      expect(clampProgress(50)).toBe(50)
      expect(clampProgress(0)).toBe(0)
      expect(clampProgress(100)).toBe(100)
    })

    test("rounds floating point values", () => {
      expect(clampProgress(50.4)).toBe(50)
      expect(clampProgress(50.6)).toBe(51)
      expect(clampProgress(99.9)).toBe(100)
      expect(clampProgress(0.1)).toBe(0)
    })

    test("clamps out of bounds values", () => {
      expect(clampProgress(-15)).toBe(0)
      expect(clampProgress(150)).toBe(100)
    })

    test("handles malformed/invalid inputs gracefully", () => {
      expect(clampProgress(NaN)).toBe(0)
      expect(clampProgress(undefined as unknown as number)).toBe(0)
      expect(clampProgress(null as unknown as number)).toBe(0)
    })
  })

  describe("getSubjectCategory", () => {
    test("categorizes exactly 0 as not-started", () => {
      expect(getSubjectCategory(0)).toBe("not-started")
    })

    test("categorizes negative values or values that clamp to 0 as not-started", () => {
      expect(getSubjectCategory(-5)).toBe("not-started")
      expect(getSubjectCategory(0.4)).toBe("not-started")
    })

    test("categorizes greater than 0 and less than 100 as in-progress", () => {
      expect(getSubjectCategory(0.5)).toBe("in-progress")
      expect(getSubjectCategory(1)).toBe("in-progress")
      expect(getSubjectCategory(50)).toBe("in-progress")
      expect(getSubjectCategory(99)).toBe("in-progress")
      expect(getSubjectCategory(99.4)).toBe("in-progress")
    })

    test("categorizes exactly 100 as completed", () => {
      expect(getSubjectCategory(100)).toBe("completed")
    })

    test("categorizes values that clamp to 100 as completed", () => {
      expect(getSubjectCategory(99.6)).toBe("completed")
      expect(getSubjectCategory(120)).toBe("completed")
    })
  })

  describe("getCanonicalSubjectProgress", () => {
    test("handles null/undefined subjects safely", () => {
      const result = getCanonicalSubjectProgress(null as unknown as SubjectWithRelations)
      expect(result.overall).toBe(0)
      expect(result.category).toBe("not-started")
      expect(result.foundationLevel).toBe("Beginner")
      expect(result.expectedMarks).toBeNull()
    })

    test("returns formatted progress for an active subject", () => {
      const mockSubject: SubjectWithRelations = {
        id: "subject-1",
        name: "Algorithms",
        weightage: 12,
        expectedMarks: 5,
        foundationLevel: "Moderate",
        overallProgress: 45,
        learningProgress: 80,
        revisionProgress: 30,
        practiceProgress: 20,
        testProgress: 10,
        position: 0,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        chapters: [],
        tests: [],
        mockTests: [],
      }

      const result = getCanonicalSubjectProgress(mockSubject)
      expect(result.overall).toBe(35)
      expect(result.learning).toBe(80)
      expect(result.revision).toBe(30)
      expect(result.practice).toBe(20)
      expect(result.test).toBe(0)
      expect(result.category).toBe("in-progress")
      expect(result.foundationLevel).toBe("Moderate")
      expect(result.expectedMarks).toBeNull()
    })
  })
})

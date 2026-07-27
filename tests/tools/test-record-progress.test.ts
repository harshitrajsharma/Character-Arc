// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  calculateExpectedMarksEvidence,
  calculateSubjectTestProgress,
  calculateWeightedAverageMarks,
  type TestRecordInput,
} from "@/lib/tools/exam-prep/calculations/test-records"
import { defaultSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

function record(
  id: string,
  marksObtained: number,
  totalMarks: number,
  chapterId: string | null = null
): TestRecordInput {
  return { id, marksObtained, totalMarks, chapterId }
}

describe("TestRecord progress evidence", () => {
  test("combines chapter and subject targets without cross-scope compensation", () => {
    const result = calculateSubjectTestProgress({
      chapterIds: ["chapter-1", "chapter-2"],
      records: [
        record("chapter-1-a", 8, 10, "chapter-1"),
        record("chapter-1-b", 9, 10, "chapter-1"),
        record("subject-1", 80, 100),
      ],
      policy: defaultSubjectProgressPolicy,
    })

    expect(result).toEqual({
      percentage: 66.7,
      completedRecords: 2,
      targetRecords: 3,
      chapter: { completedRecords: 1, targetRecords: 2 },
      subject: { completedRecords: 1, targetRecords: 1 },
    })
  })

  test("returns 100 when both test targets are disabled", () => {
    const result = calculateSubjectTestProgress({
      chapterIds: ["chapter-1"],
      records: [],
      policy: {
        ...defaultSubjectProgressPolicy,
        chapterTestTarget: 0,
        subjectTestTarget: 0,
      },
    })

    expect(result.percentage).toBe(100)
    expect(result.completedRecords).toBe(0)
    expect(result.targetRecords).toBe(0)
  })

  test("ignores invalid records and records for inactive chapters", () => {
    const result = calculateSubjectTestProgress({
      chapterIds: ["chapter-1"],
      records: [
        record("valid", 8, 10, "chapter-1"),
        record("zero-total", 0, 0, "chapter-1"),
        record("over-total", 11, 10),
        record("inactive", 10, 10, "chapter-2"),
      ],
      policy: defaultSubjectProgressPolicy,
    })

    expect(result.completedRecords).toBe(1)
    expect(result.targetRecords).toBe(2)
    expect(result.percentage).toBe(50)
  })
})

describe("Expected marks evidence", () => {
  test("balances chapters equally and weights subject tests 60/40", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1", "chapter-2"],
      records: [
        record("chapter-1-a", 80, 100, "chapter-1"),
        record("chapter-1-b", 100, 100, "chapter-1"),
        record("chapter-2-a", 30, 50, "chapter-2"),
        record("subject-a", 70, 100),
        record("subject-b", 90, 100),
      ],
      weightage: 20,
    })

    expect(result.chapterAveragePercentage).toBe(75)
    expect(result.subjectAveragePercentage).toBe(80)
    expect(result.percentage).toBe(78)
    expect(result.expectedMarks).toBe(15.6)
    expect(result.validChapterRecords).toBe(3)
    expect(result.validSubjectRecords).toBe(2)
    expect(result.testedChapters).toBe(2)
    expect(result.activeChapters).toBe(2)
    expect(result.chapterCoveragePercentage).toBe(100)
    expect(result.coverageStatus).toBe("strong")
  })

  test("uses chapter evidence at full weight when no subject test exists", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1"],
      records: [record("chapter", 7.5, 10, "chapter-1")],
      weightage: 20,
    })

    expect(result.percentage).toBe(75)
    expect(result.expectedMarks).toBe(15)
    expect(result.coverageStatus).toBe("strong")
  })

  test("reports partial chapter coverage without lowering the observed average", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1", "chapter-2", "chapter-3"],
      records: [record("chapter", 8, 10, "chapter-1")],
      weightage: 20,
    })

    expect(result.percentage).toBe(80)
    expect(result.expectedMarks).toBe(16)
    expect(result.testedChapters).toBe(1)
    expect(result.activeChapters).toBe(3)
    expect(result.chapterCoveragePercentage).toBe(33.3)
    expect(result.coverageStatus).toBe("limited")
  })

  test("treats a full-subject test as strong coverage", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1", "chapter-2"],
      records: [record("subject", 8, 10)],
      weightage: 20,
    })

    expect(result.percentage).toBe(80)
    expect(result.coverageStatus).toBe("strong")
  })

  test("uses subject evidence at full weight when no chapter test exists", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1"],
      records: [record("subject", 82.5, 100)],
      weightage: 20,
    })

    expect(result.percentage).toBe(82.5)
    expect(result.expectedMarks).toBe(16.5)
  })

  test("returns no estimate without valid evidence", () => {
    const result = calculateExpectedMarksEvidence({
      chapterIds: ["chapter-1"],
      records: [record("invalid", 12, 10, "chapter-1")],
      weightage: 20,
    })

    expect(result.percentage).toBeNull()
    expect(result.expectedMarks).toBeNull()
    expect(result.coverageStatus).toBe("none")
  })
})

describe("Average marks aggregation", () => {
  test("weights only subjects with valid evidence", () => {
    const result = calculateWeightedAverageMarks([
      { percentage: 80, weightage: 20 },
      { percentage: 50, weightage: 10 },
      { percentage: null, weightage: 30 },
    ])

    expect(result).toEqual({
      percentage: 70,
      evidencedSubjects: 2,
      totalSubjects: 3,
    })
  })

  test("returns no average when no subject has usable evidence", () => {
    const result = calculateWeightedAverageMarks([
      { percentage: null, weightage: 20 },
      { percentage: 80, weightage: 0 },
    ])

    expect(result.percentage).toBeNull()
    expect(result.evidencedSubjects).toBe(0)
    expect(result.totalSubjects).toBe(2)
  })
})

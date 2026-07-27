// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"

import {
  removeTestRecord,
  upsertTestRecord,
} from "@/components/tools/exam-prep/subjects/test-record-state"
import type { NormalizedTestRecord } from "@/lib/tools/exam-prep/actions/test-actions"
import type { SubjectWithRelations } from "@/types/progressapp/domain"

const now = new Date("2026-07-23T12:00:00.000Z")

function createSubject(): SubjectWithRelations {
  return {
    id: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
    name: "Algorithms",
    weightage: 20,
    expectedMarks: null,
    foundationLevel: "Beginner",
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: 0,
    userId: "",
    createdAt: now,
    updatedAt: now,
    tests: [],
    mockTests: [],
    testRecords: [],
    chapters: [
      {
        id: "68a0111e-43d0-4464-83c0-a5132c6bd4f6",
        name: "Arrays",
        important: false,
        overallProgress: 0,
        learningProgress: 0,
        revisionProgress: 0,
        practiceProgress: 0,
        testProgress: 0,
        position: 0,
        subjectId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
        createdAt: now,
        updatedAt: now,
        topics: [],
        testRecords: [],
        subject: null as never,
      },
      {
        id: "78a0111e-43d0-4464-83c0-a5132c6bd4f7",
        name: "Graphs",
        important: false,
        overallProgress: 0,
        learningProgress: 0,
        revisionProgress: 0,
        practiceProgress: 0,
        testProgress: 0,
        position: 1,
        subjectId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
        createdAt: now,
        updatedAt: now,
        topics: [],
        testRecords: [],
        subject: null as never,
      },
    ],
  }
}

function createRecord(overrides: Partial<NormalizedTestRecord> = {}): NormalizedTestRecord {
  return {
    id: "88a0111e-43d0-4464-83c0-a5132c6bd4f8",
    examId: "98a0111e-43d0-4464-83c0-a5132c6bd4f9",
    subjectId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
    chapterId: "68a0111e-43d0-4464-83c0-a5132c6bd4f6",
    title: "Arrays test",
    marksObtained: 8,
    totalMarks: 10,
    summary: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  }
}

describe("shared TestRecord subject state", () => {
  test("upserts a chapter record at root and matching chapter without mutation", () => {
    const source = createSubject()
    const result = upsertTestRecord(source, createRecord())

    expect(source.testRecords).toEqual([])
    expect(source.chapters[0].testRecords).toEqual([])
    expect(result.testRecords?.map((record) => record.id)).toEqual([createRecord().id])
    expect(result.chapters[0].testRecords?.map((record) => record.id)).toEqual([createRecord().id])
    expect(result.chapters[1]).toBe(source.chapters[1])
  })

  test("subject records remain only at the subject root", () => {
    const result = upsertTestRecord(createSubject(), createRecord({ chapterId: null }))

    expect(result.testRecords).toHaveLength(1)
    expect(result.chapters.every((chapter) => chapter.testRecords?.length === 0)).toBe(true)
  })

  test("updating an existing ID replaces it and moves chapter scope", () => {
    const first = upsertTestRecord(createSubject(), createRecord())
    const moved = upsertTestRecord(first, createRecord({
      chapterId: "78a0111e-43d0-4464-83c0-a5132c6bd4f7",
      marksObtained: 9,
    }))

    expect(moved.testRecords).toHaveLength(1)
    expect(moved.testRecords?.[0].marksObtained).toBe(9)
    expect(moved.chapters[0].testRecords).toHaveLength(0)
    expect(moved.chapters[1].testRecords).toHaveLength(1)
  })

  test("removes root and nested copies", () => {
    const withRecord = upsertTestRecord(createSubject(), createRecord())
    const result = removeTestRecord(withRecord, createRecord().id)

    expect(result.testRecords).toHaveLength(0)
    expect(result.chapters[0].testRecords).toHaveLength(0)
  })

  test("ignores records for another subject", () => {
    const source = createSubject()
    const result = upsertTestRecord(source, createRecord({
      subjectId: "a8a0111e-43d0-4464-83c0-a5132c6bdfa0",
    }))

    expect(result).toBe(source)
  })
})

describe("TestRecord views use canonical shared state", () => {
  test("views do not refetch TestRecords on mount", async () => {
    const chapterView = await readFile("components/tools/exam-prep/subjects/tests/chapter-test-view.tsx", "utf8")
    const subjectView = await readFile("components/tools/exam-prep/subjects/tests/subject-test-view.tsx", "utf8")

    expect(chapterView).not.toContain("getTestRecordsForChapterAction")
    expect(subjectView).not.toContain("getTestRecordsForSubjectAction")
  })

  test("subject target is not expanded by scheduled test count", async () => {
    const subjectView = await readFile("components/tools/exam-prep/subjects/tests/subject-test-view.tsx", "utf8")

    expect(subjectView).not.toContain("Math.max")
    expect(subjectView).not.toContain("scheduledTests.length")
  })
})

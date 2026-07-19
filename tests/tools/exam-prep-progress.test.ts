// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"
import type {
  BaseTopic,
  ChapterWithRelations,
  SubjectWithRelations,
} from "@/types/progressapp/domain"

function topic(overrides: Partial<BaseTopic> & Pick<BaseTopic, "id">): BaseTopic {
  const now = new Date("2026-07-19T00:00:00.000Z")
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    important: overrides.important ?? false,
    learningStatus: overrides.learningStatus ?? false,
    revisionCount: overrides.revisionCount ?? 0,
    practiceCount: overrides.practiceCount ?? 0,
    testCount: overrides.testCount ?? 0,
    position: overrides.position ?? 0,
    lastRevised: overrides.lastRevised ?? null,
    nextRevision: overrides.nextRevision ?? null,
    chapterId: overrides.chapterId ?? "chapter-1",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

function subject(topics: BaseTopic[]): SubjectWithRelations {
  const now = new Date("2026-07-19T00:00:00.000Z")
  const chapter: ChapterWithRelations = {
    id: "chapter-1",
    name: "Chapter 1",
    important: false,
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: 0,
    subjectId: "subject-1",
    createdAt: now,
    updatedAt: now,
    topics,
    subject: null as unknown as SubjectWithRelations,
  }

  return {
    id: "subject-1",
    name: "Subject 1",
    weightage: 10,
    expectedMarks: 0,
    foundationLevel: "Beginner",
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: 0,
    userId: "user-1",
    createdAt: now,
    updatedAt: now,
    chapters: [chapter],
    tests: [],
    mockTests: [],
  }
}

describe("Exam Prep subject progress rollups", () => {
  test("updates subject and chapter learning progress from topic state", () => {
    const result = withCalculatedSubjectProgress(subject([
      topic({ id: "topic-1", learningStatus: true }),
      topic({ id: "topic-2" }),
    ]))

    expect(result.learningProgress).toBe(50)
    expect(result.overallProgress).toBe(12.5)
    expect(result.chapterCount).toBe(1)
    expect(result.topicCount).toBe(2)
    expect(result.chapters[0].learningProgress).toBe(50)
  })

  test("uses three steps normally and five for high-yield topics", () => {
    const result = withCalculatedSubjectProgress(subject([
      topic({
        id: "topic-1",
        learningStatus: true,
        revisionCount: 3,
        practiceCount: 3,
        testCount: 3,
      }),
      topic({
        id: "topic-2",
        important: true,
        learningStatus: true,
        revisionCount: 3,
        practiceCount: 3,
        testCount: 3,
      }),
    ]))

    expect(result.learningProgress).toBe(100)
    expect(result.revisionProgress).toBe(80)
    expect(result.practiceProgress).toBe(80)
    expect(result.testProgress).toBe(0)
    expect(result.overallProgress).toBe(70.6)
  })

  test("uses the subject policy instead of hardcoded revision targets", () => {
    const result = withCalculatedSubjectProgress({
      ...subject([topic({ id: "topic-1", revisionCount: 5 })]),
      progressPolicy: {
        revisionTarget: 10,
        practiceTarget: 3,
        highYieldRevisionTarget: 10,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 1,
        subjectTestTarget: 1,
      },
    })

    expect(result.revisionProgress).toBe(50)
    expect(result.chapters[0].revisionProgress).toBe(50)
  })
})

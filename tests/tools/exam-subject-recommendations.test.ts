// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  generateExamSubjectRecommendations,
  type ExamSubjectRecommendationSource,
} from "@/lib/tools/exam-prep/recommendations"
import type {
  BaseTestRecord,
  BaseTopic,
  ChapterWithRelations,
  SubjectWithRelations,
} from "@/types/progressapp/domain"

const NOW = new Date("2026-07-30T00:00:00.000Z")
const NO_TEST_POLICY = {
  revisionTarget: 3,
  practiceTarget: 3,
  highYieldRevisionTarget: 5,
  highYieldPracticeTarget: 5,
  chapterTestTarget: 0,
  subjectTestTarget: 0,
}
const DEFAULT_TEST_POLICY = {
  ...NO_TEST_POLICY,
  chapterTestTarget: 1,
  subjectTestTarget: 1,
}

function makeTopic(id: string, overrides: Partial<BaseTopic> = {}): BaseTopic {
  return {
    id,
    name: overrides.name ?? `Topic ${id}`,
    important: overrides.important ?? false,
    learningStatus: overrides.learningStatus ?? false,
    revisionCount: overrides.revisionCount ?? 0,
    practiceCount: overrides.practiceCount ?? 0,
    testCount: overrides.testCount ?? 0,
    position: overrides.position ?? 0,
    learningCompletedAt: overrides.learningCompletedAt ?? null,
    lastRevised: overrides.lastRevised ?? null,
    lastPracticed: overrides.lastPracticed ?? null,
    nextRevision: overrides.nextRevision ?? null,
    chapterId: overrides.chapterId ?? "chapter-1",
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
    ...(overrides.targetRevisions === undefined
      ? {}
      : { targetRevisions: overrides.targetRevisions }),
    ...(overrides.targetPractices === undefined
      ? {}
      : { targetPractices: overrides.targetPractices }),
  }
}

function makeTestRecord(
  id: string,
  overrides: Partial<BaseTestRecord> = {}
): BaseTestRecord {
  return {
    id,
    examId: "exam-1",
    subjectId: overrides.subjectId ?? "subject-1",
    chapterId: overrides.chapterId ?? null,
    title: overrides.title ?? `Test ${id}`,
    marksObtained: overrides.marksObtained ?? 80,
    totalMarks: overrides.totalMarks ?? 100,
    summary: overrides.summary ?? null,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  }
}

type SubjectOptions = {
  id?: string
  name?: string
  weightage?: number
  position?: number
  isRequired?: boolean
  topics?: BaseTopic[]
  syllabusEmpty?: boolean
  chapterTestRecords?: BaseTestRecord[]
  subjectTestRecords?: BaseTestRecord[]
  progressPolicy?: SubjectWithRelations["progressPolicy"]
  storedProgress?: Partial<
    Pick<
      SubjectWithRelations,
      | "overallProgress"
      | "learningProgress"
      | "revisionProgress"
      | "practiceProgress"
      | "testProgress"
    >
  >
}

function makeSubject(
  options: SubjectOptions = {}
): ExamSubjectRecommendationSource {
  const id = options.id ?? "subject-1"
  const chapterId = `${id}-chapter`
  const topics = (options.topics ?? [makeTopic(`${id}-topic`)]).map(
    (topic, position) => ({ ...topic, chapterId, position })
  )
  const chapterTestRecords = (options.chapterTestRecords ?? []).map(
    (record) => ({ ...record, subjectId: id, chapterId })
  )
  const subjectTestRecords = (options.subjectTestRecords ?? []).map(
    (record) => ({ ...record, subjectId: id, chapterId: null })
  )

  const chapter = {
    id: chapterId,
    name: `${options.name ?? id} Chapter`,
    important: false,
    overallProgress: 0,
    learningProgress: 0,
    revisionProgress: 0,
    practiceProgress: 0,
    testProgress: 0,
    position: 0,
    subjectId: id,
    createdAt: NOW,
    updatedAt: NOW,
    topics,
    testRecords: chapterTestRecords,
    subject: null,
  } as unknown as ChapterWithRelations

  return {
    id,
    name: options.name ?? id,
    weightage: options.weightage ?? 10,
    expectedMarks: null,
    foundationLevel: "Beginner",
    overallProgress: options.storedProgress?.overallProgress ?? 0,
    learningProgress: options.storedProgress?.learningProgress ?? 0,
    revisionProgress: options.storedProgress?.revisionProgress ?? 0,
    practiceProgress: options.storedProgress?.practiceProgress ?? 0,
    testProgress: options.storedProgress?.testProgress ?? 0,
    position: options.position ?? 0,
    userId: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    chapterCount: options.syllabusEmpty ? 0 : 1,
    topicCount: options.syllabusEmpty ? 0 : topics.length,
    progressPolicy: options.progressPolicy ?? DEFAULT_TEST_POLICY,
    chapters: options.syllabusEmpty ? [] : [chapter],
    tests: [],
    mockTests: [],
    testRecords: [...chapterTestRecords, ...subjectTestRecords],
    isRequired: options.isRequired,
  }
}

function learnedTopic(id: string, overrides: Partial<BaseTopic> = {}) {
  return makeTopic(id, {
    learningStatus: true,
    revisionCount: 3,
    practiceCount: 3,
    ...overrides,
  })
}

function laneIds(
  result: ReturnType<typeof generateExamSubjectRecommendations>,
  lane: "revise" | "priority-focus" | "start-next" | "test-progress"
) {
  return result.groups[lane].map((item) => item.subjectId)
}

describe("exam-level subject recommendations", () => {
  test("classifies all four lanes and assigns each subject only once", () => {
    const result = generateExamSubjectRecommendations({
      now: NOW,
      subjects: [
        makeSubject({
          id: "revise",
          topics: [learnedTopic("revise-topic", { revisionCount: 0 })],
          progressPolicy: NO_TEST_POLICY,
        }),
        makeSubject({
          id: "focus",
          topics: [learnedTopic("done"), makeTopic("unlearned")],
        }),
        makeSubject({ id: "start" }),
        makeSubject({
          id: "test",
          topics: [learnedTopic("test-topic")],
          subjectTestRecords: [makeTestRecord("weak", { marksObtained: 30 })],
        }),
      ],
    })

    expect(laneIds(result, "revise")).toEqual(["revise"])
    expect(laneIds(result, "priority-focus")).toEqual(["focus"])
    expect(laneIds(result, "start-next")).toEqual(["start"])
    expect(laneIds(result, "test-progress")).toEqual(["test"])
    expect(
      new Set(result.recommendations.map((item) => item.subjectId)).size
    ).toBe(result.recommendations.length)
  })

  test("weak latest tests take precedence and lower valid scores rank first", () => {
    const missing = makeSubject({
      id: "missing",
      topics: [learnedTopic("missing-topic", { revisionCount: 0 })],
      progressPolicy: { ...NO_TEST_POLICY, subjectTestTarget: 1 },
    })
    const weak40 = makeSubject({
      id: "weak-40",
      weightage: 20,
      subjectTestRecords: [
        makeTestRecord("weak-40-record", { marksObtained: 40 }),
      ],
    })
    const weak20 = makeSubject({
      id: "weak-20",
      weightage: 5,
      subjectTestRecords: [
        makeTestRecord("weak-20-record", { marksObtained: 20 }),
      ],
    })

    const result = generateExamSubjectRecommendations({
      subjects: [missing, weak40, weak20],
      now: NOW,
    })

    expect(laneIds(result, "test-progress")).toEqual([
      "weak-20",
      "weak-40",
      "missing",
    ])
    expect(result.groups["test-progress"][0]).toMatchObject({
      metricLabel: "Latest test score",
      metricValue: 20,
      stage: "test",
    })
  })

  test("invalid test attempts are ignored and a newer healthy test suppresses an older weak one", () => {
    const subject = makeSubject({
      id: "healthy-latest",
      topics: [learnedTopic("done"), makeTopic("remaining")],
      subjectTestRecords: [
        makeTestRecord("old-weak", {
          marksObtained: 20,
          createdAt: new Date("2026-07-20T00:00:00.000Z"),
        }),
        makeTestRecord("invalid", {
          marksObtained: 90,
          totalMarks: 0,
          createdAt: new Date("2026-07-29T00:00:00.000Z"),
        }),
        makeTestRecord("new-healthy", {
          marksObtained: 80,
          createdAt: new Date("2026-07-28T00:00:00.000Z"),
        }),
      ],
    })

    const result = generateExamSubjectRecommendations({
      subjects: [subject],
      now: NOW,
    })
    expect(result.counts["test-progress"]).toBe(0)
    expect(laneIds(result, "priority-focus")).toEqual(["healthy-latest"])
  })

  test("actionable missing tests outrank revision debt but are not actionable before learning", () => {
    const ready = makeSubject({
      id: "ready-for-test",
      topics: [learnedTopic("ready", { revisionCount: 0 })],
      progressPolicy: { ...NO_TEST_POLICY, chapterTestTarget: 1 },
    })
    const notReady = makeSubject({
      id: "not-ready",
      topics: [makeTopic("not-ready-topic")],
      progressPolicy: { ...NO_TEST_POLICY, chapterTestTarget: 1 },
    })

    const result = generateExamSubjectRecommendations({
      subjects: [ready, notReady],
      now: NOW,
    })
    expect(laneIds(result, "test-progress")).toEqual(["ready-for-test"])
    expect(laneIds(result, "start-next")).toEqual(["not-ready"])
  })

  test("overdue revision outranks threshold-only debt and overdue days break equal-priority ties", () => {
    const thresholdOnly = makeSubject({
      id: "threshold",
      weightage: 50,
      topics: [learnedTopic("threshold-topic", { revisionCount: 0 })],
      progressPolicy: NO_TEST_POLICY,
    })
    const twoDays = makeSubject({
      id: "two-days",
      weightage: 20,
      topics: [
        learnedTopic("two-days-topic", {
          revisionCount: 0,
          nextRevision: new Date("2026-07-28T00:00:00.000Z"),
        }),
      ],
      progressPolicy: NO_TEST_POLICY,
    })
    const tenDays = makeSubject({
      id: "ten-days",
      weightage: 5,
      topics: [
        learnedTopic("ten-days-topic", {
          revisionCount: 0,
          nextRevision: new Date("2026-07-20T00:00:00.000Z"),
        }),
      ],
      progressPolicy: NO_TEST_POLICY,
    })

    const result = generateExamSubjectRecommendations({
      subjects: [thresholdOnly, twoDays, tenDays],
      now: NOW,
    })
    expect(laneIds(result, "revise")).toEqual([
      "ten-days",
      "two-days",
      "threshold",
    ])
  })

  test("uses inclusive 70 learning and exclusive 70 revision thresholds", () => {
    const topicsAtThreshold = Array.from({ length: 10 }, (_, index) =>
      makeTopic(`at-${index}`, {
        learningStatus: index < 7,
        revisionCount: index < 6 ? 3 : 0,
        practiceCount: index < 7 ? 3 : 0,
      })
    )
    const topicsRevision70 = Array.from({ length: 10 }, (_, index) =>
      makeTopic(`revision-70-${index}`, {
        learningStatus: index < 7,
        revisionCount: index < 7 ? 3 : 0,
        practiceCount: index < 7 ? 3 : 0,
      })
    )
    const topicsLearning69 = Array.from({ length: 100 }, (_, index) =>
      makeTopic(`learning-69-${index}`, {
        learningStatus: index < 69,
        revisionCount: 0,
        practiceCount: index < 69 ? 3 : 0,
      })
    )

    const result = generateExamSubjectRecommendations({
      now: NOW,
      subjects: [
        makeSubject({
          id: "at-threshold",
          topics: topicsAtThreshold,
          progressPolicy: NO_TEST_POLICY,
        }),
        makeSubject({
          id: "revision-70",
          topics: topicsRevision70,
          progressPolicy: NO_TEST_POLICY,
        }),
        makeSubject({
          id: "learning-69",
          topics: topicsLearning69,
          progressPolicy: NO_TEST_POLICY,
        }),
      ],
    })

    expect(laneIds(result, "revise")).toEqual(["at-threshold"])
    expect(laneIds(result, "priority-focus").sort()).toEqual([
      "learning-69",
      "revision-70",
    ])
  })

  test("priority focus ranks equal-priority work by exam impact", () => {
    const lowerProgress = makeSubject({
      id: "twelve-marks",
      weightage: 12,
      topics: [
        learnedTopic("a-done"),
        makeTopic("a-2"),
        makeTopic("a-3"),
        makeTopic("a-4"),
      ],
    })
    const higherProgress = makeSubject({
      id: "twenty-marks",
      weightage: 20,
      topics: [
        learnedTopic("b-1"),
        learnedTopic("b-2"),
        learnedTopic("b-3"),
        makeTopic("b-4"),
      ],
    })

    const result = generateExamSubjectRecommendations({
      subjects: [higherProgress, lowerProgress],
      now: NOW,
    })
    expect(laneIds(result, "priority-focus")).toEqual([
      "twelve-marks",
      "twenty-marks",
    ])
  })

  test("start next prefers required, syllabus-ready, higher-weight subjects", () => {
    const result = generateExamSubjectRecommendations({
      now: NOW,
      subjects: [
        makeSubject({ id: "optional", weightage: 30, isRequired: false }),
        makeSubject({ id: "setup", weightage: 40, syllabusEmpty: true }),
        makeSubject({ id: "required-low", weightage: 5 }),
        makeSubject({ id: "required-high", weightage: 10 }),
      ],
    })

    expect(laneIds(result, "start-next")).toEqual([
      "required-high",
      "required-low",
      "setup",
    ])
    expect(result.counts["start-next"]).toBe(4)
  })

  test("represents an empty syllabus as setup work", () => {
    const result = generateExamSubjectRecommendations({
      subjects: [makeSubject({ id: "setup", syllabusEmpty: true })],
      now: NOW,
    })

    expect(result.groups["start-next"][0]).toMatchObject({
      subjectId: "setup",
      actionLabel: "Set up syllabus",
      stage: "setup",
      evidence: "No syllabus topics yet",
    })
  })

  test("uses position, normalized name, and id as stable final tie-breakers", () => {
    const result = generateExamSubjectRecommendations({
      now: NOW,
      subjects: [
        makeSubject({ id: "z-id", name: "Same", position: 2 }),
        makeSubject({ id: "b-id", name: " beta ", position: 1 }),
        makeSubject({ id: "a-id", name: "Alpha", position: 1 }),
        makeSubject({ id: "a2-id", name: "Same", position: 2 }),
      ],
    })

    expect(laneIds(result, "start-next")).toEqual(["a-id", "b-id", "a2-id"])
    expect(result.recommendations.map((item) => item.subjectId)).toEqual([
      "a-id",
      "b-id",
      "a2-id",
      "z-id",
    ])
  })

  test("shuffled input produces byte-for-byte identical output", () => {
    const subjects = [
      makeSubject({ id: "charlie", name: "Charlie", position: 2 }),
      makeSubject({ id: "alpha", name: "Alpha", position: 0 }),
      makeSubject({ id: "bravo", name: "Bravo", position: 1 }),
    ]

    const forward = generateExamSubjectRecommendations({ subjects, now: NOW })
    const reversed = generateExamSubjectRecommendations({
      subjects: [...subjects].reverse(),
      now: NOW,
    })
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed))
  })

  test("shows at most three per lane while preserving total counts", () => {
    const result = generateExamSubjectRecommendations({
      now: NOW,
      subjects: Array.from({ length: 5 }, (_, index) =>
        makeSubject({ id: `subject-${index}`, position: index })
      ),
    })

    expect(result.groups["start-next"]).toHaveLength(3)
    expect(result.counts["start-next"]).toBe(5)
    expect(result.recommendations).toHaveLength(5)
  })

  test("returns empty groups for no subjects and complete state for all-complete subjects", () => {
    const empty = generateExamSubjectRecommendations({ subjects: [], now: NOW })
    expect(empty.recommendations).toEqual([])
    expect(empty.isComplete).toBe(false)

    const completed = makeSubject({
      id: "completed",
      topics: [learnedTopic("complete-topic")],
      progressPolicy: NO_TEST_POLICY,
    })
    const completeResult = generateExamSubjectRecommendations({
      subjects: [completed],
      now: NOW,
    })
    expect(completeResult.recommendations).toEqual([])
    expect(completeResult.isComplete).toBe(true)
  })

  test("normalizes invalid progress and weightage and ignores duplicate subject ids", () => {
    const invalid = makeSubject({
      id: "invalid",
      weightage: Number.NaN,
      syllabusEmpty: true,
      storedProgress: {
        overallProgress: Number.POSITIVE_INFINITY,
        learningProgress: -10,
        revisionProgress: 140,
        practiceProgress: Number.NaN,
        testProgress: -1,
      },
    })
    const duplicate = makeSubject({
      id: "invalid",
      name: "ZZZ duplicate",
      position: 99,
    })

    const result = generateExamSubjectRecommendations({
      subjects: [duplicate, invalid],
      now: NOW,
    })
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0]).toMatchObject({
      subjectId: "invalid",
      weightage: 0,
      overallProgress: 30,
      metricValue: 30,
    })
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  test("does not mutate the input array or subjects", () => {
    const subjects = [
      makeSubject({ id: "second", position: 2 }),
      makeSubject({ id: "first", position: 1 }),
    ]
    const before = JSON.stringify(subjects)

    generateExamSubjectRecommendations({ subjects, now: NOW })

    expect(JSON.stringify(subjects)).toBe(before)
    expect(subjects.map((subject) => subject.id)).toEqual(["second", "first"])
  })
})

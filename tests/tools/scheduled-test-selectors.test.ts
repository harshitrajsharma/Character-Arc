// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  getScheduledTestAgenda,
  getScheduledTestDisplayStatus,
  getScheduledTestsForChapter,
  getSubjectLevelScheduledTests,
  sortScheduledTests,
} from "@/lib/tools/exam-prep/scheduled-test-selectors"
import type { ScheduledTest } from "@/types/progressapp/domain"

const localDate = "2026-08-02"

function createScheduledTest(
  overrides: Partial<ScheduledTest> = {}
): ScheduledTest {
  return {
    id: "scheduled-test",
    examId: "exam",
    subjectId: "subject",
    title: "Scheduled test",
    scope: "subject",
    status: "planned",
    scheduledFor: null,
    durationMinutes: null,
    totalMarks: null,
    notes: null,
    revision: 1,
    rescheduleCount: 0,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    targetChapterIds: [],
    testRecordId: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  }
}

describe("getScheduledTestDisplayStatus", () => {
  test("derives overdue, due-today, upcoming, and planned from date-only strings", () => {
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2026-08-01" }),
        localDate
      )
    ).toBe("overdue")
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2026-08-02" }),
        localDate
      )
    ).toBe("due-today")
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2026-08-03" }),
        localDate
      )
    ).toBe("upcoming")
    expect(
      getScheduledTestDisplayStatus(createScheduledTest(), localDate)
    ).toBe("planned")
  })

  test("completed and cancelled states override their scheduled dates", () => {
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({
          status: "completed",
          scheduledFor: "2026-07-01",
        }),
        localDate
      )
    ).toBe("completed")
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({
          status: "cancelled",
          scheduledFor: "2026-08-02",
        }),
        localDate
      )
    ).toBe("cancelled")
  })

  test("treats malformed or impossible scheduled dates as unscheduled", () => {
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2026-08-02T00:00:00.000Z" }),
        localDate
      )
    ).toBe("planned")
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2026-02-30" }),
        localDate
      )
    ).toBe("planned")
    expect(
      getScheduledTestDisplayStatus(
        createScheduledTest({ scheduledFor: "2028-02-29" }),
        "2028-02-28"
      )
    ).toBe("upcoming")
  })

  test("rejects an invalid caller-provided local date", () => {
    expect(() =>
      getScheduledTestDisplayStatus(createScheduledTest(), "2026-02-30")
    ).toThrow("localDate must be a valid YYYY-MM-DD date")
  })
})

describe("scheduled test placement", () => {
  const chapterTest = createScheduledTest({
    id: "chapter-test",
    scope: "chapter",
    targetChapterIds: ["chapter-a"],
  })
  const multiChapterTest = createScheduledTest({
    id: "multi-test",
    scope: "multi-chapter",
    targetChapterIds: ["chapter-a", "chapter-b"],
  })
  const subjectTest = createScheduledTest({
    id: "subject-test",
    scope: "subject",
  })
  const scheduledTests = [subjectTest, multiChapterTest, chapterTest]

  test("places a multi-chapter test under every targeted chapter", () => {
    expect(
      getScheduledTestsForChapter(scheduledTests, "chapter-a").map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual(["multi-test", "chapter-test"])
    expect(
      getScheduledTestsForChapter(scheduledTests, "chapter-b").map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual(["multi-test"])
    expect(getScheduledTestsForChapter(scheduledTests, "chapter-c")).toEqual([])
  })

  test("places only subject-scoped tests at subject level", () => {
    expect(
      getSubjectLevelScheduledTests(scheduledTests).map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual(["subject-test"])
  })

  test("deduplicates a multi-chapter test into one agenda entry", () => {
    const chapterA = getScheduledTestsForChapter(scheduledTests, "chapter-a")
    const chapterB = getScheduledTestsForChapter(scheduledTests, "chapter-b")
    const agenda = getScheduledTestAgenda([
      ...chapterA,
      ...chapterB,
      subjectTest,
    ])
    const sortedAgenda = sortScheduledTests(agenda, localDate)

    expect(sortedAgenda.map((scheduledTest) => scheduledTest.id)).toEqual([
      "chapter-test",
      "multi-test",
      "subject-test",
    ])
    expect(
      sortedAgenda.filter((scheduledTest) => scheduledTest.id === "multi-test")
    ).toHaveLength(1)
    expect(agenda.map((scheduledTest) => scheduledTest.id)).toEqual([
      "multi-test",
      "chapter-test",
      "subject-test",
    ])
  })
})

describe("sortScheduledTests", () => {
  test("uses display priority, then date, title, and id deterministically", () => {
    const scheduledTests = [
      createScheduledTest({
        id: "cancelled",
        title: "Cancelled",
        status: "cancelled",
      }),
      createScheduledTest({
        id: "completed",
        title: "Completed",
        status: "completed",
      }),
      createScheduledTest({ id: "planned-z", title: "Zulu" }),
      createScheduledTest({ id: "planned-a-2", title: "Alpha" }),
      createScheduledTest({ id: "planned-a-1", title: "Alpha" }),
      createScheduledTest({
        id: "upcoming-later",
        title: "Later",
        scheduledFor: "2026-08-04",
      }),
      createScheduledTest({
        id: "upcoming-sooner",
        title: "Sooner",
        scheduledFor: "2026-08-03",
      }),
      createScheduledTest({
        id: "due",
        title: "Due",
        scheduledFor: "2026-08-02",
      }),
      createScheduledTest({
        id: "overdue-recent",
        title: "Recent",
        scheduledFor: "2026-08-01",
      }),
      createScheduledTest({
        id: "overdue-old",
        title: "Old",
        scheduledFor: "2026-07-30",
      }),
    ]
    const originalOrder = scheduledTests.map(
      (scheduledTest) => scheduledTest.id
    )

    expect(
      sortScheduledTests(scheduledTests, localDate).map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual([
      "overdue-old",
      "overdue-recent",
      "due",
      "upcoming-sooner",
      "upcoming-later",
      "planned-a-1",
      "planned-a-2",
      "planned-z",
      "completed",
      "cancelled",
    ])
    expect(scheduledTests.map((scheduledTest) => scheduledTest.id)).toEqual(
      originalOrder
    )
  })

  test("returns the same order for every permutation of tied inputs", () => {
    const alpha = createScheduledTest({ id: "a", title: "Same" })
    const beta = createScheduledTest({ id: "b", title: "Same" })

    expect(
      sortScheduledTests([beta, alpha], localDate).map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual(["a", "b"])
    expect(
      sortScheduledTests([alpha, beta], localDate).map(
        (scheduledTest) => scheduledTest.id
      )
    ).toEqual(["a", "b"])
  })
})

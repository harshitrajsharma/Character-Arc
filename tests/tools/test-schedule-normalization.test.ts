// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { normalizeUnifiedTestSchedule } from "@/lib/tools/exam-prep/actions/test-schedule-normalization"

describe("Unified Test Schedule Normalization", () => {
  test("legacy chapter entry survives a unified save as chapter-scoped", () => {
    const allTests = [
      { id: "test-1", title: "Legacy Chapter Test", date: "2024-01-01" }, // Missing scope
    ]
    const subjectProps = {}
    const chapters = [
      {
        id: "chap-1",
        properties: {
          scheduledTests: [
            { id: "test-1", title: "Legacy Chapter Test" }, // Exists in chapter storage
          ],
        },
      },
    ]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(0)
    expect(chapterTestsMap.get("chap-1")).toHaveLength(1)
    expect(chapterTestsMap.get("chap-1")![0]).toEqual({
      id: "test-1",
      title: "Legacy Chapter Test",
      date: "2024-01-01",
      scope: "chapter",
      targetChapterIds: ["chap-1"],
    })
  })

  test("subject entry remains subject-scoped", () => {
    const allTests = [
      { id: "test-2", title: "Subject Test", scope: "subject" as const },
    ]
    const subjectProps = {}
    const chapters = [{ id: "chap-1", properties: {} }]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(1)
    expect(subjectTests[0].scope).toBe("subject")
    expect(chapterTestsMap.get("chap-1")).toHaveLength(0)
  })

  test("explicit chapter scope routes only to its selected chapter", () => {
    const allTests = [
      {
        id: "test-3",
        title: "New Chapter Test",
        scope: "chapter" as const,
        targetChapterIds: ["chap-2"],
      },
    ]
    const subjectProps = {}
    const chapters = [
      { id: "chap-1", properties: {} },
      { id: "chap-2", properties: {} },
    ]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(0)
    expect(chapterTestsMap.get("chap-1")).toHaveLength(0)
    expect(chapterTestsMap.get("chap-2")).toHaveLength(1)
    expect(chapterTestsMap.get("chap-2")![0].id).toBe("test-3")
  })

  test("no chapter schedule is erased merely because a legacy item had no scope", () => {
    // A legacy item with no scope is passed in allTests
    // Another legacy item is intentionally left out of allTests (simulating deletion).
    const allTests = [
      { id: "test-legacy", title: "Kept Test" }, // No scope, but kept
    ]
    const subjectProps = {}
    const chapters = [
      {
        id: "chap-1",
        properties: {
          scheduledTests: [
            { id: "test-legacy", title: "Kept Test" },
            { id: "test-deleted", title: "Deleted Test" },
          ],
        },
      },
    ]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(0)
    expect(chapterTestsMap.get("chap-1")).toHaveLength(1)
    expect(chapterTestsMap.get("chap-1")![0].id).toBe("test-legacy")
  })

  test("legacy subject entry lacking scope is routed to subject", () => {
    const allTests = [
      { id: "test-4", title: "Legacy Subject Test" }, // No scope
    ]
    const subjectProps = {
      scheduledTests: [{ id: "test-4", title: "Legacy Subject Test" }],
    }
    const chapters = [{ id: "chap-1", properties: {} }]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(1)
    expect(subjectTests[0].scope).toBe("subject")
    expect(chapterTestsMap.get("chap-1")).toHaveLength(0)
  })

  test("default assignment to subject when scope missing and not in legacy map", () => {
    const allTests = [{ id: "test-new-unscoped", title: "New Unscoped Test" }]
    const subjectProps = {}
    const chapters = [{ id: "chap-1", properties: {} }]

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests.length).toBe(1)
    // When no legacy data is found, it explicitly falls back to "subject" scope.
    expect(subjectTests[0].scope).toBe("subject")
    expect(chapterTestsMap.get("chap-1")).toHaveLength(0)
  })

  test("throws error when chapter-scoped test is missing targetChapterIds", () => {
    const allTests = [
      {
        id: "test-invalid-1",
        title: "Invalid Test",
        scope: "chapter" as const,
      },
    ]
    const subjectProps = {}
    const chapters = [{ id: "chap-1", properties: {} }]

    expect(() =>
      normalizeUnifiedTestSchedule(allTests, subjectProps, chapters)
    ).toThrow(
      "Scheduled test 'Invalid Test' is chapter-scoped but missing targetChapterIds"
    )
  })

  test("throws error when chapter-scoped test targets an unknown chapter", () => {
    const allTests = [
      {
        id: "test-invalid-2",
        title: "Unknown Chapter Test",
        scope: "chapter" as const,
        targetChapterIds: ["chap-99"],
      },
    ]
    const subjectProps = {}
    const chapters = [{ id: "chap-1", properties: {} }]

    expect(() =>
      normalizeUnifiedTestSchedule(allTests, subjectProps, chapters)
    ).toThrow(
      "Scheduled test 'Unknown Chapter Test' targets an unknown chapter: chap-99"
    )
  })

  test("throws error when chapter-scoped test targets more than one chapter", () => {
    const allTests = [
      {
        id: "test-invalid-3",
        title: "Ambiguous Chapter Test",
        scope: "chapter" as const,
        targetChapterIds: ["chap-1", "chap-2"],
      },
    ]
    const subjectProps = {}
    const chapters = [
      { id: "chap-1", properties: {} },
      { id: "chap-2", properties: {} },
    ]

    expect(() =>
      normalizeUnifiedTestSchedule(allTests, subjectProps, chapters)
    ).toThrow(
      "Scheduled test 'Ambiguous Chapter Test' is chapter-scoped but must target exactly one chapter"
    )
  })

  test("subject-scoped tests discard an invalid chapter assignment", () => {
    const allTests = [
      {
        id: "test-subject",
        title: "Full Subject Test",
        scope: "subject" as const,
        targetChapterIds: ["chap-1"],
      },
    ]
    const subjectProps = {}
    const chapters = [{ id: "chap-1", properties: {} }]

    const { subjectTests } = normalizeUnifiedTestSchedule(
      allTests,
      subjectProps,
      chapters
    )

    expect(subjectTests).toEqual([
      {
        id: "test-subject",
        title: "Full Subject Test",
        scope: "subject",
        targetChapterIds: undefined,
      },
    ])
  })
})

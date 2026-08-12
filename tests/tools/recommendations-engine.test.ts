// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  generateRecommendations,
  type RecommendationEngineInput,
} from "@/lib/tools/exam-prep/recommendations"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-07-21T00:00:00.000Z")

function makeTopic(
  overrides: Partial<RecommendationEngineInput["chapters"][0]["topics"][0]> = {}
) {
  return {
    id: overrides.id ?? "topic-1",
    name: overrides.name ?? "Topic A",
    important: overrides.important ?? false,
    learningStatus: overrides.learningStatus ?? false,
    revisionCount: overrides.revisionCount ?? 0,
    practiceCount: overrides.practiceCount ?? 0,
    testCount: overrides.testCount ?? 0,
    lastRevised: overrides.lastRevised ?? null,
    nextRevision: overrides.nextRevision ?? null,
    targetRevisions: overrides.targetRevisions ?? null,
    targetPractices: overrides.targetPractices ?? null,
  }
}

function makeChapter(
  overrides: Partial<RecommendationEngineInput["chapters"][0]> & {
    topics?: ReturnType<typeof makeTopic>[]
  } = {}
) {
  return {
    id: overrides.id ?? "ch-1",
    name: overrides.name ?? "Chapter 1",
    important: overrides.important ?? false,
    topics: overrides.topics ?? [makeTopic()],
    testRecords: overrides.testRecords ?? [],
  }
}

function makeInput(
  overrides: Partial<RecommendationEngineInput> = {}
): RecommendationEngineInput {
  return {
    chapters: overrides.chapters ?? [makeChapter()],
    subjectTestRecords: overrides.subjectTestRecords ?? [],
    policy: overrides.policy ?? null,
    now: overrides.now ?? NOW,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Recommendation engine", () => {
  // -------------------------------------------------------------------
  // Priority ordering
  // -------------------------------------------------------------------

  test("overdue high-yield revision ranks first (priority 1)", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t-hy",
              important: true,
              learningStatus: true,
              nextRevision: new Date("2026-07-18T00:00:00.000Z"), // 3 days overdue
            }),
            makeTopic({
              id: "t-std",
              learningStatus: true,
              nextRevision: new Date("2026-07-19T00:00:00.000Z"), // 2 days overdue
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    expect(result.all.length).toBeGreaterThanOrEqual(2)
    expect(result.all[0].type).toBe("overdue-revision")
    expect(result.all[0].priority).toBe(1) // high-yield gets priority 1
    expect(result.all[0].evidence).toContain("3 day")
  })

  test("unlearned high-yield topic gets priority 2", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({ id: "t-hy", important: true, learningStatus: false }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    expect(result.primary[0].type).toBe("unlearned-high-yield")
    expect(result.primary[0].priority).toBe(2)
    expect(result.primary[0].urgency).toBe("critical")
  })

  test("standard vs high-yield policy targets are respected", () => {
    // Put topics in separate chapters so dedup (one rec per chapter+type)
    // does not collapse them.
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-std",
          name: "Standard Chapter",
          topics: [
            makeTopic({
              id: "t-std",
              learningStatus: true,
              revisionCount: 2,
            }),
          ],
        }),
        makeChapter({
          id: "ch-hy",
          name: "High-Yield Chapter",
          topics: [
            makeTopic({
              id: "t-hy",
              important: true,
              learningStatus: true,
              revisionCount: 2,
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const hyRec = result.all.find(
      (r) => r.chapterId === "ch-hy" && r.type === "revision-gap"
    )
    const stdRec = result.all.find(
      (r) => r.chapterId === "ch-std" && r.type === "revision-gap"
    )

    expect(hyRec).toBeDefined()
    expect(stdRec).toBeDefined()
    expect(hyRec!.evidence).toBe("2/5 revisions")
    expect(stdRec!.evidence).toBe("2/3 revisions")
    // High-yield revision gap (priority 6) ranks before standard (priority 7)
    expect(hyRec!.priority).toBeLessThan(stdRec!.priority)
  })

  test("revision gap is detected for learned topics below target", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 1,
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const revGap = result.all.find((r) => r.type === "revision-gap")
    expect(revGap).toBeDefined()
    expect(revGap!.evidence).toBe("1/3 revisions")
    expect(revGap!.stage).toBe("revision")
  })

  test("practice gap is detected for learned topics below target", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              practiceCount: 0,
              revisionCount: 3, // at target so revision gap won't interfere
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const pracGap = result.all.find((r) => r.type === "practice-gap")
    expect(pracGap).toBeDefined()
    expect(pracGap!.evidence).toBe("0/3 practice")
    expect(pracGap!.stage).toBe("practice")
  })

  // -------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------

  test("no duplicate recommendations per chapter+type", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({ id: "t1", learningStatus: false }),
            makeTopic({ id: "t2", learningStatus: false }),
            makeTopic({ id: "t3", learningStatus: false }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const unlearnedInCh1 = result.all.filter(
      (r) => r.type === "unlearned-topic" && r.chapterId === "ch-1"
    )
    // Only one "unlearned-topic" rec per chapter
    expect(unlearnedInCh1.length).toBe(1)
  })

  // -------------------------------------------------------------------
  // Maximum primary count
  // -------------------------------------------------------------------

  test("returns at most 3 primary recommendations", () => {
    // Create many chapters with diverse issues
    const chapters = Array.from({ length: 10 }, (_, i) =>
      makeChapter({
        id: `ch-${i}`,
        name: `Chapter ${i}`,
        topics: [
          makeTopic({
            id: `t-${i}`,
            learningStatus: false,
            important: i < 3,
          }),
        ],
      })
    )

    const result = generateRecommendations(makeInput({ chapters }))
    expect(result.primary.length).toBe(3)
    expect(result.all.length).toBeGreaterThan(3)
  })

  // -------------------------------------------------------------------
  // Invalid date handling
  // -------------------------------------------------------------------

  test("invalid dates are treated as missing (no crash, no false overdue)", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
              nextRevision: "not-a-date" as unknown as Date,
            }),
          ],
        }),
      ],
    })

    // Should not crash and should not produce an overdue-revision rec
    const result = generateRecommendations(input)
    const overdueRec = result.all.find((r) => r.type === "overdue-revision")
    expect(overdueRec).toBeUndefined()
  })

  test("null nextRevision does not produce overdue recommendation", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
              nextRevision: null,
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const overdueRec = result.all.find((r) => r.type === "overdue-revision")
    expect(overdueRec).toBeUndefined()
  })

  // -------------------------------------------------------------------
  // Missing test target
  // -------------------------------------------------------------------

  test("missing chapter test produces recommendation", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [], // no tests taken
        }),
      ],
      policy: {
        revisionTarget: 3,
        practiceTarget: 3,
        highYieldRevisionTarget: 5,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 1,
        subjectTestTarget: 0,
      },
    })

    const result = generateRecommendations(input)
    const missingTest = result.all.find(
      (r) => r.type === "missing-chapter-test"
    )
    expect(missingTest).toBeDefined()
    expect(missingTest!.evidence).toBe("0/1 chapter test")
  })

  test("missing subject test produces recommendation", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
        }),
      ],
      subjectTestRecords: [],
      policy: {
        revisionTarget: 3,
        practiceTarget: 3,
        highYieldRevisionTarget: 5,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 0,
        subjectTestTarget: 2,
      },
    })

    const result = generateRecommendations(input)
    const missingTest = result.all.find(
      (r) => r.type === "missing-subject-test"
    )
    expect(missingTest).toBeDefined()
    expect(missingTest!.evidence).toBe("0/2 subject tests")
  })

  // -------------------------------------------------------------------
  // Weak test outcome
  // -------------------------------------------------------------------

  test("weak chapter test outcome produces recommendation", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-1",
              marksObtained: 30,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const weakTest = result.all.find((r) => r.type === "weak-test")
    expect(weakTest).toBeDefined()
    expect(weakTest!.priority).toBe(3)
    expect(weakTest!.evidence).toBe("Scored 30%")
    expect(weakTest!.urgency).toBe("warning")
  })

  test("weak subject test outcome produces recommendation", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
        }),
      ],
      subjectTestRecords: [
        {
          id: "str-1",
          marksObtained: 20,
          totalMarks: 100,
          createdAt: new Date("2026-07-20T00:00:00.000Z"),
        },
      ],
    })

    const result = generateRecommendations(input)
    const weakTest = result.all.find(
      (r) => r.type === "weak-test" && !r.chapterId
    )
    expect(weakTest).toBeDefined()
    expect(weakTest!.evidence).toBe("Scored 20%")
  })

  // -------------------------------------------------------------------
  // Completed subject
  // -------------------------------------------------------------------

  test("completed subject produces the completed state", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
              testCount: 3,
            }),
            makeTopic({
              id: "t2",
              important: true,
              learningStatus: true,
              revisionCount: 5,
              practiceCount: 5,
              testCount: 5,
            }),
          ],
          testRecords: [
            { id: "tr-1", marksObtained: 80, totalMarks: 100, createdAt: NOW },
          ],
        }),
      ],
      subjectTestRecords: [
        { id: "str-1", marksObtained: 75, totalMarks: 100, createdAt: NOW },
      ],
      policy: {
        revisionTarget: 3,
        practiceTarget: 3,
        highYieldRevisionTarget: 5,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 1,
        subjectTestTarget: 1,
      },
    })

    const result = generateRecommendations(input)
    expect(result.isCompleted).toBe(true)
    expect(result.all.length).toBe(0)
    expect(result.primary.length).toBe(0)
  })

  // -------------------------------------------------------------------
  // Deterministic results for a fixed "now"
  // -------------------------------------------------------------------

  test("deterministic results for the same inputs and now", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              important: true,
              learningStatus: true,
              revisionCount: 1,
              nextRevision: new Date("2026-07-15T00:00:00.000Z"),
            }),
            makeTopic({ id: "t2", learningStatus: false }),
          ],
        }),
      ],
    })

    const result1 = generateRecommendations(input)
    const result2 = generateRecommendations(input)

    expect(result1.all.length).toBe(result2.all.length)
    for (let i = 0; i < result1.all.length; i++) {
      expect(result1.all[i].id).toBe(result2.all[i].id)
      expect(result1.all[i].priority).toBe(result2.all[i].priority)
      expect(result1.all[i].evidence).toBe(result2.all[i].evidence)
    }
  })

  // -------------------------------------------------------------------
  // Policy with custom targets
  // -------------------------------------------------------------------

  test("uses custom policy targets instead of defaults", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 5,
              practiceCount: 5,
            }),
          ],
        }),
      ],
      policy: {
        revisionTarget: 10,
        practiceTarget: 10,
        highYieldRevisionTarget: 15,
        highYieldPracticeTarget: 15,
        chapterTestTarget: 0,
        subjectTestTarget: 0,
      },
    })

    const result = generateRecommendations(input)
    const revGap = result.all.find((r) => r.type === "revision-gap")
    expect(revGap).toBeDefined()
    expect(revGap!.evidence).toBe("5/10 revisions")

    const pracGap = result.all.find((r) => r.type === "practice-gap")
    expect(pracGap).toBeDefined()
    expect(pracGap!.evidence).toBe("5/10 practice")
  })

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  test("empty chapters produce completed state", () => {
    const result = generateRecommendations(
      makeInput({
        chapters: [],
        subjectTestRecords: [],
        policy: {
          revisionTarget: 3,
          practiceTarget: 3,
          highYieldRevisionTarget: 5,
          highYieldPracticeTarget: 5,
          chapterTestTarget: 0,
          subjectTestTarget: 0,
        },
      })
    )
    expect(result.isCompleted).toBe(true)
  })

  test("chapters with no topics produce completed state", () => {
    const result = generateRecommendations(
      makeInput({
        chapters: [makeChapter({ topics: [] })],
        policy: {
          revisionTarget: 3,
          practiceTarget: 3,
          highYieldRevisionTarget: 5,
          highYieldPracticeTarget: 5,
          chapterTestTarget: 0,
          subjectTestTarget: 0,
        },
      })
    )
    expect(result.isCompleted).toBe(true)
  })

  test("all recommendations have stable IDs", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({ id: "t1", learningStatus: false, important: true }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    for (const rec of result.all) {
      expect(rec.id).toBeTruthy()
      // Subject-level recs (e.g. missing-subject-test) may not have ::
      // but they always contain the type as prefix.
      expect(rec.id).toContain(rec.type)
    }
  })

  test("overdue standard revision gets priority 4", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({
              id: "t-std",
              important: false,
              learningStatus: true,
              nextRevision: new Date("2026-07-19T00:00:00.000Z"),
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const overdueRec = result.all.find((r) => r.type === "overdue-revision")
    expect(overdueRec).toBeDefined()
    expect(overdueRec!.priority).toBe(4)
    expect(overdueRec!.urgency).toBe("warning")
  })

  test("recommendation stage matches expected action", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          topics: [
            makeTopic({ id: "t1", learningStatus: false }),
            makeTopic({
              id: "t2",
              learningStatus: true,
              revisionCount: 0,
              practiceCount: 0,
            }),
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    for (const rec of result.all) {
      if (
        rec.type === "unlearned-topic" ||
        rec.type === "unlearned-high-yield"
      ) {
        expect(rec.stage).toBe("learning")
      }
      if (rec.type === "overdue-revision" || rec.type === "revision-gap") {
        expect(rec.stage).toBe("revision")
      }
      if (rec.type === "practice-gap") {
        expect(rec.stage).toBe("practice")
      }
      if (
        rec.type === "missing-chapter-test" ||
        rec.type === "missing-subject-test" ||
        rec.type === "weak-test"
      ) {
        expect(rec.stage).toBe("test")
      }
    }
  })

  // -------------------------------------------------------------------
  // Regression tests
  // -------------------------------------------------------------------

  test("a later topic with a larger deficit wins deduplication", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t-small-deficit",
              name: "Small Deficit",
              learningStatus: true,
              revisionCount: 2,
            }), // target 3, deficit 1
            makeTopic({
              id: "t-large-deficit",
              name: "Large Deficit",
              learningStatus: true,
              revisionCount: 0,
            }), // target 3, deficit 3
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const revGap = result.all.find(
      (r) => r.type === "revision-gap" && r.chapterId === "ch-1"
    )
    expect(revGap).toBeDefined()
    expect(revGap!.topicId).toBe("t-large-deficit")
    expect(revGap!.subPriority).toBe(3)
  })

  test("input topic order does not change the selected recommendation", () => {
    const input1 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t-large-deficit",
              name: "Large Deficit",
              learningStatus: true,
              revisionCount: 0,
            }),
            makeTopic({
              id: "t-small-deficit",
              name: "Small Deficit",
              learningStatus: true,
              revisionCount: 2,
            }),
          ],
        }),
      ],
    })
    const input2 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t-small-deficit",
              name: "Small Deficit",
              learningStatus: true,
              revisionCount: 2,
            }),
            makeTopic({
              id: "t-large-deficit",
              name: "Large Deficit",
              learningStatus: true,
              revisionCount: 0,
            }),
          ],
        }),
      ],
    })

    const result1 = generateRecommendations(input1)
    const result2 = generateRecommendations(input2)

    const revGap1 = result1.all.find(
      (r) => r.type === "revision-gap" && r.chapterId === "ch-1"
    )
    const revGap2 = result2.all.find(
      (r) => r.type === "revision-gap" && r.chapterId === "ch-1"
    )

    expect(revGap1).toBeDefined()
    expect(revGap2).toBeDefined()
    expect(revGap1!.topicId).toBe("t-large-deficit")
    expect(revGap2!.topicId).toBe("t-large-deficit")
  })

  test("newest healthy test suppresses an older weak attempt", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-old-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-15T00:00:00.000Z"),
            },
            {
              id: "tr-new-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const weakTest = result.all.find(
      (r) => r.type === "weak-test" && r.chapterId === "ch-1"
    )
    expect(weakTest).toBeUndefined()
  })

  test("newest weak test creates a warning", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-old-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-15T00:00:00.000Z"),
            },
            {
              id: "tr-new-weak",
              marksObtained: 30,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const weakTest = result.all.find(
      (r) => r.type === "weak-test" && r.chapterId === "ch-1"
    )
    expect(weakTest).toBeDefined()
    expect(weakTest!.urgency).toBe("warning")
    expect(weakTest!.evidence).toBe("Scored 30%")
  })

  test("invalid newest test falls back to the latest valid attempt", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-valid-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-15T00:00:00.000Z"),
            },
            {
              id: "tr-invalid-new",
              marksObtained: 90,
              totalMarks: 0,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const weakTest = result.all.find(
      (r) => r.type === "weak-test" && r.chapterId === "ch-1"
    )
    expect(weakTest).toBeDefined()
    expect(weakTest!.evidence).toBe("Scored 20%")
  })

  test("chapter and subject test behavior match (newest healthy suppresses older weak)", () => {
    const inputChapter = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-old-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-15T00:00:00.000Z"),
            },
            {
              id: "tr-new-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })
    const inputSubject = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
        }),
      ],
      subjectTestRecords: [
        {
          id: "str-old-weak",
          marksObtained: 20,
          totalMarks: 100,
          createdAt: new Date("2026-07-15T00:00:00.000Z"),
        },
        {
          id: "str-new-healthy",
          marksObtained: 80,
          totalMarks: 100,
          createdAt: new Date("2026-07-20T00:00:00.000Z"),
        },
      ],
    })

    const resultChapter = generateRecommendations(inputChapter)
    const resultSubject = generateRecommendations(inputSubject)

    expect(
      resultChapter.all.find((r) => r.type === "weak-test")
    ).toBeUndefined()
    expect(
      resultSubject.all.find((r) => r.type === "weak-test")
    ).toBeUndefined()
  })

  test("deterministic tie-breaking sorts stably by stable identifiers", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-beta",
          name: "Beta Chapter",
          topics: [makeTopic({ id: "t-beta", learningStatus: false })],
        }),
        makeChapter({
          id: "ch-alpha",
          name: "Alpha Chapter",
          topics: [makeTopic({ id: "t-alpha", learningStatus: false })],
        }),
      ],
    })

    const result = generateRecommendations(input)
    const unlearned = result.all.filter((r) => r.type === "unlearned-topic")
    expect(unlearned.length).toBe(2)
    expect(unlearned[0].chapterId).toBe("ch-alpha")
    expect(unlearned[1].chapterId).toBe("ch-beta")
  })

  test("high-yield behavior matches canonical progress rules with target overrides", () => {
    const input = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t-hy-override",
              important: true,
              learningStatus: true,
              revisionCount: 2,
              targetRevisions: 4,
            }),
          ],
        }),
      ],
      policy: {
        revisionTarget: 3,
        practiceTarget: 3,
        highYieldRevisionTarget: 5,
        highYieldPracticeTarget: 5,
        chapterTestTarget: 0,
        subjectTestTarget: 0,
      },
    })

    const result = generateRecommendations(input)
    const revGap = result.all.find(
      (r) => r.type === "revision-gap" && r.topicId === "t-hy-override"
    )
    expect(revGap).toBeDefined()
    expect(revGap!.evidence).toBe("2/4 revisions")
    expect(revGap!.subPriority).toBe(2)
  })

  test("same-timestamp test determinism is independent of input order", () => {
    const inputA1 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
            {
              id: "tr-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })
    const inputA2 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "tr-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
            {
              id: "tr-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const resultA1 = generateRecommendations(inputA1)
    const resultA2 = generateRecommendations(inputA2)
    expect(resultA1.all.find((r) => r.type === "weak-test")).toBeUndefined()
    expect(resultA2.all.find((r) => r.type === "weak-test")).toBeUndefined()

    const inputB1 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "a-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
            {
              id: "b-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })
    const inputB2 = makeInput({
      chapters: [
        makeChapter({
          id: "ch-1",
          topics: [
            makeTopic({
              id: "t1",
              learningStatus: true,
              revisionCount: 3,
              practiceCount: 3,
            }),
          ],
          testRecords: [
            {
              id: "b-healthy",
              marksObtained: 80,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
            {
              id: "a-weak",
              marksObtained: 20,
              totalMarks: 100,
              createdAt: new Date("2026-07-20T00:00:00.000Z"),
            },
          ],
        }),
      ],
    })

    const resultB1 = generateRecommendations(inputB1)
    const resultB2 = generateRecommendations(inputB2)
    const recB1 = resultB1.all.find((r) => r.type === "weak-test")
    const recB2 = resultB2.all.find((r) => r.type === "weak-test")
    expect(recB1).toBeDefined()
    expect(recB2).toBeDefined()
    expect(recB1!.evidence).toBe("Scored 20%")
    expect(recB2!.evidence).toBe("Scored 20%")
  })
})

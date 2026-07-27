// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test";
import { generateStudyPath, subjectToStudyPathInput } from "@/lib/tools/exam-prep/study-path";
import type { StudyPathEngineInput } from "@/lib/tools/exam-prep/study-path/types";
import { DEFAULT_SUBJECT_PROGRESS_POLICY } from "@/lib/tools/exam-prep/progress/policy";
import type { SubjectWithRelations } from "@/types/progressapp/domain/curriculum";

const NOW = new Date("2026-07-21T00:00:00.000Z");

function makeInput(overrides: Partial<StudyPathEngineInput> = {}): StudyPathEngineInput {
  return {
    chapters: overrides.chapters ?? [],
    subjectTestRecords: overrides.subjectTestRecords ?? [],
    policy: overrides.policy !== undefined ? overrides.policy : DEFAULT_SUBJECT_PROGRESS_POLICY,
    now: overrides.now ?? NOW,
  };
}

describe("Study Path Engine", () => {
  test("learning order locks subsequent topics and has correct dependency IDs", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, nextRevision: null },
            { id: "t2", name: "Topic 2", position: 2, important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, nextRevision: null },
            { id: "t3", name: "Topic 3", position: 3, important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, nextRevision: null },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const learnT1 = result.allSteps.find(s => s.id === "learn::ch-1::t1")!;
    const learnT2 = result.allSteps.find(s => s.id === "learn::ch-1::t2")!;
    const learnT3 = result.allSteps.find(s => s.id === "learn::ch-1::t3")!;
    
    expect(learnT1.status).toBe("ready");
    expect(learnT1.dependencyIds).toEqual([]);
    
    expect(learnT2.status).toBe("locked");
    expect(learnT2.dependencyIds).toEqual(["learn::ch-1::t1"]);
    
    expect(learnT3.status).toBe("locked");
    expect(learnT3.dependencyIds).toEqual(["learn::ch-1::t2"]);
  });

  test("missing/null policy normalization", () => {
    const input = makeInput({
      policy: null,
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 0, practiceCount: 0, nextRevision: null },
          ]
        }
      ]
    });
    // Should not crash, should use defaults (revisionTarget: 3)
    const result = generateStudyPath(input);
    const revise = result.allSteps.find(s => s.kind === "revise")!;
    expect(revise.evidence).toBe("0/3 revisions");
  });

  test("subject adapter mapping and deduplication", () => {
    const subject: SubjectWithRelations = {
      id: "subj-1",
      name: "Subject 1",
      weightage: 100,
      expectedMarks: null,
      foundationLevel: "intermediate",
      overallProgress: 0,
      learningProgress: 0,
      revisionProgress: 0,
      practiceProgress: 0,
      testProgress: 0,
      position: 1,
      userId: "user-1",
      createdAt: NOW,
      updatedAt: NOW,
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          important: false,
          overallProgress: 0,
          learningProgress: 0,
          revisionProgress: 0,
          practiceProgress: 0,
          testProgress: 0,
          position: 1,
          subjectId: "subj-1",
          createdAt: NOW,
          updatedAt: NOW,
          topics: [
            { id: "t1", name: "Topic 1", important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, testCount: 0, position: 1, lastRevised: null, nextRevision: null, chapterId: "ch-1", createdAt: NOW, updatedAt: NOW }
          ]
        }
      ],
      tests: [],
      mockTests: [],
      testRecords: [
        { id: "tr-1", chapterId: "ch-1", marksObtained: 80, totalMarks: 100, createdAt: NOW, testId: "test-1", durationSeconds: null, score: 80, isCompleted: true, subjectId: "subj-1" },
        { id: "tr-1", chapterId: "ch-1", marksObtained: 80, totalMarks: 100, createdAt: NOW, testId: "test-1", durationSeconds: null, score: 80, isCompleted: true, subjectId: "subj-1" }, // duplicate
        { id: "str-1", chapterId: null, marksObtained: 90, totalMarks: 100, createdAt: NOW, testId: "test-2", durationSeconds: null, score: 90, isCompleted: true, subjectId: "subj-1" },
      ]
    } as unknown as SubjectWithRelations;

    const input = subjectToStudyPathInput(subject, NOW);
    expect(input.chapters[0].testRecords.length).toBe(1);
    expect(input.chapters[0].testRecords[0].id).toBe("tr-1");
    expect(input.subjectTestRecords.length).toBe(1);
    expect(input.subjectTestRecords[0].id).toBe("str-1");
  });

  test("invalid createdAt values", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [
            { id: "tr1", marksObtained: 20, totalMarks: 100, createdAt: "not-a-date" },
            { id: "tr2", marksObtained: 80, totalMarks: 100, createdAt: new Date("2026-07-20T00:00:00.000Z") },
          ],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 3, practiceCount: 3, nextRevision: null, targetRevisions: 3, targetPractices: 3 },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const remediation = result.allSteps.find(s => s.kind === "remediation");
    // tr1 should be ignored due to invalid date, tr2 is 80% so no remediation
    expect(remediation).toBeUndefined();
  });

  test("chapter test depending on revision and practice", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 0, practiceCount: 0, nextRevision: null, targetRevisions: 3, targetPractices: 3 },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const chapterTest = result.allSteps.find(s => s.kind === "chapter-test")!;
    expect(chapterTest.status).toBe("locked");
    expect(chapterTest.dependencyIds).toContain("revise::ch-1::t1");
    expect(chapterTest.dependencyIds).toContain("practice::ch-1::t1");
    expect(chapterTest.dependencyIds).not.toContain("learn::ch-1::t1"); // because it's completed
  });

  test("subject test dependency IDs", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [], // missing chapter test
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 3, practiceCount: 3, nextRevision: null, targetRevisions: 3, targetPractices: 3 },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const subjectTest = result.allSteps.find(s => s.kind === "subject-test")!;
    expect(subjectTest.status).toBe("locked");
    expect(subjectTest.dependencyIds).toEqual(["chapter-test::ch-1"]);
  });

  test("actual overachievement evidence", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 5, practiceCount: 3, nextRevision: null, targetRevisions: 3, targetPractices: 3 },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const revise = result.allSteps.find(s => s.kind === "revise")!;
    expect(revise.status).toBe("overachieved");
    expect(revise.evidence).toBe("5/3 revisions");
  });

  test("zero-target 'Not required' evidence", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 0, practiceCount: 0, nextRevision: null, targetRevisions: 0, targetPractices: 0 },
          ]
        }
      ],
      policy: {
        ...DEFAULT_SUBJECT_PROGRESS_POLICY,
        chapterTestTarget: 0,
        subjectTestTarget: 0,
      }
    });
    const result = generateStudyPath(input);
    const revise = result.allSteps.find(s => s.kind === "revise")!;
    const chapterTest = result.allSteps.find(s => s.kind === "chapter-test")!;
    
    expect(revise.evidence).toBe("Not required");
    expect(revise.status).toBe("completed");
    
    expect(chapterTest.evidence).toBe("Not required");
    expect(chapterTest.status).toBe("completed");
    expect(chapterTest.reason).toBe("Excluded from requirements");
  });

  test("high-yield ready work not becoming due", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: true, learningStatus: true, revisionCount: 0, practiceCount: 0, nextRevision: null },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const revise = result.allSteps.find(s => s.kind === "revise")!;
    expect(revise.status).toBe("ready");
    expect(revise.urgencyScore).toBe(75); // 70 + 5
  });

  test("deterministic behavior with shuffled inputs", () => {
    const chapter1 = {
      id: "ch-1", name: "Ch 1", position: 1, important: false, testRecords: [],
      topics: [
        { id: "t1", name: "T1", position: 1, important: false, learningStatus: true, revisionCount: 0, practiceCount: 0, nextRevision: null },
      ]
    };
    const chapter2 = {
      id: "ch-2", name: "Ch 2", position: 2, important: false, testRecords: [],
      topics: [
        { id: "t2", name: "T2", position: 1, important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, nextRevision: null },
      ]
    };
    
    const input1 = makeInput({ chapters: [chapter1, chapter2] });
    const input2 = makeInput({ chapters: [chapter2, chapter1] }); // Shuffled
    
    const result1 = generateStudyPath(input1);
    const result2 = generateStudyPath(input2);
    
    expect(result1.nextSteps.map(s => s.id)).toEqual(result2.nextSteps.map(s => s.id));
  });

  test("completed and overachieved steps must not appear in actionableSteps", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: true, revisionCount: 5, practiceCount: 5, nextRevision: null, targetRevisions: 3, targetPractices: 3 },
          ]
        }
      ]
    });
    const result = generateStudyPath(input);
    const actionable = result.actionableSteps;
    expect(actionable.find(s => s.kind === "learn")).toBeUndefined();
    expect(actionable.find(s => s.kind === "revise")).toBeUndefined();
    expect(actionable.find(s => s.kind === "practice")).toBeUndefined();
  });

  test("chapterTestTarget 0 plus unfinished topic work keeps subject test locked and lists unfinished topic step IDs", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            { id: "t1", name: "Topic 1", position: 1, important: false, learningStatus: false, revisionCount: 0, practiceCount: 0, nextRevision: null },
          ]
        }
      ],
      policy: {
        ...DEFAULT_SUBJECT_PROGRESS_POLICY,
        chapterTestTarget: 0, // Disabled
        subjectTestTarget: 1,
      }
    });
    const result = generateStudyPath(input);
    const subjectTest = result.allSteps.find(s => s.kind === "subject-test")!;
    const learnStep = result.allSteps.find(s => s.kind === "learn")!;
    const reviseStep = result.allSteps.find(s => s.kind === "revise")!;
    const practiceStep = result.allSteps.find(s => s.kind === "practice")!;

    expect(subjectTest.status).toBe("locked");
    // Ensure the dependencies include the unfinished topics, but NOT the completed chapter test
    expect(subjectTest.dependencyIds).toContain(learnStep.id);
    expect(subjectTest.dependencyIds).toContain(reviseStep.id);
    expect(subjectTest.dependencyIds).toContain(practiceStep.id);
    expect(subjectTest.dependencyIds).not.toContain("chapter-test::ch-1");
  });

  test("chapter-only TestRecords are preserved by subjectToStudyPathInput and duplicates are included only once", () => {
    const subject: SubjectWithRelations = {
      id: "subj-1",
      name: "Subject 1",
      weightage: 100,
      expectedMarks: null,
      foundationLevel: "intermediate",
      overallProgress: 0,
      learningProgress: 0,
      revisionProgress: 0,
      practiceProgress: 0,
      testProgress: 0,
      position: 1,
      userId: "user-1",
      createdAt: NOW,
      updatedAt: NOW,
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          important: false,
          overallProgress: 0,
          learningProgress: 0,
          revisionProgress: 0,
          practiceProgress: 0,
          testProgress: 0,
          position: 1,
          subjectId: "subj-1",
          createdAt: NOW,
          updatedAt: NOW,
          topics: [],
          testRecords: [
            { id: "tr-1", chapterId: "ch-1", marksObtained: 80, totalMarks: 100, createdAt: NOW, testId: "test-1", durationSeconds: null, score: 80, isCompleted: true, subjectId: "subj-1" },
            { id: "tr-2", chapterId: "ch-1", marksObtained: 90, totalMarks: 100, createdAt: NOW, testId: "test-1", durationSeconds: null, score: 90, isCompleted: true, subjectId: "subj-1" },
          ]
        }
      ],
      tests: [],
      mockTests: [],
      testRecords: [
        { id: "tr-1", chapterId: "ch-1", marksObtained: 80, totalMarks: 100, createdAt: NOW, testId: "test-1", durationSeconds: null, score: 80, isCompleted: true, subjectId: "subj-1" }, // Duplicate with chapter
        { id: "str-1", chapterId: null, marksObtained: 90, totalMarks: 100, createdAt: NOW, testId: "test-2", durationSeconds: null, score: 90, isCompleted: true, subjectId: "subj-1" },
      ]
    } as unknown as SubjectWithRelations;

    const input = subjectToStudyPathInput(subject, NOW);
    expect(input.chapters[0].testRecords.length).toBe(2);
    // tr-1 and tr-2 must be preserved on the chapter
    expect(input.chapters[0].testRecords.map(r => r.id).sort()).toEqual(["tr-1", "tr-2"]);
    
    expect(input.subjectTestRecords.length).toBe(1);
    expect(input.subjectTestRecords[0].id).toBe("str-1");
  });

  test("completed steps expose trustworthy completion evidence dates", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [
            {
              id: "chapter-test-1",
              chapterId: "ch-1",
              marksObtained: 8,
              totalMarks: 10,
              createdAt: "2026-07-19T10:00:00.000Z",
            },
          ],
          topics: [
            {
              id: "topic-1",
              name: "Topic 1",
              position: 1,
              important: false,
              learningStatus: true,
              revisionCount: 1,
              practiceCount: 1,
              nextRevision: null,
              learningCompletedAt: "2026-07-16T10:00:00.000Z",
              lastRevised: "2026-07-17T10:00:00.000Z",
              lastPracticed: "2026-07-18T10:00:00.000Z",
            },
          ],
        },
      ],
      subjectTestRecords: [
        {
          id: "subject-test-1",
          chapterId: null,
          marksObtained: 9,
          totalMarks: 10,
          createdAt: "2026-07-20T10:00:00.000Z",
        },
      ],
      policy: {
        ...DEFAULT_SUBJECT_PROGRESS_POLICY,
        revisionTarget: 1,
        practiceTarget: 1,
        chapterTestTarget: 1,
        subjectTestTarget: 1,
      },
    });

    const result = generateStudyPath(input);
    expect(result.allSteps.find((step) => step.kind === "learn")?.completedAt).toBe("2026-07-16T10:00:00.000Z");
    expect(result.allSteps.find((step) => step.kind === "revise")?.completedAt).toBe("2026-07-17T10:00:00.000Z");
    expect(result.allSteps.find((step) => step.kind === "practice")?.completedAt).toBe("2026-07-18T10:00:00.000Z");
    expect(result.allSteps.find((step) => step.kind === "chapter-test")?.completedAt).toBe("2026-07-19T10:00:00.000Z");
    expect(result.allSteps.find((step) => step.kind === "subject-test")?.completedAt).toBe("2026-07-20T10:00:00.000Z");
  });

  test("legacy completed topic steps keep completion dates unavailable", () => {
    const input = makeInput({
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            {
              id: "topic-1",
              name: "Topic 1",
              position: 1,
              important: false,
              learningStatus: true,
              revisionCount: 1,
              practiceCount: 1,
              nextRevision: null,
            },
          ],
        },
      ],
      policy: {
        ...DEFAULT_SUBJECT_PROGRESS_POLICY,
        revisionTarget: 1,
        practiceTarget: 1,
        chapterTestTarget: 0,
        subjectTestTarget: 0,
      },
    });

    const result = generateStudyPath(input);
    expect(result.allSteps.find((step) => step.kind === "learn")?.completedAt).toBeNull();
    expect(result.allSteps.find((step) => step.kind === "revise")?.completedAt).toBeNull();
    expect(result.allSteps.find((step) => step.kind === "practice")?.completedAt).toBeNull();
  });
});

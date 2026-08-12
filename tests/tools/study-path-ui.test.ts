// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import {
  getActionLabelForStep,
  getNavigationTargetForStep,
  isPendingStudyPathStep,
} from "@/components/tools/exam-prep/subjects/recommendations/types"
import { applyTopicProgress } from "@/components/tools/exam-prep/subjects/syllabus/syllabus-model"
import { generateStudyPath } from "@/lib/tools/exam-prep/study-path"
import type {
  StudyPathStep,
  StudyPathEngineInput,
} from "@/lib/tools/exam-prep/study-path/types"
import { DEFAULT_SUBJECT_PROGRESS_POLICY } from "@/lib/tools/exam-prep/progress/policy"

const NOW = new Date("2026-07-23T00:00:00.000Z")

describe("Study Path UI Integration & Helpers", () => {
  test("optimistic topic progress records completion evidence dates", () => {
    const topic = {
      id: "topic-1",
      name: "Topic 1",
      important: false,
      learningStatus: false,
      revisionCount: 0,
      practiceCount: 0,
      testCount: 0,
      position: 0,
      lastRevised: null,
      nextRevision: null,
      chapterId: "chapter-1",
      createdAt: NOW,
      updatedAt: NOW,
    }

    expect(
      applyTopicProgress(topic, "learning", true, NOW).learningCompletedAt
    ).toEqual(NOW)
    expect(applyTopicProgress(topic, "revision", 1, NOW).lastRevised).toEqual(
      NOW
    )
    expect(applyTopicProgress(topic, "practice", 1, NOW).lastPracticed).toEqual(
      NOW
    )
  })

  test("getActionLabelForStep returns required action labels", () => {
    expect(getActionLabelForStep("learn")).toBe("Learn topic")
    expect(getActionLabelForStep("revise")).toBe("Start revision")
    expect(getActionLabelForStep("practice")).toBe("Start practice")
    expect(getActionLabelForStep("chapter-test")).toBe("Open chapter test")
    expect(getActionLabelForStep("subject-test")).toBe("Open subject test")
    expect(getActionLabelForStep("remediation")).toBe("Review test")
  })

  test("getNavigationTargetForStep maps steps correctly to SyllabusStage and NavigationTarget", () => {
    const learnStep: StudyPathStep = {
      id: "learn::ch-1::t1",
      kind: "learn",
      status: "ready",
      stage: "learning",
      title: "Learn Topic 1",
      reason: "Curriculum requirement",
      evidence: "Not learned",
      chapterId: "ch-1",
      chapterName: "Chapter 1",
      topicId: "t1",
      topicName: "Topic 1",
      isHighYield: true,
      order: 1,
      dependencyIds: [],
      urgencyScore: 85,
    }

    const navLearn = getNavigationTargetForStep(learnStep)
    expect(navLearn.stage).toBe("learning")
    expect(navLearn.chapterId).toBe("ch-1")
    expect(navLearn.topicId).toBe("t1")
    expect(navLearn.type).toBe("learn")
    expect(navLearn.timestamp).toBeGreaterThan(0)

    const chapterTestStep: StudyPathStep = {
      id: "chapter-test::ch-1",
      kind: "chapter-test",
      status: "ready",
      stage: "test",
      title: "Take Chapter 1 Test",
      reason: "Missing chapter test",
      evidence: "0/1 chapter test",
      chapterId: "ch-1",
      chapterName: "Chapter 1",
      isHighYield: false,
      order: 4,
      dependencyIds: [],
      urgencyScore: 60,
    }

    const navChapterTest = getNavigationTargetForStep(chapterTestStep)
    expect(navChapterTest.stage).toBe("test")
    expect(navChapterTest.chapterId).toBe("ch-1")
    expect(navChapterTest.topicId).toBeUndefined()
    expect(navChapterTest.type).toBe("chapter-test")

    const subjectTestStep: StudyPathStep = {
      id: "subject-test",
      kind: "subject-test",
      status: "ready",
      stage: "test",
      title: "Take Subject Test",
      reason: "Missing subject test",
      evidence: "0/1 subject test",
      isHighYield: false,
      order: 5,
      dependencyIds: [],
      urgencyScore: 50,
    }

    const navSubjectTest = getNavigationTargetForStep(subjectTestStep)
    expect(navSubjectTest.stage).toBe("test")
    expect(navSubjectTest.chapterId).toBeUndefined()
    expect(navSubjectTest.topicId).toBeUndefined()
    expect(navSubjectTest.type).toBe("subject-test")
  })

  test("Study Path summary calculation excludes 'Not required' steps", () => {
    const input: StudyPathEngineInput = {
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            {
              id: "t1",
              name: "Topic 1",
              position: 1,
              important: false,
              learningStatus: true,
              revisionCount: 0,
              practiceCount: 0,
              nextRevision: null,
              targetRevisions: 0, // Excluded from requirements
              targetPractices: 0, // Excluded from requirements
            },
          ],
        },
      ],
      subjectTestRecords: [],
      policy: {
        ...DEFAULT_SUBJECT_PROGRESS_POLICY,
        chapterTestTarget: 0, // Excluded
        subjectTestTarget: 0, // Excluded
      },
      now: NOW,
    }

    const output = generateStudyPath(input)
    const requiredSteps = output.allSteps.filter(
      (s) => s.evidence !== "Not required"
    )
    const notRequiredSteps = output.allSteps.filter(
      (s) => s.evidence === "Not required"
    )

    // Learn step is required; revise, practice, chapter-test, subject-test are "Not required"
    expect(notRequiredSteps.length).toBe(4)
    expect(requiredSteps.length).toBe(1)
    expect(requiredSteps[0].kind).toBe("learn")
  })

  test("Up Next contains maximum 3 actionable steps", () => {
    const input: StudyPathEngineInput = {
      chapters: [
        {
          id: "ch-1",
          name: "Chapter 1",
          position: 1,
          important: false,
          testRecords: [],
          topics: [
            {
              id: "t1",
              name: "Topic 1",
              position: 1,
              important: true,
              learningStatus: false,
              revisionCount: 0,
              practiceCount: 0,
              nextRevision: null,
            },
            {
              id: "t2",
              name: "Topic 2",
              position: 2,
              important: false,
              learningStatus: false,
              revisionCount: 0,
              practiceCount: 0,
              nextRevision: null,
            },
            {
              id: "t3",
              name: "Topic 3",
              position: 3,
              important: false,
              learningStatus: false,
              revisionCount: 0,
              practiceCount: 0,
              nextRevision: null,
            },
          ],
        },
      ],
      subjectTestRecords: [],
      policy: DEFAULT_SUBJECT_PROGRESS_POLICY,
      now: NOW,
    }

    const output = generateStudyPath(input)
    expect(output.nextSteps.length).toBeLessThanOrEqual(3)
  })

  test("the visible study path excludes completed work", () => {
    const step: StudyPathStep = {
      id: "learn::ch-1::t1",
      kind: "learn",
      status: "ready",
      stage: "learning",
      title: "Learn Topic 1",
      reason: "Curriculum requirement",
      evidence: "Not learned",
      chapterId: "ch-1",
      chapterName: "Chapter 1",
      topicId: "t1",
      topicName: "Topic 1",
      isHighYield: false,
      order: 1,
      dependencyIds: [],
      urgencyScore: 85,
    }

    expect(isPendingStudyPathStep(step)).toBe(true)
    expect(isPendingStudyPathStep({ ...step, status: "locked" })).toBe(true)
    expect(isPendingStudyPathStep({ ...step, status: "completed" })).toBe(false)
    expect(isPendingStudyPathStep({ ...step, status: "overachieved" })).toBe(
      false
    )
  })
})

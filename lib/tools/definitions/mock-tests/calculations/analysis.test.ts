// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, it } from "bun:test"
import {
  buildAnalysis,
  buildRecommendation,
  buildSectionBreakdown,
  type AnalysisQuestionRow,
} from "./analysis"

function row(overrides: Partial<AnalysisQuestionRow>): AnalysisQuestionRow {
  return {
    questionId: "q1",
    position: 0,
    section: null,
    kind: "SINGLE_CHOICE",
    stem: "Q",
    difficulty: null,
    marks: 3,
    negativeMarks: -1,
    options: [],
    selectedKeys: [],
    answerText: null,
    timeSpentSeconds: null,
    isCorrect: null,
    awardedMarks: 0,
    correctKeys: [],
    explanation: null,
    ...overrides,
  }
}

describe("buildSectionBreakdown", () => {
  it("groups a section and computes counts and accuracy", () => {
    const breakdown = buildSectionBreakdown([
      row({ questionId: "a", isCorrect: true, awardedMarks: 3 }),
      row({ questionId: "b", isCorrect: false, awardedMarks: -1 }),
      row({ questionId: "c", isCorrect: null, awardedMarks: 0 }),
    ])
    expect(breakdown.section).toBe("__all__")
    expect(breakdown.questionCount).toBe(3)
    expect(breakdown.correctCount).toBe(1)
    expect(breakdown.incorrectCount).toBe(1)
    expect(breakdown.unansweredCount).toBe(1)
    expect(breakdown.score).toBe(2)
    expect(breakdown.maxScore).toBe(9)
    expect(breakdown.accuracy).toBe(50)
  })

  it("returns null accuracy when nothing is answered", () => {
    const breakdown = buildSectionBreakdown([
      row({ questionId: "a", isCorrect: null, awardedMarks: 0 }),
    ])
    expect(breakdown.accuracy).toBeNull()
  })
})

describe("buildRecommendation", () => {
  it("suggests revising weak topics below 50% accuracy", () => {
    const recommendation = buildRecommendation({
      accuracy: 30,
      correctCount: 1,
      incorrectCount: 2,
      unansweredCount: 0,
      questionCount: 3,
      weakTopicCount: 2,
    })
    expect(recommendation).toContain("weak topic")
  })

  it("coaches pacing when accuracy is high but many skipped", () => {
    const recommendation = buildRecommendation({
      accuracy: 90,
      correctCount: 4,
      incorrectCount: 1,
      unansweredCount: 5,
      questionCount: 10,
      weakTopicCount: 0,
    })
    expect(recommendation).toContain("pacing")
  })

  it("celebrates a strong result", () => {
    const recommendation = buildRecommendation({
      accuracy: 100,
      correctCount: 5,
      incorrectCount: 0,
      unansweredCount: 0,
      questionCount: 5,
      weakTopicCount: 0,
    })
    expect(recommendation).toContain("Great result")
  })
})

describe("buildAnalysis", () => {
  it("builds a full doc with totals, accuracy and recommendation", () => {
    const doc = buildAnalysis({
      attemptId: "attempt-1",
      assessmentId: "assessment-1",
      assessmentTitle: "Mock",
      status: "EVALUATED",
      startedAt: "2026-01-01T00:00:00Z",
      submittedAt: "2026-01-01T01:00:00Z",
      durationMinutes: 60,
      questions: [
        row({ questionId: "a", position: 0, isCorrect: true, awardedMarks: 3, marks: 3 }),
        row({ questionId: "b", position: 1, isCorrect: false, awardedMarks: -1, marks: 3 }),
      ],
      weakTopics: [{ blockId: "block-1", proficiency: 20, confidence: 50, evidenceCount: 1 }],
    })

    expect(doc.score).toBe(2)
    expect(doc.maxScore).toBe(6)
    expect(doc.percentage).toBe(Math.round((2 / 6) * 10000) / 100)
    expect(doc.correctCount).toBe(1)
    expect(doc.incorrectCount).toBe(1)
    expect(doc.unansweredCount).toBe(0)
    expect(doc.accuracy).toBe(50)
    expect(doc.weakTopics).toHaveLength(1)
    expect(doc.recommendation.length).toBeGreaterThan(0)
  })

  it("groups questions into sections in document order", () => {
    const doc = buildAnalysis({
      attemptId: "attempt-1",
      assessmentId: "assessment-1",
      assessmentTitle: "Mock",
      status: "EVALUATED",
      startedAt: "2026-01-01T00:00:00Z",
      submittedAt: null,
      durationMinutes: null,
      questions: [
        row({ questionId: "a", section: "A", position: 0, isCorrect: true, awardedMarks: 3 }),
        row({ questionId: "b", section: "B", position: 1, isCorrect: false, awardedMarks: -1 }),
      ],
      weakTopics: [],
    })

    expect(doc.sections.map((section) => section.section)).toEqual(["A", "B"])
    expect(doc.sections[0].correctCount).toBe(1)
    expect(doc.sections[1].incorrectCount).toBe(1)
    expect(doc.passingBenchmark).toBe(33)
    expect(doc.distinctionBenchmark).toBe(70)
  })

  it("preserves custom benchmarks when provided", () => {
    const doc = buildAnalysis({
      attemptId: "attempt-1",
      assessmentId: "assessment-1",
      assessmentTitle: "GATE CS Mock",
      status: "EVALUATED",
      startedAt: "2026-01-01T00:00:00Z",
      submittedAt: "2026-01-01T01:00:00Z",
      durationMinutes: 180,
      questions: [
        row({ questionId: "a", isCorrect: true, awardedMarks: 25, marks: 100 }),
      ],
      weakTopics: [],
      passingBenchmark: 25,
      distinctionBenchmark: 65,
    })

    expect(doc.passingBenchmark).toBe(25)
    expect(doc.distinctionBenchmark).toBe(65)
  })
})

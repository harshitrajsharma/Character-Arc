/**
 * Deterministic analysis document builder for mock-test attempts.
 *
 * Pure and I/O-free so the recommendations and breakdowns can be unit-tested.
 * The handler/repository supply stored per-question verdicts and this module
 * recomputes totals, section breakdowns, accuracy, and a next-step
 * recommendation. No AI is ever involved — students get instant, explainable
 * feedback for free.
 */

import {
  aggregateAttempt,
  type QuestionKind,
  type ScoredResponse,
} from "./scoring"

export type AnalysisQuestionRow = {
  questionId: string
  position: number
  section: string | null
  kind: QuestionKind
  stem: string
  difficulty: number | null
  marks: number
  negativeMarks: number
  options: Array<{ key: string; content: string }>
  selectedKeys: string[]
  answerText: string | null
  timeSpentSeconds: number | null
  isCorrect: boolean | null
  awardedMarks: number
  correctKeys: string[]
  explanation: string | null
  numericAnswer?: number | null
  modelAnswer?: string | null
}

export type WeakTopicItem = {
  blockId: string
  proficiency: number
  confidence: number
  evidenceCount: number
  title?: string | null
  blockTypeKey?: string | null
}

export type SectionBreakdown = {
  section: string
  questionCount: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  score: number
  maxScore: number
  accuracy: number | null
}

export type AnalysisDoc = {
  attemptId: string
  assessmentId: string
  assessmentTitle: string
  status: string
  startedAt: string | null
  submittedAt: string | null
  durationMinutes: number | null
  score: number
  maxScore: number
  percentage: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  accuracy: number | null
  negativeMarksLost: number
  grossMarksGained: number
  totalTimeSpentSeconds: number
  avgTimePerQuestionSeconds: number
  sections: SectionBreakdown[]
  questions: AnalysisQuestionRow[]
  weakTopics: WeakTopicItem[]
  recommendation: string
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Adapts a stored analysis row into a ScoredResponse so aggregateAttempt can
 * recompute totals. AnalysisQuestionRow carries `marks` (its own maximum) but
 * no separate maxMarks field, so we map it here rather than passing the row
 * directly — otherwise maxScore would accumulate undefined and become NaN.
 */
function toScoredResponse(row: AnalysisQuestionRow): ScoredResponse {
  return {
    isCorrect: row.isCorrect,
    awardedMarks: row.awardedMarks,
    // unanswered rows carry isCorrect: null; use marks as the max.
    maxMarks: row.marks,
    unanswered: row.isCorrect === null,
  }
}

function accuracyOf(correct: number, answered: number): number | null {
  if (answered <= 0) return null
  return round2((correct / answered) * 100)
}

export function buildSectionBreakdown(
  rows: AnalysisQuestionRow[]
): SectionBreakdown {
  const totals = aggregateAttempt(rows.map(toScoredResponse))
  return {
    section: rows[0]?.section ?? "__all__",
    questionCount: rows.length,
    answeredCount: totals.correctCount + totals.incorrectCount,
    correctCount: totals.correctCount,
    incorrectCount: totals.incorrectCount,
    unansweredCount: totals.unansweredCount,
    score: round2(totals.score),
    maxScore: round2(totals.maxScore),
    accuracy: accuracyOf(
      totals.correctCount,
      totals.correctCount + totals.incorrectCount
    ),
  }
}

/**
 * Deterministic next-step guidance based on accuracy and question coverage.
 * Always actionable and never model-generated.
 */
export function buildRecommendation(args: {
  accuracy: number | null
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  questionCount: number
  weakTopicCount: number
}): string {
  const {
    accuracy,
    correctCount,
    incorrectCount,
    unansweredCount,
    questionCount,
    weakTopicCount,
  } = args
  const answered = correctCount + incorrectCount

  if (questionCount === 0) {
    return "Add questions to this test before attempting it."
  }
  if (unansweredCount > 0 && unansweredCount >= answered && answered === 0) {
    return "You did not answer any questions. Try again with more time, or take a shorter test."
  }
  if (accuracy === null) {
    return "Answer at least a few questions to get an accuracy-based recommendation."
  }
  if (accuracy < 50) {
    return weakTopicCount > 0
      ? `Revise the ${weakTopicCount} weak topic${weakTopicCount === 1 ? "" : "s"} listed below, then retake a focused test on them.`
      : "Revise the topics behind the questions you missed, then retake a focused test."
  }
  if (accuracy < 75) {
    return "Solid base. Do targeted practice on the sections with the most incorrect answers."
  }
  if (unansweredCount > Math.ceil(questionCount / 4)) {
    return "Strong accuracy, but you skipped several questions. Practise pacing so skips stop costing you marks."
  }
  return "Great result. Attempt a harder test or move on to the next set of topics."
}

/** Builds the full analysis document from stored per-question verdicts. */
export function buildAnalysis(input: {
  attemptId: string
  assessmentId: string
  assessmentTitle: string
  status: string
  startedAt: string | null
  submittedAt: string | null
  durationMinutes: number | null
  questions: AnalysisQuestionRow[]
  weakTopics: WeakTopicItem[]
}): AnalysisDoc {
  const { questions } = input
  const totals = aggregateAttempt(questions.map(toScoredResponse))
  const answered = totals.correctCount + totals.incorrectCount
  const accuracy = accuracyOf(totals.correctCount, answered)
  const percentage = totals.maxScore > 0 ? round2((totals.score / totals.maxScore) * 100) : 0

  let negativeMarksLost = 0
  let grossMarksGained = 0
  let totalTimeSpentSeconds = 0

  for (const q of questions) {
    if (q.isCorrect === true && q.awardedMarks > 0) {
      grossMarksGained += q.awardedMarks
    } else if (q.isCorrect === false && q.awardedMarks < 0) {
      negativeMarksLost += Math.abs(q.awardedMarks)
    }
    if (q.timeSpentSeconds) {
      totalTimeSpentSeconds += q.timeSpentSeconds
    }
  }

  const avgTimePerQuestionSeconds = questions.length > 0
    ? Math.round(totalTimeSpentSeconds / questions.length)
    : 0

  const bySection = new Map<string, AnalysisQuestionRow[]>()
  for (const row of questions) {
    const key = row.section ?? "__all__"
    const group = bySection.get(key) ?? []
    group.push(row)
    bySection.set(key, group)
  }

  const sections = Array.from(bySection.entries()).map(([, rows]) =>
    buildSectionBreakdown(rows)
  )
  sections.sort((left, right) => {
    const leftOrder = left.section === "__all__" ? 1 : 0
    const rightOrder = right.section === "__all__" ? 1 : 0
    return leftOrder - rightOrder
  })

  return {
    attemptId: input.attemptId,
    assessmentId: input.assessmentId,
    assessmentTitle: input.assessmentTitle,
    status: input.status,
    startedAt: input.startedAt,
    submittedAt: input.submittedAt,
    durationMinutes: input.durationMinutes,
    score: round2(totals.score),
    maxScore: round2(totals.maxScore),
    percentage,
    correctCount: totals.correctCount,
    incorrectCount: totals.incorrectCount,
    unansweredCount: totals.unansweredCount,
    accuracy,
    negativeMarksLost: round2(negativeMarksLost),
    grossMarksGained: round2(grossMarksGained),
    totalTimeSpentSeconds,
    avgTimePerQuestionSeconds,
    sections,
    questions,
    weakTopics: input.weakTopics,
    recommendation: buildRecommendation({
      accuracy,
      correctCount: totals.correctCount,
      incorrectCount: totals.incorrectCount,
      unansweredCount: totals.unansweredCount,
      questionCount: questions.length,
      weakTopicCount: input.weakTopics.length,
    }),
  }
}

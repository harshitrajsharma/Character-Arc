/**
 * Pure marking and aggregation logic for mock-test attempts.
 *
 * Every function here is free of I/O and the Prisma client so the scoring
 * rules can be unit-tested in isolation. Handlers feed raw question/response
 * data in and get deterministic verdicts back.
 */

export type QuestionKind =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "NUMERIC"
  | "SHORT_ANSWER"

/** Relative tolerance for numeric answers, e.g. 0.01 = within 1%. */
export const NUMERIC_RELATIVE_TOLERANCE = 0.01
/** Absolute tolerance floor so tiny expected values still have some slack. */
export const NUMERIC_ABSOLUTE_TOLERANCE = 0.01

export type MarkResponseInput = {
  kind: QuestionKind
  /** Selected option keys (choice kinds). Empty when unanswered or text kinds. */
  selectedKeys: string[]
  /** Free-text answer (NUMERIC / SHORT_ANSWER). */
  answerText: string | null
  /** Correct option keys from the server-only solution. */
  correctKeys: string[]
  /** Expected numeric answer (NUMERIC). */
  numericAnswer: number | null
  /** Expected text answer (SHORT_ANSWER). */
  textAnswer: string | null
  marks: number
  negativeMarks: number
}

export type ScoredResponse = {
  /** true = correct, false = incorrect, null = unanswered. */
  isCorrect: boolean | null
  awardedMarks: number
  /** Maximum marks this question could award. */
  maxMarks: number
  unanswered: boolean
}

function isAnswered(input: MarkResponseInput): boolean {
  if (input.kind === "NUMERIC" || input.kind === "SHORT_ANSWER") {
    return (
      input.answerText !== null &&
      input.answerText !== undefined &&
      input.answerText.trim().length > 0
    )
  }
  return input.selectedKeys.length > 0
}

function setsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const seen = new Set(right)
  return left.every((key) => seen.has(key))
}

/** Collapses whitespace and lowercases for forgiving short-answer compare. */
export function normalizeTextAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function parseNumericAnswer(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "")
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function isNumericClose(actual: number, expected: number): boolean {
  const absoluteSlack = Math.max(
    NUMERIC_ABSOLUTE_TOLERANCE,
    Math.abs(expected) * NUMERIC_RELATIVE_TOLERANCE
  )
  return Math.abs(actual - expected) <= absoluteSlack
}

/**
 * Marks a single response. Unanswered responses award 0 (never the negative
 * penalty). Choice kinds require an exact option-key match.
 */
export function markResponse(input: MarkResponseInput): ScoredResponse {
  if (!isAnswered(input)) {
    return { isCorrect: null, awardedMarks: 0, maxMarks: input.marks, unanswered: true }
  }

  const kind = input.kind
  let correct = false

  switch (kind) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
    case "MULTIPLE_CHOICE":
      correct = setsEqual(
        input.selectedKeys.slice().sort(),
        input.correctKeys.slice().sort()
      )
      break
    case "NUMERIC": {
      const actual = parseNumericAnswer(input.answerText ?? "")
      correct =
        actual !== null &&
        input.numericAnswer !== null &&
        isNumericClose(actual, input.numericAnswer)
      break
    }
    case "SHORT_ANSWER": {
      const expected = normalizeTextAnswer(input.textAnswer ?? "")
      const actual = normalizeTextAnswer(input.answerText ?? "")
      correct = expected.length > 0 && actual === expected
      break
    }
  }

  return {
    isCorrect: correct,
    awardedMarks: correct ? input.marks : Math.min(input.negativeMarks, 0),
    maxMarks: input.marks,
    unanswered: false,
  }
}

export type AttemptTotals = {
  score: number
  maxScore: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
}

/** Aggregates per-question verdicts into attempt-level totals. */
export function aggregateAttempt(
  responses: ScoredResponse[]
): AttemptTotals {
  let score = 0
  let maxScore = 0
  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  for (const response of responses) {
    score += response.awardedMarks
    maxScore += response.maxMarks
    if (response.isCorrect === true) correctCount += 1
    else if (response.isCorrect === false) incorrectCount += 1
    else unansweredCount += 1
  }

  return { score, maxScore, correctCount, incorrectCount, unansweredCount }
}

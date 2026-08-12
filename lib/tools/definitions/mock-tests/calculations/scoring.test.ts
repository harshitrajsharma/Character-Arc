// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, it } from "bun:test"
import {
  aggregateAttempt,
  isNumericClose,
  markResponse,
  normalizeTextAnswer,
  parseNumericAnswer,
  type MarkResponseInput,
} from "./scoring"

function base(overrides: Partial<MarkResponseInput>): MarkResponseInput {
  return {
    kind: "SINGLE_CHOICE",
    selectedKeys: [],
    answerText: null,
    correctKeys: [],
    numericAnswer: null,
    textAnswer: null,
    marks: 3,
    negativeMarks: -1,
    ...overrides,
  }
}

describe("markResponse", () => {
  it("marks a correct single choice with full marks", () => {
    const result = markResponse(
      base({
        selectedKeys: ["A"],
        correctKeys: ["A"],
      })
    )
    expect(result).toEqual({
      isCorrect: true,
      awardedMarks: 3,
      maxMarks: 3,
      unanswered: false,
    })
  })

  it("applies the negative penalty for a wrong single choice", () => {
    const result = markResponse(
      base({
        selectedKeys: ["B"],
        correctKeys: ["A"],
      })
    )
    expect(result.isCorrect).toBe(false)
    expect(result.awardedMarks).toBe(-1)
  })

  it("returns unanswered with zero marks (no penalty) when nothing is selected", () => {
    const result = markResponse(base({ correctKeys: ["A"] }))
    expect(result).toEqual({
      isCorrect: null,
      awardedMarks: 0,
      maxMarks: 3,
      unanswered: true,
    })
  })

  it("requires an exact key match for multiple choice", () => {
    const correct = markResponse(
      base({
        kind: "MULTIPLE_CHOICE",
        selectedKeys: ["A", "B"],
        correctKeys: ["A", "B"],
      })
    )
    expect(correct.isCorrect).toBe(true)
    expect(correct.awardedMarks).toBe(3)

    const partial = markResponse(
      base({
        kind: "MULTIPLE_CHOICE",
        selectedKeys: ["A"],
        correctKeys: ["A", "B"],
      })
    )
    expect(partial.isCorrect).toBe(false)
    expect(partial.awardedMarks).toBe(-1)
  })

  it("treats a zero negative penalty as no penalty", () => {
    const result = markResponse(
      base({ selectedKeys: ["B"], correctKeys: ["A"], negativeMarks: 0 })
    )
    expect(result.isCorrect).toBe(false)
    expect(result.awardedMarks).toBe(0)
  })

  it("grades numeric answers within relative tolerance", () => {
    const correct = markResponse(
      base({
        kind: "NUMERIC",
        answerText: "0.5",
        numericAnswer: 0.5,
      })
    )
    expect(correct.isCorrect).toBe(true)

    const close = markResponse(
      base({
        kind: "NUMERIC",
        answerText: "0.495",
        numericAnswer: 0.5,
      })
    )
    expect(close.isCorrect).toBe(true)

    const wrong = markResponse(
      base({
        kind: "NUMERIC",
        answerText: "2",
        numericAnswer: 0.5,
      })
    )
    expect(wrong.isCorrect).toBe(false)
    expect(wrong.awardedMarks).toBe(-1)
  })

  it("rejects blank or non-numeric numeric answers as unanswered", () => {
    const blank = markResponse(
      base({ kind: "NUMERIC", answerText: "   ", numericAnswer: 0.5 })
    )
    expect(blank.unanswered).toBe(true)
    expect(blank.awardedMarks).toBe(0)

    const notNumber = markResponse(
      base({ kind: "NUMERIC", answerText: "abc", numericAnswer: 0.5 })
    )
    expect(notNumber.unanswered).toBe(false)
    expect(notNumber.isCorrect).toBe(false)
  })

  it("compares short answers case- and whitespace-insensitively", () => {
    const correct = markResponse(
      base({
        kind: "SHORT_ANSWER",
        answerText: "  Binary   Search ",
        textAnswer: "binary search",
      })
    )
    expect(correct.isCorrect).toBe(true)

    const wrong = markResponse(
      base({
        kind: "SHORT_ANSWER",
        answerText: "linear search",
        textAnswer: "binary search",
      })
    )
    expect(wrong.isCorrect).toBe(false)
  })
})

describe("numeric helpers", () => {
  it("parses comma-separated decimals", () => {
    expect(parseNumericAnswer("1,000.5")).toBe(1000.5)
    expect(parseNumericAnswer("42")).toBe(42)
    expect(parseNumericAnswer("")).toBeNull()
    expect(parseNumericAnswer("abc")).toBeNull()
  })

  it("uses a relative tolerance with an absolute floor", () => {
    expect(isNumericClose(0.505, 0.5)).toBe(true)
    expect(isNumericClose(0.6, 0.5)).toBe(false)
    // Expected near zero still has the absolute floor of 0.01.
    expect(isNumericClose(0.009, 0.0)).toBe(true)
    expect(isNumericClose(0.02, 0.0)).toBe(false)
  })

  it("normalizes whitespace and case", () => {
    expect(normalizeTextAnswer("  Heap\nSort ")).toBe("heap sort")
  })
})

describe("aggregateAttempt", () => {
  it("sums scores, maxes and per-verdict counts", () => {
    const totals = aggregateAttempt([
      { isCorrect: true, awardedMarks: 3, maxMarks: 3, unanswered: false },
      { isCorrect: false, awardedMarks: -1, maxMarks: 3, unanswered: false },
      { isCorrect: null, awardedMarks: 0, maxMarks: 3, unanswered: true },
    ])
    expect(totals).toEqual({
      score: 2,
      maxScore: 9,
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 1,
    })
  })

  it("returns zeros for an empty attempt", () => {
    expect(aggregateAttempt([])).toEqual({
      score: 0,
      maxScore: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
    })
  })
})

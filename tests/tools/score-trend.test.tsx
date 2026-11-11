// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  SCORE_TREND_LIMIT,
  scoreTrendPoints,
  scoreTrendScale,
  scoreChange,
} from "@/lib/tools/mock-tests/score-trend"
import { ScoreTrajectoryGraph } from "@/components/tools/mock-tests/detail/score-trajectory-graph"
import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"

function attempt(
  id: string,
  score: number | null,
  maxScore = 4,
  minute = 0
): RecentAttemptItem {
  return {
    id,
    assessmentId: "paper",
    assessmentTitle: "Assessment",
    status: "evaluated",
    score,
    maxScore,
    percentage: 99,
    startedAt: new Date(Date.UTC(2026, 9, 29, 10, minute)).toISOString(),
    submittedAt: "2026-10-29T11:00:00Z",
  }
}

describe("recent score comparison", () => {
  test("uses the latest five valid scored attempts, sorted chronologically without mutation", () => {
    const rows = [
      attempt("six", 3, 4, 6),
      attempt("one", 0, 4, 1),
      attempt("four", 1, 4, 4),
      attempt("two", 2, 4, 2),
      attempt("five", 3, 4, 5),
      attempt("three", 2, 4, 3),
    ]
    const before = structuredClone(rows)
    const points = scoreTrendPoints(rows)
    expect(SCORE_TREND_LIMIT).toBe(5)
    expect(points.map((p) => p.id)).toEqual([
      "two",
      "three",
      "four",
      "five",
      "six",
    ])
    expect(points.map((p) => p.percentage)).toEqual([50, 50, 25, 75, 75])
    expect(rows).toEqual(before)
  })
  test("never plots ungraded, invalid-date, non-finite or zero-maximum records", () => {
    expect(
      scoreTrendPoints([
        attempt("missing", null),
        attempt("zero-max", 0, 0),
        attempt("infinite", Infinity),
        attempt("bad-max", 1, Infinity),
        { ...attempt("pending", 2), status: "submitted" },
        { ...attempt("bad-date", 2), startedAt: "bad" },
      ])
    ).toEqual([])
    expect(scoreTrendPoints([attempt("zero", 0)])[0].percentage).toBe(0)
  })
  test("same-time results use stable IDs and stored maxima rather than supplied percentages", () => {
    const points = scoreTrendPoints([attempt("b", 3, 4), attempt("a", 41, 50)])
    expect(points.map((p) => [p.id, p.percentage])).toEqual([
      ["a", 82],
      ["b", 75],
    ])
    expect(scoreChange(points, 1)).toBe(-7)
    expect(scoreChange(points, 0)).toBeNull()
  })
  test("differences use percentage points, including unchanged results", () => {
    const points = scoreTrendPoints([
      attempt("a", 2, 4, 1),
      attempt("b", 3, 4, 2),
      attempt("c", 3, 4, 3),
    ])
    expect(scoreChange(points, 1)).toBe(25)
    expect(scoreChange(points, 2)).toBe(0)
    expect(scoreChange(points, 99)).toBeNull()
  })
  test("scale retains zero and does not clip negative or over-maximum scores", () => {
    expect(scoreTrendScale(scoreTrendPoints([attempt("zero", 0)]))).toEqual({
      minimum: 0,
      maximum: 100,
      ticks: [0, 25, 50, 75, 100],
    })
    const points = scoreTrendPoints([
      attempt("negative", -1, 2),
      attempt("bonus", 5, 4),
    ])
    const scale = scoreTrendScale(points)
    expect(scale.minimum).toBeLessThanOrEqual(-50)
    expect(scale.maximum).toBeGreaterThanOrEqual(125)
    expect(scale.ticks).toContain(0)
    expect(scale.ticks.length).toBeLessThanOrEqual(6)
  })
  test("zero results omit a fabricated plot; one result retains a review action without implying a trend", () => {
    expect(
      renderToStaticMarkup(
        <ScoreTrajectoryGraph
          attempts={[]}
          evaluatedCount={0}
          workspaceSlug="mine"
        />
      )
    ).toBe("")
    const html = renderToStaticMarkup(
      <ScoreTrajectoryGraph
        attempts={[attempt("only", 0)]}
        evaluatedCount={1}
        workspaceSlug="mine"
      />
    )
    expect(html).toContain("One scored attempt")
    expect(html).toContain("/attempts/only/analysis")
    expect(html).toContain("Latest")
    expect(html).toContain("0%")
    expect(html).not.toContain("Recent score comparison")
  })
  test("the recent view discloses its bound, chooses latest initially and keeps full precision in text", () => {
    const html = renderToStaticMarkup(
      <ScoreTrajectoryGraph
        attempts={[attempt("a", 1, 3, 1), attempt("b", 2, 3, 2)]}
        evaluatedCount={20}
        workspaceSlug="mine"
      />
    )
    expect(html).toContain("Latest 2 of 20 scored attempts")
    expect(html).toContain('data-selected-score="b"')
    expect(html).toContain("66.67%")
    expect(html).toContain("+33.33 percentage points")
    expect(html).not.toContain("passing target")
  })
})

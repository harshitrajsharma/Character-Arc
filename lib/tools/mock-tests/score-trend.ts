import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"

/** A recent comparison, with enough room for five dated touch targets on phones. */
export const SCORE_TREND_LIMIT = 5

export type ScoreTrendPoint = {
  id: string
  startedAt: string
  score: number
  maxScore: number
  percentage: number
}

export function scoreTrendPoints(
  attempts: readonly RecentAttemptItem[]
): ScoreTrendPoint[] {
  return attempts
    .flatMap((attempt) => {
      if (
        attempt.status !== "evaluated" ||
        attempt.score === null ||
        attempt.maxScore === null ||
        !Number.isFinite(attempt.score) ||
        !Number.isFinite(attempt.maxScore) ||
        attempt.maxScore <= 0 ||
        !Number.isFinite(Date.parse(attempt.startedAt))
      )
        return []
      const percentage = (attempt.score / attempt.maxScore) * 100
      return Number.isFinite(percentage)
        ? [
            {
              id: attempt.id,
              startedAt: attempt.startedAt,
              score: attempt.score,
              maxScore: attempt.maxScore,
              percentage,
            },
          ]
        : []
    })
    .sort(
      (a, b) =>
        Date.parse(a.startedAt) - Date.parse(b.startedAt) ||
        a.id.localeCompare(b.id)
    )
    .slice(-SCORE_TREND_LIMIT)
}

export function scoreTrendScale(points: readonly ScoreTrendPoint[]) {
  const lower = Math.min(0, ...points.map((point) => point.percentage))
  const upper = Math.max(100, ...points.map((point) => point.percentage))
  const step = Math.max(25, Math.ceil((upper - lower) / 4 / 25) * 25)
  const minimum = Math.floor(lower / step) * step
  const maximum = Math.ceil(upper / step) * step
  const ticks = Array.from(
    { length: Math.round((maximum - minimum) / step) + 1 },
    (_, index) => minimum + index * step
  )
  return { minimum, maximum, ticks }
}

export function scoreChange(points: readonly ScoreTrendPoint[], index: number) {
  if (index <= 0 || index >= points.length) return null
  return (
    Math.round(
      (points[index].percentage - points[index - 1].percentage) * 100
    ) / 100
  )
}

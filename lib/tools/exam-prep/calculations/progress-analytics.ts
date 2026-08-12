import { differenceInDays, addDays, isValid, format } from "date-fns"

export interface DailyProgressData {
  date: string
  progress: number
}

export type TimeRange = "7d" | "30d" | "90d" | "all"

interface TrendResult {
  direction: "up" | "down" | "neutral"
  percentage: number
}

/**
 * Validates and sorts progress data
 */
export function validateAndSortData(
  data: DailyProgressData[]
): DailyProgressData[] {
  return data
    .filter((item) => {
      const date = new Date(item.date)
      return (
        isValid(date) &&
        !isNaN(item.progress) &&
        item.progress >= 0 &&
        item.progress <= 100
      )
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Filters data based on selected time range
 */
export function filterDataByTimeRange(
  data: DailyProgressData[],
  timeRange: TimeRange
): DailyProgressData[] {
  if (!data.length) return []

  const now = new Date()
  const ranges: Record<TimeRange, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    all: differenceInDays(now, new Date(data[0]?.date || now)),
  }

  const daysToShow = ranges[timeRange]
  return data.filter((item) => {
    const date = new Date(item.date)
    return differenceInDays(now, date) <= daysToShow
  })
}

/**
 * Calculates trend indicators
 */
export function calculateTrend(data: DailyProgressData[]): TrendResult {
  if (data.length < 2) return { direction: "neutral", percentage: 0 }

  const lastValue = data[data.length - 1]?.progress || 0
  const previousValue = data[data.length - 2]?.progress || 0
  const difference = lastValue - previousValue
  const percentage =
    previousValue !== 0 ? (difference / previousValue) * 100 : 0

  return {
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "neutral",
    percentage: Math.abs(Math.round(percentage)),
  }
}

/**
 * Calculates progress velocity (progress per day)
 */
export function calculateVelocity(data: DailyProgressData[]): number {
  if (data.length < 2) return 0

  const firstValue = data[0]?.progress || 0
  const lastValue = data[data.length - 1]?.progress || 0
  const days = Math.max(
    1,
    differenceInDays(
      new Date(data[data.length - 1]?.date),
      new Date(data[0]?.date)
    )
  )

  return Math.round(((lastValue - firstValue) / days) * 100) / 100
}

/**
 * Predicts completion date based on current velocity
 */
export function predictCompletionDate(
  data: DailyProgressData[]
): string | null {
  try {
    const velocity = calculateVelocity(data)
    if (velocity <= 0) return null

    const lastProgress = data[data.length - 1]?.progress || 0
    if (lastProgress >= 100) return "Completed"

    const remainingProgress = 100 - lastProgress
    const daysToComplete = Math.ceil(remainingProgress / velocity)

    const lastDate = new Date(data[data.length - 1]?.date)
    if (!isValid(lastDate)) return null

    const predictedDate = addDays(lastDate, daysToComplete)
    return format(predictedDate, "MMM d, yyyy")
  } catch (error) {
    console.error("Error predicting completion date:", error)
    return null
  }
}

/**
 * Calculates last week average progress
 */
export function calculateLastWeekAverage(data: DailyProgressData[]): number {
  const lastWeekData = data.slice(-7)
  if (!lastWeekData.length) return 0
  return Math.round(
    lastWeekData.reduce((acc, item) => acc + item.progress, 0) /
      lastWeekData.length
  )
}

/**
 * Calculates moving average for trendline
 */
export function calculateMovingAverage(
  data: DailyProgressData[]
): (DailyProgressData & { average: number })[] {
  return data.map((item, index, array) => {
    const window = array.slice(Math.max(0, index - 6), index + 1)
    const average =
      window.reduce((acc, curr) => acc + curr.progress, 0) / window.length
    return { ...item, average: Math.round(average * 100) / 100 }
  })
}

/**
 * Calculates overall average progress
 */
export function calculateAverageProgress(data: DailyProgressData[]): number {
  if (!data.length) return 0
  return Math.round(data.reduce((acc, d) => acc + d.progress, 0) / data.length)
}

/**
 * Gets highest progress value
 */
export function getHighestProgress(data: DailyProgressData[]): number {
  if (!data.length) return 0
  return Math.max(...data.map((d) => d.progress))
}

/**
 * Gets most recent progress value
 */
export function getCurrentProgress(data: DailyProgressData[]): number {
  return data[data.length - 1]?.progress || 0
}

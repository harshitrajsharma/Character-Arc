import { format, isValid, parseISO } from "date-fns"
import type {
  DateRange,
  SubjectActivity,
  SubjectProgressResponse,
} from "@/types/progressapp/analytics"

export type SubjectProgressRange = "day" | "week" | "month" | "all"

export const SUBJECT_PROGRESS_RANGES: SubjectProgressRange[] = [
  "day",
  "week",
  "month",
  "all",
]

const ACTIVITY_TYPES = ["learning", "revision", "practice", "test"] as const

const clampPercentage = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

const safeDateString = (value: unknown) => {
  if (!value) return new Date().toISOString()
  const date = typeof value === "string" ? new Date(value) : value
  return date instanceof Date && isValid(date)
    ? date.toISOString()
    : new Date().toISOString()
}

export const isSubjectProgressRange = (
  range: string | null
): range is SubjectProgressRange =>
  !!range && SUBJECT_PROGRESS_RANGES.includes(range as SubjectProgressRange)

export const getAnalyticsDateKey = (date: Date | string) => {
  const parsedDate = typeof date === "string" ? new Date(date) : date
  return isValid(parsedDate)
    ? format(parsedDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd")
}

export const getSubjectProgressQueryKey = (
  range: SubjectProgressRange,
  selectedDate: Date | string
) => {
  if (range === "all") return ["subject-progress", range] as const
  return ["subject-progress", range, getAnalyticsDateKey(selectedDate)] as const
}

export const formatSubjectDateRange = (
  dateRange: DateRange | undefined,
  range: SubjectProgressRange
) => {
  if (!dateRange) return ""

  const start = parseISO(String(dateRange.start))
  const end = parseISO(String(dateRange.end))

  if (!isValid(start) || !isValid(end)) return ""

  switch (range) {
    case "day":
      return format(start, "MMMM d, yyyy")
    case "week":
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
    case "month":
      return format(start, "MMMM yyyy")
    case "all":
      return "All activity"
  }
}

export const normalizeSubjectProgressResponse = (
  data: SubjectProgressResponse
): SubjectProgressResponse => {
  const subjects = Array.isArray(data.subjects)
    ? data.subjects.map((subject) => {
        const activity = {
          learning:
            typeof subject.activity?.learning === "number"
              ? subject.activity.learning
              : 0,
          revision:
            typeof subject.activity?.revision === "number"
              ? subject.activity.revision
              : 0,
          practice:
            typeof subject.activity?.practice === "number"
              ? subject.activity.practice
              : 0,
          test:
            typeof subject.activity?.test === "number"
              ? subject.activity.test
              : 0,
          total:
            typeof subject.activity?.total === "number"
              ? subject.activity.total
              : 0,
        }

        const calculatedTotal =
          activity.learning +
          activity.revision +
          activity.practice +
          activity.test

        return {
          ...subject,
          learningProgress: clampPercentage(subject.learningProgress),
          revisionProgress: clampPercentage(subject.revisionProgress),
          practiceProgress: clampPercentage(subject.practiceProgress),
          testProgress: clampPercentage(subject.testProgress),
          overallProgress: clampPercentage(subject.overallProgress),
          activity: {
            ...activity,
            total: activity.total || calculatedTotal,
          },
          activityPercentage: clampPercentage(subject.activityPercentage),
          createdAt: safeDateString(subject.createdAt),
          updatedAt: safeDateString(subject.updatedAt),
        }
      })
    : []

  const totalStats = {
    learning:
      typeof data.totalStats?.learning === "number"
        ? data.totalStats.learning
        : 0,
    revision:
      typeof data.totalStats?.revision === "number"
        ? data.totalStats.revision
        : 0,
    practice:
      typeof data.totalStats?.practice === "number"
        ? data.totalStats.practice
        : 0,
    test: typeof data.totalStats?.test === "number" ? data.totalStats.test : 0,
    total:
      typeof data.totalStats?.total === "number" ? data.totalStats.total : 0,
  }

  const calculatedTotal =
    totalStats.learning +
    totalStats.revision +
    totalStats.practice +
    totalStats.test

  return {
    ...data,
    subjects,
    totalStats: {
      ...totalStats,
      total: totalStats.total || calculatedTotal,
    },
  }
}

export const getPredominantActivityType = (subject: SubjectActivity) => {
  if (!subject?.activity) return "learning"

  return ACTIVITY_TYPES.reduce((currentBest, type) => {
    const bestCount = subject.activity[currentBest] || 0
    const typeCount = subject.activity[type] || 0
    return typeCount > bestCount ? type : currentBest
  }, ACTIVITY_TYPES[0])
}

export const buildSubjectInsights = (subjects: SubjectActivity[]) => {
  if (!subjects.length) {
    return {
      mostActiveSubject: undefined,
      leastActiveSubject: undefined,
      balancedSubjects: [],
      learningHeavySubjects: [],
      focusRecommendation: undefined,
    }
  }

  let mostActiveSubject: SubjectActivity | undefined
  let leastActiveSubject: SubjectActivity | undefined
  const balancedSubjects: SubjectActivity[] = []
  const learningHeavySubjects: SubjectActivity[] = []

  for (const subject of subjects) {
    if (
      !mostActiveSubject ||
      subject.activity.total > mostActiveSubject.activity.total
    ) {
      mostActiveSubject = subject
    }

    if (
      subject.overallProgress < 100 &&
      (!leastActiveSubject ||
        subject.activity.total < leastActiveSubject.activity.total)
    ) {
      leastActiveSubject = subject
    }

    const values = ACTIVITY_TYPES.map((type) => subject.activity[type]).filter(
      (value) => value > 0
    )
    if (values.length > 1) {
      const max = Math.max(...values)
      const min = Math.min(...values)
      if (max / min < 3) balancedSubjects.push(subject)
    }

    if (
      subject.activity.total > 0 &&
      subject.activity.learning >
        subject.activity.revision +
          subject.activity.practice +
          subject.activity.test
    ) {
      learningHeavySubjects.push(subject)
    }
  }

  return {
    mostActiveSubject,
    leastActiveSubject,
    balancedSubjects,
    learningHeavySubjects,
    focusRecommendation: leastActiveSubject
      ? { id: leastActiveSubject.id, name: leastActiveSubject.name }
      : undefined,
  }
}

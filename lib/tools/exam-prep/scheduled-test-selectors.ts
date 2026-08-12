import type { ScheduledTest } from "@/types/progressapp/domain"

export type ScheduledTestDisplayStatus =
  "planned" | "upcoming" | "due-today" | "overdue" | "completed" | "cancelled"

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const DISPLAY_STATUS_PRIORITY: Record<ScheduledTestDisplayStatus, number> = {
  overdue: 0,
  "due-today": 1,
  upcoming: 2,
  planned: 3,
  completed: 4,
  cancelled: 5,
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function isValidDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]
}

function assertValidLocalDate(localDate: string) {
  if (!isValidDateOnly(localDate)) {
    throw new RangeError("localDate must be a valid YYYY-MM-DD date")
  }
}

function deriveDisplayStatus(
  scheduledTest: ScheduledTest,
  localDate: string
): ScheduledTestDisplayStatus {
  if (scheduledTest.status === "completed") {
    return "completed"
  }

  if (scheduledTest.status === "cancelled") {
    return "cancelled"
  }

  const scheduledFor = scheduledTest.scheduledFor
  if (!scheduledFor || !isValidDateOnly(scheduledFor)) {
    return "planned"
  }

  if (scheduledFor < localDate) {
    return "overdue"
  }

  if (scheduledFor === localDate) {
    return "due-today"
  }

  return "upcoming"
}

function compareText(left: string, right: string) {
  const normalizedLeft = left.toLowerCase()
  const normalizedRight = right.toLowerCase()

  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft < normalizedRight ? -1 : 1
  }

  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

export function getScheduledTestDisplayStatus(
  scheduledTest: ScheduledTest,
  localDate: string
): ScheduledTestDisplayStatus {
  assertValidLocalDate(localDate)
  return deriveDisplayStatus(scheduledTest, localDate)
}

export function sortScheduledTests(
  scheduledTests: readonly ScheduledTest[],
  localDate: string
) {
  assertValidLocalDate(localDate)

  return [...scheduledTests].sort((left, right) => {
    const statusDifference =
      DISPLAY_STATUS_PRIORITY[deriveDisplayStatus(left, localDate)] -
      DISPLAY_STATUS_PRIORITY[deriveDisplayStatus(right, localDate)]

    if (statusDifference !== 0) {
      return statusDifference
    }

    const leftDate =
      left.scheduledFor && isValidDateOnly(left.scheduledFor)
        ? left.scheduledFor
        : null
    const rightDate =
      right.scheduledFor && isValidDateOnly(right.scheduledFor)
        ? right.scheduledFor
        : null

    if (leftDate !== rightDate) {
      if (leftDate === null) {
        return 1
      }

      if (rightDate === null) {
        return -1
      }

      return leftDate < rightDate ? -1 : 1
    }

    const titleDifference = compareText(left.title, right.title)
    if (titleDifference !== 0) {
      return titleDifference
    }

    return compareText(left.id, right.id)
  })
}

export function getScheduledTestsForChapter(
  scheduledTests: readonly ScheduledTest[],
  chapterId: string
) {
  return scheduledTests.filter((scheduledTest) =>
    scheduledTest.targetChapterIds.includes(chapterId)
  )
}

export function getSubjectLevelScheduledTests(
  scheduledTests: readonly ScheduledTest[]
) {
  return scheduledTests.filter(
    (scheduledTest) => scheduledTest.scope === "subject"
  )
}

export function getScheduledTestAgenda(
  scheduledTests: readonly ScheduledTest[]
) {
  const uniqueScheduledTests = new Map<string, ScheduledTest>()

  for (const scheduledTest of scheduledTests) {
    if (!uniqueScheduledTests.has(scheduledTest.id)) {
      uniqueScheduledTests.set(scheduledTest.id, scheduledTest)
    }
  }

  return [...uniqueScheduledTests.values()]
}

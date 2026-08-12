import { SubjectWithRelations } from "./types"
import { calculateSubjectProgress } from "./progress"
import { clampPercentage, roundPercentage } from "./index"
import {
  getProgressSummary,
  type ProgressSummarySource,
} from "@/lib/tools/exam-prep/progress/selectors"

export interface DashboardProgress {
  overall: number
  learning: number
  revision: number
  practice: number
  test: number
  stats: {
    subjects: {
      total: number
      completed: number
    }
    topics: {
      total: number
      completed: number
    }
  }
}

export interface DashboardProgressRollupSubject {
  weightage: number | null
  overallProgress: number | null
  learningProgress: number | null
  revisionProgress: number | null
  practiceProgress: number | null
  testProgress: number | null
}

/**
 * Calculate weighted average progress based on subject weightage
 */
function getSubjectWeight(
  subject: Pick<DashboardProgressRollupSubject, "weightage">
): number {
  const weightage = Number(subject.weightage)
  return Number.isFinite(weightage) && weightage > 0 ? weightage : 1
}

function calculateWeightedProgress<
  T extends Pick<DashboardProgressRollupSubject, "weightage">,
>(subjects: T[], getValue: (subject: T) => number): number {
  if (subjects.length === 0) return 0

  let totalWeightage = 0
  let weightedSum = 0

  subjects.forEach((subject) => {
    const weight = getSubjectWeight(subject)
    totalWeightage += weight
    weightedSum += getValue(subject) * weight
  })

  if (totalWeightage === 0) return 0
  return clampPercentage(roundPercentage(weightedSum / totalWeightage))
}

function toProgressRollupSubject(subject: DashboardProgressRollupSubject) {
  return {
    ...subject,
    progress: getProgressSummary(subject as ProgressSummarySource),
  }
}

export function calculateDashboardProgressFromRollups(
  subjects: DashboardProgressRollupSubject[]
): DashboardProgress {
  if (!subjects || subjects.length === 0) {
    return {
      overall: 0,
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      stats: {
        subjects: { total: 0, completed: 0 },
        topics: { total: 0, completed: 0 },
      },
    }
  }

  const subjectsWithProgress = subjects.map(toProgressRollupSubject)

  return {
    overall: calculateWeightedProgress(
      subjectsWithProgress,
      ({ progress }) => progress.overall
    ),
    learning: calculateWeightedProgress(
      subjectsWithProgress,
      ({ progress }) => progress.learning
    ),
    revision: calculateWeightedProgress(
      subjectsWithProgress,
      ({ progress }) => progress.revision
    ),
    practice: calculateWeightedProgress(
      subjectsWithProgress,
      ({ progress }) => progress.practice
    ),
    test: calculateWeightedProgress(
      subjectsWithProgress,
      ({ progress }) => progress.test
    ),
    stats: {
      subjects: {
        total: subjects.length,
        completed: subjectsWithProgress.filter(
          ({ progress }) => progress.overall >= 100
        ).length,
      },
      topics: {
        total: 0,
        completed: 0,
      },
    },
  }
}

/**
 * Calculate overall dashboard progress combining all subjects
 */
export function calculateDashboardProgress(
  subjects: SubjectWithRelations[]
): DashboardProgress {
  if (!subjects || subjects.length === 0) {
    return {
      overall: 0,
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      stats: {
        subjects: { total: 0, completed: 0 },
        topics: { total: 0, completed: 0 },
      },
    }
  }

  // Calculate progress for each subject first
  const subjectsWithProgress = subjects.map((subject) => {
    const progress = calculateSubjectProgress(subject)
    return {
      ...subject,
      calculatedProgress: progress,
      overallProgress: progress.overall,
      learningProgress: progress.learning,
      revisionProgress: progress.revision,
      practiceProgress: progress.practice,
      testProgress: progress.test,
    }
  })

  // Calculate weighted averages for each progress type
  const overall = calculateWeightedProgress(
    subjectsWithProgress,
    (subject) => subject.overallProgress
  )
  const learning = calculateWeightedProgress(
    subjectsWithProgress,
    (subject) => subject.learningProgress
  )
  const revision = calculateWeightedProgress(
    subjectsWithProgress,
    (subject) => subject.revisionProgress
  )
  const practice = calculateWeightedProgress(
    subjectsWithProgress,
    (subject) => subject.practiceProgress
  )
  const test = calculateWeightedProgress(
    subjectsWithProgress,
    (subject) => subject.testProgress
  )

  // Calculate completion statistics
  const completedSubjects = subjectsWithProgress.filter(
    (subject) => subject.overallProgress >= 100
  ).length

  // Calculate total topics and completed topics
  const topicsStats = subjectsWithProgress.reduce(
    (acc, subject) => {
      const progress = subject.calculatedProgress
      return {
        total: acc.total + progress.stats.learning.totalTopics,
        completed: acc.completed + progress.stats.learning.completedTopics,
      }
    },
    { total: 0, completed: 0 }
  )

  return {
    overall,
    learning,
    revision,
    practice,
    test,
    stats: {
      subjects: {
        total: subjects.length,
        completed: completedSubjects,
      },
      topics: topicsStats,
    },
  }
}

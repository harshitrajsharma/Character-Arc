import { Test } from "@/types/progressapp/domain"
import { SubjectWithRelations, TestStatistics } from "./types"
import { calculateSubjectProgress, calculateChapterProgress } from "./progress"

/**
 * Calculate test statistics for a subject
 */
export function calculateTestStatistics(tests: Test[]): TestStatistics {
  if (tests.length === 0) {
    return {
      totalTests: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      recentScore: 0,
      trend: "stable"
    }
  }

  // Sort tests by date
  const sortedTests = [...tests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )

  const scores = sortedTests.map(test => test.score)
  const recentScore = scores[0]
  const previousScore = scores[1] || scores[0]

  return {
    totalTests: tests.length,
    averageScore: scores.reduce((acc, score) => acc + score, 0) / tests.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    recentScore,
    trend: recentScore > previousScore ? "up" : recentScore < previousScore ? "down" : "stable"
  }
}

/**
 * Calculate foundation level based on progress and test performance
 */
export function calculateFoundationLevel(subject: SubjectWithRelations) {
  const { overall } = calculateSubjectProgress(subject)
  const tests = subject.tests ?? []
  const testAverage = tests.length > 0
    ? tests.reduce((acc, t) => acc + t.score, 0) / tests.length
    : 0

  if (overall >= 80 && testAverage >= 70) return "Advanced"
  if (overall >= 50 && testAverage >= 50) return "Moderate"
  return "Beginner"
}

/**
 * Calculate expected marks based on weightage and test performance
 */
export function calculateExpectedMarks(subject: SubjectWithRelations): number {
  if (subject.tests.length === 0) return 0

  const testAverage = subject.tests.reduce(
    (acc, test) => acc + test.score,
    0
  ) / subject.tests.length

  return (subject.weightage * testAverage) / 100
}

/**
 * Calculate completion statistics for a subject
 */
export function calculateCompletionStats(subject: SubjectWithRelations) {
  const progress = calculateSubjectProgress(subject)
  const chapters = subject.chapters ?? []

  const totalChapters = chapters.length
  const completedChapters = chapters.filter(ch =>
    calculateChapterProgress(ch).overall >= 100
  ).length

  return {
    chapters: {
      total: totalChapters,
      completed: completedChapters,
      percentage: totalChapters > 0
        ? (completedChapters / totalChapters) * 100
        : 0
    },
    topics: {
      total: progress.stats.learning.totalTopics,
      completed: progress.stats.learning.completedTopics,
      percentage: progress.stats.learning.percentage
    }
  }
}
 

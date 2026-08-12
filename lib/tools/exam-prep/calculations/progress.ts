import { Topic } from "@/types/progressapp/domain"
import {
  calculateProgressStats as calculateModeProgressStats,
  calculateProgressRollup,
  calculateTopicProgress as calculateTopicProgressSnapshot,
  calculateWeightedOverallProgress,
  isTopicModeCompleted,
} from "@/lib/tools/exam-prep/progress"
import {
  TopicProgress,
  ChapterProgress,
  SubjectProgress,
  ChapterWithRelations,
  SubjectWithRelations,
  ProgressStats,
  FoundationLevel,
} from "./types"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import {
  normalizeSubjectProgressPolicy,
  type SubjectProgressPolicy,
} from "@/lib/tools/exam-prep/progress/policy"
import {
  calculateChapterTestProgress,
  calculateExpectedMarksEvidence,
  calculateSubjectTestProgress,
  type TestProgressEvidence,
} from "./test-records"

/**
 * Safely get topics array from a chapter
 */
function getSafeTopics(chapter: Partial<ChapterWithRelations>): Topic[] {
  if (!chapter) return []
  return Array.isArray(chapter.topics) ? chapter.topics : []
}

/**
 * Safely get chapters array from a subject
 */
function getSafeChapters(
  subject: Partial<SubjectWithRelations>
): ChapterWithRelations[] {
  if (!subject) return []
  return Array.isArray(subject.chapters) ? subject.chapters : []
}

function getProgressFromRollup(source: {
  learningProgress?: number | null
  revisionProgress?: number | null
  practiceProgress?: number | null
  testProgress?: number | null
  overallProgress?: number | null
}): TopicProgress & { overall: number } {
  const progress = getProgressSummary(source)

  return {
    learning: progress.learning,
    revision: progress.revision,
    practice: progress.practice,
    test: progress.test,
    overall: progress.overall,
  }
}

function statsFromRollup(
  totalTopics: number,
  percentage: number
): ProgressStats {
  return {
    totalTopics,
    completedTopics: Math.round((totalTopics * percentage) / 100),
    percentage,
  }
}

function statsFromTestEvidence(evidence: TestProgressEvidence): ProgressStats {
  return {
    totalTopics: evidence.targetRecords,
    completedTopics: evidence.completedRecords,
    percentage: evidence.percentage,
  }
}

function aggregateProgressStats(
  chapterProgress: ChapterProgress[]
): SubjectProgress["stats"] {
  const modes = ["learning", "revision", "practice", "test"] as const

  return modes.reduce(
    (stats, mode) => {
      const totalTopics = chapterProgress.reduce(
        (total, chapter) => total + chapter.stats[mode].totalTopics,
        0
      )
      const completedTopics = chapterProgress.reduce(
        (total, chapter) => total + chapter.stats[mode].completedTopics,
        0
      )
      const weightedProgress = chapterProgress.reduce(
        (total, chapter) =>
          total +
          chapter.stats[mode].percentage * chapter.stats[mode].totalTopics,
        0
      )

      stats[mode] = {
        totalTopics,
        completedTopics,
        percentage:
          totalTopics > 0
            ? Math.round((weightedProgress / totalTopics) * 10) / 10
            : 0,
      }

      return stats
    },
    {} as SubjectProgress["stats"]
  )
}

/**
 * Calculate progress for a single topic across all study modes
 */
export function calculateTopicProgress(topic: Topic): TopicProgress {
  return calculateTopicProgressSnapshot(topic)
}

/**
 * Calculate if a topic is completed for a specific category
 */
export function isTopicCompletedForCategory(
  topic: Topic,
  category: "learning" | "revision" | "practice" | "test"
): boolean {
  return isTopicModeCompleted(topic, category)
}

/**
 * Calculate if a topic is fully completed
 */
export function isTopicCompleted(topic: Topic): boolean {
  return (
    isTopicCompletedForCategory(topic, "learning") &&
    isTopicCompletedForCategory(topic, "revision") &&
    isTopicCompletedForCategory(topic, "practice") &&
    isTopicCompletedForCategory(topic, "test")
  )
}

/**
 * Calculate progress stats for a specific category
 */
export function calculateProgressStats(
  topics: Topic[],
  category: "learning" | "revision" | "practice" | "test"
): ProgressStats {
  return calculateModeProgressStats(topics, category)
}

/**
 * Calculate foundation level based on weighted progress
 */
export function calculateFoundationLevel(progress: {
  learning: number
  revision: number
  practice: number
  test: number
  overall?: number
}): FoundationLevel {
  const overallProgress =
    progress.overall ?? calculateWeightedOverallProgress(progress)

  if (overallProgress >= 80) return "Advanced"
  if (overallProgress >= 50) return "Moderate"
  return "Beginner"
}

/**
 * Calculate expected marks based on test performance
 */
export function calculateExpectedMarks(
  subject: SubjectWithRelations
): number | null {
  return calculateExpectedMarksEvidence({
    chapterIds: getSafeChapters(subject).map((chapter) => chapter.id),
    records: subject.testRecords,
    weightage: subject.weightage,
  }).expectedMarks
}

/**
 * Calculate progress for a chapter including all its topics
 */
export function calculateChapterProgress(
  chapter: ChapterWithRelations,
  policy?: SubjectProgressPolicy
): ChapterProgress {
  const topics = getSafeTopics(chapter)
  const totalTopics = topics.length

  if (totalTopics === 0) {
    const topicCount = chapter.topicCount || 0
    const progress = getProgressFromRollup(chapter)

    return {
      ...progress,
      stats: {
        learning: statsFromRollup(topicCount, progress.learning),
        revision: statsFromRollup(topicCount, progress.revision),
        practice: statsFromRollup(topicCount, progress.practice),
        test: statsFromRollup(topicCount, progress.test),
      },
    }
  }

  const normalizedPolicy = normalizeSubjectProgressPolicy(policy)
  const testEvidence = calculateChapterTestProgress(
    chapter.testRecords,
    normalizedPolicy.chapterTestTarget
  )
  const testProgress = testEvidence.percentage
  const progress = calculateProgressRollup(
    topics,
    normalizedPolicy,
    testProgress
  )

  // Calculate stats for each category
  const stats = {
    learning: calculateModeProgressStats(topics, "learning", normalizedPolicy),
    revision: calculateModeProgressStats(topics, "revision", normalizedPolicy),
    practice: calculateModeProgressStats(topics, "practice", normalizedPolicy),
    test: statsFromTestEvidence(testEvidence),
  }

  const overall = progress.overall

  return {
    ...progress,
    overall,
    stats,
  }
}

/**
 * Calculate progress for a subject including all chapters and tests
 */
export function calculateSubjectProgress(
  subject: SubjectWithRelations
): SubjectProgress {
  const chapters = getSafeChapters(subject)
  const policy = normalizeSubjectProgressPolicy(subject.progressPolicy)
  const chapterIds = chapters.map((chapter) => chapter.id)
  const testEvidence = calculateSubjectTestProgress({
    chapterIds,
    records: subject.testRecords,
    policy,
  })
  const marksEvidence = calculateExpectedMarksEvidence({
    chapterIds,
    records: subject.testRecords,
    weightage: subject.weightage,
  })
  const expectedMarksEvidence = {
    percentage: marksEvidence.percentage,
    chapterAveragePercentage: marksEvidence.chapterAveragePercentage,
    subjectAveragePercentage: marksEvidence.subjectAveragePercentage,
    validChapterRecords: marksEvidence.validChapterRecords,
    validSubjectRecords: marksEvidence.validSubjectRecords,
    testedChapters: marksEvidence.testedChapters,
    activeChapters: marksEvidence.activeChapters,
    chapterCoveragePercentage: marksEvidence.chapterCoveragePercentage,
    coverageStatus: marksEvidence.coverageStatus,
  }

  if (chapters.length === 0) {
    const storedProgress = getProgressFromRollup(subject)
    const progress = {
      ...storedProgress,
      test: testEvidence.percentage,
      overall: calculateWeightedOverallProgress({
        ...storedProgress,
        test: testEvidence.percentage,
      }),
    }
    const totalTopics = subject.topicCount || 0
    const completedTopics = Math.round((totalTopics * progress.learning) / 100)

    return {
      ...progress,
      foundationLevel:
        (subject.foundationLevel as FoundationLevel) ||
        calculateFoundationLevel(progress),
      expectedMarks: marksEvidence.expectedMarks,
      expectedMarksEvidence,
      testEvidence,
      stats: {
        learning: {
          totalTopics,
          completedTopics,
          percentage: progress.learning,
        },
        revision: {
          totalTopics,
          completedTopics: Math.round((totalTopics * progress.revision) / 100),
          percentage: progress.revision,
        },
        practice: {
          totalTopics,
          completedTopics: Math.round((totalTopics * progress.practice) / 100),
          percentage: progress.practice,
        },
        test: statsFromTestEvidence(testEvidence),
      },
    }
  }

  const allTopics = chapters.flatMap((chapter) => getSafeTopics(chapter))

  if (allTopics.length > 0) {
    const testProgress = testEvidence.percentage
    const progress = calculateProgressRollup(allTopics, policy, testProgress)
    const stats = {
      learning: calculateModeProgressStats(allTopics, "learning", policy),
      revision: calculateModeProgressStats(allTopics, "revision", policy),
      practice: calculateModeProgressStats(allTopics, "practice", policy),
      test: statsFromTestEvidence(testEvidence),
    }

    return {
      learning: progress.learning,
      revision: progress.revision,
      practice: progress.practice,
      test: progress.test,
      overall: progress.overall,
      foundationLevel: calculateFoundationLevel(progress),
      expectedMarks: marksEvidence.expectedMarks,
      expectedMarksEvidence,
      testEvidence,
      stats,
    }
  }

  // Lightweight chapter rollups from list APIs do not include topics. In that
  // case, use topic-count-weighted chapter stats instead of equal chapter averages.
  const chapterProgress = chapters.map((chapter) =>
    calculateChapterProgress(chapter, policy)
  )

  // Aggregate stats from all chapters for reference. This supports both full
  // topic payloads and lightweight chapter rollups from list APIs.
  const stats = aggregateProgressStats(chapterProgress)
  const progress = {
    learning: stats.learning.percentage,
    revision: stats.revision.percentage,
    practice: stats.practice.percentage,
    test: testEvidence.percentage,
  }

  const overall = calculateWeightedOverallProgress(progress)

  // Calculate foundation level based on weighted progress
  const foundationLevel = calculateFoundationLevel(progress)

  // Calculate expected marks based on test performance only
  return {
    ...progress,
    overall,
    foundationLevel,
    expectedMarks: marksEvidence.expectedMarks,
    expectedMarksEvidence,
    testEvidence,
    stats: {
      ...stats,
      test: statsFromTestEvidence(testEvidence),
    },
  }
}

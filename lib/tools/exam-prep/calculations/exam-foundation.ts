import { ExamFoundationLevel, ExamFoundationResult } from "./types"
import {
  getProgressSummary,
  type ProgressSummarySource,
} from "@/lib/tools/exam-prep/progress/selectors"

type FoundationSubject = ProgressSummarySource & {
  weightage: number
}

const FOUNDATION_LEVELS: ExamFoundationLevel[] = [
  {
    level: 1,
    title: "Novice Explorer",
    description:
      "Beginning the journey with basic topic exploration and initial learning.",
    minProgress: 0,
    requirements: {
      learning: 10,
      revision: 0,
      practice: 0,
      test: 0,
    },
  },
  {
    level: 2,
    title: "Basic Learner",
    description:
      "Building basic understanding of core concepts across subjects.",
    minProgress: 11,
    requirements: {
      learning: 20,
      revision: 10,
      practice: 5,
      test: 0,
    },
  },
  {
    level: 3,
    title: "Steady Beginner",
    description: "Developing consistent learning patterns and topic coverage.",
    minProgress: 21,
    requirements: {
      learning: 35,
      revision: 20,
      practice: 15,
      test: 10,
    },
  },
  {
    level: 4,
    title: "Foundation Builder",
    description: "Mastering core concepts with regular practice and revision.",
    minProgress: 31,
    requirements: {
      learning: 45,
      revision: 30,
      practice: 25,
      test: 20,
    },
  },
  {
    level: 5,
    title: "Intermediate Practitioner",
    description: "Balanced progress across learning, revision, and practice.",
    minProgress: 41,
    requirements: {
      learning: 55,
      revision: 45,
      practice: 40,
      test: 35,
    },
  },
  {
    level: 6,
    title: "Advanced Learner",
    description: "Deep understanding with strong problem-solving abilities.",
    minProgress: 51,
    requirements: {
      learning: 70,
      revision: 60,
      practice: 55,
      test: 50,
    },
  },
  {
    level: 7,
    title: "Competent Solver",
    description:
      "Proficient in solving complex problems with good test performance.",
    minProgress: 61,
    requirements: {
      learning: 80,
      revision: 70,
      practice: 65,
      test: 60,
    },
  },
  {
    level: 8,
    title: "Expert Candidate",
    description:
      "Advanced preparation with strong performance across all areas.",
    minProgress: 71,
    requirements: {
      learning: 85,
      revision: 80,
      practice: 75,
      test: 70,
    },
  },
  {
    level: 9,
    title: "Master Aspirant",
    description: "Near complete mastery with excellent test performance.",
    minProgress: 81,
    requirements: {
      learning: 90,
      revision: 85,
      practice: 85,
      test: 80,
    },
  },
  {
    level: 10,
    title: "Champion",
    description: "Complete preparation with outstanding performance.",
    minProgress: 91,
    requirements: {
      learning: 95,
      revision: 90,
      practice: 90,
      test: 85,
    },
  },
]

interface ProgressMetrics {
  learning: number
  revision: number
  practice: number
  test: number
  overall: number
}

function calculateOverallProgress(
  subjects: FoundationSubject[]
): ProgressMetrics {
  if (subjects.length === 0) {
    return {
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      overall: 0,
    }
  }

  // Calculate weighted progress based on subject weightage
  const totalWeightage = subjects.reduce(
    (sum, subject) => sum + subject.weightage,
    0
  )

  const weightedProgress = subjects.reduce(
    (acc, subject) => {
      const progress = getProgressSummary(subject)
      const weight = subject.weightage / totalWeightage

      return {
        learning: acc.learning + progress.learning * weight,
        revision: acc.revision + progress.revision * weight,
        practice: acc.practice + progress.practice * weight,
        test: acc.test + progress.test * weight,
        overall: acc.overall + progress.overall * weight,
      }
    },
    {
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      overall: 0,
    }
  )

  // Round all values to 1 decimal place
  return {
    learning: Math.round(weightedProgress.learning * 10) / 10,
    revision: Math.round(weightedProgress.revision * 10) / 10,
    practice: Math.round(weightedProgress.practice * 10) / 10,
    test: Math.round(weightedProgress.test * 10) / 10,
    overall: Math.round(weightedProgress.overall * 10) / 10,
  }
}

function determineFoundationLevel(
  progress: ProgressMetrics
): ExamFoundationLevel {
  // Find the appropriate level based on overall progress first
  let appropriateLevel = FOUNDATION_LEVELS[0]

  for (let i = 0; i < FOUNDATION_LEVELS.length; i++) {
    const level = FOUNDATION_LEVELS[i]
    if (progress.overall >= level.minProgress) {
      appropriateLevel = level
    } else {
      break
    }
  }

  return appropriateLevel
}

function identifyStrengths(progress: ProgressMetrics): string[] {
  const strengths: string[] = []

  if (progress.learning > progress.overall + 10) {
    strengths.push("Strong conceptual learning")
  }
  if (progress.revision > progress.overall + 10) {
    strengths.push("Excellent revision habits")
  }
  if (progress.practice > progress.overall + 10) {
    strengths.push("Strong problem-solving practice")
  }
  if (progress.test > progress.overall + 10) {
    strengths.push("Outstanding test performance")
  }

  return strengths
}

function identifyAreasToImprove(progress: ProgressMetrics): string[] {
  const areas: string[] = []

  if (progress.learning < progress.overall - 10) {
    areas.push("Focus on conceptual learning")
  }
  if (progress.revision < progress.overall - 10) {
    areas.push("Increase revision frequency")
  }
  if (progress.practice < progress.overall - 10) {
    areas.push("More problem-solving practice needed")
  }
  if (progress.test < progress.overall - 10) {
    areas.push("Improve test performance")
  }

  return areas
}

export function calculateExamFoundation(
  subjects: FoundationSubject[]
): ExamFoundationResult {
  const progress = calculateOverallProgress(subjects)
  const currentLevel = determineFoundationLevel(progress)

  // Find next level
  const nextLevelIndex =
    FOUNDATION_LEVELS.findIndex((level) => level.level === currentLevel.level) +
    1
  const nextLevel =
    nextLevelIndex < FOUNDATION_LEVELS.length
      ? FOUNDATION_LEVELS[nextLevelIndex]
      : null

  // Calculate progress to next level
  const progressToNextLevel = nextLevel
    ? Math.min(
        100,
        ((progress.overall - currentLevel.minProgress) /
          (nextLevel.minProgress - currentLevel.minProgress)) *
          100
      )
    : 100

  return {
    currentLevel,
    nextLevel,
    progressToNextLevel,
    strengths: identifyStrengths(progress),
    areasToImprove: identifyAreasToImprove(progress),
    overallProgress: progress.overall,
  }
}

// Export levels for UI usage
export const foundationLevels = FOUNDATION_LEVELS

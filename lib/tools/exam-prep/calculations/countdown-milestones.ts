import { differenceInDays } from "date-fns"

// Standard GATE preparation milestones (days before exam)
const GATE_MILESTONES = {
  LEARNING_DEADLINE: 60, // Complete learning phase 2 months before exam
  REVISION_DEADLINE: 45, // Complete first revision 1.5 months before exam
  PRACTICE_DEADLINE: 30, // Complete practice phase 1 month before exam
  MOCK_TESTS_START: 30, // Start mock tests 1 month before exam
  FINAL_REVISION: 15, // Start final revision 15 days before exam
  QUICK_REVISION: 7, // Quick revision week before exam
  EXAM_DAY: 0,
} as const

export interface CountdownMilestone {
  label: string
  daysLeft: number
  isUpcoming: boolean
  isPassed: boolean
  isCurrent: boolean
  progress: number
  recommendation: string
}

export interface ExamCountdown {
  daysLeft: number
  currentPhase: string
  progress: {
    overall: number
    learning: number
    revision: number
    practice: number
    test: number
  }
  milestones: CountdownMilestone[]
  recommendation: string
}

function calculatePhaseStatus(
  progress: number,
  deadline: number,
  daysLeft: number
): {
  isUpcoming: boolean
  isPassed: boolean
  isCurrent: boolean
} {
  const isUpcoming = daysLeft > deadline
  const isPassed = daysLeft < deadline - 15 // Consider a phase passed if we're 15 days past its deadline
  const isCurrent = !isUpcoming && !isPassed

  return { isUpcoming, isPassed, isCurrent }
}

function getRecommendation(
  progress: {
    learning: number
    revision: number
    practice: number
    test: number
  },
  daysLeft: number
): string {
  if (daysLeft > GATE_MILESTONES.LEARNING_DEADLINE) {
    if (progress.learning < 50) {
      return "Focus on completing the learning phase. You should aim to complete basic concepts first."
    } else if (progress.learning < 80) {
      return "Good progress on learning! Keep going and start light revision of completed topics."
    } else {
      return "Excellent learning progress! Start focusing on revision and practice problems."
    }
  } else if (daysLeft > GATE_MILESTONES.REVISION_DEADLINE) {
    if (progress.learning < 90) {
      return "Warning: Speed up your learning phase. You should be almost done with basics by now."
    } else if (progress.revision < 50) {
      return "Focus on revision. Aim to revise all completed topics at least once."
    } else {
      return "Good revision progress! Start incorporating practice problems."
    }
  } else if (daysLeft > GATE_MILESTONES.PRACTICE_DEADLINE) {
    if (progress.revision < 70) {
      return "Warning: Increase revision pace. Start practice problems for strong topics."
    } else if (progress.practice < 30) {
      return "Focus on solving more practice problems and previous year questions."
    } else {
      return "Balance revision with practice. Start preparing for mock tests."
    }
  } else if (daysLeft > GATE_MILESTONES.FINAL_REVISION) {
    if (progress.practice < 60) {
      return "Focus on solving full-length practice tests and analyzing mistakes."
    } else if (progress.test < 40) {
      return "Take more mock tests and work on time management."
    } else {
      return "Good progress! Focus on weak areas identified from mock tests."
    }
  } else {
    return "Final stretch! Focus on quick revisions and stay confident."
  }
}

export function calculateCountdown(
  examDate: Date,
  progress: {
    overall: number
    learning: number
    revision: number
    practice: number
    test: number
  }
): ExamCountdown {
  const now = new Date()
  const daysLeft = differenceInDays(examDate, now)

  // Calculate current phase
  let currentPhase = "Learning"
  if (daysLeft <= GATE_MILESTONES.QUICK_REVISION)
    currentPhase = "Final Preparation"
  else if (daysLeft <= GATE_MILESTONES.FINAL_REVISION)
    currentPhase = "Final Revision"
  else if (daysLeft <= GATE_MILESTONES.PRACTICE_DEADLINE)
    currentPhase = "Mock Tests"
  else if (daysLeft <= GATE_MILESTONES.REVISION_DEADLINE)
    currentPhase = "Practice"
  else if (daysLeft <= GATE_MILESTONES.LEARNING_DEADLINE)
    currentPhase = "Revision"

  // Generate milestones
  const milestones: CountdownMilestone[] = [
    {
      label: "Complete Learning Phase",
      daysLeft: Math.max(
        0,
        daysLeft - (daysLeft - GATE_MILESTONES.LEARNING_DEADLINE)
      ),
      ...calculatePhaseStatus(
        progress.learning,
        GATE_MILESTONES.LEARNING_DEADLINE,
        daysLeft
      ),
      progress: progress.learning,
      recommendation:
        "Focus on understanding core concepts and completing syllabus",
    },
    {
      label: "First Revision Round",
      daysLeft: Math.max(
        0,
        daysLeft - (daysLeft - GATE_MILESTONES.REVISION_DEADLINE)
      ),
      ...calculatePhaseStatus(
        progress.revision,
        GATE_MILESTONES.REVISION_DEADLINE,
        daysLeft
      ),
      progress: progress.revision,
      recommendation: "Revise completed topics and solve basic problems",
    },
    {
      label: "Practice Phase",
      daysLeft: Math.max(
        0,
        daysLeft - (daysLeft - GATE_MILESTONES.PRACTICE_DEADLINE)
      ),
      ...calculatePhaseStatus(
        progress.practice,
        GATE_MILESTONES.PRACTICE_DEADLINE,
        daysLeft
      ),
      progress: progress.practice,
      recommendation: "Focus on problem-solving and previous year questions",
    },
    {
      label: "Mock Tests",
      daysLeft: Math.max(
        0,
        daysLeft - (daysLeft - GATE_MILESTONES.MOCK_TESTS_START)
      ),
      ...calculatePhaseStatus(
        progress.test,
        GATE_MILESTONES.MOCK_TESTS_START,
        daysLeft
      ),
      progress: progress.test,
      recommendation: "Take full-length mock tests and analyze performance",
    },
  ]

  return {
    daysLeft,
    currentPhase,
    progress,
    milestones,
    recommendation: getRecommendation(progress, daysLeft),
  }
}

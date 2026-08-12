import type { Progress } from "@/types/progressapp/progress"
import { calculateWeightedOverallProgress } from "./rules"

export type ProgressSummarySource = {
  overallProgress?: number | null
  learningProgress?: number | null
  revisionProgress?: number | null
  practiceProgress?: number | null
  testProgress?: number | null
}

function toProgressNumber(value: number | null | undefined): number {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(100, Math.round(numericValue * 10) / 10))
}

function deriveOverallProgress(source: ProgressSummarySource): number {
  const explicitOverall = toProgressNumber(source.overallProgress)
  const learning = toProgressNumber(source.learningProgress)
  const revision = toProgressNumber(source.revisionProgress)
  const practice = toProgressNumber(source.practiceProgress)
  const test = toProgressNumber(source.testProgress)
  const weightedOverall = calculateWeightedOverallProgress({
    learning,
    revision,
    practice,
    test,
  })

  if (explicitOverall > 0 || weightedOverall === 0) {
    return explicitOverall
  }

  return weightedOverall
}

export function getProgressSummary(source: ProgressSummarySource): Progress {
  return {
    overall: deriveOverallProgress(source),
    learning: toProgressNumber(source.learningProgress),
    revision: toProgressNumber(source.revisionProgress),
    practice: toProgressNumber(source.practiceProgress),
    test: toProgressNumber(source.testProgress),
  }
}

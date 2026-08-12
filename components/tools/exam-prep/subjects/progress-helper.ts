import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"
import type { SubjectCategory } from "./subject-card"

export interface CanonicalSubjectProgress {
  overall: number
  learning: number
  revision: number
  practice: number
  test: number
  category: SubjectCategory
  foundationLevel: string
  expectedMarks: number | null
}

/**
 * Clamps and safely normalizes a progress value to be an integer between 0 and 100.
 */
export function clampProgress(val: number): number {
  if (typeof val !== "number" || isNaN(val)) return 0
  return Math.max(0, Math.min(100, Math.round(val)))
}

/**
 * Maps overall progress to its respective SubjectCategory based on the rules:
 * - 0 = not-started
 * - greater than 0 and less than 100 = in-progress
 * - 100 = completed
 */
export function getSubjectCategory(overallProgress: number): SubjectCategory {
  const rounded = clampProgress(overallProgress)
  if (rounded <= 0) return "not-started"
  if (rounded >= 100) return "completed"
  return "in-progress"
}

/**
 * Unified canonical progress calculations for a Subject.
 * Ensures the category, displayed percentage, and progress bars cannot disagree.
 */
export function getCanonicalSubjectProgress(
  subject: SubjectWithRelations
): CanonicalSubjectProgress {
  if (!subject) {
    return {
      overall: 0,
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      category: "not-started",
      foundationLevel: "Beginner",
      expectedMarks: null,
    }
  }

  const rawProgress = calculateSubjectProgress(subject)

  const overall = clampProgress(rawProgress.overall ?? 0)
  const learning = clampProgress(rawProgress.learning ?? 0)
  const revision = clampProgress(rawProgress.revision ?? 0)
  const practice = clampProgress(rawProgress.practice ?? 0)
  const test = clampProgress(rawProgress.test ?? 0)

  const category = getSubjectCategory(overall)

  return {
    overall,
    learning,
    revision,
    practice,
    test,
    category,
    foundationLevel: rawProgress.foundationLevel || "Beginner",
    expectedMarks:
      rawProgress.expectedMarks === null
        ? null
        : Math.max(0, Math.round(rawProgress.expectedMarks * 10) / 10),
  }
}

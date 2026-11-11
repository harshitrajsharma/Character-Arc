import type {
  AssessmentDetail,
  RecentAttemptItem,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

export type AssessmentOverview = Omit<
  AssessmentDetail,
  "questions" | "sections" | "isPublishable"
> & {
  questionMarks: number
  penalty: { minimum: number; maximum: number }
  sections: Array<SectionDefinition & { questionCount: number; marks: number }>
  unsectioned: { questionCount: number; marks: number }
  coverage: {
    items: Array<{
      id: string
      title: string
      type: string
      questionCount: number
      context?: string
      subject?: { id: string; examId: string }
    }>
    total: number
    page: number
    pageSize: number
    totalPages: number
    unmapped: number
  }
}

export type AssessmentActivity = {
  active: RecentAttemptItem | null
  latest: RecentAttemptItem | null
  trend: RecentAttemptItem[]
  evaluatedCount: number
}

/** UI eligibility only; Server Actions retain authoritative access checks. */
export function assessmentCapabilities({
  status,
  canWrite,
  questionCount,
  hasActiveAttempt,
}: {
  status: AssessmentOverview["status"]
  canWrite: boolean
  questionCount: number
  hasActiveAttempt: boolean
}) {
  const editable = canWrite && status !== "archived"
  const playable = canWrite && status === "published" && questionCount > 0
  return {
    edit: editable,
    share: editable && status === "published",
    start: playable && !hasActiveAttempt,
    resume: playable && hasActiveAttempt,
  }
}

export function attemptPercentage(
  score: number | null,
  maximum: number | null
) {
  return score !== null && maximum !== null && maximum > 0
    ? Math.round((score / maximum) * 10000) / 100
    : null
}

/** Matches markResponse: legacy positive penalties do not award or deduct marks. */
export function scoringPenaltyRange(minimum: number, maximum: number) {
  return { minimum: Math.min(minimum, 0), maximum: Math.min(maximum, 0) }
}

export type ExamScheduleStatus =
  "expected" | "announced" | "confirmed" | "postponed" | "cancelled"

export type ScoringRules = {
  correctMarks?: unknown
  incorrectMarks?: unknown
  unansweredMarks?: unknown
}

export type ExamDetailHeaderData = {
  id: string
  title: string
  summary: string | null
  expectedStartDate: string | null
  officialStartAt: string | null
  scheduleStatus: ExamScheduleStatus
  targetMarks: number | null
  examCode: string | null
  conductingBody: string | null
  durationMinutes: number | null
  totalMarks: number | null
  officialUrl: string | null
  scoringRules: ScoringRules | null | undefined
}

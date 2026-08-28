import { CalendarClockIcon, CalendarPlusIcon, TrophyIcon } from "lucide-react"

type ExamCountdownSummaryProps = {
  examDate: string | null
}

function getDaysRemaining(examDate: string): number | null {
  const target = new Date(`${examDate}T00:00:00.000Z`)
  if (Number.isNaN(target.getTime())) return null

  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate()
  )
  return Math.ceil((targetDay - today) / 86_400_000)
}

export function ExamCountdownSummary({ examDate }: ExamCountdownSummaryProps) {
  const daysRemaining = examDate ? getDaysRemaining(examDate) : null

  if (daysRemaining === null) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
        <CalendarPlusIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
        <span>Set exam date</span>
      </div>
    )
  }

  if (daysRemaining <= 0) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-brand-amber-line bg-brand-amber-soft px-3 text-sm font-medium text-brand-amber-ink">
        <TrophyIcon className="size-4" aria-hidden="true" />
        <span>{daysRemaining === 0 ? "Exam today" : "Exam date passed"}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-brand-violet-line bg-brand-violet-soft px-3 text-sm text-brand-violet-ink">
      <CalendarClockIcon className="size-4" aria-hidden="true" />
      <span className="font-semibold tabular-nums">{daysRemaining} days</span>
      <span className="text-muted-foreground">to exam</span>
    </div>
  )
}

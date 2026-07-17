import { ActivityIcon, CalendarClockIcon, CheckCircle2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
})

type ArcProgressPanelProps = {
  progressPercent?: number | null
  completedMilestones?: number
  totalMilestones?: number
  checkInCount?: number
  lastActivityAt?: string | null
  children?: React.ReactNode
}

export function ArcProgressPanel({
  progressPercent = 0,
  completedMilestones = 0,
  totalMilestones = 0,
  checkInCount = 0,
  lastActivityAt,
  children,
}: ArcProgressPanelProps) {
  const progress = Math.min(100, Math.max(0, progressPercent ?? 0))

  return (
    <aside className="rounded-lg border border-border bg-card p-5 text-card-foreground lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Arc signal
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold">Progress</h2>
        </div>
        <Badge variant="outline">
          <ActivityIcon aria-hidden="true" />
          {Math.round(progress)}%
        </Badge>
      </div>

      <div className="mt-5">
        <div
          className="h-2 overflow-hidden rounded-full bg-brand-neon-soft"
          role="progressbar"
          aria-label="Arc progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span
            className="block h-full rounded-full bg-brand-neon transition-[width] duration-200 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
            {totalMilestones
              ? `${completedMilestones} of ${totalMilestones} milestones complete`
              : `${checkInCount} check-in ${checkInCount === 1 ? "signal" : "signals"} recorded`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClockIcon className="size-3.5" aria-hidden="true" />
            {lastActivityAt
              ? `Last activity ${DATE_TIME_FORMATTER.format(new Date(lastActivityAt))}`
              : "No check-ins yet"}
          </span>
        </div>
      </div>

      {children ? (
        <div className="mt-6 border-t border-border pt-6">{children}</div>
      ) : null}
    </aside>
  )
}

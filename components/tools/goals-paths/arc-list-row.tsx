import Link from "next/link"
import { ArrowRightIcon, RouteIcon } from "lucide-react"

import { parseIsoLocalDate } from "@/lib/dates/local-date"

export type ArcListRowData = {
  id: string
  title: string
  summary: string | null
  createdAt: string
  targetDate?: string | null
  progressPercent?: number | null
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value))
}

export function ArcListRow({ arc }: { arc: ArcListRowData }) {
  const progress = Math.min(100, Math.max(0, arc.progressPercent ?? 0))
  const targetDate = parseIsoLocalDate(arc.targetDate)
  const timelineLabel = targetDate
    ? `Target ${DATE_FORMATTER.format(targetDate)}`
    : `Started ${formatDate(arc.createdAt)}`

  return (
    <article className="group relative border-b border-border last:border-b-0 focus-within:bg-accent hover:bg-accent">
      <Link
        href={`/tools/goals-paths/${arc.id}`}
        className="grid min-h-24 min-w-0 grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-x-3 gap-y-2 px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:min-h-20 sm:grid-cols-[3rem_minmax(0,1fr)_9.5rem_8rem_1.5rem] sm:gap-4 sm:px-4"
      >
        <span className="flex size-12 items-center justify-center rounded-md bg-brand-neon-soft text-brand-neon-ink">
          <RouteIcon aria-hidden="true" />
        </span>

        <span className="min-w-0">
          <span className="block truncate font-heading text-base font-semibold sm:text-lg">
            {arc.title}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {arc.summary ||
              "No summary yet. Open this arc to review its direction."}
          </span>
        </span>

        <span className="col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-3 sm:contents">
          <span className="min-w-0 truncate text-xs text-muted-foreground sm:col-start-3 sm:row-start-1 sm:text-right sm:text-sm">
            {timelineLabel}
          </span>

          <span className="flex w-24 shrink-0 items-center gap-2 sm:col-start-4 sm:row-start-1 sm:w-32">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-neon-soft">
              <span
                className="block h-full rounded-full bg-brand-neon transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="w-8 text-right font-mono text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </span>
        </span>

        <ArrowRightIcon
          className="col-start-3 row-span-2 row-start-1 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none sm:col-start-5 sm:row-span-1"
          aria-hidden="true"
        />
      </Link>
    </article>
  )
}

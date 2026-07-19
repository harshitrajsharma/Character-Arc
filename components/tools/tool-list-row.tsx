import Link from "next/link"
import { ArrowRightIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ToolListRowProps {
  href: string
  title: string
  summary: string | null
  emptySummaryText?: string
  icon: LucideIcon
  iconClassName?: string
  progressClassName?: string
  progressContainerClassName?: string
  progressPercent?: number | null
  timelineLabel?: React.ReactNode
}

export function ToolListRow({
  href,
  title,
  summary,
  emptySummaryText,
  icon: Icon,
  iconClassName = "bg-accent text-accent-foreground",
  progressClassName = "bg-primary",
  progressContainerClassName = "bg-primary/20",
  progressPercent,
  timelineLabel,
}: ToolListRowProps) {
  const hasProgress = progressPercent !== undefined && progressPercent !== null
  const progress = hasProgress ? Math.min(100, Math.max(0, progressPercent)) : 0

  return (
    <article className="group relative border-b border-border last:border-b-0 focus-within:bg-accent hover:bg-accent">
      <Link
        href={href}
        className="grid min-h-24 min-w-0 grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-x-3 gap-y-2 px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:min-h-20 sm:grid-cols-[3rem_minmax(0,1fr)_9.5rem_8rem_1.5rem] sm:gap-4 sm:px-4"
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-md transition-colors",
            iconClassName
          )}
        >
          <Icon aria-hidden="true" />
        </span>

        <span className="min-w-0">
          <span className="block truncate font-heading text-base font-semibold sm:text-lg">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {summary || emptySummaryText || "No details provided."}
          </span>
        </span>

        <span className="col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-3 sm:contents">
          <span className="min-w-0 truncate text-xs text-muted-foreground sm:col-start-3 sm:row-start-1 sm:text-right sm:text-sm">
            {timelineLabel}
          </span>

          {hasProgress && (
            <span className="flex w-24 shrink-0 items-center gap-2 sm:col-start-4 sm:row-start-1 sm:w-32">
              <span
                className={cn(
                  "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full",
                  progressContainerClassName
                )}
              >
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
                    progressClassName
                  )}
                  style={{ width: `${progress}%` }}
                />
              </span>
              <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </span>
          )}
        </span>

        <ArrowRightIcon
          className="col-start-3 row-span-2 row-start-1 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none sm:col-start-5 sm:row-span-1"
          aria-hidden="true"
        />
      </Link>
    </article>
  )
}

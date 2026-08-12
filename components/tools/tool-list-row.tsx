import Link from "next/link"
import { ArrowRightIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

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
  trailingAction?: ReactNode
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
  trailingAction,
}: ToolListRowProps) {
  const hasProgress = progressPercent !== undefined && progressPercent !== null
  const progress = hasProgress ? Math.min(100, Math.max(0, progressPercent)) : 0
  const hasTimeline = timelineLabel !== undefined && timelineLabel !== null
  const hasMetadata = hasTimeline || hasProgress
  const displaySummary = summary || emptySummaryText || "No details provided."

  return (
    <article className="group relative border-b border-border last:border-b-0 focus-within:bg-accent hover:bg-accent">
      <Link
        href={href}
        className={cn(
          "grid min-h-20 min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_1.5rem] items-start gap-x-3 px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:grid-cols-[3rem_minmax(0,1fr)_1.5rem] sm:gap-x-4 sm:px-4 lg:grid-cols-[3rem_minmax(0,1fr)_13rem_11rem_1.5rem] lg:items-center",
          trailingAction &&
            "grid-cols-[2.75rem_minmax(0,1fr)] pr-14 sm:grid-cols-[3rem_minmax(0,1fr)] sm:pr-16"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-md transition-colors sm:mt-0 sm:size-12",
            iconClassName
          )}
        >
          <Icon aria-hidden="true" />
        </span>

        <span className="min-w-0 lg:contents">
          <span className="min-w-0 lg:col-start-2 lg:row-start-1">
            <span className="line-clamp-2 block font-heading text-base font-semibold sm:truncate sm:text-lg">
              {title}
            </span>
            {summary || emptySummaryText ? (
              <span className="mt-0.5 hidden text-sm leading-5 text-muted-foreground sm:block lg:truncate">
                {displaySummary}
              </span>
            ) : null}
          </span>

          {hasMetadata ? (
            <span className="mt-2 flex min-w-0 items-center justify-between gap-3 lg:contents">

              {hasTimeline ? (
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground md:text-sm lg:col-start-3 lg:row-start-1 lg:text-right">
                  {timelineLabel}
                </span>
              ) : null}

              {hasProgress ? (
                <span
                  className={cn(
                    "flex w-28 min-w-0 shrink-0 items-center gap-2 sm:w-36 md:w-40 lg:col-start-4 lg:row-start-1 lg:w-full",
                    !hasTimeline && "ml-auto lg:ml-0"
                  )}
                >
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
              ) : null}
            </span>
          ) : null}
        </span>

        <ArrowRightIcon
          className={cn(
            "col-start-3 row-start-1 mt-3 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none lg:col-start-5 lg:mt-0",
            trailingAction && "hidden lg:block"
          )}
          aria-hidden="true"
        />
      </Link>
      {trailingAction ? (
        <div className="absolute top-3 right-3 z-10 lg:top-1/2 lg:right-4 lg:-translate-y-1/2">
          {trailingAction}
        </div>
      ) : null}
    </article>
  )
}

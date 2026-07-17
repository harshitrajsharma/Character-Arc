import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  Clock3Icon,
  BotIcon,
  LockKeyholeIcon,
  PauseCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { parseIsoLocalDate } from "@/lib/dates/local-date"

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  active: "In progress",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
}

function ArcStatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <CheckCircle2Icon aria-hidden="true" />
  }

  if (status === "paused") {
    return <PauseCircleIcon aria-hidden="true" />
  }

  if (status === "active") {
    return <Clock3Icon aria-hidden="true" />
  }

  return <CircleDashedIcon aria-hidden="true" />
}

export type ArcDetailHeaderProps = {
  title: string
  summary?: string | null
  status?: string | null
  createdAt: string
  targetDate?: string | null
  isPrivate?: boolean
  allowAgentAccess?: boolean
  actions?: ReactNode
}

export function ArcDetailHeader({
  title,
  summary,
  status = "not_started",
  createdAt,
  targetDate,
  isPrivate = true,
  allowAgentAccess = false,
  actions,
}: ArcDetailHeaderProps) {
  const currentStatus = status ?? "not_started"
  const target = parseIsoLocalDate(targetDate)

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/tools/goals-paths"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          All arcs
        </Link>
        {actions}
      </div>

      <header className="mt-5 border-b border-border pb-7 sm:pb-8">
        <div className="flex max-w-4xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <ArcStatusIcon status={currentStatus} />
              {STATUS_LABELS[currentStatus] ?? "In progress"}
            </Badge>
            {isPrivate ? (
              <Badge variant="secondary">
                <LockKeyholeIcon aria-hidden="true" />
                Private
              </Badge>
            ) : null}
            {allowAgentAccess ? (
              <Badge variant="secondary">
                <BotIcon aria-hidden="true" />
                Agent access
              </Badge>
            ) : null}
          </div>

          <div>
            <h1 className="max-w-3xl font-heading text-3xl leading-tight font-semibold break-words sm:text-4xl">
              {title}
            </h1>
            {summary ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {summary}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="size-4" aria-hidden="true" />
              Started {DATE_FORMATTER.format(new Date(createdAt))}
            </span>
            <span>
              {target
                ? `Target ${DATE_FORMATTER.format(target)}`
                : "No fixed deadline"}
            </span>
          </div>
        </div>
      </header>
    </>
  )
}

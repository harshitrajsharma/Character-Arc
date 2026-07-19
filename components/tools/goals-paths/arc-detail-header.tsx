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

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { parseIsoLocalDate } from "@/lib/dates/local-date"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

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

function HeaderSignal({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: "neon" | "cyan" | "amber" | "violet" | "neutral"
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-3xl border px-3 py-2",
        tone === "neon" &&
          "border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink",
        tone === "cyan" &&
          "border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink",
        tone === "amber" &&
          "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
        tone === "violet" &&
          "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink",
        tone === "neutral" && "border-border bg-muted/35 text-foreground"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/55">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] leading-none font-medium text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block truncate text-sm font-medium">{value}</span>
      </span>
    </div>
  )
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
  workspaceSlug: string
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
  workspaceSlug,
}: ArcDetailHeaderProps) {
  const currentStatus = status ?? "not_started"
  const target = parseIsoLocalDate(targetDate)

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={workspaceRoutes.goalsPaths.home(workspaceSlug)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          All arcs
        </Link>
        {actions}
      </div>

      <header className="mt-5 border-b border-border pb-7 sm:pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-neon-ink">
              Current arc
            </p>
            <h1 className="mt-2 max-w-4xl font-heading text-3xl leading-tight font-semibold warp-break-word text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {summary ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {summary}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 grid-cols-2 lg:grid-cols-2">
            <HeaderSignal
              tone="neon"
              label="Status"
              value={STATUS_LABELS[currentStatus] ?? "In progress"}
              icon={<ArcStatusIcon status={currentStatus} />}
            />
            {isPrivate ? (
              <HeaderSignal
                label="Visibility"
                value="Private"
                icon={<LockKeyholeIcon aria-hidden="true" />}
              />
            ) : null}
            {allowAgentAccess ? (
              <HeaderSignal
                tone="violet"
                label="Agent access"
                value="Allowed"
                icon={<BotIcon aria-hidden="true" />}
              />
            ) : null}
            <HeaderSignal
              tone="cyan"
              label="Started"
              value={DATE_FORMATTER.format(new Date(createdAt))}
              icon={<CalendarDaysIcon aria-hidden="true" />}
            />
            <HeaderSignal
              tone={target ? "amber" : "neutral"}
              label="Target"
              value={
                target ? DATE_FORMATTER.format(target) : "Open-ended"
              }
              icon={<Clock3Icon aria-hidden="true" />}
            />
          </div>
        </div>
      </header>
    </>
  )
}

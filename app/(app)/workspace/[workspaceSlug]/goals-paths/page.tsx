import type { Metadata } from "next"
import Link from "next/link"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDashedIcon,
  Clock3Icon,
  PauseCircleIcon,
  PlusIcon,
  RouteIcon,
  type LucideIcon,
} from "lucide-react"

import { ToolListRow } from "@/components/tools/tool-list-row"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { parseIsoLocalDate } from "@/lib/dates/local-date"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getGoalsPathsOverview } from "@/lib/tools/definitions/goals-paths/repository"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Goals and Paths" }

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value))
}

const ARC_GROUPS: Array<{
  key: "active" | "not_started" | "paused" | "completed"
  label: string
  icon: LucideIcon
  markerClassName: string
}> = [
  {
    key: "active",
    label: "In progress",
    icon: Clock3Icon,
    markerClassName: "bg-brand-neon",
  },
  {
    key: "not_started",
    label: "Not started",
    icon: CircleDashedIcon,
    markerClassName: "bg-muted-foreground",
  },
  {
    key: "paused",
    label: "Paused",
    icon: PauseCircleIcon,
    markerClassName: "bg-brand-amber",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2Icon,
    markerClassName: "bg-brand-cyan",
  },
]

export default async function GoalsPathsPage(props: { params: Promise<{ workspaceSlug: string }> }) {
  const params = await props.params
  const overview = await getGoalsPathsOverview(params.workspaceSlug)
  const arcGroups = ARC_GROUPS.map((group) => ({
    ...group,
    arcs: overview.arcs.filter((arc) => arc.lifecycleStatus === group.key),
  })).filter((group) => group.arcs.length > 0)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-24 pb-8 sm:pb-10">
      <ToolPageHeader
        eyebrow="Route log"
        title="Goals and Paths"
        description="Keep the truth about where you are, the outcome you want, and the evidence that you are moving connected in one place."
        icon={<RouteIcon aria-hidden="true" />}
        iconClassName="bg-brand-neon-soft text-brand-neon-ink"
        primaryAction={
          <Link href={workspaceRoutes.goalsPaths.new(params.workspaceSlug)} className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            New arc
          </Link>
        }
      />

      {overview.issue ? (
        <Alert variant="destructive" className="mt-6">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Your arcs are temporarily unavailable</AlertTitle>
          <AlertDescription>
            Your saved workspace data remains private. Refresh after the latest
            workspace setup has completed.
          </AlertDescription>
        </Alert>
      ) : null}

      {overview.issue ? null : overview.arcs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-brand-neon-soft text-brand-neon-ink"
            >
              <RouteIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Start your first arc</EmptyTitle>
            <EmptyDescription>
              Name one outcome and capture an honest current reality. You can
              map the route as evidence appears.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={workspaceRoutes.goalsPaths.new(params.workspaceSlug)} className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create an arc
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <section aria-labelledby="arcs-title" className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Your outcomes
              </p>
              <h2
                id="arcs-title"
                className="mt-1 font-heading text-xl font-semibold"
              >
                Current arcs
              </h2>
            </div>
            <Badge variant="outline">{overview.arcs.length} total</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border bg-card">
            {arcGroups.map((group, index) => {
              const GroupIcon = group.icon

              return (
                <section
                  key={group.key}
                  aria-labelledby={`arc-group-${group.key}`}
                  className={cn(index > 0 && "border-t border-border")}
                >
                  <header className="flex h-11 items-center gap-2 border-b border-border bg-muted/50 px-4 text-sm font-medium text-muted-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-5 rounded-full",
                        group.markerClassName
                      )}
                      aria-hidden="true"
                    />
                    <GroupIcon className="size-4" aria-hidden="true" />
                    <h3 id={`arc-group-${group.key}`}>{group.label}</h3>
                    <span className="ml-auto font-mono text-xs">
                      {group.arcs.length}
                    </span>
                  </header>

                  <div>
                    {group.arcs.map((arc) => {
                      const targetDate = parseIsoLocalDate(arc.targetDate)
                      const formattedTargetDate = targetDate ? `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}` : undefined
                      const timelineLabel = formattedTargetDate
                        ? `Target ${formattedTargetDate}`
                        : `Started ${formatDate(arc.createdAt)}`

                      return (
                        <ToolListRow
                          key={arc.id}
                          href={workspaceRoutes.goalsPaths.arc(params.workspaceSlug, arc.id)}
                          title={arc.title}
                          summary={arc.summary}
                          emptySummaryText="No summary yet. Open this arc to review its direction."
                          icon={RouteIcon}
                          iconClassName="bg-brand-neon-soft text-brand-neon-ink"
                          progressClassName="bg-brand-neon"
                          progressContainerClassName="bg-brand-neon-soft"
                          progressPercent={arc.progressPercent}
                          timelineLabel={timelineLabel}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

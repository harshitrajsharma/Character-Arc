import type { Metadata } from "next"
import Link from "next/link"
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

import { ArcListRow } from "@/components/tools/goals-paths/arc-list-row"
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

export default async function GoalsPathsPage() {
  const overview = await getGoalsPathsOverview()
  const installed = overview.item?.installationStatus === "active"
  const arcGroups = ARC_GROUPS.map((group) => ({
    ...group,
    arcs: overview.arcs.filter((arc) => arc.lifecycleStatus === group.key),
  })).filter((group) => group.arcs.length > 0)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-24 pb-8 sm:pb-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Route log
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-normal">
            Goals and Paths
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Keep the truth about where you are, the outcome you want, and the
            evidence that you are moving connected in one place.
          </p>
        </div>
        {installed ? (
          <Link href="/tools/goals-paths/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            New arc
          </Link>
        ) : (
          <Link
            href="/tools"
            className={buttonVariants({ variant: "secondary" })}
          >
            Install tool
          </Link>
        )}
      </header>

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

      {overview.issue ? null : !installed && overview.arcs.length === 0 ? (
        <Empty className="border-b border-border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RouteIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Install Goals and Paths first</EmptyTitle>
            <EmptyDescription>
              Add the planning tool to this workspace before creating an arc.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/tools"
              className={buttonVariants({ variant: "secondary" })}
            >
              Open tool catalog
            </Link>
          </EmptyContent>
        </Empty>
      ) : overview.arcs.length === 0 ? (
        <Empty className="border-b border-border py-16">
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
            <Link href="/tools/goals-paths/new" className={buttonVariants()}>
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
                    {group.arcs.map((arc) => (
                      <ArcListRow
                        key={arc.id}
                        arc={{
                          id: arc.id,
                          title: arc.title,
                          summary: arc.summary,
                          createdAt: arc.createdAt,
                          targetDate: arc.targetDate,
                          progressPercent: arc.progressPercent,
                        }}
                      />
                    ))}
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

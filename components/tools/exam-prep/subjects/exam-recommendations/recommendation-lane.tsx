import type { LucideIcon } from "lucide-react"
import {
  BookOpenCheckIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  RocketIcon,
  TargetIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type {
  ExamSubjectRecommendationLane,
  ExamSubjectRecommendationsOutput,
} from "@/lib/tools/exam-prep/recommendations"
import { cn } from "@/lib/utils"

import { RecommendationSubjectRow } from "./recommendation-subject-row"

type RecommendationItem =
  ExamSubjectRecommendationsOutput["groups"][keyof ExamSubjectRecommendationsOutput["groups"]][number]

interface LaneConfig {
  title: string
  description: string
  emptyMessage: string
  icon: LucideIcon
  panelClassName: string
  iconClassName: string
  badgeClassName: string
  rowClassName: string
  progressClassName: string
  actionClassName: string
}

const laneConfig: Record<ExamSubjectRecommendationLane, LaneConfig> = {
  revise: {
    title: "Revise",
    description: "Protect what you have learned",
    emptyMessage: "Your current revision schedule is on track.",
    icon: BookOpenCheckIcon,
    panelClassName: "border-brand-amber-line bg-brand-amber-soft",
    iconClassName: "bg-card text-brand-amber-ink",
    badgeClassName: "border-brand-amber-line bg-card text-brand-amber-ink",
    rowClassName:
      "border-brand-amber-line bg-brand-amber-surface hover:border-brand-amber hover:bg-brand-amber-surface-hover",
    progressClassName: "bg-brand-amber",
    actionClassName: "text-brand-amber-ink",
  },
  "priority-focus": {
    title: "Priority focus",
    description: "Highest-impact unfinished work",
    emptyMessage: "No priority work is waiting.",
    icon: TargetIcon,
    panelClassName: "border-brand-neon-line bg-card bg-brand-neon-soft",
    iconClassName: "bg-card text-brand-neon-ink",
    badgeClassName: "border-brand-neon-line bg-card text-brand-neon-ink",
    rowClassName:
      "border-brand-neon-line bg-brand-neon-surface hover:border-brand-neon hover:bg-brand-neon-surface-hover",
    progressClassName: "bg-brand-neon",
    actionClassName: "text-brand-neon-ink",
  },
  "start-next": {
    title: "Start next",
    description: "Best subject to begin",
    emptyMessage: "No untouched subject is ready to start.",
    icon: RocketIcon,
    panelClassName: "border-brand-cyan-line bg-brand-cyan-soft",
    iconClassName: "bg-card text-brand-cyan-ink",
    badgeClassName: "border-brand-cyan-line bg-card text-brand-cyan-ink",
    rowClassName:
      "border-brand-cyan-line bg-brand-cyan-surface hover:border-brand-cyan hover:bg-brand-cyan-surface-hover",
    progressClassName: "bg-brand-cyan",
    actionClassName: "text-brand-cyan-ink",
  },
  "test-progress": {
    title: "Test progress",
    description: "Validate and repair weak areas",
    emptyMessage: "No test action is due right now.",
    icon: ClipboardCheckIcon,
    panelClassName: "border-brand-violet-line bg-brand-violet-soft ",
    iconClassName: "bg-card text-brand-violet-ink",
    badgeClassName: "border-brand-violet-line bg-card text-brand-violet-ink",
    rowClassName:
      "border-brand-violet-line bg-brand-violet-surface hover:border-brand-violet hover:bg-brand-violet-surface-hover",
    progressClassName: "bg-brand-violet",
    actionClassName: "text-brand-violet-ink",
  },
}

export interface RecommendationLaneProps {
  workspaceSlug: string
  examId: string
  lane: ExamSubjectRecommendationLane
  items: RecommendationItem[]
}

export function RecommendationLane({
  workspaceSlug,
  examId,
  lane,
  items,
}: RecommendationLaneProps) {
  const config = laneConfig[lane]
  const Icon = config.icon
  const visibleItems = items.slice(0, 3)
  const headingId = `exam-recommendation-${lane}`

  return (
    <section
      role="listitem"
      data-recommendation-lane
      aria-labelledby={headingId}
      className={cn(
        "flex w-[calc(100vw-4rem)] max-w-104 min-w-0 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border sm:w-88 lg:w-96 xl:w-104",
        config.panelClassName
      )}
    >
      <div
        className={cn(
          "flex min-h-20 items-start gap-3 p-3 sm:p-4"
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md shadow-sm ring-1 ring-foreground/5",
            config.iconClassName
          )}
        >
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={headingId}
            className="font-heading text-sm leading-5 font-semibold text-foreground"
          >
            {config.title}
          </h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {config.description}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0", config.badgeClassName)}
        >
          {visibleItems.length}
        </Badge>
      </div>

      {visibleItems.length > 0 ? (
        <ul
          className="flex flex-1 flex-col gap-2 p-2 pt-0"
          aria-label={config.title}
        >
          {visibleItems.map((item) => (
            <RecommendationSubjectRow
              key={item.id}
              workspaceSlug={workspaceSlug}
              examId={examId}
              item={item}
              cardClassName={config.rowClassName}
              progressClassName={config.progressClassName}
              actionClassName={config.actionClassName}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 p-4 pt-0">
          <Empty
            variant="compact"
            className={cn("h-full min-h-40 rounded-2xl bg-card")}
          >
            <EmptyHeader>
              <EmptyMedia variant="icon" className={config.iconClassName}>
                <CheckCircle2Icon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="text-base">Nothing due here</EmptyTitle>
              <EmptyDescription>{config.emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </section>
  )
}

import Link from "next/link"
import { ArrowUpRightIcon, WrenchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { ExamSubjectRecommendationsOutput } from "@/lib/tools/exam-prep/recommendations"
import { cn } from "@/lib/utils"

export type ExamSubjectRecommendationItem =
  ExamSubjectRecommendationsOutput["groups"][keyof ExamSubjectRecommendationsOutput["groups"]][number]

export interface RecommendationSubjectRowProps {
  workspaceSlug: string
  examId: string
  item: ExamSubjectRecommendationItem
  cardClassName: string
  progressClassName: string
  actionClassName: string
}

const weightageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function normalizePercentage(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function getSubjectHref({
  workspaceSlug,
  examId,
  item,
}: Pick<RecommendationSubjectRowProps, "workspaceSlug" | "examId" | "item">) {
  const path = workspaceRoutes.examPrep.subject(
    workspaceSlug,
    examId,
    item.subjectId
  )
  if (item.stage === "setup") return path

  const searchParams = new URLSearchParams({ stage: item.stage })

  if (item.chapterId) searchParams.set("chapterId", item.chapterId)
  if (item.topicId) searchParams.set("topicId", item.topicId)

  return `${path}?${searchParams.toString()}`
}

export function RecommendationSubjectRow({
  workspaceSlug,
  examId,
  item,
  cardClassName,
  progressClassName,
  actionClassName,
}: RecommendationSubjectRowProps) {
  const metricValue = normalizePercentage(item.metricValue)
  const overallProgress = normalizePercentage(item.overallProgress)
  const weightage = Number.isFinite(item.weightage)
    ? weightageFormatter.format(item.weightage)
    : "0"
  const href = getSubjectHref({ workspaceSlug, examId, item })
  const indicatorClassName = cn(
    metricValue < 30 && "bg-destructive",
    metricValue >= 30 && metricValue < 70 && "bg-brand-amber",
    metricValue >= 70 && progressClassName,
    "motion-reduce:transition-none"
  )

  return (
    <li className="min-w-0">
      <Link
        href={href}
        className={cn(
          "group flex min-h-[5.25rem] min-w-0 flex-col gap-1.5 rounded-2xl border p-2.5 outline-none hover:shadow-md active:shadow-sm sm:px-3 sm:py-2.5",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-200",
          cardClassName
        )}
        aria-label={`${item.actionLabel}: ${item.subjectName}. ${item.metricLabel} ${metricValue}%. ${overallProgress}% overall. ${item.reason}${item.evidence ? ` ${item.evidence}` : ""}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm leading-tight font-semibold text-foreground">
            {item.subjectName}
          </p>
          <span className="flex shrink-0 items-center">
            <Badge
              variant="secondary"
              className="px-1.5 py-0.5 text-[10px] tabular-nums"
            >
              {weightage} marks
            </Badge>
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Progress
              value={metricValue}
              aria-label={`${item.metricLabel} for ${item.subjectName}: ${metricValue}%`}
              className="rounded-full [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:ring-1 [&_[data-slot=progress-track]]:ring-border"
              indicatorClassName={indicatorClassName}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid grid-cols-4 overflow-hidden rounded-full"
            >
              <span className="border border-r-2" />
              <span className="border border-r-2" />
              <span className="border border-r-2" />
              <span />
            </div>
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-[11px] font-semibold text-foreground tabular-nums">
            {metricValue}%
          </span>
        </div>

        <div className="mt-auto flex min-h-5 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-t border-border/60 pt-1.5">
          <span
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-xs font-semibold",
              actionClassName
            )}
          >
            {item.stage === "setup" ? (
              <WrenchIcon className="size-3 shrink-0" aria-hidden="true" />
            ) : null}
            <span className="wrap-break-word">{item.actionLabel}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground tabular-nums group-hover:text-foreground motion-safe:transition-colors">
            {overallProgress}% overall
            <ArrowUpRightIcon
              className="size-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-safe:transition-transform"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </li>
  )
}

"use client"

import { Component, useMemo, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { formatAttemptDate, formatAttemptTime } from "@/lib/dates/attempt-date"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import {
  scoreTrendPoints,
  scoreChange,
} from "@/lib/tools/mock-tests/score-trend"
import { AttemptAction } from "../attempt-presentation"

const ScoreTrendChart = dynamic(
  () => import("./score-trend-chart").then((module) => module.ScoreTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 flex-col justify-end gap-3" role="status">
        <span className="sr-only">Loading score chart…</span>
        <Skeleton
          aria-hidden="true"
          className="h-56 w-full motion-reduce:animate-none"
        />
        <Skeleton
          aria-hidden="true"
          className="h-6 w-full motion-reduce:animate-none"
        />
      </div>
    ),
  }
)

class ScoreChartBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p
        role="status"
        className="flex min-h-40 items-center text-sm text-muted-foreground"
      >
        The chart could not load. You can still inspect and review results using
        Prev and Next.
      </p>
    ) : (
      this.props.children
    )
  }
}

export function ScoreTrajectoryGraph({
  attempts,
  evaluatedCount,
  workspaceSlug,
  subjectReturnHref,
}: {
  attempts: RecentAttemptItem[]
  evaluatedCount: number
  workspaceSlug: string
  subjectReturnHref?: string | null
}) {
  const points = useMemo(() => scoreTrendPoints(attempts), [attempts])
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (!points.length) return null
  const selectedIndex = points.findIndex((point) => point.id === selectedId)
  const index = selectedIndex >= 0 ? selectedIndex : points.length - 1
  const selected = points[index]
  const latest = points.at(-1)!
  const difference = scoreChange(points, index)
  const mixed = new Set(points.map((point) => point.maxScore)).size > 1
  const changeText =
    difference === null
      ? "No earlier result in this view."
      : difference === 0
        ? "Unchanged from the previous result shown."
        : `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference))} percentage points vs previous result shown.`
  const total = Math.max(evaluatedCount, points.length)
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group border-b border-border"
      data-score-trend
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>Score trend</span>
        <span className="flex items-center gap-3">
          <span className="text-xs font-normal text-muted-foreground">
            Latest{" "}
            <strong className="font-semibold text-foreground">
              {formatNumber(latest.percentage)}%
            </strong>
          </span>
          <ChevronDownIcon
            className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
      </summary>
      <div className="flex min-w-0 flex-col gap-4 border-t border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Latest {points.length} of {total} scored attempts
          </p>
          <p>Oldest to newest · Times in IST</p>
        </div>
        {mixed ? (
          <Alert role="note">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              These attempts have different mark totals. Changes to the
              assessment can affect comparison.
            </AlertDescription>
          </Alert>
        ) : null}
        <div
          className={
            points.length > 1
              ? "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]"
              : "min-w-0"
          }
        >
          {points.length > 1 ? (
            <div className="min-w-0">
              <p className="mb-1 text-xs text-muted-foreground">Score (%)</p>
              <ScoreChartBoundary>
                {open ? (
                  <ScoreTrendChart
                    points={points}
                    selectedId={selected.id}
                    onSelect={setSelectedId}
                  />
                ) : null}
              </ScoreChartBoundary>
              <p className="mt-2 text-xs text-muted-foreground">
                Select a bar or use Prev / Next to inspect a result.
              </p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              One scored attempt. Complete another to compare results.
            </p>
          )}
          <section
            aria-label="Selected score result"
            className={
              points.length > 1
                ? "flex min-w-0 flex-col gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5"
                : "flex flex-col gap-4"
            }
            data-selected-score={selected.id}
          >
            <div>
              <p className="text-xs text-muted-foreground">
                Selected result · {index + 1} of {points.length} shown
              </p>
              <p className="mt-2 text-sm font-medium">
                {formatAttemptDate(selected.startedAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatAttemptTime(selected.startedAt)} IST
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Score</dt>
                <dd
                  className="mt-1 font-heading text-3xl font-semibold tabular-nums"
                  data-selected-percentage
                >
                  {formatNumber(selected.percentage)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Marks earned</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(selected.score)} /{" "}
                  {formatNumber(selected.maxScore)}
                </dd>
              </div>
            </dl>
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              data-score-change
            >
              {changeText}
            </p>
            <p className="sr-only" role="status" aria-atomic="true">
              Selected {formatAttemptDate(selected.startedAt)},{" "}
              {formatAttemptTime(selected.startedAt)}:{" "}
              {formatNumber(selected.percentage)}%,{" "}
              {formatNumber(selected.score)} out of{" "}
              {formatNumber(selected.maxScore)} marks.
            </p>
            <AttemptAction
              href={withSubjectReturn(
                workspaceRoutes.mockTests.analysis(workspaceSlug, selected.id),
                subjectReturnHref
              )}
              action="review"
              label="Review attempt"
              accessibleLabel={`Review selected result from ${formatAttemptDate(selected.startedAt)}, ${formatAttemptTime(selected.startedAt)}`}
              className="self-start lg:w-full"
            />
            {points.length > 1 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  aria-label="Select previous result"
                  disabled={index === 0}
                  onClick={() => setSelectedId(points[index - 1].id)}
                >
                  <ChevronLeftIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  aria-label="Select next result"
                  disabled={index === points.length - 1}
                  onClick={() => setSelectedId(points[index + 1].id)}
                >
                  Next
                  <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
        <div className="sr-only">
          <table>
            <caption>Score data, oldest to newest</caption>
            <thead>
              <tr>
                <th scope="col">Attempt date and time (IST)</th>
                <th scope="col">Score</th>
                <th scope="col">Marks earned</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id}>
                  <td>
                    {formatAttemptDate(point.startedAt)},{" "}
                    {formatAttemptTime(point.startedAt)}
                  </td>
                  <td>{formatNumber(point.percentage)}%</td>
                  <td>
                    {formatNumber(point.score)} / {formatNumber(point.maxScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

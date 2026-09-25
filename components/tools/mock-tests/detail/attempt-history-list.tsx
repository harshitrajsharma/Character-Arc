"use client"

import { useMemo } from "react"
import Link from "next/link"
import { TrendingDownIcon, TrendingUpIcon, TrophyIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDuration, formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { StartAttemptButton } from "../start-attempt-button"
import type { AssessmentAttemptHistory } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

interface AttemptHistoryListProps {
  workspaceSlug: string
  assessmentId: string
  attempts: AssessmentAttemptHistory[]
  isPublished: boolean
  className?: string
}

export function AttemptHistoryList({
  workspaceSlug,
  assessmentId,
  attempts,
  isPublished,
  className,
}: AttemptHistoryListProps) {
  const evaluatedWithScore = useMemo(() => {
    return attempts.filter((a) => a.score !== null)
  }, [attempts])

  const highestScore = useMemo(() => {
    if (evaluatedWithScore.length === 0) return null
    const max = Math.max(...evaluatedWithScore.map((a) => a.score!))
    return max > 0 ? max : null
  }, [evaluatedWithScore])

  const scoreDeltas = useMemo(() => {
    const deltas = new Map<string, number>()
    const scoredAttempts = [...attempts]
      .filter((a) => a.score !== null)
      .sort((a, b) => a.attemptNumber - b.attemptNumber)

    for (let i = 0; i < scoredAttempts.length; i++) {
      const current = scoredAttempts[i]
      if (i > 0) {
        const prev = scoredAttempts[i - 1]
        deltas.set(current.id, (current.score ?? 0) - (prev.score ?? 0))
      }
    }
    return deltas
  }, [attempts])

  return (
    <div className={cn("space-y-4 self-start", className)}>
      {/* ── Open Section Header (No outer card!) ── */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="font-heading text-base font-bold text-foreground">
            Attempt History
          </h2>
          <p className="text-xs text-muted-foreground">
            Candidate attempt milestones
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {attempts.length} {attempts.length === 1 ? "Attempt" : "Attempts"}
        </Badge>
      </div>

      {/* ── Discrete Flat Attempt Cards ── */}
      {attempts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center space-y-2">
          <TrophyIcon className="mx-auto size-6 text-muted-foreground opacity-50" />
          <p className="text-xs text-muted-foreground">
            You haven&apos;t attempted this mock test yet.
          </p>
          {isPublished ? (
            <StartAttemptButton
              workspaceSlug={workspaceSlug}
              assessmentId={assessmentId}
              size="sm"
              className="w-full text-xs font-bold rounded-xl mt-2 bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              label="Start First Attempt"
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map((att) => {
            const isFinished =
              att.status === "evaluated" || att.status === "submitted"
            const pct =
              att.accuracyRate !== null
                ? Math.round(att.accuracyRate)
                : att.score !== null && att.maxScore
                  ? Math.round((att.score / att.maxScore) * 100)
                  : null

            const isPersonalBest =
              att.score !== null &&
              highestScore !== null &&
              att.score === highestScore &&
              evaluatedWithScore.length > 1

            const delta = scoreDeltas.get(att.id)

            return (
              <div
                key={att.id}
                id={`attempt-card-${att.id}`}
                className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        Attempt #{att.attemptNumber}
                      </span>
                      {isPersonalBest ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold gap-1"
                        >
                          <TrophyIcon className="size-2.5" />
                          Personal Best
                        </Badge>
                      ) : null}
                      {delta !== undefined && delta > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold gap-0.5"
                        >
                          <TrendingUpIcon className="size-2.5" />
                          +{formatNumber(delta)}
                        </Badge>
                      ) : delta !== undefined && delta < 0 ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] font-semibold gap-0.5"
                        >
                          <TrendingDownIcon className="size-2.5" />
                          {formatNumber(delta)}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {formatDate(att.startedAt)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold",
                        isFinished
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {att.status === "evaluated"
                        ? "Evaluated"
                        : att.status === "in_progress"
                          ? "In Progress"
                          : att.status}
                    </Badge>
                    {att.durationSeconds ? (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDuration(att.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Score
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {att.score !== null ? formatNumber(att.score) : "—"} /{" "}
                      {formatNumber(att.maxScore)}
                    </span>
                  </div>
                  {pct !== null ? (
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">
                        Accuracy
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {pct}%
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="pt-1">
                  {isFinished ? (
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full text-xs font-semibold h-8 rounded-lg"
                      render={
                        <Link
                          href={workspaceRoutes.mockTests.analysis(
                            workspaceSlug,
                            att.id
                          )}
                        />
                      }
                    >
                      View Full Analysis →
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      className="w-full text-xs font-bold h-8 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                      render={
                        <Link
                          href={`/mock-test/${encodeURIComponent(att.id)}`}
                        />
                      }
                    >
                      Resume Test Room →
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


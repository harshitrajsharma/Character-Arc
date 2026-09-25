"use client"

import Link from "next/link"
import { ArrowRightIcon, PlayIcon, TrendingUpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { RecentAttemptsTableProps } from "./types"

function formatDate(iso: string | null) {
  if (!iso) return "In progress"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function RecentAttemptsTable({
  workspaceSlug,
  recentAttempts,
}: RecentAttemptsTableProps) {
  if (recentAttempts.length === 0) return null

  return (
    <div className="space-y-3 pt-6 border-t border-border/60">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
          <TrendingUpIcon className="size-4 text-foreground" />
          Recent Attempt History
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {recentAttempts.length} recorded
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <div className="hidden border-b border-border bg-muted/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1.5fr_110px_130px_130px] sm:items-center sm:gap-4 font-mono">
          <span>Test Paper</span>
          <span>Status</span>
          <span className="text-right">Score</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-border/60">
          {recentAttempts.map((attempt) => {
            const isFinished =
              attempt.status === "evaluated" || attempt.status === "submitted"

            return (
              <div
                key={attempt.id}
                className="grid gap-2 p-4 text-xs sm:grid-cols-[1.5fr_110px_130px_130px] sm:items-center sm:gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-foreground truncate font-heading text-sm">
                    {attempt.assessmentTitle}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {formatDate(attempt.submittedAt ?? attempt.startedAt)}
                  </p>
                </div>

                <div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold rounded-full px-2.5 py-0.5",
                      isFinished
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {attempt.status === "evaluated"
                      ? "Evaluated"
                      : attempt.status === "in_progress"
                      ? "In Progress"
                      : attempt.status}
                  </Badge>
                </div>

                <div className="font-mono font-bold text-foreground sm:text-right text-xs sm:text-sm">
                  {attempt.score !== null ? `${formatNumber(attempt.score)}` : "—"}
                  {attempt.maxScore !== null
                    ? ` / ${formatNumber(attempt.maxScore)}`
                    : ""}
                  {attempt.percentage !== null ? (
                    <span className="ml-1.5 text-[11px] text-muted-foreground font-medium">
                      ({Math.round(attempt.percentage)}%)
                    </span>
                  ) : null}
                </div>

                <div className="sm:text-right">
                  {isFinished ? (
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-8 rounded-full text-xs font-semibold gap-1 border-border hover:bg-muted/50 text-foreground cursor-pointer"
                      render={
                        <Link
                          href={workspaceRoutes.mockTests.analysis(
                            workspaceSlug,
                            attempt.id
                          )}
                        />
                      }
                    >
                      View Analysis
                      <ArrowRightIcon className="size-3" />
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      className="h-8 rounded-full text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1 shadow-xs cursor-pointer"
                      render={<Link href={`/assessments/${encodeURIComponent(attempt.id)}`} />}
                    >
                      <PlayIcon className="size-3 fill-current" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

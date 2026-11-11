"use client"
import {
  AttemptStatusBadge,
  AttemptResultSummary,
  AttemptAction,
} from "../attempt-presentation"
import {
  formatAttemptDate as formatDate,
  formatAttemptTime as formatTime,
} from "@/lib/dates/attempt-date"

import { HistoryIcon } from "lucide-react"
import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { AttemptHistoryPagination } from "./attempt-history-pagination"
import type { RecentAttemptsTableProps } from "./types"

export function RecentAttemptsTable({
  workspaceSlug,
  history,
  canWrite = false,
}: RecentAttemptsTableProps) {
  const recentAttempts = history.items
  const groups = recentAttempts.reduce<
    Array<{ date: string; items: RecentAttemptItem[] }>
  >((result, attempt) => {
    const date = formatDate(attempt.startedAt)
    const previous = result[result.length - 1]
    if (previous?.date === date) previous.items.push(attempt)
    else result.push({ date, items: [attempt] })
    return result
  }, [])
  return (
    <section
      aria-labelledby="attempt-history-heading"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="attempt-history-heading"
            tabIndex={-1}
            className="scroll-mt-24 font-heading text-lg font-semibold outline-none"
          >
            Attempt history
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {history.total} {history.total === 1 ? "attempt" : "attempts"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {history.total
            ? "Newest first. All your attempts in this workspace."
            : "Your test results and unfinished attempts will appear here."}
        </p>
      </div>
      {recentAttempts.length === 0 ? (
        <Empty className="rounded-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HistoryIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No attempts yet</EmptyTitle>
            <EmptyDescription>
              Choose a published paper from My papers or Community to take your
              first test.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          {groups.map((group) => (
            <section
              key={group.date}
              aria-label={`Attempts on ${group.date}`}
              className="flex min-w-0 flex-col gap-2"
            >
              <h3 className="text-xs font-medium text-muted-foreground">
                {group.date}
              </h3>
              <ul className="min-w-0 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {group.items.map((attempt) => {
                  const canReview = attempt.status === "evaluated"
                  const canResume = attempt.status === "in_progress" && canWrite
                  return (
                    <li
                      key={attempt.id}
                      data-attempt-id={attempt.id}
                      data-started-at={attempt.startedAt}
                      className="flex min-w-0 flex-col gap-3 p-4 transition-colors focus-within:bg-muted/30 hover:bg-muted/30 sm:grid sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:gap-6"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <p
                          className="line-clamp-2 text-sm font-semibold break-words"
                          title={attempt.assessmentTitle}
                        >
                          {attempt.assessmentTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                          <AttemptStatusBadge status={attempt.status} />
                          <time
                            dateTime={attempt.startedAt}
                            title={`${formatDate(attempt.startedAt)}, ${formatTime(attempt.startedAt)} (IST)`}
                          >
                            Started {formatTime(attempt.startedAt)}
                          </time>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_100px] sm:items-center sm:gap-5">
                        <div className="flex flex-col gap-0.5 text-sm tabular-nums sm:text-right">
                          <AttemptResultSummary
                            status={attempt.status}
                            score={attempt.score}
                            maxScore={attempt.maxScore}
                            percentage={attempt.percentage}
                          />
                        </div>
                        {canReview ? (
                          <AttemptAction
                            href={workspaceRoutes.mockTests.analysis(
                              workspaceSlug,
                              attempt.id
                            )}
                            action="review"
                            accessibleLabel={`Review ${attempt.assessmentTitle}, ${formatDate(attempt.startedAt)} at ${formatTime(attempt.startedAt)}`}
                          />
                        ) : canResume ? (
                          <AttemptAction
                            href={workspaceRoutes.mockTests.attempt(
                              workspaceSlug,
                              attempt.id
                            )}
                            action="resume"
                            accessibleLabel={`Resume ${attempt.assessmentTitle}`}
                          />
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <AttemptHistoryPagination
        history={history}
        workspaceSlug={workspaceSlug}
      />
    </section>
  )
}

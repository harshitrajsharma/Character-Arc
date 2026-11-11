import {
  AttemptStatusBadge,
  AttemptResultSummary,
  AttemptAction,
} from "../attempt-presentation"
import { formatAttemptDate, formatAttemptTime } from "@/lib/dates/attempt-date"
import { formatDuration } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import type { AttemptHistoryPage } from "@/lib/tools/mock-tests/actions/attempt-history-actions"
import { AttemptHistoryPagination } from "../dashboard/attempt-history-pagination"

export function AttemptHistoryList({
  workspaceSlug,
  assessmentId,
  history,
  canResume,
  subjectReturnHref,
}: {
  workspaceSlug: string
  assessmentId: string
  history: AttemptHistoryPage
  canResume: boolean
  subjectReturnHref?: string | null
}) {
  return (
    <>
      {history.items.length ? (
        <ol
          className="divide-y divide-border"
          aria-label="Your assessment attempts"
        >
          {history.items.map((attempt) => (
            <li
              key={attempt.id}
              className="grid min-w-0 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              id={`attempt-card-${attempt.id}`}
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    Attempt {attempt.attemptNumber}
                  </h3>
                  <AttemptStatusBadge status={attempt.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Started {formatAttemptDate(attempt.startedAt)},{" "}
                  {formatAttemptTime(attempt.startedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:justify-end">
                <div className="flex flex-col gap-0.5 tabular-nums">
                  <AttemptResultSummary
                    status={attempt.status}
                    score={attempt.score}
                    maxScore={attempt.maxScore}
                    percentage={attempt.percentage}
                  />
                </div>
                {attempt.durationSeconds !== null ? (
                  <p className="text-xs text-muted-foreground">
                    Elapsed {formatDuration(attempt.durationSeconds)}
                  </p>
                ) : null}
                {attempt.status === "in_progress" && canResume ? (
                  <AttemptAction
                    href={withSubjectReturn(
                      workspaceRoutes.mockTests.attempt(
                        workspaceSlug,
                        attempt.id
                      ),
                      subjectReturnHref
                    )}
                    action="resume"
                    accessibleLabel={`Resume attempt ${attempt.attemptNumber}`}
                  />
                ) : attempt.status === "evaluated" ? (
                  <AttemptAction
                    href={withSubjectReturn(
                      workspaceRoutes.mockTests.analysis(
                        workspaceSlug,
                        attempt.id
                      ),
                      subjectReturnHref
                    )}
                    action="review"
                    accessibleLabel={`Review attempt ${attempt.attemptNumber}`}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-4 text-sm text-muted-foreground sm:px-6 sm:py-6">
          Your attempts on this assessment will appear here. Completed attempts
          include a result you can review.
        </p>
      )}
      <AttemptHistoryPagination
        history={history}
        workspaceSlug={workspaceSlug}
        assessmentId={assessmentId}
      />
    </>
  )
}

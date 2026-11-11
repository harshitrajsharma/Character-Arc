"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AssessmentOverviewCard } from "./detail/assessment-overview-card"
import { AssessmentInstructions } from "./detail/assessment-instructions"
import { AssessmentPanel } from "./detail/assessment-panel"
import { ScoreTrajectoryGraph } from "./detail/score-trajectory-graph"
import { AttemptHistoryList } from "./detail/attempt-history-list"
import { ShareAssessmentDialog } from "./share-assessment-dialog"
import type {
  AssessmentOverview,
  AssessmentActivity,
} from "@/lib/tools/mock-tests/assessment-overview-model"
import type { AttemptHistoryPage } from "@/lib/tools/mock-tests/actions/attempt-history-actions"

export function MockTestDetailView({
  workspaceSlug,
  assessment,
  activity,
  history,
  canWrite,
  subjectReturnHref,
}: {
  workspaceSlug: string
  assessment: AssessmentOverview
  activity: AssessmentActivity
  history: AttemptHistoryPage | null
  canWrite: boolean
  subjectReturnHref?: string | null
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const router = useRouter()
  const [retrying, startRetry] = useTransition()
  const restoreHistoryFocus = useRef(false)
  useEffect(() => {
    if (history && restoreHistoryFocus.current) {
      document
        .getElementById("attempt-history-heading")
        ?.focus({ preventScroll: true })
      restoreHistoryFocus.current = false
    }
  }, [history])
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {subjectReturnHref ? (
        <Button
          variant="outline"
          className="min-h-11 self-start"
          render={<Link href={subjectReturnHref} />}
        >
          Subject tests
        </Button>
      ) : null}
      <AssessmentOverviewCard
        assessment={assessment}
        activity={activity}
        canWrite={canWrite}
        workspaceSlug={workspaceSlug}
        onOpenShare={() => setShareOpen(true)}
        subjectReturnHref={subjectReturnHref}
      />
      <AssessmentInstructions
        assessment={assessment}
        workspaceSlug={workspaceSlug}
        canEdit={canWrite && assessment.status !== "archived"}
      />
      <AssessmentPanel aria-labelledby="attempt-history-heading">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2
              id="attempt-history-heading"
              tabIndex={-1}
              className="scroll-mt-24 font-heading text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Your attempts
            </h2>
            <p className="text-xs text-muted-foreground">
              Your history for this assessment, newest first.
            </p>
          </div>
          {history ? (
            <span className="text-xs text-muted-foreground">
              {history.total} {history.total === 1 ? "attempt" : "attempts"}
            </span>
          ) : null}
        </div>
        <ScoreTrajectoryGraph
          key={assessment.id}
          attempts={activity.trend}
          evaluatedCount={activity.evaluatedCount}
          workspaceSlug={workspaceSlug}
          subjectReturnHref={subjectReturnHref}
        />
        {history ? (
          <AttemptHistoryList
            workspaceSlug={workspaceSlug}
            assessmentId={assessment.id}
            history={history}
            canResume={
              canWrite &&
              assessment.status === "published" &&
              assessment.questionCount > 0
            }
            subjectReturnHref={subjectReturnHref}
          />
        ) : (
          <div className="flex flex-col gap-3 p-4 sm:p-6" aria-busy={retrying}>
            <p role="status" className="text-sm text-muted-foreground">
              Could not load your attempts. The assessment details are still
              available.
            </p>
            <Button
              variant="outline"
              className="h-11 self-start"
              disabled={retrying}
              onClick={() => {
                restoreHistoryFocus.current = true
                startRetry(() => router.refresh())
              }}
            >
              {retrying ? "Loading attempts…" : "Retry attempts"}
            </Button>
          </div>
        )}
      </AssessmentPanel>
      {canWrite && assessment.status === "published" ? (
        <ShareAssessmentDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          workspaceSlug={workspaceSlug}
          assessment={assessment}
        />
      ) : null}
    </div>
  )
}

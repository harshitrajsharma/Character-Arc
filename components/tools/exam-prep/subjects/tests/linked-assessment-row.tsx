import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { SubjectLinkedAssessment } from "@/types/progressapp/domain"

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function LinkedAssessmentRow({
  assessment,
  attempt,
  workspaceSlug,
}: {
  assessment: SubjectLinkedAssessment
  attempt?: SubjectLinkedAssessment["attempts"][number]
  workspaceSlug: string
}) {
  const inProgress = attempt?.status === "IN_PROGRESS"
  const completed =
    attempt?.status === "EVALUATED" || attempt?.status === "SUBMITTED"
  const href = inProgress
    ? workspaceRoutes.mockTests.attempt(workspaceSlug, attempt.id)
    : completed
      ? workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.id)
      : workspaceRoutes.mockTests.detail(workspaceSlug, assessment.assessmentId)
  const status = inProgress
    ? "In progress"
    : attempt?.status === "EVALUATED"
      ? "Completed"
      : attempt?.status === "SUBMITTED"
        ? "Submitted"
        : attempt?.status === "ABANDONED"
          ? "Abandoned"
          : assessment.status === "PUBLISHED"
            ? "Ready"
            : assessment.status === "IN_REVIEW"
              ? "In review"
              : assessment.status === "ARCHIVED"
                ? "Archived"
                : "Draft"
  const action = inProgress
    ? "Resume test"
    : completed
      ? "View result"
      : "View mock test"
  const date = attempt
    ? new Date(attempt.submittedAt ?? attempt.startedAt)
    : null
  return (
    <article className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium break-words">
            {assessment.title}
          </h3>
          <Badge variant="outline">{status}</Badge>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>Mock test</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {assessment.linkage === "exam"
              ? "Linked to this exam"
              : "Syllabus match"}
          </span>
          {date && !Number.isNaN(date.getTime()) ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span suppressHydrationWarning>{dateFormatter.format(date)}</span>
            </>
          ) : null}
          {attempt?.score != null && attempt.maxScore != null ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>
                {attempt.score}/{attempt.maxScore} marks
              </span>
            </>
          ) : assessment.durationMinutes ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{assessment.durationMinutes} min</span>
            </>
          ) : null}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 shrink-0 self-end sm:min-h-9 sm:self-auto"
        render={<Link href={href} />}
      >
        {action}
      </Button>
    </article>
  )
}

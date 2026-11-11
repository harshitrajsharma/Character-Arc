"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRightIcon,
  LinkIcon,
  TargetIcon,
  Clock3Icon,
  FileQuestionIcon,
  TrophyIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StartAttemptButton } from "@/components/tools/mock-tests/start-attempt-button"
import {
  AttemptScoreValue,
  AttemptStatusBadge,
  type AttemptStatus,
} from "@/components/tools/mock-tests/attempt-presentation"
import { formatAttemptDate } from "@/lib/dates/attempt-date"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type { SubjectLinkedAssessment } from "@/types/progressapp/domain"

/** One actionable paper row; attempts stay canonical and are never copied into manual records. */
export function LinkedAssessmentRow({
  assessment,
  workspaceSlug,
  returnHref,
  canWrite = true,
  onUnlink,
}: {
  assessment: SubjectLinkedAssessment
  workspaceSlug: string
  returnHref: string
  canWrite?: boolean
  onUnlink?: () => void
}) {
  const active = assessment.attempts.find(
    (attempt) => attempt.status === "IN_PROGRESS"
  )
  const latest = assessment.attempts.find(
    (attempt) =>
      attempt.status === "EVALUATED" || attempt.status === "SUBMITTED"
  )
  const draft =
    assessment.status === "DRAFT" || assessment.status === "IN_REVIEW"
  const detail = withSubjectReturn(
    draft && canWrite
      ? workspaceRoutes.mockTests.edit(workspaceSlug, assessment.assessmentId)
      : workspaceRoutes.mockTests.detail(
          workspaceSlug,
          assessment.assessmentId
        ),
    returnHref
  )
  const direct = assessment.linkage === "context"
  const SourceIcon = direct ? LinkIcon : TargetIcon
  const source = direct ? "Linked" : "Syllabus match"
  return (
    <article
      className="flex min-w-0 flex-col gap-3 py-5"
      aria-label={assessment.title}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={detail}
            className="block rounded-sm text-sm leading-relaxed font-semibold wrap-anywhere outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {assessment.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <SourceIcon className="size-3.5" aria-hidden="true" />
              {source}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {assessment.targetsWholeSubject
                ? "Full subject"
                : `${assessment.targetChapterIds.length} ${assessment.targetChapterIds.length === 1 ? "chapter" : "chapters"}`}
            </span>
            <Badge
              variant={active ? "secondary" : "outline"}
              className="ml-auto sm:ml-0"
            >
              {active
                ? "In progress"
                : assessment.status === "PUBLISHED"
                  ? "Published"
                  : assessment.status === "IN_REVIEW"
                    ? "In review"
                    : "Draft"}
            </Badge>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileQuestionIcon className="size-3.5" aria-hidden="true" />
              <span>
                <strong className="font-medium text-foreground">
                  {assessment.questionCount ?? 0}
                </strong>{" "}
                questions
              </span>
            </span>
            {assessment.totalMarks !== null &&
            assessment.totalMarks !== undefined ? (
              <span className="inline-flex items-center gap-1.5">
                <TrophyIcon className="size-3.5" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-foreground">
                    {formatNumber(assessment.totalMarks)}
                  </strong>{" "}
                  marks
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock3Icon className="size-3.5" aria-hidden="true" />
              {assessment.durationMinutes
                ? `${assessment.durationMinutes} min`
                : "Untimed"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-center">
          {active && canWrite ? (
            <Button
              className="min-h-11"
              render={
                <Link
                  href={withSubjectReturn(
                    workspaceRoutes.mockTests.attempt(workspaceSlug, active.id),
                    returnHref
                  )}
                />
              }
            >
              Resume test
            </Button>
          ) : !draft && canWrite && (assessment.questionCount ?? 0) > 0 ? (
            <StartAttemptButton
              workspaceSlug={workspaceSlug}
              assessmentId={assessment.assessmentId}
              returnTo={returnHref}
              label="Take test"
              size="sm"
              className="min-h-11"
            />
          ) : (
            <Button
              variant={draft && canWrite ? "default" : "outline"}
              className="min-h-11"
              render={<Link href={detail} />}
            >
              {draft && canWrite ? "Edit test" : "View assessment"}
            </Button>
          )}
          {canWrite &&
          (active || (!draft && (assessment.questionCount ?? 0) > 0)) ? (
            <Button
              variant="ghost"
              className="min-h-11"
              render={<Link href={detail} />}
            >
              Details
            </Button>
          ) : null}
          {onUnlink && canWrite ? (
            <Button
              variant="ghost"
              className="min-h-11 text-muted-foreground"
              onClick={onUnlink}
            >
              Unlink
            </Button>
          ) : null}
        </div>
      </div>
      {latest ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-medium">Latest result</span>
            {latest.status !== "EVALUATED" ? (
              <AttemptStatusBadge
                status={latest.status.toLowerCase() as AttemptStatus}
              />
            ) : null}
            {latest.score !== null && latest.maxScore !== null ? (
              <span className="text-foreground">
                <AttemptScoreValue
                  score={latest.score}
                  maxScore={latest.maxScore}
                />{" "}
                marks
              </span>
            ) : null}
            <span>
              {formatAttemptDate(latest.submittedAt ?? latest.startedAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {latest.status === "EVALUATED" ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                href={withSubjectReturn(
                  workspaceRoutes.mockTests.analysis(workspaceSlug, latest.id),
                  returnHref
                )}
              >
                Review result{" "}
                <ArrowRightIcon className="ml-1 size-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <span>Awaiting evaluation</span>
            )}
            {(assessment.attemptCount ?? assessment.attempts.length) > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                href={detail}
              >
                {assessment.attemptCount ?? assessment.attempts.length} attempts
              </Link>
            ) : null}
          </div>
        </div>
      ) : active ? (
        <p className="text-xs text-muted-foreground">
          {canWrite
            ? "Your attempt is in progress. Resume to continue with the same answers and timer."
            : "This unfinished attempt is read-only with your current workspace role."}
        </p>
      ) : null}
    </article>
  )
}

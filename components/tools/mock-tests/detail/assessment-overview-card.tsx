"use client"

import Link from "next/link"
import {
  ArchiveIcon,
  CheckCircle2Icon,
  FilePenLineIcon,
  GlobeIcon,
  InfoIcon,
  LinkIcon,
  LockKeyholeIcon,
  Share2Icon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatAttemptDate, formatAttemptTime } from "@/lib/dates/attempt-date"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import {
  assessmentCapabilities,
  type AssessmentOverview,
  type AssessmentActivity,
} from "@/lib/tools/mock-tests/assessment-overview-model"
import { cn } from "@/lib/utils"
import { PAPER_TYPES } from "../assessment-paper-types"
import { AttemptAction, AttemptScoreValue } from "../attempt-presentation"
import { RichContent } from "../editor/rich-content"
import { StartAttemptButton } from "../start-attempt-button"
import { AssessmentPanel } from "./assessment-panel"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"

export function AssessmentOverviewCard({
  assessment,
  activity,
  canWrite,
  workspaceSlug,
  onOpenShare,
  subjectReturnHref,
}: {
  assessment: AssessmentOverview
  activity: AssessmentActivity
  canWrite: boolean
  workspaceSlug: string
  onOpenShare: () => void
  subjectReturnHref?: string | null
}) {
  const capabilities = assessmentCapabilities({
    ...assessment,
    canWrite,
    hasActiveAttempt: !!activity.active,
  })
  const type = PAPER_TYPES.find(
    (type) => type.id === assessment.taxonomy?.paperType
  )
  const StatusIcon =
    assessment.status === "published"
      ? CheckCircle2Icon
      : assessment.status === "archived"
        ? ArchiveIcon
        : FilePenLineIcon
  const VisibilityIcon =
    assessment.visibility === "public"
      ? GlobeIcon
      : assessment.visibility === "unlisted"
        ? LinkIcon
        : LockKeyholeIcon
  const visibility =
    assessment.visibility === "public"
      ? "Public"
      : assessment.visibility === "unlisted"
        ? "Link only"
        : "Private"
  const context = [
    assessment.taxonomy?.examTag,
    assessment.taxonomy?.subjects?.join(", "),
  ]
    .filter(Boolean)
    .join(" / ")
  const mismatch =
    assessment.totalMarks !== null &&
    assessment.totalMarks !== assessment.questionMarks
  const stateNote =
    assessment.status === "archived"
      ? "Archived assessment. Details and past results are read-only."
      : !canWrite
        ? "You have read-only access to this assessment."
        : assessment.status === "draft"
          ? "Continue building in the editor. Publish when your assessment is ready."
          : !assessment.questionCount
            ? "Add questions before starting a test."
            : activity.active
              ? "Resume your unfinished attempt to continue."
              : assessment.durationMinutes
                ? "The timer starts when you start a test. Use a tablet or laptop with a large enough screen."
                : "This assessment is untimed. Use a tablet or laptop with a large enough screen."
  return (
    <AssessmentPanel
      aria-labelledby="assessment-title"
      data-assessment-overview
    >
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6">
        <h1
          id="assessment-title"
          className="font-heading text-2xl leading-tight font-bold break-words sm:text-3xl"
        >
          {assessment.title}
        </h1>
        {assessment.summary?.trim() ? (
          <RichContent
            html={assessment.summary}
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          />
        ) : null}
        {context ? (
          <p className="text-sm break-words text-muted-foreground">{context}</p>
        ) : null}
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          data-assessment-metadata
        >
          <p
            className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
            data-assessment-attribution
          >
            {assessment.authorName ? (
              <span className="max-w-full break-words">
                By {assessment.authorName}
              </span>
            ) : null}
            <span>
              Updated {formatAttemptDate(assessment.updatedAt)},{" "}
              {formatAttemptTime(assessment.updatedAt)}
            </span>
            <span>Revision {assessment.revision}</span>
          </p>
          <div
            className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs"
            data-assessment-status
          >
            {type ? <Badge variant="outline">{type.label}</Badge> : null}
            <Badge
              variant="secondary"
              className={cn(
                assessment.status === "published" &&
                  "bg-success-soft text-success-ink"
              )}
            >
              <StatusIcon className="size-3" aria-hidden="true" />
              {assessment.status === "published"
                ? "Published"
                : assessment.status === "archived"
                  ? "Archived"
                  : "Draft"}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <VisibilityIcon className="size-3.5" aria-hidden="true" />
              {visibility}
            </span>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-border bg-muted/20 sm:grid-cols-4 [&>div]:min-w-0 [&>div]:border-border [&>div]:p-4 sm:[&>div]:px-6 sm:[&>div+div]:border-l [&>div:nth-child(even)]:border-l [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0">
        <div>
          <dt className="text-xs text-muted-foreground">Questions</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {assessment.questionCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Maximum marks</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {formatNumber(assessment.questionMarks)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {assessment.durationMinutes
              ? `${assessment.durationMinutes} min`
              : "Untimed"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Calculator</dt>
          <dd className="mt-1 text-lg font-semibold">
            {assessment.calculatorAllowed ? "Available" : "Unavailable"}
          </dd>
        </div>
      </dl>
      {mismatch ? (
        <div
          role="note"
          className="flex items-start gap-2 border-t border-border px-4 py-3 text-sm sm:px-6"
        >
          <InfoIcon
            className="mt-0.5 size-4 shrink-0 text-brand-amber-ink"
            aria-hidden="true"
          />
          <p>
            Configured target: {formatNumber(assessment.totalMarks!)} marks.
            Current questions: {formatNumber(assessment.questionMarks)} marks.
            Test scores use the question marks.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 border-t border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {capabilities.edit ? (
              <Button
                variant={assessment.status === "draft" ? "default" : "outline"}
                className="h-11"
                render={
                  <Link
                    href={withSubjectReturn(
                      workspaceRoutes.mockTests.edit(
                        workspaceSlug,
                        assessment.id
                      ),
                      subjectReturnHref
                    )}
                  />
                }
              >
                <FilePenLineIcon data-icon="inline-start" aria-hidden="true" />
                {assessment.status === "draft"
                  ? "Continue building"
                  : "Edit assessment"}
              </Button>
            ) : null}
            {capabilities.share ? (
              <Button variant="outline" className="h-11" onClick={onOpenShare}>
                <Share2Icon data-icon="inline-start" aria-hidden="true" />
                Share
              </Button>
            ) : null}
          </div>
          {capabilities.start ? (
            <StartAttemptButton
              workspaceSlug={workspaceSlug}
              assessmentId={assessment.id}
              label={activity.latest ? "Start new attempt" : "Start test"}
              className="h-11"
              returnTo={subjectReturnHref}
            />
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {stateNote}
        </p>
      </div>
      {activity.active ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-brand-amber-soft p-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Unfinished attempt</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Started {formatAttemptDate(activity.active.startedAt)},{" "}
              {formatAttemptTime(activity.active.startedAt)}
            </p>
          </div>
          {capabilities.resume ? (
            <AttemptAction
              href={withSubjectReturn(
                workspaceRoutes.mockTests.attempt(
                  workspaceSlug,
                  activity.active.id
                ),
                subjectReturnHref
              )}
              action="resume"
              accessibleLabel="Resume unfinished attempt"
            />
          ) : null}
        </div>
      ) : activity.latest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
          <p className="text-sm">
            <span className="mr-2 text-muted-foreground">Latest result</span>
            <span className="font-semibold tabular-nums">
              <AttemptScoreValue
                score={activity.latest.score}
                maxScore={activity.latest.maxScore}
              />
            </span>
            {activity.latest.percentage !== null ? (
              <span className="ml-2 text-muted-foreground">
                ({formatNumber(activity.latest.percentage)}%)
              </span>
            ) : null}
          </p>
          <AttemptAction
            href={withSubjectReturn(
              workspaceRoutes.mockTests.analysis(
                workspaceSlug,
                activity.latest.id
              ),
              subjectReturnHref
            )}
            action="review"
            label="Review result"
            accessibleLabel="Review latest result"
          />
        </div>
      ) : null}
    </AssessmentPanel>
  )
}

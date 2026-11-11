"use client"

import Link from "next/link"
import { CopyIcon, GlobeIcon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatAttemptDate } from "@/lib/dates/attempt-date"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { CommunityPaperDetailView } from "@/lib/tools/definitions/mock-tests/repository"
import { PAPER_TYPES } from "../assessment-paper-types"
import { RichContent } from "../editor/rich-content"
import { AssessmentPanel } from "./assessment-panel"

/** Public discovery/acquisition; workspace permissions and attempt state live elsewhere. */
export function TestProfileHeroCard({
  paper,
  userWorkspaceSlug,
  isAuthorOrInSameWorkspace,
  cloning,
  onCloneAndStart,
}: {
  mode: "public"
  paper: CommunityPaperDetailView
  userWorkspaceSlug?: string
  isAuthorOrInSameWorkspace: boolean
  cloning?: boolean
  onCloneAndStart?: () => void
}) {
  const type = PAPER_TYPES.find((type) => type.id === paper.taxonomy?.paperType)
  return (
    <AssessmentPanel aria-labelledby="public-assessment-title">
      <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {type ? <Badge variant="outline">{type.label}</Badge> : null}
            <Badge variant="secondary">
              <GlobeIcon className="size-3" aria-hidden="true" />
              Public Community Paper
            </Badge>
          </div>
          {paper.publishedAt ? (
            <p className="text-xs text-muted-foreground">
              Published {formatAttemptDate(paper.publishedAt)}
            </p>
          ) : null}
        </div>
        <h1
          id="public-assessment-title"
          className="font-heading text-2xl leading-tight font-bold break-words sm:text-3xl"
        >
          {paper.title}
        </h1>
        {paper.summary || paper.instructions ? (
          <RichContent
            html={paper.summary || paper.instructions || ""}
            className="max-w-3xl text-sm text-muted-foreground"
          />
        ) : null}
        {paper.taxonomy?.examTag || paper.taxonomy?.subjects?.length ? (
          <p className="text-sm text-muted-foreground">
            {[paper.taxonomy.examTag, paper.taxonomy.subjects?.join(", ")]
              .filter(Boolean)
              .join(" / ")}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {paper.authorName ? `By ${paper.authorName}` : "Community assessment"}
          {paper.workspaceName ? ` · ${paper.workspaceName}` : ""} ·{" "}
          {paper.calculatorAllowed ? "Calculator available" : "No calculator"}
        </p>
      </div>
      <dl className="grid grid-cols-2 border-t border-border bg-muted/20 sm:grid-cols-4 [&>div]:border-border [&>div]:p-4 sm:[&>div]:px-6 sm:[&>div+div]:border-l [&>div:nth-child(even)]:border-l [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0">
        <div>
          <dt className="text-xs text-muted-foreground">Questions</dt>
          <dd className="mt-1 text-lg font-semibold">{paper.questionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="mt-1 text-lg font-semibold">
            {paper.durationMinutes ? `${paper.durationMinutes} min` : "Untimed"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Configured marks</dt>
          <dd className="mt-1 text-lg font-semibold">
            {paper.totalMarks === null ? "—" : formatNumber(paper.totalMarks)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cohort attempts</dt>
          <dd className="mt-1 text-lg font-semibold">{paper.attemptsCount}</dd>
          {paper.avgScorePercentage !== null ? (
            <dd className="mt-1 text-xs text-muted-foreground">
              Average score: {formatNumber(paper.avgScorePercentage)}%
            </dd>
          ) : null}
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          View the shared assessment or copy it into your workspace where
          permitted.
        </p>
        <div className="flex flex-wrap gap-2">
          {paper.allowCloning && userWorkspaceSlug ? (
            <Button
              variant="outline"
              className="h-11"
              disabled={cloning}
              onClick={onCloneAndStart}
            >
              <CopyIcon data-icon="inline-start" aria-hidden="true" />
              {cloning ? "Cloning…" : "Clone to My Workspace"}
            </Button>
          ) : null}
          {isAuthorOrInSameWorkspace && userWorkspaceSlug ? (
            <Button
              className="h-11"
              render={
                <Link
                  href={workspaceRoutes.mockTests.detail(
                    userWorkspaceSlug,
                    paper.id
                  )}
                />
              }
            >
              <PlayIcon data-icon="inline-start" aria-hidden="true" />
              Open in Workspace
            </Button>
          ) : (
            <Button
              className="h-11"
              disabled={cloning}
              onClick={onCloneAndStart}
            >
              <PlayIcon data-icon="inline-start" aria-hidden="true" />
              {cloning ? "Preparing Paper…" : "Take Mock Test"}
            </Button>
          )}
        </div>
      </div>
    </AssessmentPanel>
  )
}

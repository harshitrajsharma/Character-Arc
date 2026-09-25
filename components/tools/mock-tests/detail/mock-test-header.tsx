"use client"

import { useState } from "react"
import Link from "next/link"
import { ClockIcon, FilePenLineIcon, Share2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { PublishAssessmentButton } from "../publish-assessment-button"
import { StartAttemptButton } from "../start-attempt-button"
import { ShareAssessmentDialog } from "../share-assessment-dialog"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
} from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"
import { RichContent } from "../editor/rich-content"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  published: {
    label: "Published",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

interface MockTestHeaderProps {
  workspaceSlug: string
  assessment: AssessmentDetail
  attempts: AssessmentAttemptHistory[]
  canWrite: boolean
}

export function MockTestHeader({
  workspaceSlug,
  assessment,
  attempts,
  canWrite,
}: MockTestHeaderProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const status = STATUS_CONFIG[assessment.status] ?? STATUS_CONFIG.draft
  const isPublished = assessment.status === "published"

  const ongoingAttempt = attempts.find((a) => a.status === "in_progress")

  return (
    <div className="space-y-4">
      {/* ── Open Canvas Header Strip ── */}
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left Column: Title & Description */}
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Mock Test Paper
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge
              variant="outline"
              className={cn("text-[10px]", status.className)}
            >
              {status.label}
            </Badge>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Rev {assessment.revision}
            </span>
            {assessment.publishedAt ? (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Published {formatDate(assessment.publishedAt)}
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Created {formatDate(assessment.createdAt)}
                </span>
              </>
            )}
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {assessment.title}
          </h1>

          {assessment.instructions?.trim() ? (
            /<[a-z][\s\S]*>/i.test(assessment.instructions) ? (
              <RichContent
                html={assessment.instructions}
                className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3"
              />
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                {assessment.instructions.trim()}
              </p>
            )
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isPublished
                ? "This is a comprehensive mock test. Attempt all questions under timed CBT conditions to track your progress and evaluate your readiness."
                : "Draft mode: organize sections, adjust marks, and publish when the paper is ready."}
            </p>
          )}
        </div>

        {/* Right Column: Column-Stacked Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full sm:w-52 shrink-0 pt-0.5">
          {isPublished ? (
            <>
              {/* Start New Attempt / Start Test (High-contrast, vibrant, stacked on top) */}
              <StartAttemptButton
                workspaceSlug={workspaceSlug}
                assessmentId={assessment.id}
                size="default"
                label={attempts.length > 0 ? "Start New Attempt" : "Start Mock Test"}
                className="w-full h-10 px-4 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs transition-all"
              />

              {canWrite ? (
                <>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/30"
                    render={
                      <Link
                        href={workspaceRoutes.mockTests.edit(
                          workspaceSlug,
                          assessment.id
                        )}
                      />
                    }
                  >
                    <FilePenLineIcon className="size-3.5" />
                    Edit Paper in Builder
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setShareOpen(true)}
                    className="w-full h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/30"
                  >
                    <Share2Icon className="size-3.5" />
                    Share &amp; Distribute
                  </Button>
                </>
              ) : null}
            </>
          ) : canWrite ? (
            <>
              <Button
                size="default"
                className="w-full h-10 px-4 rounded-xl text-xs font-bold gap-1.5"
                render={
                  <Link
                    href={workspaceRoutes.mockTests.edit(
                      workspaceSlug,
                      assessment.id
                    )}
                  />
                }
              >
                <FilePenLineIcon className="size-3.5" />
                Edit Paper in Builder
              </Button>
              <PublishAssessmentButton
                workspaceSlug={workspaceSlug}
                assessmentId={assessment.id}
                expectedRevision={assessment.revision}
                className="w-full h-10 px-4 rounded-xl text-xs font-semibold"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Ongoing Attempt Alert Banner */}
      {ongoingAttempt ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <ClockIcon className="size-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                You have an active attempt in progress (Attempt #
                {ongoingAttempt.attemptNumber})
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400/80">
                Started on {formatDate(ongoingAttempt.startedAt)}. Resume the CBT
                room to submit your answers.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 px-4 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs"
            render={
              <Link href={`/mock-test/${encodeURIComponent(ongoingAttempt.id)}`} />
            }
          >
            Resume Attempt #{ongoingAttempt.attemptNumber} →
          </Button>
        </div>
      ) : null}

      <ShareAssessmentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        workspaceSlug={workspaceSlug}
        assessment={assessment}
      />
    </div>
  )
}

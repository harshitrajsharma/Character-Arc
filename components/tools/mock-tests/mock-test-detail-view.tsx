"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  FilePenLineIcon,
  HelpCircleIcon,
  LayersIcon,
  ListChecksIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import {
  questionKindLabel,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { PublishAssessmentButton } from "./publish-assessment-button"
import { StartAttemptButton } from "./start-attempt-button"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
  AssessmentQuestionView,
} from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  published: {
    label: "Published",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
}

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function MockTestDetailView({
  workspaceSlug,
  assessment,
  attempts,
  canWrite,
}: {
  workspaceSlug: string
  assessment: AssessmentDetail
  attempts: AssessmentAttemptHistory[]
  canWrite: boolean
}) {
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({})

  function toggleQuestion(id: string) {
    setExpandedQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function toggleAllQuestions(expand: boolean) {
    const updated: Record<string, boolean> = {}
    assessment.questions.forEach((q) => {
      updated[q.id] = expand
    })
    setExpandedQuestionIds(updated)
  }

  const status = STATUS_CONFIG[assessment.status] ?? STATUS_CONFIG.draft
  const isPublished = assessment.status === "published"

  // Group questions by section
  const sections = useMemo(() => {
    const map = new Map<string, AssessmentQuestionView[]>()
    for (const q of assessment.questions) {
      const key = q.section ?? ""
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(q)
    }
    return map
  }, [assessment.questions])

  // Question type distribution
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const q of assessment.questions) {
      counts[q.kind] = (counts[q.kind] ?? 0) + 1
    }
    return counts
  }, [assessment.questions])

  const backHref = workspaceRoutes.mockTests.home(workspaceSlug)

  return (
    <div className="space-y-8 font-sans antialiased text-foreground">
      {/* 1. TOP HEADER STRIP */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={backHref} />}
            title="Back to Mock Tests"
            aria-label="Back to Mock Tests"
            className="mt-0.5 shrink-0"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Mock Test Paper
              </span>
              <span className="text-muted-foreground/40">•</span>
              <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                {status.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">
                Rev {assessment.revision}
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {assessment.title}
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {assessment.instructions ??
                (isPublished
                  ? "This mock test is published and ready to attempt under timed CBT exam conditions."
                  : "Draft mode: add or edit questions and publish when the paper is ready.")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isPublished ? (
            <StartAttemptButton
              workspaceSlug={workspaceSlug}
              assessmentId={assessment.id}
            />
          ) : null}

          {canWrite ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-semibold gap-1.5"
                render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, assessment.id)} />}
              >
                <FilePenLineIcon className="size-3.5" />
                Edit Paper
              </Button>
              {!isPublished ? (
                <PublishAssessmentButton
                  workspaceSlug={workspaceSlug}
                  assessmentId={assessment.id}
                  expectedRevision={assessment.revision}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* 2. PAPER METRIC CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Questions</span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.questions.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {Object.entries(typeCounts)
              .map(([kind, count]) => `${count} ${questionKindLabel(kind)}`)
              .join(" • ") || "No questions yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Paper Duration</span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.durationMinutes ? `${assessment.durationMinutes}m` : "Untimed"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {assessment.durationMinutes ? `${Math.round(assessment.durationMinutes / 60 * 10) / 10} hours` : "Practice at your own pace"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Marks</span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.totalMarks ? `${assessment.totalMarks}` : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">Standard negative marking</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Attempts Recorded</span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {attempts.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Candidate attempt history</p>
        </div>
      </div>

      {/* 3. MAIN SPLIT: PAPER CONTENT (Left 65%) + ATTEMPT HISTORY (Right 35%) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Question Paper Structure & Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Syllabus &amp; Structure
              </p>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Question Paper Overview
              </h2>
            </div>

            {assessment.questions.length > 0 ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleAllQuestions(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  Expand all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleAllQuestions(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  Collapse all
                </Button>
              </div>
            ) : null}
          </div>

          {assessment.questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
              <ListChecksIcon className="mx-auto size-8 text-muted-foreground opacity-60" />
              <p className="text-xs text-muted-foreground">
                This test has no questions yet.
              </p>
              {canWrite ? (
                <Button
                  size="sm"
                  className="text-xs font-bold gap-1.5"
                  render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, assessment.id)} />}
                >
                  <FilePenLineIcon className="size-3.5" />
                  Add Questions in Builder
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(sections.entries()).map(([sectionName, sectionQuestions]) => (
                <div key={sectionName || "__general"} className="space-y-3">
                  {sectionName ? (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="size-2 rounded-full bg-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {sectionName} Section ({sectionQuestions.length} Questions)
                      </h3>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {sectionQuestions.map((q) => {
                      const isExpanded = expandedQuestionIds[q.id] ?? false

                      return (
                        <div
                          key={q.id}
                          className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs"
                        >
                          <div
                            onClick={() => toggleQuestion(q.id)}
                            className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-6 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-foreground">
                                {q.position + 1}
                              </span>
                              <Badge variant="outline" className="text-xs font-medium">
                                {questionKindLabel(q.kind)}
                              </Badge>
                              {q.section ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {q.section}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-foreground">
                                +{q.marks} {q.negativeMarks < 0 ? `| ${q.negativeMarks} Neg` : ""}
                              </span>
                              <button
                                type="button"
                                className="size-5 flex items-center justify-center text-muted-foreground"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="p-4 pt-0 border-t border-border/60 space-y-4">
                              <div className="text-xs leading-relaxed text-foreground rich-text pt-3">
                                <RichContent html={q.stem} />
                              </div>

                              {q.options && q.options.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {q.options.map((opt) => (
                                    <div
                                      key={opt.key}
                                      className="flex items-start gap-2 rounded-xl border border-border/80 bg-muted/20 p-2.5"
                                    >
                                      <span className="size-5 rounded bg-background border border-border flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground shrink-0">
                                        {opt.key}
                                      </span>
                                      <div className="flex-1 leading-snug rich-text">
                                        <RichContent html={opt.content} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Past Attempts for this Paper */}
        <div className="space-y-4">
          <div className="border-b border-border pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              History
            </p>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Your Attempt Records
            </h2>
          </div>

          {attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center space-y-2">
              <TrophyIcon className="mx-auto size-6 text-muted-foreground opacity-60" />
              <p className="text-xs text-muted-foreground">
                You haven&apos;t attempted this mock test yet.
              </p>
              {isPublished ? (
                <StartAttemptButton
                  workspaceSlug={workspaceSlug}
                  assessmentId={assessment.id}
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((att) => {
                const isFinished = att.status === "evaluated" || att.status === "submitted"
                const pct = att.accuracyRate !== null ? Math.round(att.accuracyRate) : (att.score !== null && att.maxScore ? Math.round((att.score / att.maxScore) * 100) : null)

                return (
                  <div
                    key={att.id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatDate(att.startedAt)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold",
                          isFinished
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {att.status === "evaluated" ? "Evaluated" : att.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Score</span>
                        <span className="font-mono font-bold text-foreground">
                          {att.score !== null ? formatNumber(att.score) : "—"} / {formatNumber(att.maxScore)}
                        </span>
                      </div>
                      {pct !== null ? (
                        <div className="text-right">
                          <span className="text-muted-foreground block text-[10px]">Accuracy</span>
                          <span className="font-mono font-bold text-foreground">{pct}%</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-1">
                      {isFinished ? (
                        <Button
                          variant="outline"
                          size="xs"
                          className="w-full text-xs font-semibold h-8"
                          render={
                            <Link href={workspaceRoutes.mockTests.analysis(workspaceSlug, att.id)} />
                          }
                        >
                          View Full Analysis
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          className="w-full text-xs font-bold h-8 bg-amber-600 hover:bg-amber-700 text-white"
                          render={<Link href={`/mock-test/${encodeURIComponent(att.id)}`} />}
                        >
                          Resume Test Room
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

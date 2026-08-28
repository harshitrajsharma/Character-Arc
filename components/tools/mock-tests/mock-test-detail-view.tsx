"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckBigIcon,
  ClockIcon,
  ExternalLinkIcon,
  EyeIcon,
  FilePenLineIcon,
  HashIcon,
  HelpCircleIcon,
  LayersIcon,
  ListChecksIcon,
  ScrollTextIcon,
  TrophyIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { stripHtml } from "@/components/tools/mock-tests/editor/html-utils"
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  published: {
    label: "Published",
    className:
      "border-success-line/40 bg-success-soft text-success-ink font-semibold",
  },
  archived: {
    label: "Archived",
    className:
      "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink",
  },
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

function questionKindBadgeClass(kind: string): string {
  switch (kind) {
    case "SINGLE_CHOICE":
      return "border-brand-cyan-line/40 bg-brand-cyan-soft text-brand-cyan-ink"
    case "MULTIPLE_CHOICE":
      return "border-brand-violet-line/40 bg-brand-violet-soft text-brand-violet-ink"
    case "TRUE_FALSE":
      return "border-brand-violet-line/40 bg-brand-violet-soft text-brand-violet-ink"
    case "NUMERIC":
      return "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
    case "SHORT_ANSWER":
      return "border-brand-neon-line/40 bg-brand-neon-soft text-brand-neon-ink"
    default:
      return "border-border bg-muted/60 text-foreground"
  }
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
  const [showAllSolutions, setShowAllSolutions] = useState(false)
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<
    Record<string, boolean>
  >({})

  function toggleQuestion(id: string) {
    setExpandedQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const status = STATUS_BADGE[assessment.status] ?? STATUS_BADGE.draft
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

  // Unique topic titles in this test
  const allTopics = useMemo(() => {
    const set = new Set<string>()
    for (const q of assessment.questions) {
      if (q.targetTitles) {
        for (const title of q.targetTitles) {
          set.add(title)
        }
      }
    }
    return Array.from(set)
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
    <div className="space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={backHref} />}
            title="Back to Mock Tests"
            aria-label="Back to Mock Tests"
            className="mt-0.5 shrink-0"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Mock Tests
              </span>
              <span className="text-muted-foreground/40">•</span>
              <Badge
                variant="outline"
                className={cn("text-xs", status.className)}
              >
                {status.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Rev {assessment.revision}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {assessment.title}
            </h1>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {assessment.summary ??
                (isPublished
                  ? "This mock test is published and ready to attempt. Click Start Attempt below to take the test under timed exam conditions."
                  : "This mock test is currently in draft mode. Add or edit questions and publish when ready.")}
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isPublished ? (
            <>
              <StartAttemptButton
                workspaceSlug={workspaceSlug}
                assessmentId={assessment.id}
              />
              {canWrite ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={workspaceRoutes.mockTests.edit(
                        workspaceSlug,
                        assessment.id
                      )}
                    />
                  }
                >
                  <FilePenLineIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Edit test
                </Button>
              ) : null}
            </>
          ) : canWrite ? (
            <>
              {assessment.isPublishable ? (
                <PublishAssessmentButton
                  workspaceSlug={workspaceSlug}
                  assessmentId={assessment.id}
                  expectedRevision={assessment.revision}
                />
              ) : null}
              <Button
                variant={assessment.questionCount === 0 ? "default" : "outline"}
                size="sm"
                render={
                  <Link
                    href={workspaceRoutes.mockTests.edit(
                      workspaceSlug,
                      assessment.id
                    )}
                  />
                }
              >
                <FilePenLineIcon data-icon="inline-start" aria-hidden="true" />
                {assessment.questionCount === 0
                  ? "Add questions"
                  : "Edit questions"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Test Blueprint & Summary Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Questions
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
              <ListChecksIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {assessment.questionCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {Object.keys(typeCounts).length > 0
              ? Object.entries(typeCounts)
                  .map(([kind, count]) => `${count} ${questionKindLabel(kind)}`)
                  .join(", ")
              : "No questions added"}
          </p>
        </Card>

        <Card className="border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Marks
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-cyan-soft text-brand-cyan-ink">
              <TrophyIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {assessment.totalMarks !== null
              ? formatNumber(assessment.totalMarks)
              : "0"}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sum of question marks
          </p>
        </Card>

        <Card className="border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Time Limit
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-amber-soft text-brand-amber-ink">
              <ClockIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {assessment.durationMinutes !== null
              ? `${assessment.durationMinutes} min`
              : "Untimed"}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {assessment.durationMinutes !== null
              ? "Automated countdown timer"
              : "Practice at your own pace"}
          </p>
        </Card>

        <Card className="border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Syllabus Coverage
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
              <BookOpenIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground">
            {allTopics.length}{" "}
            <span className="font-sans text-xs font-normal text-muted-foreground">
              topics
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Mapped to Exam Prep
          </p>
        </Card>
      </div>

      {/* Test Instructions Banner */}
      {assessment.instructions ? (
        <Alert className="border-border/80 bg-card shadow-xs">
          <ScrollTextIcon
            className="size-4 text-brand-violet-ink"
            aria-hidden="true"
          />
          <AlertTitle className="text-sm font-semibold text-foreground">
            Exam Instructions
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
            <span className="whitespace-pre-wrap">
              {assessment.instructions}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Topic Alignment Cloud */}
      {allTopics.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <LayersIcon className="size-3.5 text-brand-violet-ink" />
            Tested Topics in this Paper ({allTopics.length}):
          </span>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {allTopics.map((title, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border border-brand-violet-line/30 bg-brand-violet-soft/30 px-2.5 py-0.5 text-xs font-medium text-brand-violet-ink transition-colors hover:bg-brand-violet-soft/50"
              >
                <span
                  className="size-1.5 rounded-full bg-brand-violet-ink"
                  aria-hidden="true"
                />
                {title}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Attempt History Section (when student attempts exist) */}
      {attempts.length > 0 ? (
        <section aria-labelledby="attempts-title" className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2
              id="attempts-title"
              className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
            >
              <TrophyIcon className="size-4 text-brand-amber-ink" />
              Your Past Attempts ({attempts.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Recent test results
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[80px_1fr_120px_120px_140px] sm:items-center sm:gap-3">
              <span>Attempt</span>
              <span>Status</span>
              <span className="text-right">Score</span>
              <span className="text-right">Accuracy</span>
              <span className="text-right">Analysis</span>
            </div>
            <div className="divide-y divide-border">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="grid gap-2 p-3.5 text-xs sm:grid-cols-[80px_1fr_120px_120px_140px] sm:items-center sm:gap-3"
                >
                  <span className="font-mono font-bold text-foreground">
                    #{attempt.attemptNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        attempt.status === "evaluated" ||
                          attempt.status === "submitted"
                          ? "border-success-line/40 bg-success-soft text-success-ink"
                          : "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
                      )}
                    >
                      {attempt.status === "evaluated"
                        ? "Graded"
                        : attempt.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDate(attempt.startedAt)}
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-foreground sm:text-right">
                    {attempt.score !== null
                      ? `${formatNumber(attempt.score)}`
                      : "—"}
                    {attempt.maxScore !== null
                      ? ` / ${formatNumber(attempt.maxScore)}`
                      : ""}
                  </div>
                  <div className="sm:text-right">
                    {attempt.accuracyRate !== null ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-success-ink">
                        {attempt.accuracyRate}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-7 text-xs text-brand-violet-ink hover:text-brand-violet-ink"
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
                      <ExternalLinkIcon className="ml-1 size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Questions List & Practice Paper */}
      {assessment.questions.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AlertCircleIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              No questions in this test yet
            </p>
            <p className="mx-auto max-w-sm text-xs text-muted-foreground">
              {canWrite
                ? "Add questions from your Question Bank to complete this mock test."
                : "The author hasn't added questions yet."}
            </p>
          </div>
          {canWrite ? (
            <Button
              size="sm"
              className="h-8 text-xs font-medium"
              render={
                <Link
                  href={workspaceRoutes.mockTests.edit(
                    workspaceSlug,
                    assessment.id
                  )}
                />
              }
            >
              <FilePenLineIcon data-icon="inline-start" aria-hidden="true" />
              Add questions now
            </Button>
          ) : null}
        </div>
      ) : (
        <section aria-labelledby="questions-title" className="space-y-4">
          {/* Section Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2
                id="questions-title"
                className="font-heading text-xl font-bold text-foreground"
              >
                Test Paper & Question Roster
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {assessment.questionCount} questions ·{" "}
                {formatNumber(assessment.totalMarks)} total marks
              </p>
            </div>

            {/* Global Answer Key & Solution Review Toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showAllSolutions ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAllSolutions(!showAllSolutions)}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <EyeIcon
                  className="size-3.5 text-brand-violet-ink"
                  aria-hidden="true"
                />
                {showAllSolutions
                  ? "Hide Answer Keys"
                  : "Reveal Answer Keys & Solutions"}
              </Button>
            </div>
          </div>

          {/* Render Sections */}
          {[...sections.entries()].map(([sectionName, questions]) => (
            <div key={sectionName || "__unsectioned__"} className="space-y-3">
              {sectionName ? (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs font-bold tracking-wider text-brand-violet-ink uppercase">
                    Section:
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {sectionName}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {questions.length}{" "}
                    {questions.length === 1 ? "question" : "questions"}
                  </Badge>
                </div>
              ) : null}

              <div className="space-y-3">
                {questions.map((question, qIdx) => {
                  const isExpanded =
                    showAllSolutions ||
                    Boolean(expandedQuestionIds[question.id])
                  const displayNum = String(question.position + 1).padStart(
                    2,
                    "0"
                  )

                  return (
                    <div
                      key={question.id || qIdx}
                      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors sm:p-5"
                    >
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-bold text-foreground">
                            {displayNum}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
                              questionKindBadgeClass(question.kind)
                            )}
                          >
                            {question.kind === "SINGLE_CHOICE" ? (
                              <CircleCheckBigIcon
                                className="size-3"
                                aria-hidden="true"
                              />
                            ) : question.kind === "MULTIPLE_CHOICE" ? (
                              <ListChecksIcon
                                className="size-3"
                                aria-hidden="true"
                              />
                            ) : question.kind === "TRUE_FALSE" ? (
                              <CheckCircle2Icon
                                className="size-3"
                                aria-hidden="true"
                              />
                            ) : question.kind === "NUMERIC" ? (
                              <HashIcon className="size-3" aria-hidden="true" />
                            ) : (
                              <FilePenLineIcon
                                className="size-3"
                                aria-hidden="true"
                              />
                            )}
                            {questionKindLabel(question.kind)}
                          </span>

                          {question.difficulty !== null ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                                question.difficulty <= 2
                                  ? "bg-muted text-muted-foreground"
                                  : question.difficulty === 3
                                    ? "bg-brand-amber-soft text-brand-amber-ink"
                                    : "bg-success-soft text-success-ink"
                              )}
                            >
                              Level {question.difficulty}
                            </span>
                          ) : null}
                        </div>

                        {/* Marks & Expand */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            +{formatNumber(question.marks)} marks
                            {question.negativeMarks < 0 ? (
                              <span className="ml-1 font-normal text-destructive">
                                (-{formatNumber(-question.negativeMarks)})
                              </span>
                            ) : null}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toggleQuestion(question.id)}
                          >
                            {isExpanded ? (
                              <>
                                Hide Solution
                                <ChevronUpIcon className="size-3" />
                              </>
                            ) : (
                              <>
                                View Solution
                                <ChevronDownIcon className="size-3" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Stem Prompt with LaTeX Equations */}
                      <div>
                        <RichContent
                          html={question.stem}
                          className="text-sm leading-relaxed font-medium text-foreground"
                        />
                      </div>

                      {/* Topic Tags */}
                      {question.targetTitles &&
                      question.targetTitles.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {question.targetTitles.map((title, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md border border-brand-violet-line/30 bg-brand-violet-soft/30 px-2 py-0.5 text-[11px] font-medium text-brand-violet-ink"
                            >
                              <span
                                className="size-1 rounded-full bg-brand-violet-ink"
                                aria-hidden="true"
                              />
                              {title}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Options & Solutions (Always in practice or when expanded) */}
                      {isExpanded ? (
                        <div className="mt-3 space-y-3 rounded-lg border-t border-border/80 bg-muted/15 p-3.5 pt-3">
                          {/* Options grid for choices */}
                          {question.options && question.options.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                Answer Options & Correct Key
                              </span>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {question.options.map((opt) => {
                                  const isCorrect =
                                    question.answerKeys?.includes(opt.key)
                                  return (
                                    <div
                                      key={opt.key}
                                      className={cn(
                                        "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                                        isCorrect
                                          ? "border-success-line bg-success-soft font-medium text-success-ink"
                                          : "border-border/80 bg-card text-foreground"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold",
                                          isCorrect
                                            ? "border-success bg-success text-success-foreground"
                                            : "border-border bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {opt.key}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <RichContent
                                          html={opt.content}
                                          className="text-xs leading-relaxed"
                                        />
                                      </div>
                                      {isCorrect ? (
                                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-success-ink" />
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : question.numericAnswer !== null ? (
                            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-3 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                Correct Numeric Value:
                              </span>
                              <span className="font-mono font-bold text-success-ink">
                                {question.numericAnswer}
                              </span>
                            </div>
                          ) : question.textAnswer ? (
                            <div className="space-y-1 rounded-lg border border-border/80 bg-card p-3 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                Model Answer:
                              </span>
                              <p className="font-mono text-foreground">
                                {question.textAnswer}
                              </p>
                            </div>
                          ) : null}

                          {/* Step-by-Step Explanation */}
                          {question.explanation &&
                          stripHtml(question.explanation).trim() ? (
                            <div className="space-y-1.5 rounded-lg border border-border/80 bg-card p-3.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <HelpCircleIcon className="size-3.5 text-brand-violet-ink" />
                                Step-by-Step Derivation & Explanation
                              </div>
                              <RichContent
                                html={question.explanation}
                                className="text-xs leading-relaxed text-muted-foreground"
                              />
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
        </section>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Created {formatDate(assessment.createdAt)}</span>
        <span>Last updated {formatDate(assessment.updatedAt)}</span>
      </div>
    </div>
  )
}

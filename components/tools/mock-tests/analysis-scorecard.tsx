"use client"

import { useMemo, useState } from "react"
import {
  ClockIcon,
  SparklesIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { QuestionStem } from "./questions/question-view"
import { AnalysisBenchmark } from "./analysis-benchmark"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  formatDuration,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import type { AnalysisDoc } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

interface AnalysisScorecardProps {
  analysis: Pick<
    AnalysisDoc,
    | "status"
    | "score"
    | "maxScore"
    | "percentage"
    | "grossMarksGained"
    | "negativeMarksLost"
    | "accuracy"
    | "totalTimeSpentSeconds"
    | "avgTimePerQuestionSeconds"
    | "correctCount"
    | "incorrectCount"
    | "unansweredCount"
    | "questions"
    | "recommendation"
    | "passingBenchmark"
    | "distinctionBenchmark"
  >
}

export function AnalysisScorecard({ analysis }: AnalysisScorecardProps) {
  const [selectedSection, setSelectedSection] = useState<string>("ALL")

  const totalQuestions = analysis.questions.length
  const attemptedCount = analysis.correctCount + analysis.incorrectCount
  // Derive distinct sections for heatmap filtering
  const sections = useMemo(() => {
    const list = Array.from(
      new Set(analysis.questions.map((q) => q.section).filter(Boolean))
    ) as string[]
    return list
  }, [analysis.questions])

  // Filter questions by section if selected
  const displayedQuestions = useMemo(() => {
    if (selectedSection === "ALL") return analysis.questions
    return analysis.questions.filter((q) => q.section === selectedSection)
  }, [analysis.questions, selectedSection])

  // Heatmap click handler: dispatches event & scrolls to targeted question
  function handleSelectQuestion(questionId: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("select-review-question", { detail: { questionId } })
      )
    }

    setTimeout(() => {
      const el = document.getElementById(`question-review-${questionId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-2", "ring-primary", "ring-offset-2")
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2")
        }, 2000)
      }
    }, 50)
  }

  return (
    <section
      aria-labelledby="scorecard-heading"
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      <h2 id="scorecard-heading" className="sr-only">
        Attempt Performance Telemetry &amp; Heatmap
      </h2>

      {/* ── SEGMENT 1: Score & Benchmark Hero ── */}
      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[340px_1fr] lg:divide-x lg:divide-y-0">
        {/* Left Sub-pane: Net Score Hero */}
        <div className="flex flex-col justify-center gap-2 p-5 sm:p-6">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Net Score
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              {formatNumber(analysis.score)}
            </span>
            <span className="text-lg font-medium text-muted-foreground sm:text-xl">
              / {formatNumber(analysis.maxScore)}
            </span>
            <span className="ml-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Marks
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              +{formatNumber(analysis.grossMarksGained)} gross
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              -{formatNumber(analysis.negativeMarksLost)} penalty
            </span>
          </div>
        </div>

        <AnalysisBenchmark analysis={analysis} />
      </div>

      {/* ── SEGMENT 2: 4 Core CBT Metric Grid ── */}
      <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Accuracy */}
        <div className="space-y-1 border-b border-border p-5 sm:border-r sm:border-b-0 lg:border-r">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Accuracy</span>
            <TrendingUpIcon className="size-3.5 text-emerald-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {analysis.accuracy !== null ? `${analysis.accuracy}%` : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {analysis.correctCount} of {attemptedCount} attempted
          </p>
        </div>

        {/* 2. Negative Marks Lost */}
        <div className="space-y-1 border-b border-border p-5 sm:border-b-0 lg:border-r">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Negative Marks Lost</span>
            <TrendingDownIcon className="size-3.5 text-destructive" />
          </div>
          <div className="font-mono text-2xl font-bold text-destructive">
            -{formatNumber(analysis.negativeMarksLost)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross marks: +{formatNumber(analysis.grossMarksGained)}
          </p>
        </div>

        {/* 3. Total Time Elapsed */}
        <div className="space-y-1 border-b border-border p-5 sm:border-r sm:border-b-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Total Time Elapsed</span>
            <ClockIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {formatDuration(analysis.totalTimeSpentSeconds)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Avg {formatDuration(analysis.avgTimePerQuestionSeconds)} per
            question
          </p>
        </div>

        {/* 4. Questions Attempted */}
        <div className="space-y-1 p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Questions Attempted</span>
            <TargetIcon className="size-3.5 text-sky-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {attemptedCount}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / {totalQuestions}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalQuestions > 0
              ? Math.round((attemptedCount / totalQuestions) * 100)
              : 0}
            % attempt rate • {analysis.unansweredCount} skipped
          </p>
        </div>
      </div>

      {/* ── SEGMENT 3: Question Performance Heatmap Matrix ── */}
      <div className="space-y-4 border-t border-border p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Visual Scorecard Matrix
            </p>
            <h3 className="text-base font-bold text-foreground sm:text-lg">
              Question Performance Heatmap
            </h3>
          </div>

          {/* Mini Legend with Live Counts */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 shrink-0 rounded-md bg-emerald-600 dark:bg-emerald-500" />
              <span className="text-foreground">Correct</span>
              <Badge
                variant="secondary"
                className="h-5 border-0 bg-emerald-500/15 px-1.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
              >
                {analysis.correctCount}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 shrink-0 rounded-md bg-rose-600 dark:bg-rose-500" />
              <span className="text-foreground">Incorrect</span>
              <Badge
                variant="secondary"
                className="h-5 border-0 bg-rose-500/15 px-1.5 font-mono text-[10px] font-bold text-rose-700 dark:text-rose-400"
              >
                {analysis.incorrectCount}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 shrink-0 rounded-md border border-border bg-muted/80" />
              <span className="text-foreground">Skipped</span>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
              >
                {analysis.unansweredCount}
              </Badge>
            </div>
          </div>
        </div>

        {/* Section Filter Pills (if multiple sections exist) */}
        {sections.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedSection("ALL")}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all",
                selectedSection === "ALL"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Sections ({totalQuestions})
            </button>
            {sections.map((sec) => {
              const secQuestions = analysis.questions.filter(
                (q) => q.section === sec
              )
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all",
                    selectedSection === sec
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {sec} ({secQuestions.length})
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Heatmap Chips Grid */}
        <div className="flex flex-wrap gap-2 pt-1">
          {displayedQuestions.map((q) => {
            const actualIndex = analysis.questions.findIndex(
              (item) => item.questionId === q.questionId
            )
            const isCorrect = q.isCorrect === true
            const isIncorrect = q.isCorrect === false

            let cellClass =
              "bg-muted/50 text-muted-foreground border border-border hover:border-foreground/40 hover:bg-muted"
            let statusText = "Skipped / Unattempted (0.00)"

            if (isCorrect) {
              cellClass =
                "bg-emerald-600 dark:bg-emerald-500 text-white font-bold hover:brightness-110 shadow-2xs"
              statusText = `Correct (+${q.awardedMarks})`
            } else if (isIncorrect) {
              cellClass =
                "bg-rose-600 dark:bg-rose-500 text-white font-bold hover:brightness-110 shadow-2xs"
              statusText = `Incorrect (${q.awardedMarks < 0 ? q.awardedMarks : "0.00"})`
            }

            return (
              <HoverCard key={q.questionId}>
                <HoverCardTrigger
                  delay={100}
                  closeDelay={150}
                  render={
                    <button
                      type="button"
                      onClick={() => handleSelectQuestion(q.questionId)}
                      className={cn(
                        "flex size-9 cursor-pointer items-center justify-center rounded-lg font-mono text-xs transition-all active:scale-95 sm:size-10",
                        cellClass
                      )}
                      aria-label={`Question ${actualIndex + 1}: ${statusText}`}
                    >
                      {actualIndex + 1}
                    </button>
                  }
                />
                <HoverCardContent
                  side="top"
                  align="center"
                  className="w-80 space-y-2.5 rounded-2xl border border-border bg-popover/95 p-3.5 text-left shadow-xl backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 font-mono text-xs font-bold text-foreground">
                        Q{actualIndex + 1}
                      </span>
                      {q.section ? (
                        <span className="truncate text-[11px] font-medium text-muted-foreground">
                          • {q.section}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      {isCorrect ? (
                        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatNumber(q.awardedMarks)} marks
                        </span>
                      ) : isIncorrect ? (
                        <span className="inline-flex items-center rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {q.awardedMarks < 0
                            ? formatNumber(q.awardedMarks)
                            : "0.00"}{" "}
                          marks
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  <QuestionStem stem={q.stem} compact />

                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">Your answer:</span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        isCorrect
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isIncorrect
                            ? "text-rose-600 dark:text-rose-400"
                            : "font-normal text-muted-foreground italic"
                      )}
                    >
                      {q.selectedKeys.length > 0
                        ? `Option ${q.selectedKeys.join(", ")}`
                        : q.answerText
                          ? q.answerText
                          : "Not attempted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {formatDuration(q.timeSpentSeconds)}
                    </span>
                    <span className="font-semibold text-primary">
                      Click to review →
                    </span>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )
          })}
        </div>
      </div>

      {/* ── SEGMENT 4: Action Strategy Footer Ribbon ── */}
      {analysis.recommendation ? (
        <div className="flex items-start gap-3 border-t border-border bg-muted/15 p-4 sm:p-5">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1 text-xs">
            <span className="block text-[11px] font-bold tracking-wider text-primary uppercase">
              Recommended Action Strategy
            </span>
            <p className="leading-relaxed text-foreground">
              {analysis.recommendation}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}

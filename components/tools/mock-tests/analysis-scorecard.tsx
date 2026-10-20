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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDuration, formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type {
  AnalysisDoc,
} from "@/lib/tools/definitions/mock-tests/calculations/analysis"

interface AnalysisScorecardProps {
  analysis: Pick<
    AnalysisDoc,
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


function cleanSnippet(html: string, maxLength = 120): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "…"
}

export function AnalysisScorecard({ analysis }: AnalysisScorecardProps) {
  const [selectedSection, setSelectedSection] = useState<string>("ALL")

  const totalQuestions = analysis.questions.length
  const attemptedCount = analysis.correctCount + analysis.incorrectCount
  const percentage =
    analysis.percentage ??
    (analysis.maxScore > 0
      ? Math.round((analysis.score / analysis.maxScore) * 100)
      : 0)

  const passingBenchmark = analysis.passingBenchmark ?? 33
  const distinctionBenchmark = analysis.distinctionBenchmark ?? 70

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

  // Performance tier badge configuration evaluated against custom benchmarks
  const tierBadge =
    percentage >= distinctionBenchmark
      ? {
          label: "Distinction",
          sub: "Exceeds Benchmark",
          color:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        }
      : percentage >= passingBenchmark
        ? {
            label: "Qualified",
            sub: "Meets Passing Cut-off",
            color:
              "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
          }
        : {
            label: "Below Cut-off",
            sub: "Needs Revision",
            color:
              "bg-destructive/10 text-destructive border-destructive/30",
          }

  return (
    <section
      aria-labelledby="scorecard-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      <h2 id="scorecard-heading" className="sr-only">
        Attempt Performance Telemetry &amp; Heatmap
      </h2>

      {/* ── SEGMENT 1: Score & Benchmark Hero ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left Sub-pane: Net Score Hero */}
        <div className="p-5 sm:p-6 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Net Score
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
              {formatNumber(analysis.score)}
            </span>
            <span className="text-lg sm:text-xl font-medium text-muted-foreground">
              / {formatNumber(analysis.maxScore)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
              Marks
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              +{formatNumber(analysis.grossMarksGained)} gross
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              -{formatNumber(analysis.negativeMarksLost)} penalty
            </span>
          </div>
        </div>

        {/* Right Sub-pane: Performance Benchmark & Inline Progress Meter */}
        <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-muted/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Performance Benchmark
              </span>
              <span className="text-xs text-muted-foreground">
                Target cut-off: {passingBenchmark}% pass • {distinctionBenchmark}% distinction
              </span>
            </div>

            <div
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold text-xs border shadow-2xs text-center shrink-0",
                tierBadge.color
              )}
            >
              <span className="uppercase text-[9px] tracking-wider font-extrabold block">
                {tierBadge.label}
              </span>
              <span className="text-[11px] font-semibold block mt-0.5">
                {tierBadge.sub}
              </span>
            </div>
          </div>

          {/* Inline Percentage & Benchmark Progress Bar */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted relative">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-border/80 z-10"
                  style={{ left: `${passingBenchmark}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-border/80 z-10"
                  style={{ left: `${distinctionBenchmark}%` }}
                />
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    percentage >= distinctionBenchmark
                      ? "bg-emerald-500"
                      : percentage >= passingBenchmark
                        ? "bg-amber-500"
                        : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>0%</span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {passingBenchmark}% Pass
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {distinctionBenchmark}% Distinction
                </span>
                <span>100%</span>
              </div>
            </div>

            <div className="shrink-0 text-right min-w-[70px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                Score
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-foreground block mt-0.5">
                {percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEGMENT 2: 4 Core CBT Metric Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-border">
        {/* 1. Accuracy */}
        <div className="p-5 border-b sm:border-b-0 sm:border-r lg:border-r border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Accuracy</span>
            <TrendingUpIcon className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">
            {analysis.accuracy !== null ? `${analysis.accuracy}%` : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {analysis.correctCount} of {attemptedCount} attempted
          </p>
        </div>

        {/* 2. Negative Marks Lost */}
        <div className="p-5 border-b sm:border-b-0 lg:border-r border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Negative Marks Lost</span>
            <TrendingDownIcon className="size-3.5 text-destructive" />
          </div>
          <div className="text-2xl font-mono font-bold text-destructive">
            -{formatNumber(analysis.negativeMarksLost)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross marks: +{formatNumber(analysis.grossMarksGained)}
          </p>
        </div>

        {/* 3. Total Time Elapsed */}
        <div className="p-5 border-b sm:border-b-0 sm:border-r border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Total Time Elapsed</span>
            <ClockIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatDuration(analysis.totalTimeSpentSeconds)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Avg {formatDuration(analysis.avgTimePerQuestionSeconds)} per question
          </p>
        </div>

        {/* 4. Questions Attempted */}
        <div className="p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Questions Attempted</span>
            <TargetIcon className="size-3.5 text-sky-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">
            {attemptedCount}
            <span className="text-sm font-normal text-muted-foreground ml-1">
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
      <div className="border-t border-border p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Visual Scorecard Matrix
            </p>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Question Performance Heatmap
            </h3>
          </div>

          {/* Mini Legend with Live Counts */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 rounded-md bg-emerald-600 dark:bg-emerald-500 shrink-0" />
              <span className="text-foreground">Correct</span>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0"
              >
                {analysis.correctCount}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 rounded-md bg-rose-600 dark:bg-rose-500 shrink-0" />
              <span className="text-foreground">Incorrect</span>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0"
              >
                {analysis.incorrectCount}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-3.5 rounded-md border border-border bg-muted/80 shrink-0" />
              <span className="text-foreground">Skipped</span>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-mono font-medium text-muted-foreground"
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
                "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                selectedSection === "ALL"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Sections ({totalQuestions})
            </button>
            {sections.map((sec) => {
              const secQuestions = analysis.questions.filter((q) => q.section === sec)
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
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
                        "flex size-9 sm:size-10 items-center justify-center rounded-lg font-mono text-xs transition-all active:scale-95 cursor-pointer",
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
                  className="w-80 p-3.5 space-y-2.5 rounded-2xl bg-popover/95 backdrop-blur-md shadow-xl border border-border text-left"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-xs text-foreground shrink-0">
                        Q{actualIndex + 1}
                      </span>
                      {q.section ? (
                        <span className="truncate text-[11px] text-muted-foreground font-medium">
                          • {q.section}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      {isCorrect ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          +{formatNumber(q.awardedMarks)} marks
                        </span>
                      ) : isIncorrect ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          {q.awardedMarks < 0 ? formatNumber(q.awardedMarks) : "0.00"} marks
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                    {cleanSnippet(q.stem)}
                  </p>

                  <div className="flex items-center justify-between text-[11px] bg-muted/40 rounded-lg px-2.5 py-1.5 border border-border/60">
                    <span className="text-muted-foreground">Your answer:</span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        isCorrect
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isIncorrect
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground italic font-normal"
                      )}
                    >
                      {q.selectedKeys.length > 0
                        ? `Option ${q.selectedKeys.join(", ")}`
                        : q.answerText
                          ? q.answerText
                          : "Not attempted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
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
        <div className="border-t border-border bg-muted/15 p-4 sm:p-5 flex items-start gap-3">
          <SparklesIcon className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-primary uppercase tracking-wider text-[11px] block">
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

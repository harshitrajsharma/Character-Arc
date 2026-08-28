"use client"

import { useState, useMemo } from "react"
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  HelpCircleIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { questionKindLabel, formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type { AnalysisQuestionRow } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

type FilterMode = "ALL" | "INCORRECT" | "UNANSWERED" | "CORRECT"

function formatTimeSpent(seconds: number | null): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function AnalysisReviewList({
  questions,
}: {
  questions: AnalysisQuestionRow[]
}) {
  const [filter, setFilter] = useState<FilterMode>("ALL")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const counts = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let unanswered = 0
    questions.forEach((q) => {
      if (q.isCorrect === true) correct += 1
      else if (q.isCorrect === false) incorrect += 1
      else unanswered += 1
    })
    return { all: questions.length, correct, incorrect, unanswered }
  }, [questions])

  const filteredQuestions = useMemo(() => {
    if (filter === "CORRECT") return questions.filter((q) => q.isCorrect === true)
    if (filter === "INCORRECT") return questions.filter((q) => q.isCorrect === false)
    if (filter === "UNANSWERED") return questions.filter((q) => q.isCorrect === null)
    return questions
  }, [questions, filter])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section aria-labelledby="review-title" className="mt-8 space-y-4">
      {/* Section Header & Filter Pills */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question by Question
          </p>
          <h2 id="review-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
            Detailed Solution Review
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              filter === "ALL"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("INCORRECT")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
              filter === "INCORRECT"
                ? "bg-destructive/15 text-destructive shadow-xs font-semibold"
                : "text-muted-foreground hover:text-destructive"
            )}
          >
            <XCircleIcon className="size-3" />
            Incorrect ({counts.incorrect})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNANSWERED")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              filter === "UNANSWERED"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unanswered ({counts.unanswered})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CORRECT")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
              filter === "CORRECT"
                ? "bg-success-soft text-success-ink shadow-xs font-semibold"
                : "text-muted-foreground hover:text-success-ink"
            )}
          >
            <CheckCircle2Icon className="size-3" />
            Correct ({counts.correct})
          </button>
        </div>
      </div>

      {/* Questions list */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
          No questions match the active filter ({filter.toLowerCase()}).
        </div>
      ) : (
        <ol className="space-y-4">
          {filteredQuestions.map((question) => {
            const originalIndex = questions.findIndex((q) => q.questionId === question.questionId)
            const isUnanswered = question.selectedKeys.length === 0 && !question.answerText
            const isCorrect = question.isCorrect === true
            const isIncorrect = question.isCorrect === false
            const timeSpent = formatTimeSpent(question.timeSpentSeconds)
            const isCollapsed = expandedIds[question.questionId] === false // default expanded

            return (
              <li
                key={question.questionId}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-colors"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(question.questionId)}
                  className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isCorrect
                          ? "bg-success-soft text-success-ink"
                          : isIncorrect
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2Icon className="size-4" />
                      ) : isIncorrect ? (
                        <XCircleIcon className="size-4" />
                      ) : (
                        originalIndex + 1
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Question {originalIndex + 1}
                        </span>
                        {question.section ? (
                          <Badge variant="outline" className="text-[10px]">
                            {question.section}
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-[10px]">
                          {questionKindLabel(question.kind)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {timeSpent ? (
                      <span className="hidden sm:flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <ClockIcon className="size-3" />
                        {timeSpent}
                      </span>
                    ) : null}

                    <div className="text-right text-xs font-mono">
                      <span
                        className={cn(
                          "font-bold",
                          isCorrect
                            ? "text-success-ink"
                            : isIncorrect
                              ? "text-destructive"
                              : "text-muted-foreground"
                        )}
                      >
                        {formatNumber(question.awardedMarks)}
                      </span>
                      <span className="text-muted-foreground"> / {formatNumber(question.marks)} marks</span>
                    </div>

                    <Button variant="ghost" size="icon-xs" className="size-7 text-muted-foreground">
                      {isCollapsed ? <ChevronDownIcon className="size-4" /> : <ChevronUpIcon className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Body Content */}
                {!isCollapsed ? (
                  <div className="p-4 sm:p-5 space-y-4">
                    <RichContent html={question.stem} className="text-sm leading-relaxed text-foreground" />

                    {/* Options / Numeric / Short Answer */}
                    {question.options.length > 0 ? (
                      <ul className="space-y-2">
                        {question.options.map((option) => {
                          const selected = question.selectedKeys.includes(option.key)
                          const correct = question.correctKeys.includes(option.key)
                          return (
                            <li
                              key={option.key}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3 text-xs transition-colors",
                                correct
                                  ? "border-success-line bg-success-soft text-success-ink shadow-xs"
                                  : selected
                                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                                    : "border-border/80 bg-background text-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border",
                                  correct
                                    ? "bg-success text-success-foreground border-success"
                                    : selected
                                      ? "border-destructive/40 bg-destructive/20 text-destructive"
                                      : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {option.key}
                              </span>
                              <div className="min-w-0 flex-1">
                                <RichContent html={option.content} className="text-xs leading-relaxed" />
                              </div>
                              {correct ? (
                                <span className="shrink-0 text-xs font-semibold text-success-ink">
                                  Correct answer
                                </span>
                              ) : selected ? (
                                <span className="shrink-0 text-xs font-semibold text-destructive">
                                  Your choice
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : question.kind === "NUMERIC" ? (
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs flex flex-wrap items-center gap-4">
                        <div>
                          <span className="text-muted-foreground font-medium">Your Answer: </span>
                          <span className="font-mono font-bold text-foreground">
                            {question.answerText ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">Correct Value: </span>
                          <span className="font-mono font-bold text-success-ink">
                            {question.numericAnswer !== null && question.numericAnswer !== undefined
                              ? formatNumber(question.numericAnswer)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs space-y-1.5">
                        <div>
                          <span className="text-muted-foreground font-medium">Your Answer: </span>
                          <span className="font-mono text-foreground">{question.answerText ?? "—"}</span>
                        </div>
                        {question.modelAnswer ? (
                          <div>
                            <span className="text-muted-foreground font-medium">Model Answer: </span>
                            <span className="font-mono font-bold text-success-ink">
                              {question.modelAnswer}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {isUnanswered ? (
                      <div className="rounded-lg border border-brand-amber-line bg-brand-amber-soft p-2.5 text-xs text-brand-amber-ink">
                        Skipped / Unanswered — awarded 0 marks.
                      </div>
                    ) : null}

                    {/* Step-by-Step Solution Derivation */}
                    {question.explanation ? (
                      <div className="rounded-xl border border-brand-violet-line/30 bg-brand-violet-soft/20 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-violet-ink uppercase tracking-wide">
                          <HelpCircleIcon className="size-4" />
                          Step-by-Step Solution Explanation
                        </div>
                        <RichContent html={question.explanation} className="text-xs leading-relaxed text-foreground" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

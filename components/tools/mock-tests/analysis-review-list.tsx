"use client"

import { useState, useMemo, useEffect, startTransition } from "react"
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  LightbulbIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { questionKindLabel, formatNumber, formatDuration } from "@/lib/tools/mock-tests/kind-labels"
import type { AnalysisQuestionRow } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

type FilterMode = "ALL" | "INCORRECT" | "NEGATIVE" | "UNANSWERED" | "CORRECT"

export function AnalysisReviewList({
  questions,
}: {
  questions: AnalysisQuestionRow[]
}) {
  const [filter, setFilter] = useState<FilterMode>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSection, setSelectedSection] = useState<string>("ALL")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    // Lazy expansion: expand only the first high-yield review candidate on initial mount
    const firstIncorrect = questions.find((q) => q.isCorrect === false)
    const targetId = firstIncorrect?.questionId ?? questions[0]?.questionId
    return targetId ? { [targetId]: true } : {}
  })

  const sections = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.section).filter(Boolean))) as string[]
  }, [questions])

  // Heatmap click interaction bridge
  useEffect(() => {
    function handleSelect(e: Event) {
      const customEvent = e as CustomEvent<{ questionId: string }>
      const targetId = customEvent.detail?.questionId
      if (!targetId) return

      const q = questions.find((item) => item.questionId === targetId)
      if (!q) return

      // If active filter would hide this question, reset filter to ALL
      setFilter((currentFilter) => {
        if (currentFilter === "CORRECT" && q.isCorrect !== true) return "ALL"
        if (currentFilter === "INCORRECT" && q.isCorrect !== false) return "ALL"
        if (currentFilter === "NEGATIVE" && (q.isCorrect !== false || q.awardedMarks >= 0)) return "ALL"
        if (currentFilter === "UNANSWERED" && q.isCorrect !== null) return "ALL"
        return currentFilter
      })

      // Ensure search query or section doesn't hide it
      setSearchQuery("")
      setSelectedSection("ALL")

      // Expand the targeted question card
      setExpandedIds((prev) => ({ ...prev, [targetId]: true }))

      // Smooth scroll into view
      setTimeout(() => {
        const el = document.getElementById(`question-review-${targetId}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.classList.add("ring-2", "ring-primary", "ring-offset-2")
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2")
          }, 2000)
        }
      }, 100)
    }

    window.addEventListener("select-review-question", handleSelect)
    return () => {
      window.removeEventListener("select-review-question", handleSelect)
    }
  }, [questions])

  const counts = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let negative = 0
    let unanswered = 0
    questions.forEach((q) => {
      if (q.isCorrect === true) correct += 1
      else if (q.isCorrect === false) {
        incorrect += 1
        if (q.awardedMarks < 0) negative += 1
      } else unanswered += 1
    })
    return { all: questions.length, correct, incorrect, negative, unanswered }
  }, [questions])

  const filteredQuestions = useMemo(() => {
    let result = questions

    // Status filter
    if (filter === "CORRECT") result = result.filter((q) => q.isCorrect === true)
    else if (filter === "INCORRECT") result = result.filter((q) => q.isCorrect === false)
    else if (filter === "NEGATIVE") result = result.filter((q) => q.isCorrect === false && q.awardedMarks < 0)
    else if (filter === "UNANSWERED") result = result.filter((q) => q.isCorrect === null)

    // Section filter
    if (selectedSection !== "ALL") {
      result = result.filter((q) => q.section === selectedSection)
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((q, index) => {
        const qNum = `q${index + 1}`
        if (qNum.includes(query)) return true
        if (q.stem.toLowerCase().includes(query)) return true
        if (q.options?.some((o) => o.content.toLowerCase().includes(query))) return true
        if (q.explanation && q.explanation.toLowerCase().includes(query)) return true
        return false
      })
    }

    return result
  }, [questions, filter, selectedSection, searchQuery])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll(expand: boolean) {
    startTransition(() => {
      const updated: Record<string, boolean> = {}
      if (expand) {
        questions.forEach((q) => {
          updated[q.questionId] = true
        })
      }
      setExpandedIds(updated)
    })
  }

  return (
    <section aria-labelledby="review-title" className="mt-8 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Question by Question
          </p>
          <h2 id="review-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
            Detailed Solution &amp; Answer Key
          </h2>
        </div>

        {/* Global Expand/Collapse controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => toggleAll(true)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-full"
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => toggleAll(false)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-full"
          >
            Collapse all
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              filter === "ALL"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("INCORRECT")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer",
              filter === "INCORRECT"
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                : "text-muted-foreground hover:text-rose-500"
            )}
          >
            <XCircleIcon className="size-3" />
            Incorrect ({counts.incorrect})
          </button>
          {counts.negative > 0 ? (
            <button
              type="button"
              onClick={() => setFilter("NEGATIVE")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer",
                filter === "NEGATIVE"
                  ? "bg-destructive/15 text-destructive shadow-xs font-bold"
                  : "text-muted-foreground hover:text-destructive"
              )}
            >
              <AlertTriangleIcon className="size-3" />
              -ve Marks ({counts.negative})
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFilter("UNANSWERED")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              filter === "UNANSWERED"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Skipped ({counts.unanswered})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CORRECT")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer",
              filter === "CORRECT"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-muted-foreground hover:text-emerald-500"
            )}
          >
            <CheckCircle2Icon className="size-3" />
            Correct ({counts.correct})
          </button>
        </div>

        {/* Search & Section Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {sections.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedSection("ALL")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  selectedSection === "ALL"
                    ? "bg-secondary text-secondary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Sections
              </button>
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    selectedSection === sec
                      ? "bg-secondary text-secondary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sec}
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative w-full sm:w-56">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search solutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-full bg-muted/40 border-border"
            />
          </div>
        </div>
      </div>

      {/* Questions list */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
          No questions match the current filters.
        </div>
      ) : (
        <ol className="space-y-4">
          {filteredQuestions.map((question) => {
            const isCorrect = question.isCorrect === true
            const isIncorrect = question.isCorrect === false
            const isUnanswered = question.isCorrect === null
            const isExpanded = Boolean(expandedIds[question.questionId])
            const actualIndex = questions.findIndex((q) => q.questionId === question.questionId)

            return (
              <li
                key={question.questionId}
                id={`question-review-${question.questionId}`}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-200 bg-card shadow-xs",
                  isCorrect
                    ? "border-emerald-500/30"
                    : isIncorrect
                      ? "border-rose-500/30"
                      : "border-border"
                )}
              >
                {/* Question Summary Bar */}
                <div
                  onClick={() => toggleExpand(question.questionId)}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-background border border-border font-mono text-xs font-bold text-foreground">
                      {actualIndex + 1}
                    </span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {questionKindLabel(question.kind)}
                    </Badge>
                    {question.section ? (
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {question.section}
                      </Badge>
                    ) : null}
                    {question.timeSpentSeconds ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground ml-1">
                        <ClockIcon className="size-3" />
                        {formatDuration(question.timeSpentSeconds)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Score badge */}
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2Icon className="size-3.5" />
                        +{question.awardedMarks} Marks
                      </span>
                    ) : isIncorrect ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircleIcon className="size-3.5" />
                        {question.awardedMarks < 0 ? `${question.awardedMarks} Negative` : "0 Marks"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground border border-border">
                        0 Marks (Skipped)
                      </span>
                    )}

                    <button
                      type="button"
                      className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={isExpanded ? "Collapse solution" : "Expand solution"}
                    >
                      {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Solution Body */}
                {isExpanded ? (
                  <div className="p-4 sm:p-6 space-y-5">
                    {/* Question Prompt */}
                    <div className="text-sm sm:text-base leading-relaxed text-foreground rich-text">
                      <RichContent html={question.stem} />
                    </div>

                    {/* Option Choices with High-Contrast Feedback */}
                    {question.options && question.options.length > 0 ? (
                      <ul className="space-y-2 pt-1">
                        {question.options.map((option) => {
                          const selected = question.selectedKeys.includes(option.key)
                          const correct = question.correctKeys.includes(option.key)

                          return (
                            <li
                              key={option.key}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all",
                                correct && selected
                                  ? "border-emerald-500/60 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/30"
                                  : correct
                                    ? "border-emerald-500/50 bg-emerald-500/5 text-foreground ring-1 ring-emerald-500/20"
                                    : selected
                                      ? "border-rose-500/60 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30"
                                      : "border-border/80 bg-background/50 text-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border",
                                  correct
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : selected
                                      ? "border-rose-500/60 bg-rose-600 text-white"
                                      : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {option.key}
                              </span>
                              <div className="min-w-0 flex-1 rich-text leading-relaxed">
                                <RichContent html={option.content} />
                              </div>
                              {correct && selected ? (
                                <span className="inline-flex items-center gap-1 shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckIcon className="size-3.5" />
                                  Your Choice &amp; Correct
                                </span>
                              ) : correct ? (
                                <span className="inline-flex items-center gap-1 shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckIcon className="size-3.5" />
                                  Correct Answer
                                </span>
                              ) : selected ? (
                                <span className="inline-flex items-center gap-1 shrink-0 text-xs font-bold text-rose-600 dark:text-rose-400">
                                  <XIcon className="size-3.5" />
                                  Your Choice
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : question.kind === "NUMERIC" ? (
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs flex flex-wrap items-center gap-8">
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Your Response:</span>
                          <span className={cn(
                            "font-mono text-sm font-bold",
                            isCorrect ? "text-emerald-600 dark:text-emerald-400" : isIncorrect ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                          )}>
                            {question.answerText && question.answerText.trim() !== "" ? question.answerText : "— (Unanswered)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Accepted Correct Value:</span>
                          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {question.numericAnswer !== null && question.numericAnswer !== undefined
                              ? formatNumber(question.numericAnswer)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {isUnanswered ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Question Skipped / Unattempted — No penalty applied (0.00 marks).
                      </div>
                    ) : null}

                    {/* Step-by-Step Mathematical Derivation / Solution */}
                    {question.explanation ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                          <LightbulbIcon className="size-4" />
                          Step-by-Step Solution Derivation
                        </div>
                        <div className="text-xs leading-relaxed text-foreground rich-text">
                          <RichContent html={question.explanation} />
                        </div>
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

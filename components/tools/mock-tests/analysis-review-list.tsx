"use client"

import { useState, useMemo, useEffect, startTransition } from "react"
import {
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { QuestionView } from "./questions/question-view"
import { QuestionCard } from "./questions/question-card"
import { QuestionReviewSummary } from "./questions/question-review-summary"
import { formatDuration } from "@/lib/tools/mock-tests/kind-labels"
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(
    () => {
      // Lazy expansion: expand only the first high-yield review candidate on initial mount
      const firstIncorrect = questions.find((q) => q.isCorrect === false)
      const targetId = firstIncorrect?.questionId ?? questions[0]?.questionId
      return targetId ? { [targetId]: true } : {}
    }
  )

  const sections = useMemo(() => {
    return Array.from(
      new Set(questions.map((q) => q.section).filter(Boolean))
    ) as string[]
  }, [questions])

  const questionNumbers = useMemo(
    () =>
      new Map(
        questions.map((question, index) => [question.questionId, index + 1])
      ),
    [questions]
  )

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
        if (
          currentFilter === "NEGATIVE" &&
          (q.isCorrect !== false || q.awardedMarks >= 0)
        )
          return "ALL"
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
    if (filter === "CORRECT")
      result = result.filter((q) => q.isCorrect === true)
    else if (filter === "INCORRECT")
      result = result.filter((q) => q.isCorrect === false)
    else if (filter === "NEGATIVE")
      result = result.filter((q) => q.isCorrect === false && q.awardedMarks < 0)
    else if (filter === "UNANSWERED")
      result = result.filter((q) => q.isCorrect === null)

    // Section filter
    if (selectedSection !== "ALL") {
      result = result.filter((q) => q.section === selectedSection)
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((q) => {
        const qNum = `q${questionNumbers.get(q.questionId)}`
        if (qNum.includes(query)) return true
        if (q.stem.toLowerCase().includes(query)) return true
        if (q.options?.some((o) => o.content.toLowerCase().includes(query)))
          return true
        if (q.explanation && q.explanation.toLowerCase().includes(query))
          return true
        return false
      })
    }

    return result
  }, [questions, questionNumbers, filter, selectedSection, searchQuery])

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
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Question by Question
          </p>
          <h2
            id="review-title"
            className="mt-0.5 font-heading text-xl font-bold text-foreground"
          >
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
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => toggleAll(false)}
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
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
              "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === "ALL"
                ? "bg-background font-bold text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("INCORRECT")}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === "INCORRECT"
                ? "bg-rose-500/15 font-bold text-rose-600 shadow-xs dark:text-rose-400"
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
                "flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                filter === "NEGATIVE"
                  ? "bg-destructive/15 font-bold text-destructive shadow-xs"
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
              "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === "UNANSWERED"
                ? "bg-background font-bold text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Skipped ({counts.unanswered})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CORRECT")}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === "CORRECT"
                ? "bg-emerald-500/15 font-bold text-emerald-600 shadow-xs dark:text-emerald-400"
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
                  "cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedSection === "ALL"
                    ? "bg-secondary font-bold text-secondary-foreground"
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
                    "cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedSection === sec
                      ? "bg-secondary font-bold text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sec}
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative w-full sm:w-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search solutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-full border-border bg-muted/40 pr-3 pl-8 text-xs"
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
            const isUnanswered = question.isCorrect === null
            const isExpanded = Boolean(expandedIds[question.questionId])
            const actualIndex =
              (questionNumbers.get(question.questionId) ?? 1) - 1

            return (
              <li
                key={question.questionId}
                id={`question-review-${question.questionId}`}
                className="min-w-0"
              >
                <QuestionCard
                  mode="disclosure"
                  question={question}
                  expanded={isExpanded}
                  onToggle={() => toggleExpand(question.questionId)}
                  label={`${isExpanded ? "Collapse" : "Expand"} review for question ${actualIndex + 1}`}
                  summary={
                    <QuestionReviewSummary
                      question={question}
                      allocation={{
                        number: actualIndex + 1,
                        marks: question.marks,
                        negativeMarks: question.negativeMarks,
                        section: question.section,
                      }}
                      response={{
                        selectedKeys: question.selectedKeys,
                        answerText: question.answerText ?? "",
                      }}
                      solution={{
                        answerKeys: question.correctKeys,
                        numericAnswer: question.numericAnswer,
                        textAnswer: question.modelAnswer,
                      }}
                      isCorrect={question.isCorrect}
                      awardedMarks={question.awardedMarks}
                      timeLabel={
                        question.timeSpentSeconds !== null
                          ? formatDuration(question.timeSpentSeconds)
                          : undefined
                      }
                      expanded={isExpanded}
                    />
                  }
                >
                  <QuestionView
                    mode="review"
                    header={null}
                    question={question}
                    response={{
                      selectedKeys: question.selectedKeys,
                      answerText: question.answerText ?? "",
                    }}
                    solution={{
                      answerKeys: question.correctKeys,
                      numericAnswer: question.numericAnswer,
                      textAnswer: question.modelAnswer,
                      explanation: question.explanation,
                    }}
                  />
                  {isUnanswered ? (
                    <p className="text-sm text-muted-foreground">
                      Unanswered - {question.awardedMarks} marks awarded
                    </p>
                  ) : null}
                </QuestionCard>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

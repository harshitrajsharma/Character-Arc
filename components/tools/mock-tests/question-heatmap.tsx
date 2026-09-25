"use client"

import { useMemo, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/tools/mock-tests/kind-labels"
import type { AnalysisQuestionRow } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

interface QuestionHeatmapProps {
  questions: AnalysisQuestionRow[]
  onSelectQuestion?: (questionId: string) => void
}

export function QuestionHeatmap({ questions, onSelectQuestion }: QuestionHeatmapProps) {
  const [selectedSection, setSelectedSection] = useState<string>("ALL")

  const sections = useMemo(() => {
    const list = Array.from(new Set(questions.map((q) => q.section).filter(Boolean))) as string[]
    return list
  }, [questions])

  const counts = useMemo(() => {
    let correct = 0
    let incorrect = 0
    let unanswered = 0
    questions.forEach((q) => {
      if (q.isCorrect === true) correct += 1
      else if (q.isCorrect === false) incorrect += 1
      else unanswered += 1
    })
    return { correct, incorrect, unanswered, total: questions.length }
  }, [questions])

  const displayedQuestions = useMemo(() => {
    if (selectedSection === "ALL") return questions
    return questions.filter((q) => q.section === selectedSection)
  }, [questions, selectedSection])

  function handleClick(questionId: string) {
    // 1. Dispatch custom event so the review list can adjust filter & expand
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("select-review-question", { detail: { questionId } })
      )
    }

    // 2. Call optional callback
    if (onSelectQuestion) {
      onSelectQuestion(questionId)
    }

    // 3. Fallback smooth scroll & pulse ring after slight delay for DOM mount
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
    <section aria-labelledby="heatmap-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Visual Scorecard Matrix
          </p>
          <h2 id="heatmap-heading" className="text-base sm:text-lg font-bold text-foreground">
            Question Performance Heatmap
          </h2>
        </div>

        {/* Mini Legend with Counts */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="size-3.5 rounded-md bg-emerald-600 dark:bg-emerald-500 shrink-0" />
            <span className="text-foreground">Correct</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
              {counts.correct}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="size-3.5 rounded-md bg-rose-600 dark:bg-rose-500 shrink-0" />
            <span className="text-foreground">Incorrect</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0">
              {counts.incorrect}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="size-3.5 rounded-md border border-border bg-muted/80 shrink-0" />
            <span className="text-foreground">Skipped</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono font-medium text-muted-foreground">
              {counts.unanswered}
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
            All Sections ({questions.length})
          </button>
          {sections.map((sec) => {
            const secQuestions = questions.filter((q) => q.section === sec)
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

      {/* Heatmap Grid */}
      <div className="flex flex-wrap gap-2 pt-1">
        {displayedQuestions.map((q) => {
          const actualIndex = questions.findIndex((item) => item.questionId === q.questionId)
          const isCorrect = q.isCorrect === true
          const isIncorrect = q.isCorrect === false

          let cellClass = "bg-muted/50 text-muted-foreground border border-border hover:border-foreground/40 hover:bg-muted"
          let statusText = "Skipped / Unattempted (0.00)"

          if (isCorrect) {
            cellClass = "bg-emerald-600 dark:bg-emerald-500 text-white font-bold hover:brightness-110 shadow-2xs"
            statusText = `Correct (+${q.awardedMarks})`
          } else if (isIncorrect) {
            cellClass = "bg-rose-600 dark:bg-rose-500 text-white font-bold hover:brightness-110 shadow-2xs"
            statusText = `Incorrect (${q.awardedMarks < 0 ? q.awardedMarks : "0.00"})`
          }

          return (
            <Tooltip key={q.questionId}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => handleClick(q.questionId)}
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
              <TooltipContent side="top" className="text-xs space-y-0.5">
                <div className="font-bold">Q{actualIndex + 1} {q.section ? `• ${q.section}` : ""}</div>
                <div className={cn(isCorrect ? "text-emerald-400 font-semibold" : isIncorrect ? "text-rose-400 font-semibold" : "text-muted-foreground")}>
                  {statusText}
                </div>
                {q.timeSpentSeconds ? (
                  <div className="text-muted-foreground text-[10px]">
                    Time Spent: {formatDuration(q.timeSpentSeconds)}
                  </div>
                ) : null}
                <div className="text-[10px] text-primary pt-0.5 font-medium">Click to inspect solution</div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}

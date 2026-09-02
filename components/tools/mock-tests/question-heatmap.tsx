"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AnalysisQuestionRow } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

interface QuestionHeatmapProps {
  questions: AnalysisQuestionRow[]
  onSelectQuestion?: (questionId: string) => void
}

function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function QuestionHeatmap({ questions, onSelectQuestion }: QuestionHeatmapProps) {
  function handleClick(questionId: string) {
    if (onSelectQuestion) {
      onSelectQuestion(questionId)
    } else {
      const el = document.getElementById(`question-review-${questionId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-2", "ring-primary", "ring-offset-2")
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2")
        }, 2000)
      }
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Visual Scorecard Matrix
          </p>
          <h2 className="text-base font-bold text-foreground">
            Question Performance Heatmap
          </h2>
        </div>

        {/* Mini Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-emerald-600 dark:bg-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Correct (+Marks)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-rose-600 dark:bg-rose-500 shrink-0" />
            <span className="text-muted-foreground">Incorrect (-Penalty)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm border border-border bg-muted/80 shrink-0" />
            <span className="text-muted-foreground">Unanswered (0)</span>
          </div>
        </div>
      </div>

      {/* GitHub-style Heatmap Grid */}
      <div className="flex flex-wrap gap-2 pt-1">
        {questions.map((q, idx) => {
          const isCorrect = q.isCorrect === true
          const isIncorrect = q.isCorrect === false
          const isUnanswered = q.isCorrect === null

          let cellClass = "bg-muted/70 text-muted-foreground border border-border hover:border-foreground/40"
          let statusText = "Unanswered (0.00)"

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
                    aria-label={`Question ${idx + 1}: ${statusText}`}
                  >
                    {idx + 1}
                  </button>
                }
              />
              <TooltipContent side="top" className="text-xs space-y-0.5">
                <div className="font-bold">Q{idx + 1} {q.section ? `• ${q.section}` : ""}</div>
                <div className={cn(isCorrect ? "text-emerald-400" : isIncorrect ? "text-rose-400" : "text-muted-foreground")}>
                  {statusText}
                </div>
                {q.timeSpentSeconds ? (
                  <div className="text-muted-foreground text-[10px]">
                    Time: {formatTime(q.timeSpentSeconds)}
                  </div>
                ) : null}
                <div className="text-[10px] text-primary pt-0.5">Click to view solution</div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}

"use client"

import { useState } from "react"
import {
  CheckCircle2Icon,
  EyeIcon,
  HelpCircleIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { stripHtml } from "./editor/html-utils"
import type { QuestionFormTarget } from "./question-form"
import type { TargetableBlock } from "@/lib/tools/definitions/mock-tests/repository"

export function QuestionPreview({
  stem,
  kind,
  difficulty,
  options,
  answerKeys,
  numericAnswer,
  textAnswer,
  explanation,
  targets,
  targetableBlocks,
}: {
  stem: string
  kind: string
  difficulty: string
  options: Array<{ key: string; content: string }>
  answerKeys: string[]
  numericAnswer: string
  textAnswer: string
  explanation: string
  targets: QuestionFormTarget[]
  targetableBlocks: TargetableBlock[]
}) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [userNumeric, setUserNumeric] = useState("")
  const [userText, setUserText] = useState("")
  const [showSolution, setShowSolution] = useState(false)

  const hasStem = Boolean(stripHtml(stem).trim() || stem.includes("data-math-"))
  const canRevealSolution = Boolean(
    answerKeys.length > 0 ||
      stripHtml(explanation).trim() ||
      (kind === "NUMERIC" && numericAnswer.trim()) ||
      (kind === "SHORT_ANSWER" && textAnswer.trim())
  )
  const hasResponse = Boolean(
    selectedKeys.length > 0 || userNumeric.trim() || userText.trim()
  )

  function toggleOption(key: string) {
    if (kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE") {
      setSelectedKeys(selectedKeys.includes(key) ? [] : [key])
    } else if (kind === "MULTIPLE_CHOICE") {
      setSelectedKeys(
        selectedKeys.includes(key)
          ? selectedKeys.filter((k) => k !== key)
          : [...selectedKeys, key]
      )
    }
  }

  const linkedBlockTitles = targets
    .map((t) => targetableBlocks.find((b) => b.blockId === t.blockId)?.title)
    .filter(Boolean)

  // Interactive feedback state when author clicks options in preview mode
  const isSelectedAny = selectedKeys.length > 0
  const isSelectedCorrect =
    isSelectedAny &&
    answerKeys.length > 0 &&
    selectedKeys.length === answerKeys.length &&
    selectedKeys.every((k) => answerKeys.includes(k))

  function resetResponse() {
    setSelectedKeys([])
    setUserNumeric("")
    setUserText("")
  }

  return (
    <Card className="gap-0 overflow-hidden border-border bg-card py-0 shadow-xs lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <EyeIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Student preview
          </h3>
          <Badge variant="outline" className="hidden text-[10px] font-normal sm:inline-flex">
            Interactive
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {hasResponse ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 gap-1.5 text-xs"
              onClick={resetResponse}
            >
              <RotateCcwIcon aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={cn(
              "h-7 text-xs gap-1.5",
              showSolution && "bg-brand-violet-soft text-brand-violet-ink"
            )}
            disabled={!canRevealSolution}
            aria-pressed={showSolution}
            onClick={() => setShowSolution(!showSolution)}
          >
            <CheckCircle2Icon aria-hidden="true" />
            {showSolution ? "Hide answer key" : "Reveal answer key"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Header Metadata Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              {questionKindLabel(kind)}
            </Badge>
            {difficulty ? (
              <Badge variant="outline" className="text-muted-foreground">
                Difficulty {difficulty}/5
              </Badge>
            ) : null}
            {linkedBlockTitles.length > 0 ? (
              <Badge variant="outline" className="text-brand-violet-ink bg-brand-violet-soft/30 border-brand-violet-line/40">
                {linkedBlockTitles.length} {linkedBlockTitles.length === 1 ? "Topic" : "Topics"}
              </Badge>
            ) : null}
          </div>

          {/* Real-time Answer Choice Tester Feedback */}
          {isSelectedAny && !showSolution ? (
            <Badge
              variant="outline"
              aria-live="polite"
              className={cn(
                "text-xs font-semibold px-2 py-0.5 animate-in fade-in-0 duration-200",
                isSelectedCorrect
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              )}
            >
              {isSelectedCorrect ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2Icon className="size-3.5 text-emerald-600" /> Correct Choice!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircleIcon className="size-3.5 text-rose-600" /> Incorrect Choice
                </span>
              )}
            </Badge>
          ) : null}
        </div>

        {/* Question Stem */}
        <div>
          {hasStem ? (
            <RichContent html={stem} className="text-sm font-medium leading-relaxed text-foreground" />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Add a question stem to see the student view.</p>
              <p className="mt-1 text-xs text-muted-foreground">The preview updates as you author the question.</p>
            </div>
          )}
        </div>

        {/* Options / Answer Input Area */}
        <div className="pt-2">
          {kind === "SINGLE_CHOICE" || kind === "MULTIPLE_CHOICE" || kind === "TRUE_FALSE" ? (
            <div className="space-y-2">
              {options.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No answer options added yet.</p>
              ) : (
                options.map((option) => {
                  const isSelected = selectedKeys.includes(option.key)
                  const isCorrect = answerKeys.includes(option.key)

                  let stateClass = "border-border bg-background hover:bg-muted/40"
                  if (showSolution) {
                    if (isCorrect) {
                      stateClass = "border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                    } else if (isSelected && !isCorrect) {
                      stateClass = "border-rose-500/60 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                    }
                  } else if (isSelected) {
                    stateClass = "border-brand-violet-line/80 bg-brand-violet-soft/30 ring-1 ring-brand-violet-line/40"
                  }

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleOption(option.key)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-[background-color,border-color,box-shadow,color]",
                        stateClass
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold border transition-colors",
                          showSolution && isCorrect
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : isSelected
                            ? "bg-brand-violet-ink text-white border-brand-violet-ink"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {option.key}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        {stripHtml(option.content).trim() ? (
                          <RichContent html={option.content} className="text-sm leading-snug" />
                        ) : (
                          <span className="text-muted-foreground italic">Option {option.key}...</span>
                        )}
                      </div>
                      {showSolution && isCorrect ? (
                        <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : showSolution && isSelected && !isCorrect ? (
                        <XCircleIcon className="size-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          ) : kind === "NUMERIC" ? (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <label htmlFor="preview-numeric-input" className="text-xs font-medium text-muted-foreground block">
                Student Input Preview
              </label>
              <input
                id="preview-numeric-input"
                type="number"
                value={userNumeric}
                onChange={(e) => setUserNumeric(e.target.value)}
                placeholder="Enter numerical answer..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {showSolution ? (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-4" aria-hidden="true" />
                  Correct answer: <span className="font-mono font-bold">{numericAnswer || "Not set"}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <label htmlFor="preview-text-input" className="text-xs font-medium text-muted-foreground block">
                Student Answer Textarea Preview
              </label>
              <textarea
                id="preview-text-input"
                rows={3}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Student writes answer here..."
                className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {showSolution ? (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2Icon className="size-4" aria-hidden="true" />
                    Model Solution Answer:
                  </div>
                  <p className="p-2 rounded bg-background border text-foreground text-xs leading-relaxed">
                    {textAnswer || "No model answer provided."}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Explanation Section Preview */}
        {showSolution || stripHtml(explanation).trim() ? (
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <HelpCircleIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
              Explanation & Solution Review
            </div>
            {stripHtml(explanation).trim() ? (
              <RichContent html={explanation} className="text-xs leading-relaxed text-muted-foreground" />
            ) : (
              <p className="text-xs text-muted-foreground italic">No explanation provided for this question.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

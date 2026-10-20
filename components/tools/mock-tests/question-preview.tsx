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
import { stripHtml, hasRichContent } from "./editor/html-utils"
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

  const hasStem = hasRichContent(stem)
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
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-none">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <EyeIcon className="size-4 text-foreground" aria-hidden="true" />
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Student preview
          </h3>
          <Badge
            variant="outline"
            className="hidden text-[10px] font-normal sm:inline-flex"
          >
            Interactive
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {hasResponse ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-h-11 gap-1.5 text-xs"
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
              "min-h-11 gap-1.5 text-xs",
              showSolution &&
                "bg-foreground font-semibold text-background hover:bg-foreground/90"
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
              <Badge
                variant="outline"
                className="border-border/60 bg-muted text-foreground"
              >
                {linkedBlockTitles.length}{" "}
                {linkedBlockTitles.length === 1 ? "Topic" : "Topics"}
              </Badge>
            ) : null}
          </div>

          {/* Real-time Answer Choice Tester Feedback */}
          {isSelectedAny && !showSolution ? (
            <Badge
              variant="outline"
              aria-live="polite"
              className={cn(
                "animate-in px-2 py-0.5 text-xs font-semibold duration-200 fade-in-0",
                isSelectedCorrect
                  ? "border-success-line bg-success-soft text-success-ink"
                  : "border-destructive/60 bg-destructive/10 text-destructive"
              )}
            >
              {isSelectedCorrect ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2Icon className="size-3.5 text-success-ink" />{" "}
                  Correct Choice!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircleIcon className="size-3.5 text-destructive" />{" "}
                  Incorrect Choice
                </span>
              )}
            </Badge>
          ) : null}
        </div>

        {/* Question Stem */}
        <div>
          {hasStem ? (
            <RichContent
              html={stem}
              className="text-sm leading-relaxed font-medium text-foreground"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">
                Add a question stem to see the student view.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The preview updates as you author the question.
              </p>
            </div>
          )}
        </div>

        {/* Options / Answer Input Area */}
        <div className="pt-2">
          {kind === "SINGLE_CHOICE" ||
          kind === "MULTIPLE_CHOICE" ||
          kind === "TRUE_FALSE" ? (
            <div className="space-y-2">
              {options.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No answer options added yet.
                </p>
              ) : (
                options.map((option) => {
                  const isSelected = selectedKeys.includes(option.key)
                  const isCorrect = answerKeys.includes(option.key)

                  let stateClass =
                    "border-border bg-background hover:bg-muted/40"
                  if (showSolution) {
                    if (isCorrect) {
                      stateClass =
                        "border-success-line bg-success-soft text-success-ink"
                    } else if (isSelected && !isCorrect) {
                      stateClass =
                        "border-destructive/60 bg-destructive/10 text-destructive"
                    }
                  } else if (isSelected) {
                    stateClass =
                      "border-foreground/40 bg-muted/30 ring-1 ring-foreground/20"
                  }

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleOption(option.key)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-[background-color,border-color,box-shadow,color]",
                        stateClass
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold transition-colors",
                          showSolution && isCorrect
                            ? "border-success bg-success text-success-foreground"
                            : isSelected
                              ? "border-foreground bg-foreground font-bold text-background"
                              : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {option.key}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        {hasRichContent(option.content) ? (
                          <RichContent
                            html={option.content}
                            className="text-sm leading-snug"
                          />
                        ) : (
                          <span className="text-muted-foreground italic">
                            Option {option.key}...
                          </span>
                        )}
                      </div>
                      {showSolution && isCorrect ? (
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-success-ink"
                          aria-hidden="true"
                        />
                      ) : showSolution && isSelected && !isCorrect ? (
                        <XCircleIcon
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          ) : kind === "NUMERIC" ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <label
                htmlFor="preview-numeric-input"
                className="block text-xs font-medium text-muted-foreground"
              >
                Student Input Preview
              </label>
              <input
                id="preview-numeric-input"
                type="number"
                value={userNumeric}
                onChange={(e) => setUserNumeric(e.target.value)}
                placeholder="Enter numerical answer..."
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
              {showSolution ? (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success-ink">
                  <CheckCircle2Icon className="size-4" aria-hidden="true" />
                  Correct answer:{" "}
                  <span className="font-mono font-bold">
                    {numericAnswer || "Not set"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <label
                htmlFor="preview-text-input"
                className="block text-xs font-medium text-muted-foreground"
              >
                Student Answer Textarea Preview
              </label>
              <textarea
                id="preview-text-input"
                rows={3}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Student writes answer here..."
                className="w-full rounded-md border border-input bg-background p-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
              {showSolution ? (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-success-ink">
                    <CheckCircle2Icon className="size-4" aria-hidden="true" />
                    Model Solution Answer:
                  </div>
                  <p className="rounded border bg-background p-2 text-xs leading-relaxed text-foreground">
                    {textAnswer || "No model answer provided."}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Explanation Section Preview */}
        {showSolution || stripHtml(explanation).trim() ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <HelpCircleIcon
                className="size-4 text-sky-500"
                aria-hidden="true"
              />
              Explanation & Solution Review
            </div>
            {stripHtml(explanation).trim() ? (
              <RichContent
                html={explanation}
                className="text-xs leading-relaxed text-muted-foreground"
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No explanation provided for this question.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

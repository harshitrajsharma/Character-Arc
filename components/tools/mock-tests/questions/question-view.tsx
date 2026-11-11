"use client"

import { useId, type ReactNode } from "react"
import { CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { RichContent } from "../editor/rich-content"
import { hasRichContent } from "../editor/html-utils"
import {
  formatNumber,
  questionKindLabel,
} from "@/lib/tools/mock-tests/kind-labels"
import { cn } from "@/lib/utils"
import {
  isChoiceKind,
  toggleChoice,
  type QuestionAllocation,
  type QuestionContent,
  type QuestionResponseValue,
  type QuestionSolutionData,
} from "./question-types"

const contentClass =
  "min-w-0 max-w-full overflow-x-auto text-sm leading-6 [overflow-wrap:anywhere] [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"

export function QuestionOptionContent({
  option,
}: {
  option: { key: string; content: string }
}) {
  return hasRichContent(option.content) ? (
    <RichContent html={option.content} className={contentClass} />
  ) : (
    <span className="text-sm text-muted-foreground">
      Option {option.key} is empty
    </span>
  )
}

export function QuestionMetadata({
  question,
  allocation,
}: {
  question: Pick<QuestionContent, "kind" | "difficulty">
  allocation?: QuestionAllocation
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {allocation?.number !== undefined ? (
        <span className="font-mono tabular-nums">Q{allocation.number}</span>
      ) : null}
      <Badge
        variant="outline"
        className="border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink"
      >
        {question.kind === "SHORT_ANSWER"
          ? "Short answer"
          : questionKindLabel(question.kind)}
      </Badge>
      {question.difficulty !== null && question.difficulty !== undefined ? (
        <Badge variant="outline">Level {question.difficulty}</Badge>
      ) : null}
      {allocation?.marks !== undefined ? (
        <span>
          {formatNumber(allocation.marks)}{" "}
          {allocation.marks === 1 ? "mark" : "marks"}
        </span>
      ) : null}
      {allocation?.negativeMarks !== undefined &&
      allocation.negativeMarks < 0 ? (
        <span>Penalty {formatNumber(allocation.negativeMarks)}</span>
      ) : null}
      {allocation?.section ? (
        <span className="[overflow-wrap:anywhere]">{allocation.section}</span>
      ) : null}
    </div>
  )
}

export function QuestionStem({
  stem,
  compact = false,
  className,
}: {
  stem: string
  compact?: boolean
  className?: string
}) {
  return hasRichContent(stem) ? (
    <RichContent
      html={compact ? stem.replace(/<\/?a\b[^>]*>/gi, "") : stem}
      className={cn(
        contentClass,
        compact && "line-clamp-2 overflow-hidden",
        className
      )}
    />
  ) : (
    <p className="text-sm text-muted-foreground">
      Add question content to see the preview.
    </p>
  )
}

export function QuestionSummary({
  question,
  allocation,
  children,
}: {
  question: QuestionContent
  allocation?: QuestionAllocation
  children?: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-2" data-question-summary="">
      <QuestionMetadata question={question} allocation={allocation} />
      <QuestionStem stem={question.stem} compact />
      {children}
    </div>
  )
}

type OptionsProps = {
  question: QuestionContent
  response?: QuestionResponseValue
  solution?: QuestionSolutionData
} & (
  | {
      onResponseChange: (response: QuestionResponseValue) => void
      response: QuestionResponseValue
    }
  | { onResponseChange?: never }
)

export function QuestionOptions({
  question,
  response,
  solution,
  onResponseChange,
}: OptionsProps) {
  const id = useId()
  const correctKeys = new Set(solution?.answerKeys)
  const selectedKeys = new Set(response?.selectedKeys)
  const multiple = question.kind === "MULTIPLE_CHOICE"
  if (!question.options.length)
    return (
      <p className="text-sm text-muted-foreground">
        No answer options added yet.
      </p>
    )
  return (
    <FieldSet
      className="grid min-w-0 gap-2 border-0 p-0"
      data-question-options=""
    >
      <FieldLegend className="sr-only">
        {onResponseChange
          ? multiple
            ? "Select all answers that apply"
            : "Select one answer"
          : "Answer options"}
      </FieldLegend>
      {question.options.map((option) => {
        const selected = selectedKeys.has(option.key),
          correct = correctKeys.has(option.key)
        const incorrect = Boolean(solution && selected && !correct)
        const label = correct
          ? selected
            ? "Your choice · Correct answer"
            : "Correct answer"
          : selected
            ? solution
              ? "Your choice · Incorrect"
              : "Selected"
            : null
        const body = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-semibold",
                selected && "bg-primary text-primary-foreground",
                correct &&
                  "border-success-line bg-success-soft text-success-ink"
              )}
            >
              {option.key}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <QuestionOptionContent option={option} />
              {label ? (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    correct
                      ? "text-success-ink"
                      : incorrect
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {correct ? (
                    <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                  ) : incorrect ? (
                    <XCircleIcon className="size-3.5" aria-hidden="true" />
                  ) : null}
                  {label}
                </span>
              ) : null}
            </div>
          </>
        )
        const className = cn(
          "relative flex min-h-11 min-w-0 items-start gap-3 rounded-lg border border-border bg-background p-3 text-left",
          selected && "border-brand-violet-line bg-brand-violet-soft",
          correct && "border-success-line bg-success-soft",
          incorrect && "border-destructive bg-destructive/10"
        )
        return onResponseChange ? (
          <label
            key={option.key}
            className={cn(
              className,
              "cursor-pointer hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring"
            )}
          >
            <input
              className="mt-1 size-4 shrink-0 accent-primary"
              type={multiple ? "checkbox" : "radio"}
              name={`${id}-answer`}
              value={option.key}
              checked={selected}
              onChange={() =>
                onResponseChange(
                  toggleChoice(response, question.kind, option.key)
                )
              }
              aria-label={`Option ${option.key}`}
              aria-describedby={`${id}-${option.key}`}
            />
            <div
              id={`${id}-${option.key}`}
              className="flex min-w-0 flex-1 gap-3"
            >
              {body}
            </div>
          </label>
        ) : (
          <div key={option.key} className={className}>
            {body}
          </div>
        )
      })}
    </FieldSet>
  )
}

export function QuestionAcceptedAnswer({
  question,
  solution,
  className,
}: {
  question: QuestionContent
  solution: QuestionSolutionData
  className?: string
}) {
  const numeric =
    solution.numericAnswer !== null &&
    solution.numericAnswer !== undefined &&
    String(solution.numericAnswer).trim() !== ""
  return (
    <>
      {question.kind === "NUMERIC" ? (
        <p className={cn("text-sm [overflow-wrap:anywhere]", className)}>
          <span className="font-medium">Correct answer: </span>
          {numeric ? String(solution.numericAnswer) : "Not set"}
        </p>
      ) : null}
      {question.kind === "SHORT_ANSWER" ? (
        <div className={cn("text-sm", className)}>
          <p className="font-medium">Model answer</p>
          <p className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
            {solution.textAnswer || "Not set"}
          </p>
        </div>
      ) : null}
    </>
  )
}

export function QuestionSolution({
  question,
  solution,
}: {
  question: QuestionContent
  solution: QuestionSolutionData
}) {
  return (
    <div className="grid min-w-0 gap-3" data-question-solution="">
      <QuestionAcceptedAnswer question={question} solution={solution} />
      <QuestionExplanation explanation={solution.explanation} />
    </div>
  )
}

export function QuestionExplanation({
  explanation,
}: {
  explanation?: string | null
}) {
  return explanation && hasRichContent(explanation) ? (
    <div className="grid min-w-0 gap-2 border-t border-border pt-3">
      <h3 className="text-sm font-semibold">Explanation</h3>
      <RichContent html={explanation} className={contentClass} />
    </div>
  ) : null
}

type ViewProps = {
  question: QuestionContent
  allocation?: QuestionAllocation
  header?: ReactNode
} & (
  | { mode: "summary" }
  | { mode: "readOnly"; solution?: QuestionSolutionData }
  | {
      mode: "authorPreview"
      response: QuestionResponseValue
      onResponseChange: (response: QuestionResponseValue) => void
      solution?: QuestionSolutionData
    }
  | {
      mode: "review"
      response: QuestionResponseValue
      solution: QuestionSolutionData
    }
)

/** No fetching, navigation, scoring or persistence. Solutions are caller-authorized. */
export function QuestionView(props: ViewProps) {
  const inputId = useId()
  const { question, allocation } = props
  if (props.mode === "summary")
    return <QuestionSummary question={question} allocation={allocation} />
  const solution = props.solution
  const response =
    props.mode === "authorPreview" || props.mode === "review"
      ? props.response
      : undefined
  return (
    <div className="grid min-w-0 gap-4" data-question-view={props.mode}>
      {props.header !== undefined ? (
        props.header
      ) : (
        <QuestionMetadata question={question} allocation={allocation} />
      )}
      <QuestionStem stem={question.stem} />
      {question.topicTitles?.length ? (
        <p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
          {question.topicTitles.join(", ")}
        </p>
      ) : null}
      {isChoiceKind(question.kind) ? (
        props.mode === "authorPreview" ? (
          <QuestionOptions
            question={question}
            solution={solution}
            response={props.response}
            onResponseChange={props.onResponseChange}
          />
        ) : (
          <QuestionOptions
            question={question}
            solution={solution}
            response={response}
          />
        )
      ) : props.mode === "authorPreview" ? (
        <Field className="min-w-0 gap-2">
          <FieldLabel htmlFor={inputId}>
            {question.kind === "NUMERIC" ? "Numeric answer" : "Written answer"}
          </FieldLabel>
          {question.kind === "NUMERIC" ? (
            <Input
              id={inputId}
              type="number"
              step="any"
              inputMode="decimal"
              className="h-11"
              value={props.response.answerText}
              onChange={(event) =>
                props.onResponseChange({
                  ...props.response,
                  answerText: event.target.value,
                })
              }
            />
          ) : (
            <Textarea
              id={inputId}
              rows={3}
              value={props.response.answerText}
              onChange={(event) =>
                props.onResponseChange({
                  ...props.response,
                  answerText: event.target.value,
                })
              }
            />
          )}
        </Field>
      ) : props.mode === "review" ? (
        <div className="text-sm">
          <p className="font-medium">Your response</p>
          <p className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
            {props.response.answerText.trim() || "Unanswered"}
          </p>
        </div>
      ) : !solution ? (
        <p className="text-sm text-muted-foreground">
          {question.kind === "NUMERIC" ? "Numerical answer" : "Written answer"}
        </p>
      ) : null}
      {solution ? (
        <QuestionSolution question={question} solution={solution} />
      ) : null}
    </div>
  )
}

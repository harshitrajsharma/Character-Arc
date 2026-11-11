"use client"

import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import {
  QuestionMetadata,
  QuestionSummary,
  QuestionStem,
} from "./question-view"
import {
  isChoiceKind,
  type QuestionAllocation,
  type QuestionContent,
  type QuestionResponseValue,
  type QuestionSolutionData,
} from "./question-types"

function AnswerExcerpt({
  question,
  keys,
  text,
}: {
  question: QuestionContent
  keys?: readonly string[]
  text?: string | number | null
}) {
  if (isChoiceKind(question.kind)) {
    return keys?.length ? (
      <div className="grid min-w-0 gap-1">
        {keys.map((key) => {
          const option = question.options.find(
            (candidate) => candidate.key === key
          )
          return (
            <div key={key} className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 font-mono text-xs font-medium">
                {key}
              </span>
              {option ? (
                <QuestionStem stem={option.content} compact />
              ) : (
                <span className="text-sm">Option {key}</span>
              )}
            </div>
          )
        })}
      </div>
    ) : (
      <span className="text-sm text-muted-foreground">Not provided</span>
    )
  }
  return (
    <p className="line-clamp-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
      {text !== null && text !== undefined && String(text).trim()
        ? String(text)
        : "Not provided"}
    </p>
  )
}

/** Review-specific scan content. The caller owns disclosure and authoritative outcomes. */
export function QuestionReviewSummary({
  question,
  allocation,
  response,
  solution,
  isCorrect,
  awardedMarks,
  timeLabel,
  expanded,
}: {
  question: QuestionContent
  allocation: QuestionAllocation
  response: QuestionResponseValue
  solution: QuestionSolutionData
  isCorrect: boolean | null
  awardedMarks: number
  timeLabel?: string
  expanded: boolean
}) {
  const answered =
    response.selectedKeys.length > 0 || Boolean(response.answerText.trim())
  const status =
    isCorrect === true
      ? "Correct"
      : isCorrect === false
        ? "Incorrect"
        : answered
          ? "Not graded"
          : "Skipped"
  return (
    <div className="grid min-w-0 flex-1 gap-3" data-question-review-summary="">
      <div className="flex min-w-0 items-start justify-between gap-3">
        {expanded ? (
          <QuestionMetadata
            question={question}
            allocation={{
              number: allocation.number,
              section: allocation.section,
            }}
          />
        ) : (
          <QuestionSummary
            question={question}
            allocation={{
              number: allocation.number,
              section: allocation.section,
            }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <Badge
          variant="secondary"
          className={cn(
            isCorrect === true && "bg-success-soft text-success-ink",
            isCorrect === false && "bg-destructive/10 text-destructive"
          )}
        >
          {isCorrect === true ? (
            <CheckCircle2Icon aria-hidden="true" />
          ) : isCorrect === false ? (
            <XCircleIcon aria-hidden="true" />
          ) : null}
          {status}
        </Badge>
        <span className="font-medium tabular-nums">
          {awardedMarks > 0 ? "+" : ""}
          {formatNumber(awardedMarks)} / {formatNumber(allocation.marks)}{" "}
          {allocation.marks === 1 ? "mark" : "marks"}
        </span>
        {timeLabel ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {timeLabel}
          </span>
        ) : null}
      </div>
      {!expanded ? (
        <dl className="grid min-w-0 gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="grid min-w-0 gap-1">
            <dt className="text-xs text-muted-foreground">Your answer</dt>
            <dd className="min-w-0">
              {answered ? (
                <AnswerExcerpt
                  question={question}
                  keys={response.selectedKeys}
                  text={response.answerText}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Not answered
                </span>
              )}
            </dd>
          </div>
          <div className="grid min-w-0 gap-1">
            <dt className="text-xs text-muted-foreground">Accepted answer</dt>
            <dd className="min-w-0">
              <AnswerExcerpt
                question={question}
                keys={solution.answerKeys}
                text={
                  question.kind === "NUMERIC"
                    ? solution.numericAnswer
                    : solution.textAnswer
                }
              />
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { QuestionCard } from "./question-card"
import { QuestionView } from "./question-view"
import { hasRichContent } from "../editor/html-utils"
import {
  EMPTY_RESPONSE,
  hasSolution,
  type QuestionAllocation,
  type QuestionContent,
  type QuestionSolutionData,
} from "./question-types"

type Props = {
  question: QuestionContent
  solution: QuestionSolutionData
  allocation?: QuestionAllocation
  actions?: ReactNode
}

/** A content change resets practice response/reveal without synchronizing state in effects. */
export function AuthorQuestionPreview(props: Props) {
  const { question, solution } = props
  const contentKey = useMemo(
    () =>
      JSON.stringify([
        question.id,
        question.kind,
        question.stem,
        question.options,
        solution.answerKeys,
        solution.numericAnswer,
        solution.textAnswer,
        solution.explanation,
      ]),
    [
      question.id,
      question.kind,
      question.stem,
      question.options,
      solution.answerKeys,
      solution.numericAnswer,
      solution.textAnswer,
      solution.explanation,
    ]
  )
  return <PreviewSession key={contentKey} {...props} />
}

function PreviewSession({ question, solution, allocation, actions }: Props) {
  const [response, setResponse] = useState(EMPTY_RESPONSE)
  const [revealed, setRevealed] = useState(false)
  return (
    <QuestionCard
      mode="static"
      question={question}
      summary={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Student preview</h3>
          <div className="flex flex-wrap gap-2">
            {actions}
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={
                !response.selectedKeys.length &&
                !response.answerText &&
                !revealed
              }
              onClick={() => {
                setResponse(EMPTY_RESPONSE)
                setRevealed(false)
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      }
    >
      <QuestionView
        mode="authorPreview"
        question={question}
        allocation={allocation}
        response={response}
        onResponseChange={setResponse}
        solution={revealed ? solution : undefined}
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start"
        disabled={
          !hasSolution({
            ...solution,
            explanation:
              solution.explanation && hasRichContent(solution.explanation)
                ? solution.explanation
                : null,
          })
        }
        aria-pressed={revealed}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed ? "Hide answer key" : "Reveal answer key"}
      </Button>
    </QuestionCard>
  )
}

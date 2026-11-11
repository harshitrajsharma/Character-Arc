"use client"

import { useId } from "react"
import {
  QuestionAcceptedAnswer,
  QuestionExplanation,
  QuestionOptions,
  QuestionStem,
} from "./question-view"
import {
  isChoiceKind,
  type QuestionContent,
  type QuestionSolutionData,
} from "./question-types"

/** Author inspection: explicit reading sections, with caller-authorized answers. */
export function QuestionInspectionView({
  question,
  solution,
}: {
  question: QuestionContent
  solution: QuestionSolutionData
}) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-5" data-question-view="inspection">
      <section
        aria-labelledby={`${id}-question`}
        className="grid min-w-0 gap-2"
        data-question-section="question"
      >
        <h3
          id={`${id}-question`}
          className="text-xs font-medium text-muted-foreground"
        >
          Question
        </h3>
        <QuestionStem
          stem={question.stem}
          className="text-base leading-7 font-medium"
        />
      </section>
      <section
        aria-labelledby={`${id}-answer`}
        className="grid min-w-0 gap-3 border-t border-border pt-4"
        data-question-section="answer-key"
      >
        <h3 id={`${id}-answer`} className="text-sm font-semibold">
          Answer key
        </h3>
        {isChoiceKind(question.kind) ? (
          <QuestionOptions question={question} solution={solution} />
        ) : (
          <div className="rounded-lg border border-border bg-muted p-4">
            <QuestionAcceptedAnswer
              question={question}
              solution={solution}
              className={
                question.kind === "NUMERIC"
                  ? "text-lg font-semibold tabular-nums"
                  : undefined
              }
            />
          </div>
        )}
      </section>
      <QuestionExplanation explanation={solution.explanation} />
    </div>
  )
}

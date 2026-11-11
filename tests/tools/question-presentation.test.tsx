// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { AuthorQuestionPreview } from "@/components/tools/mock-tests/questions/author-question-preview"
import { QuestionView } from "@/components/tools/mock-tests/questions/question-view"
import { QuestionReviewSummary } from "@/components/tools/mock-tests/questions/question-review-summary"
import { QuestionCard } from "@/components/tools/mock-tests/questions/question-card"
import { QuestionInspectionView } from "@/components/tools/mock-tests/questions/question-inspection-view"

const question = {
  id: "q1",
  kind: "SINGLE_CHOICE",
  stem: "<p>Choose an answer</p>",
  options: [
    { key: "A", content: "<p>Alpha</p>" },
    { key: "B", content: "<p>Beta</p>" },
  ],
  // Extra source DTO properties must never implicitly authorize answer rendering.
  answerKeys: ["A"],
  explanation: "Secret explanation",
  numericAnswer: 123,
}

describe("shared app question presentation boundaries", () => {
  test("bank inspection identifies question, answer key and explanation in reading order without repeating the prompt", () => {
    const html = renderToStaticMarkup(
      <QuestionInspectionView question={question} solution={question} />
    )
    expect(html.match(/Choose an answer/g)).toHaveLength(1)
    expect(html.indexOf(">Question</h3>")).toBeLessThan(
      html.indexOf(">Answer key</h3>")
    )
    expect(html.indexOf(">Answer key</h3>")).toBeLessThan(
      html.indexOf(">Explanation</h3>")
    )
    expect(html).toContain("Correct answer")
    expect(html).toContain("Secret explanation")
    expect(html).not.toContain('type="radio"')
  })

  test("inspection accepts numeric zero and keeps library context after content only when requested", () => {
    const inspection = (
      <QuestionInspectionView
        question={{ ...question, kind: "NUMERIC", options: [] }}
        solution={{ numericAnswer: 0, explanation: "Why zero is correct" }}
      />
    )
    const html = renderToStaticMarkup(
      <QuestionCard
        mode="static"
        question={question}
        summary="Question identity"
        footerPlacement="bottom"
        footer={<span>Library context</span>}
      >
        {inspection}
      </QuestionCard>
    )
    expect(html).toContain("Correct answer:")
    expect(html).not.toContain("Not set")
    expect(html.indexOf("Why zero is correct")).toBeLessThan(
      html.indexOf("Library context")
    )
    const defaultPlacement = renderToStaticMarkup(
      <QuestionCard
        mode="static"
        question={question}
        footer={<span>Header context</span>}
      >
        {inspection}
      </QuestionCard>
    )
    expect(defaultPlacement.indexOf("Header context")).toBeLessThan(
      defaultPlacement.indexOf("Why zero is correct")
    )
  })

  test("collapsed card does not mount full solutions and keeps its management action outside the disclosure", () => {
    const html = renderToStaticMarkup(
      <QuestionCard
        mode="disclosure"
        question={question}
        expanded={false}
        onToggle={() => {}}
        label="Preview question 1"
        actions={<button type="button">Edit</button>}
      >
        <QuestionView mode="readOnly" question={question} solution={question} />
      </QuestionCard>
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain("Choose an answer")
    expect(html).not.toContain("Secret explanation")
    expect(html).toMatch(
      /<\/button>[\s\S]*<button type="button">Edit<\/button>/
    )
  })

  test("collapsed review identifies content, outcome, score and both answers without revealing explanation", () => {
    const html = renderToStaticMarkup(
      <QuestionReviewSummary
        question={question}
        allocation={{ number: 1, marks: 2 }}
        response={{ selectedKeys: ["B"], answerText: "" }}
        solution={question}
        isCorrect={false}
        awardedMarks={-0.5}
        timeLabel="12s"
        expanded={false}
      />
    )
    for (const text of [
      "Choose an answer",
      "Incorrect",
      "Your answer",
      "Accepted answer",
      "Alpha",
      "Beta",
      "-0.5",
      "12s",
    ])
      expect(html).toContain(text)
    expect(html).not.toContain("Secret explanation")
  })

  test("review summary distinguishes skipped questions from an ungraded response", () => {
    const common = {
      question,
      allocation: { number: 1, marks: 1 },
      solution: question,
      isCorrect: null,
      awardedMarks: 0,
      expanded: false,
    } as const
    expect(
      renderToStaticMarkup(
        <QuestionReviewSummary
          {...common}
          response={{ selectedKeys: [], answerText: "" }}
        />
      )
    ).toContain("Skipped")
    expect(
      renderToStaticMarkup(
        <QuestionReviewSummary
          {...common}
          response={{ selectedKeys: ["A"], answerText: "" }}
        />
      )
    ).toContain("Not graded")
  })

  test("read-only content does not implicitly reveal solutions on its source DTO", () => {
    const html = renderToStaticMarkup(
      <QuestionView mode="readOnly" question={question} />
    )
    expect(html).toContain("Alpha")
    expect(html).not.toContain("Secret explanation")
    expect(html).not.toContain("Correct answer")
    expect(html).not.toContain("data-question-solution")
  })

  test("author preview requires explicit reveal even when it receives authorized answers", () => {
    const html = renderToStaticMarkup(
      <AuthorQuestionPreview question={question} solution={question} />
    )
    expect(html).toContain("Reveal answer key")
    expect(html).not.toContain("Secret explanation")
    expect(html).not.toContain("Incorrect")
    expect(html).not.toContain("data-question-solution")
  })

  test("authorized review distinguishes selected wrong choice and accepted answer with text", () => {
    const html = renderToStaticMarkup(
      <QuestionView
        mode="review"
        question={question}
        response={{ selectedKeys: ["B"], answerText: "" }}
        solution={question}
      />
    )
    expect(html).toContain("Correct answer")
    expect(html).toContain("Your choice · Incorrect")
    expect(html).toContain("Secret explanation")
    expect(html).not.toContain('type="radio"')
  })

  test("numeric zero is a present accepted answer, not a missing value", () => {
    const html = renderToStaticMarkup(
      <QuestionView
        mode="review"
        question={{ ...question, kind: "NUMERIC", options: [] }}
        response={{ selectedKeys: [], answerText: "0" }}
        solution={{ numericAnswer: 0 }}
      />
    )
    expect(html).toContain("Correct answer:")
    expect(html).toContain("Your response")
    expect(html).not.toContain("Not set")
    expect(html).not.toContain("Unanswered")
  })

  test("incomplete empty preview provides placeholders and disables reveal", () => {
    const html = renderToStaticMarkup(
      <AuthorQuestionPreview
        question={{ kind: "NUMERIC", stem: "<p></p>", options: [] }}
        solution={{ numericAnswer: "", explanation: "<p></p>" }}
      />
    )
    expect(html).toContain("Add question content")
    expect(html).toMatch(/disabled=""[^>]*aria-pressed="false"/)
  })
})

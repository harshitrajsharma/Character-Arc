import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ListChecksIcon,
  LightbulbIcon,
  SparklesIcon,
  TargetIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { questionKindLabel, formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { getAttemptAnalysis } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Attempt Analysis" }

function scoreColor(percentage: number): string {
  if (percentage >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (percentage >= 50) return "text-brand-amber-ink"
  return "text-destructive"
}

export default async function AttemptAnalysisPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; attemptId: string }>
}) {
  const { workspaceSlug, attemptId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const analysis = await getAttemptAnalysis(workspace.id, attemptId, workspace.userId)
  if (!analysis) notFound()

  const percentage = Math.round(analysis.percentage * 100) / 100
  const isEvaluated = analysis.status === "EVALUATED"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      {/* Score card */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ListChecksIcon className="size-4" aria-hidden="true" />
              {analysis.assessmentTitle}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
              {isEvaluated ? "Attempt analysis" : "Attempt in review"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {isEvaluated
                ? "Instant, explainable feedback on every question — including what the correct answer was and why."
                : "Your answers are saved. The result will appear here once grading completes."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                {analysis.correctCount} correct
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                <XCircleIcon className="size-3.5" aria-hidden="true" />
                {analysis.incorrectCount} incorrect
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {analysis.unansweredCount} unanswered
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-5 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Your score
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums">
              {formatNumber(analysis.score)}
              <span className="text-lg font-medium text-muted-foreground">
                {" "}
                / {formatNumber(analysis.maxScore)}
              </span>
            </p>
            <p
              className={cn(
                "mt-2 font-heading text-2xl font-semibold",
                scoreColor(percentage)
              )}
            >
              {isEvaluated ? `${percentage}%` : "—"}
            </p>
            {analysis.accuracy !== null && isEvaluated ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatNumber(analysis.accuracy)}% accuracy on attempted
                questions
              </p>
            ) : null}
          </div>
        </div>

        {isEvaluated ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-brand-violet-soft/20 px-6 py-4">
            <LightbulbIcon className="size-5 shrink-0 text-brand-violet-ink" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-6">{analysis.recommendation}</p>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />
              }
            >
              <SparklesIcon data-icon="inline-start" aria-hidden="true" />
              New test
            </Button>
          </div>
        ) : null}
      </section>

      {isEvaluated ? (
        <>
          {analysis.weakTopics.length > 0 ? (
            <section aria-labelledby="weak-topics-title" className="mt-8">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Focus next
                  </p>
                  <h2
                    id="weak-topics-title"
                    className="mt-1 font-heading text-xl font-semibold"
                  >
                    Weak topics
                  </h2>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {analysis.weakTopics.map((topic) => (
                  <li
                    key={topic.blockId}
                    className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <TargetIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {topic.title ?? "Untitled topic"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Proficiency {formatNumber(topic.proficiency)}% ·{" "}
                        {topic.evidenceCount}{" "}
                        {topic.evidenceCount === 1 ? "attempt" : "attempts"}
                      </p>
                    </div>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-violet"
                        style={{ width: `${Math.min(100, topic.proficiency)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {analysis.sections.length > 1 ? (
            <section aria-labelledby="sections-title" className="mt-8">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Where the marks went
                  </p>
                  <h2
                    id="sections-title"
                    className="mt-1 font-heading text-xl font-semibold"
                  >
                    Section breakdown
                  </h2>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border bg-card">
                <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                  <span>Section</span>
                  <span className="w-16 text-right">Questions</span>
                  <span className="w-16 text-right">Correct</span>
                  <span className="w-20 text-right">Score</span>
                  <span className="w-20 text-right">Accuracy</span>
                </div>
                {analysis.sections.map((section) => (
                  <div
                    key={section.section}
                    className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center md:gap-4"
                  >
                    <p className="text-sm font-medium">
                      {section.section === "__all__"
                        ? "All questions"
                        : section.section}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground md:w-16 md:text-right">
                      {section.questionCount}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground md:w-16 md:text-right">
                      {section.correctCount}
                    </p>
                    <p className="text-sm font-medium tabular-nums md:w-20 md:text-right">
                      {formatNumber(section.score)} / {formatNumber(section.maxScore)}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground md:w-20 md:text-right">
                      {section.accuracy !== null
                        ? `${formatNumber(section.accuracy)}%`
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="review-title" className="mt-8">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Question by question
                </p>
                <h2
                  id="review-title"
                  className="mt-1 font-heading text-xl font-semibold"
                >
                  Review answers
                </h2>
              </div>
            </div>

            <ol className="mt-4 space-y-4">
              {analysis.questions.map((question, index) => {
                const isUnanswered =
                  question.selectedKeys.length === 0 &&
                  !question.answerText
                const isCorrect = question.isCorrect === true
                const isIncorrect = question.isCorrect === false
                return (
                  <li
                    key={question.questionId}
                    className="overflow-hidden rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3 border-b border-border px-4 py-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                          isCorrect
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : isIncorrect
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCorrect ? (
                          <CheckCircle2Icon className="size-4" aria-hidden="true" />
                        ) : isIncorrect ? (
                          <XCircleIcon className="size-4" aria-hidden="true" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          Question {index + 1}
                          {question.section ? (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {question.section}
                            </span>
                          ) : null}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {questionKindLabel(question.kind)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatNumber(question.awardedMarks)} /{" "}
                            {formatNumber(question.marks)} marks
                            {question.negativeMarks < 0
                              ? ` · -${formatNumber(-question.negativeMarks)} negative`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon
                        className="mt-1 size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="px-4 py-4">
                      <RichContent
                        html={question.stem}
                        className="text-sm leading-6"
                      />

                      {question.options.length > 0 ? (
                        <ul className="mt-4 space-y-2">
                          {question.options.map((option) => {
                            const selected = question.selectedKeys.includes(
                              option.key
                            )
                            const correct = question.correctKeys.includes(
                              option.key
                            )
                            return (
                              <li
                                key={option.key}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                                  correct
                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                    : selected
                                      ? "border-destructive/30 bg-destructive/5"
                                      : "border-border"
                                )}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
                                    correct
                                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : selected
                                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                                        : "border-border text-muted-foreground"
                                  )}
                                >
                                  {option.key}
                                </span>
                                <RichContent
                                  html={option.content}
                                  className="min-w-0 flex-1 leading-6"
                                />
                                {correct ? (
                                  <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    Correct answer
                                  </span>
                                ) : selected ? (
                                  <span className="shrink-0 text-xs font-medium text-destructive">
                                    Your answer
                                  </span>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      ) : question.kind === "NUMERIC" ? (
                        <p className="mt-4 text-sm">
                          <span className="text-muted-foreground">
                            Your answer:{" "}
                          </span>
                          <span className="font-mono font-medium">
                            {question.answerText ?? "—"}
                          </span>
                          <span className="mx-3 text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            Correct:{" "}
                          </span>
                          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {question.numericAnswer !== null &&
                            question.numericAnswer !== undefined
                              ? formatNumber(question.numericAnswer)
                              : "—"}
                          </span>
                        </p>
                      ) : (
                        <div className="mt-4 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              Your answer:{" "}
                            </span>
                            <span className="whitespace-pre-wrap font-medium">
                              {question.answerText ?? "—"}
                            </span>
                          </p>
                          {question.modelAnswer ? (
                            <p className="mt-1">
                              <span className="text-muted-foreground">
                                Model answer:{" "}
                              </span>
                              <span className="whitespace-pre-wrap font-medium text-emerald-600 dark:text-emerald-400">
                                {question.modelAnswer}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      )}

                      {isUnanswered ? (
                        <p className="mt-3 text-xs font-medium text-muted-foreground">
                          Unanswered — counted as incorrect.
                        </p>
                      ) : null}

                      {question.explanation ? (
                        <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Explanation
                          </p>
                          <RichContent
                            html={question.explanation}
                            className="mt-1.5 text-sm leading-6"
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </>
      ) : null}
    </main>
  )
}

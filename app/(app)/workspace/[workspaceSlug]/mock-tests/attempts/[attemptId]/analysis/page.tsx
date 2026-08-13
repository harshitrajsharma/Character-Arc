import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ListChecksIcon,
  LightbulbIcon,
  SparklesIcon,
  TargetIcon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { getAttemptAnalysis } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { AnalysisReviewList } from "@/components/tools/mock-tests/analysis-review-list"
import { StartAttemptButton } from "@/components/tools/mock-tests/start-attempt-button"

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
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:pb-10 md:px-6 xl:px-10 space-y-6">
      {/* Top Header Navigation Strip */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          render={<Link href={workspaceRoutes.mockTests.home(workspaceSlug)} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Mock Tests Dashboard
        </Button>

        <div className="flex items-center gap-2">
          <StartAttemptButton
            workspaceSlug={workspaceSlug}
            assessmentId={analysis.assessmentId}
          />
        </div>
      </div>

      {/* Score card */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ListChecksIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
              {analysis.assessmentTitle}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
              {isEvaluated ? "Attempt Analysis" : "Attempt in Review"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {isEvaluated
                ? "Instant, explainable feedback on every question — including correct answers, derivations, and weak topics."
                : "Your answers are saved. The result will appear here once grading completes."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                {analysis.correctCount} Correct
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                <XCircleIcon className="size-3.5" aria-hidden="true" />
                {analysis.incorrectCount} Incorrect
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {analysis.unansweredCount} Unanswered
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-5 text-center shadow-2xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Score
            </p>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-foreground">
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
                {formatNumber(analysis.accuracy)}% accuracy on attempted questions
              </p>
            ) : null}
          </div>
        </div>

        {isEvaluated ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-brand-violet-soft/20 px-6 py-4">
            <LightbulbIcon className="size-5 shrink-0 text-brand-violet-ink" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs sm:text-sm leading-relaxed text-foreground">{analysis.recommendation}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              render={
                <Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />
              }
            >
              <SparklesIcon data-icon="inline-start" className="size-3.5 text-brand-violet-ink" aria-hidden="true" />
              New Test Blueprint
            </Button>
          </div>
        ) : null}
      </section>

      {isEvaluated ? (
        <>
          {analysis.weakTopics.length > 0 ? (
            <section aria-labelledby="weak-topics-title" className="mt-8 space-y-3">
              <div className="border-b border-border pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Focus Next
                </p>
                <h2 id="weak-topics-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
                  Weak Topics Analysis
                </h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {analysis.weakTopics.map((topic) => (
                  <li
                    key={topic.blockId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs"
                  >
                    <TargetIcon className="size-4 shrink-0 text-brand-violet-ink" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {topic.title ?? "Untitled Topic"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Proficiency {formatNumber(topic.proficiency)}% ·{" "}
                        {topic.evidenceCount}{" "}
                        {topic.evidenceCount === 1 ? "attempt" : "attempts"}
                      </p>
                    </div>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted shrink-0">
                      <div
                        className="h-full rounded-full bg-brand-violet-ink"
                        style={{ width: `${Math.min(100, topic.proficiency)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {analysis.sections.length > 1 ? (
            <section aria-labelledby="sections-title" className="mt-8 space-y-3">
              <div className="border-b border-border pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Where Marks Went
                </p>
                <h2 id="sections-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
                  Sectional Performance Breakdown
                </h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
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
                    <p className="text-xs font-semibold text-foreground">
                      {section.section === "__all__" ? "All questions" : section.section}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground md:w-16 md:text-right">
                      {section.questionCount}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground md:w-16 md:text-right">
                      {section.correctCount}
                    </p>
                    <p className="text-xs font-mono font-bold tabular-nums md:w-20 md:text-right">
                      {formatNumber(section.score)} / {formatNumber(section.maxScore)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground md:w-20 md:text-right font-medium">
                      {section.accuracy !== null ? `${formatNumber(section.accuracy)}%` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Interactive Question-by-Question Review Component with Filter Pills */}
          <AnalysisReviewList questions={analysis.questions} />
        </>
      ) : null}
    </main>
  )
}

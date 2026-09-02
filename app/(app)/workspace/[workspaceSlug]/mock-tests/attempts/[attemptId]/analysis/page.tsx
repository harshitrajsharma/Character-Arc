import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  ListChecksIcon,
  SparklesIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { getAttemptAnalysis } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { AnalysisReviewList } from "@/components/tools/mock-tests/analysis-review-list"
import { QuestionHeatmap } from "@/components/tools/mock-tests/question-heatmap"
import { WeakTopicsRemediation } from "@/components/tools/mock-tests/weak-topics-remediation"
import { StartAttemptButton } from "@/components/tools/mock-tests/start-attempt-button"

export const metadata: Metadata = { title: "Attempt Analysis — Mock Test" }

function formatSeconds(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
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
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-10 space-y-8 font-sans antialiased text-foreground">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Mock Tests", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: analysis.assessmentTitle, href: workspaceRoutes.mockTests.detail(workspaceSlug, analysis.assessmentId) },
          { label: "Analysis" },
        ]}
        backHref={workspaceRoutes.mockTests.detail(workspaceSlug, analysis.assessmentId)}
        backLabel="Back to Test Paper"
      />

      {/* Top Header Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          render={<Link href={workspaceRoutes.mockTests.home(workspaceSlug)} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Mock Tests
        </Button>

        <div className="flex items-center gap-2">
          <StartAttemptButton
            workspaceSlug={workspaceSlug}
            assessmentId={analysis.assessmentId}
          />
        </div>
      </div>

      {/* 1. SCORE CARD & KEY CBT PERFORMANCE METRICS */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <ListChecksIcon className="size-4 text-brand-violet-ink" />
              {analysis.assessmentTitle}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {isEvaluated ? "Attempt Performance Report" : "Attempt in Evaluation"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Evaluated using Standard CBT / GATE negative marking conventions.
            </p>
          </div>

          {/* Primary Score Badge */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 text-right">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Net Score
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-foreground">
                {analysis.score}
                <span className="text-base sm:text-lg font-normal text-muted-foreground"> / {analysis.maxScore}</span>
              </div>
            </div>
            <div className={cn(
              "flex flex-col items-center justify-center size-14 rounded-2xl font-mono font-black text-sm border shadow-2xs",
              percentage >= 70
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : percentage >= 40
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
            )}>
              <span>{percentage}%</span>
            </div>
          </div>
        </div>

        {/* 4 Core CBT Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Accuracy */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Accuracy</span>
              <TrendingUpIcon className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">
              {analysis.accuracy !== null ? `${analysis.accuracy}%` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {analysis.correctCount} of {analysis.correctCount + analysis.incorrectCount} attempted
            </p>
          </div>

          {/* 2. Negative Marks Lost */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Negative Marks Lost</span>
              <TrendingDownIcon className="size-3.5 text-destructive" />
            </div>
            <div className="text-2xl font-mono font-bold text-destructive">
              -{analysis.negativeMarksLost}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Gross marks: +{analysis.grossMarksGained}
            </p>
          </div>

          {/* 3. Time Spent */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Total Time Spent</span>
              <ClockIcon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatSeconds(analysis.totalTimeSpentSeconds)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Avg {formatSeconds(analysis.avgTimePerQuestionSeconds)} per question
            </p>
          </div>

          {/* 4. Question Breakdown */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Attempt Summary</span>
              <TargetIcon className="size-3.5 text-brand-violet-ink" />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" />
                {analysis.correctCount}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                <XCircleIcon className="size-3.5" />
                {analysis.incorrectCount}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {analysis.unansweredCount} skipped
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {analysis.questions.length} total questions
            </p>
          </div>
        </div>

        {/* Actionable Strategy Recommendation */}
        {analysis.recommendation ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3">
            <SparklesIcon className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-primary uppercase tracking-wider text-[11px] block">
                Recommended Action Strategy
              </span>
              <p className="leading-relaxed text-foreground">
                {analysis.recommendation}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. GITHUB-STYLE QUESTION PERFORMANCE HEATMAP */}
      <QuestionHeatmap questions={analysis.questions} />

      {/* 3. SECTIONAL PERFORMANCE BREAKDOWN */}
      {analysis.sections.length > 0 ? (
        <section aria-labelledby="sections-title" className="space-y-4">
          <div className="border-b border-border pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Section Analytics
            </p>
            <h2 id="sections-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
              Sectional Score &amp; Accuracy Breakdown
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="hidden grid-cols-[1.5fr_auto_auto_auto_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-bold text-muted-foreground md:grid">
              <span>Section Name</span>
              <span className="w-20 text-right">Questions</span>
              <span className="w-20 text-right">Correct</span>
              <span className="w-28 text-right">Score</span>
              <span className="w-28 text-right">Accuracy</span>
            </div>
            {analysis.sections.map((section) => (
              <div
                key={section.section}
                className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[1.5fr_auto_auto_auto_auto] md:items-center md:gap-4 hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {section.section === "__all__" ? "All Questions" : section.section}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {section.answeredCount} attempted • {section.unansweredCount} skipped
                  </p>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground md:w-20 md:text-right font-mono">
                  {section.questionCount}
                </p>
                <p className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-bold md:w-20 md:text-right font-mono">
                  {section.correctCount}
                </p>
                <p className="text-xs font-mono font-bold tabular-nums md:w-28 md:text-right">
                  {formatNumber(section.score)} / {formatNumber(section.maxScore)}
                </p>
                <div className="md:w-28 md:text-right space-y-1">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {section.accuracy !== null ? `${formatNumber(section.accuracy)}%` : "—"}
                  </span>
                  {section.accuracy !== null ? (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.max(0, section.accuracy))}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. AI-DRIVEN WEAK TOPIC REMEDIATION BRIDGE */}
      <WeakTopicsRemediation
        workspaceSlug={workspaceSlug}
        weakTopics={analysis.weakTopics}
      />

      {/* 5. DETAILED QUESTION-BY-QUESTION SOLUTION REVIEW */}
      <AnalysisReviewList questions={analysis.questions} />
    </main>
  )
}

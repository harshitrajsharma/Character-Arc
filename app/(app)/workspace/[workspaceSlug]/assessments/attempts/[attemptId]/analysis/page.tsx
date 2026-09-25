import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ClockIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { getAttemptAnalysis } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { AnalysisReviewList } from "@/components/tools/mock-tests/analysis-review-list"
import { AnalysisScorecard } from "@/components/tools/mock-tests/analysis-scorecard"
import { WeakTopicsRemediation } from "@/components/tools/mock-tests/weak-topics-remediation"
import { StartAttemptButton } from "@/components/tools/mock-tests/start-attempt-button"

export const metadata: Metadata = { title: "Attempt Analysis — Mock Test" }

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
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

  const isEvaluated = analysis.status === "EVALUATED"

  // Compute total questions for section table footer
  const totalQuestions = analysis.questions.length

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

      {/* 1. BALANCED ATTEMPT HEADER BANNER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div className="space-y-1 min-w-0">
          {/* Kicker & Evaluation Status Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Mock Test Attempt
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 border-0 uppercase tracking-wide",
                isEvaluated
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {isEvaluated ? "Evaluated" : "In Evaluation"}
            </Badge>
          </div>

          {/* Assessment Title as Primary H1 */}
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
            {analysis.assessmentTitle}
          </h1>

          {/* Unified Metadata Trail */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground pt-0.5">
            {analysis.submittedAt ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <ClockIcon className="size-3 text-muted-foreground/70" />
                Completed {formatDateTime(analysis.submittedAt)}
              </span>
            ) : null}
            <span className="text-muted-foreground/40 hidden sm:inline">•</span>
            <span>{analysis.questions.length} Questions</span>
            <span className="text-muted-foreground/40 hidden sm:inline">•</span>
            <span>{analysis.durationMinutes ? `${analysis.durationMinutes}m Duration` : "Untimed"}</span>
          </div>
        </div>

        {/* Harmonized Action Group */}
        <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-border hover:bg-muted text-foreground"
            render={<Link href={workspaceRoutes.mockTests.detail(workspaceSlug, analysis.assessmentId)} />}
          >
            <FileTextIcon className="size-3.5 text-muted-foreground" />
            View Test Paper
          </Button>
          <StartAttemptButton
            workspaceSlug={workspaceSlug}
            assessmentId={analysis.assessmentId}
            label="Retake Test"
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-2xs"
          />
        </div>
      </div>

      {/* 2. CBT SCORECARD, TELEMETRY & QUESTION HEATMAP (Monolithic Segmented Card) */}
      <AnalysisScorecard analysis={analysis} />

      {/* 4. SECTIONAL PERFORMANCE BREAKDOWN */}
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
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="font-semibold text-xs text-muted-foreground min-w-[180px]">
                    Section Name
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-muted-foreground min-w-[120px]">
                    Questions
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-muted-foreground min-w-[120px]">
                    Outcome
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-muted-foreground min-w-[130px]">
                    Net Score
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-muted-foreground min-w-[140px]">
                    Accuracy Rate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.sections.map((section) => (
                  <TableRow
                    key={section.section}
                    className="border-b border-border/80 hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="py-3.5">
                      <p className="font-semibold text-sm text-foreground">
                        {section.section === "__all__" ? "All Questions" : section.section}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {section.answeredCount} attempted • {section.unansweredCount} skipped
                      </p>
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs text-muted-foreground tabular-nums">
                      <span className="font-bold text-foreground">{section.questionCount}</span> total
                    </TableCell>

                    <TableCell className="text-right py-3.5">
                      <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{section.correctCount}
                        </span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          -{section.incorrectCount}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-3.5 font-mono text-xs font-bold tabular-nums">
                      {formatNumber(section.score)}
                      <span className="font-normal text-muted-foreground"> / {formatNumber(section.maxScore)}</span>
                    </TableCell>

                    <TableCell className="text-right py-3.5">
                      <div className="space-y-1 inline-block text-right w-24">
                        <span className="text-xs font-mono font-bold text-foreground block">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted/30 border-t border-border">
                <TableRow className="hover:bg-transparent font-semibold text-xs">
                  <TableCell className="py-3">
                    Total Assessment Summary
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono text-muted-foreground">
                    {totalQuestions} questions
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">+{analysis.correctCount}</span>
                    <span className="text-muted-foreground/50 mx-1">/</span>
                    <span className="text-rose-600 dark:text-rose-400">-{analysis.incorrectCount}</span>
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono font-bold">
                    {formatNumber(analysis.score)} / {formatNumber(analysis.maxScore)}
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono font-bold">
                    {analysis.accuracy !== null ? `${analysis.accuracy}%` : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </section>
      ) : null}

      {/* 5. AI-DRIVEN WEAK TOPIC REMEDIATION BRIDGE */}
      <WeakTopicsRemediation
        workspaceSlug={workspaceSlug}
        weakTopics={analysis.weakTopics}
      />

      {/* 6. DETAILED QUESTION-BY-QUESTION SOLUTION REVIEW */}
      <AnalysisReviewList questions={analysis.questions} />
    </main>
  )
}

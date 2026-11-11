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
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"

export const metadata: Metadata = { title: "Attempt Analysis — Assessments" }

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
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; attemptId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { workspaceSlug, attemptId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const analysis = await getAttemptAnalysis(
    workspace.id,
    attemptId,
    workspace.userId
  )
  if (!analysis) notFound()
  const study = await resolveSubjectTestsReturn(
    workspaceSlug,
    (await searchParams).returnTo
  )

  const isEvaluated = analysis.status === "EVALUATED"

  // Compute total questions for section table footer
  const totalQuestions = analysis.questions.length

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-8 px-4 pt-20 pb-12 font-sans text-foreground antialiased sm:pb-16 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          {
            label: "Assessments",
            href: workspaceRoutes.mockTests.home(workspaceSlug),
          },
          {
            label: analysis.assessmentTitle,
            href: workspaceRoutes.mockTests.detail(
              workspaceSlug,
              analysis.assessmentId
            ),
          },
          { label: "Analysis" },
        ]}
        backHref={
          study?.returnHref ??
          workspaceRoutes.mockTests.detail(workspaceSlug, analysis.assessmentId)
        }
        backLabel={study ? "Back to Subject tests" : "Back to Test Paper"}
      />

      {/* 1. BALANCED ATTEMPT HEADER BANNER */}
      <div className="flex min-w-0 flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="w-full min-w-0 space-y-1 sm:w-auto sm:flex-1">
          {/* Kicker & Evaluation Status Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Assessment Attempt
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge
              variant="secondary"
              className={cn(
                "border-0 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                isEvaluated
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {isEvaluated ? "Evaluated" : "In Evaluation"}
            </Badge>
          </div>

          {/* Assessment Title as Primary H1 */}
          <h1 className="truncate font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {analysis.assessmentTitle}
          </h1>

          {/* Unified Metadata Trail */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            {analysis.submittedAt ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <ClockIcon className="size-3 text-muted-foreground/70" />
                Completed {formatDateTime(analysis.submittedAt)}
              </span>
            ) : null}
            <span className="hidden text-muted-foreground/40 sm:inline">•</span>
            <span>{analysis.questions.length} Questions</span>
            <span className="hidden text-muted-foreground/40 sm:inline">•</span>
            <span>
              {analysis.durationMinutes
                ? `${analysis.durationMinutes}m Duration`
                : "Untimed"}
            </span>
          </div>
        </div>

        {/* Harmonized Action Group */}
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2.5 self-start sm:self-center">
          {study ? (
            <Button
              variant="outline"
              className="min-h-11"
              render={<Link href={study.returnHref} />}
            >
              Subject tests
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-border px-3.5 text-xs font-semibold text-foreground hover:bg-muted"
            render={
              <Link
                href={withSubjectReturn(
                  workspaceRoutes.mockTests.detail(
                    workspaceSlug,
                    analysis.assessmentId
                  ),
                  study?.returnHref
                )}
              />
            }
          >
            <FileTextIcon className="size-3.5 text-muted-foreground" />
            View Test Paper
          </Button>
          <StartAttemptButton
            workspaceSlug={workspaceSlug}
            assessmentId={analysis.assessmentId}
            label="Retake Test"
            returnTo={study?.returnHref}
            size="sm"
            className="h-9 gap-1.5 px-3.5 text-xs font-bold shadow-2xs"
          />
        </div>
      </div>

      {/* 2. CBT SCORECARD, TELEMETRY & QUESTION HEATMAP (Monolithic Segmented Card) */}
      <AnalysisScorecard analysis={analysis} />

      {/* 4. SECTIONAL PERFORMANCE BREAKDOWN */}
      {analysis.sections.length > 0 ? (
        <section aria-labelledby="sections-title" className="space-y-4">
          <div className="border-b border-border pb-3">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Section Analytics
            </p>
            <h2
              id="sections-title"
              className="mt-0.5 font-heading text-xl font-bold text-foreground"
            >
              Sectional Score &amp; Accuracy Breakdown
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="min-w-[180px] text-xs font-semibold text-muted-foreground">
                    Section Name
                  </TableHead>
                  <TableHead className="min-w-[120px] text-right text-xs font-semibold text-muted-foreground">
                    Questions
                  </TableHead>
                  <TableHead className="min-w-[120px] text-right text-xs font-semibold text-muted-foreground">
                    Outcome
                  </TableHead>
                  <TableHead className="min-w-[130px] text-right text-xs font-semibold text-muted-foreground">
                    Net Score
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right text-xs font-semibold text-muted-foreground">
                    Accuracy Rate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.sections.map((section) => (
                  <TableRow
                    key={section.section}
                    className="border-b border-border/80 transition-colors hover:bg-muted/20"
                  >
                    <TableCell className="py-3.5">
                      <p className="text-sm font-semibold text-foreground">
                        {section.section === "__all__"
                          ? "All Questions"
                          : section.section}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {section.answeredCount} attempted •{" "}
                        {section.unansweredCount} skipped
                      </p>
                    </TableCell>

                    <TableCell className="py-3.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      <span className="font-bold text-foreground">
                        {section.questionCount}
                      </span>{" "}
                      total
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
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

                    <TableCell className="py-3.5 text-right font-mono text-xs font-bold tabular-nums">
                      {formatNumber(section.score)}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        / {formatNumber(section.maxScore)}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
                      <div className="inline-block w-24 space-y-1 text-right">
                        <span className="block font-mono text-xs font-bold text-foreground">
                          {section.accuracy !== null
                            ? `${formatNumber(section.accuracy)}%`
                            : "—"}
                        </span>
                        {section.accuracy !== null ? (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, section.accuracy))}%`,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="border-t border-border bg-muted/30">
                <TableRow className="text-xs font-semibold hover:bg-transparent">
                  <TableCell className="py-3">
                    Total Assessment Summary
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-muted-foreground">
                    {totalQuestions} questions
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{analysis.correctCount}
                    </span>
                    <span className="mx-1 text-muted-foreground/50">/</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      -{analysis.incorrectCount}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono font-bold">
                    {formatNumber(analysis.score)} /{" "}
                    {formatNumber(analysis.maxScore)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono font-bold">
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

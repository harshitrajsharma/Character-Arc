import type { Metadata } from "next"
import Link from "next/link"
import {
  CircleAlertIcon,
  FilePenLineIcon,
  ListChecksIcon,
  PlusIcon,
  ScrollTextIcon,
  SendIcon,
  TrendingUpIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ToolListRow } from "@/components/tools/tool-list-row"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { getMockTestsOverview } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Mock Tests" }

const STATUS_GROUPS: Array<{
  key: "draft" | "published" | "archived"
  label: string
  markerClassName: string
}> = [
  { key: "draft", label: "Drafts", markerClassName: "bg-muted-foreground" },
  { key: "published", label: "Published", markerClassName: "bg-brand-neon" },
  { key: "archived", label: "Archived", markerClassName: "bg-brand-amber" },
]

export default async function MockTestsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.mock-tests"
  )

  const overview = await getMockTestsOverview(
    workspace.id,
    workspaceSlug,
    installation.id
  )
  const groups = STATUS_GROUPS.map((group) => ({
    ...group,
    items: overview.assessments.filter(
      (assessment) => assessment.status === group.key
    ),
  })).filter((group) => group.items.length > 0)

  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      <ToolPageHeader
        eyebrow="Test yourself"
        title="Mock Tests"
        description="Build mock tests in any competitive pattern, attempt them under timed conditions, and get instant, explainable analysis of your weak topics."
        icon={<ListChecksIcon aria-hidden="true" />}
        iconClassName="bg-brand-violet-soft text-brand-violet-ink"
        primaryAction={
          canWrite ? (
            <Button render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              New test
            </Button>
          ) : null
        }
      />

      {overview.issue ? (
        <Alert variant="destructive" className="mt-6">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Your tests are temporarily unavailable</AlertTitle>
          <AlertDescription>
            Your saved workspace data remains private. Refresh after the latest
            workspace setup has completed.
          </AlertDescription>
        </Alert>
      ) : null}

      {!overview.issue &&
      overview.assessments.length === 0 &&
      overview.recentAttempts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-brand-violet-soft text-brand-violet-ink"
            >
              <ListChecksIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Build your first mock test</EmptyTitle>
            <EmptyDescription>
              Create a test blueprint, add questions from your bank, and publish
              it to start practicing under exam conditions.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {canWrite ? (
              <Button render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                Create a test
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tests in this workspace yet.
              </p>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <section aria-labelledby="tests-title" className="mt-8">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your test blueprints
                </p>
                <h2
                  id="tests-title"
                  className="mt-1 font-heading text-xl font-semibold"
                >
                  Mock tests
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {canWrite ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        href={workspaceRoutes.mockTests.questions(workspaceSlug)}
                      />
                    }
                  >
                    <FilePenLineIcon data-icon="inline-start" aria-hidden="true" />
                    Question bank
                  </Button>
                ) : null}
                <Badge variant="outline">
                  {overview.assessments.length} total
                </Badge>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No tests yet. Create one to get started.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border bg-card">
                {groups.map((group, index) => (
                  <section
                    key={group.key}
                    aria-labelledby={`mock-test-group-${group.key}`}
                    className={cn(index > 0 && "border-t border-border")}
                  >
                    <header className="flex h-11 items-center gap-2 border-b border-border bg-muted/50 px-4 text-sm font-medium text-muted-foreground">
                      <span
                        className={cn(
                          "h-1.5 w-5 rounded-full",
                          group.markerClassName
                        )}
                        aria-hidden="true"
                      />
                      <h3 id={`mock-test-group-${group.key}`}>
                        {group.label}
                      </h3>
                      <span className="ml-auto font-mono text-xs">
                        {group.items.length}
                      </span>
                    </header>
                    <div>
                      {group.items.map((assessment) => (
                        <ToolListRow
                          key={assessment.id}
                          href={workspaceRoutes.mockTests.detail(
                            workspaceSlug,
                            assessment.id
                          )}
                          title={assessment.title}
                          summary={`${assessment.questionCount} questions · ${
                            assessment.durationMinutes
                              ? `${assessment.durationMinutes} min`
                              : "untimed"
                          }${
                            assessment.totalMarks !== null
                              ? ` · ${assessment.totalMarks} marks`
                              : ""
                          }`}
                          icon={ListChecksIcon}
                          iconClassName="bg-brand-violet-soft text-brand-violet-ink group-hover:bg-brand-violet group-hover:text-brand-violet-foreground"
                          progressContainerClassName="bg-muted"
                          progressPercent={assessment.myBestPercentage}
                          timelineLabel={
                            assessment.attemptsCount > 0 ? (
                              <span className="flex items-center gap-1.5 lg:justify-end">
                                <TrendingUpIcon
                                  className="size-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {assessment.attemptsCount}{" "}
                                  {assessment.attemptsCount === 1
                                    ? "attempt"
                                    : "attempts"}
                                </span>
                              </span>
                            ) : undefined
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          {overview.recentAttempts.length > 0 ? (
            <section
              aria-labelledby="recent-attempts-title"
              className="mt-10"
            >
              <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Your latest results
                  </p>
                  <h2
                    id="recent-attempts-title"
                    className="mt-1 font-heading text-xl font-semibold"
                  >
                    Recent attempts
                  </h2>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border bg-card">
                {overview.recentAttempts.map((attempt) => (
                  <ToolListRow
                    key={attempt.id}
                    href={workspaceRoutes.mockTests.analysis(
                      workspaceSlug,
                      attempt.id
                    )}
                    title={attempt.assessmentTitle}
                    summary={
                      attempt.score !== null
                        ? `${attempt.score} / ${attempt.maxScore} marks`
                        : "Not graded yet"
                    }
                    icon={
                      attempt.status === "evaluated"
                        ? TrendingUpIcon
                        : attempt.status === "in_progress"
                          ? SendIcon
                          : ScrollTextIcon
                    }
                    iconClassName="bg-brand-cyan-soft text-brand-cyan-ink group-hover:bg-brand-cyan group-hover:text-brand-cyan-foreground"
                    progressPercent={attempt.percentage}
                    progressContainerClassName="bg-muted"
                    timelineLabel={
                      <span className="flex items-center gap-1.5 lg:justify-end">
                        <span className="truncate">
                          {attempt.percentage !== null
                            ? `${attempt.percentage}% · `
                            : ""}
                          {attempt.submittedAt ?? "in progress"}
                        </span>
                      </span>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  )
}

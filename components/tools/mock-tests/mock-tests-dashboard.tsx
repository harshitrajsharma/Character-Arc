"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  BookOpenTextIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  FilePenLineIcon,
  FilterXIcon,
  ListChecksIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatNumber, questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  MockTestListItem,
  RecentAttemptItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import { StartAttemptButton } from "./start-attempt-button"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  published: {
    label: "Published",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
}

function formatDate(iso: string | null) {
  if (!iso) return "In progress"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function MockTestsDashboard({
  workspaceSlug,
  assessments,
  recentAttempts,
  canWrite,
}: {
  workspaceSlug: string
  assessments: MockTestListItem[]
  recentAttempts: RecentAttemptItem[]
  canWrite: boolean
}) {
  const searchId = useId()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "questions" | "best_score">("newest")

  // Check if there is an in-progress attempt to pin at the top
  const activeAttempt = useMemo(() => {
    return recentAttempts.find((a) => a.status === "in_progress") ?? null
  }, [recentAttempts])

  // Overall Dashboard High-Level Metrics
  const stats = useMemo(() => {
    const total = assessments.length
    const published = assessments.filter((a) => a.status === "published").length
    const drafts = assessments.filter((a) => a.status === "draft").length
    const attemptsCount = recentAttempts.length

    // Average accuracy rate across graded attempts
    const graded = recentAttempts.filter((a) => a.percentage !== null)
    const avgAccuracy =
      graded.length > 0
        ? Math.round(
            graded.reduce((acc, curr) => acc + (curr.percentage ?? 0), 0) / graded.length
          )
        : null

    return { total, published, drafts, attemptsCount, avgAccuracy }
  }, [assessments, recentAttempts])

  // Filter & Sort Logic
  const filteredAssessments = useMemo(() => {
    let result = assessments

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      result = result.filter((item) => item.title.toLowerCase().includes(q))
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter)
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }
      if (sortBy === "questions") {
        return b.questionCount - a.questionCount
      }
      if (sortBy === "best_score") {
        return (b.myBestPercentage ?? -1) - (a.myBestPercentage ?? -1)
      }
      return 0
    })
  }, [assessments, query, statusFilter, sortBy])

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "ALL" || sortBy !== "newest"

  function clearFilters() {
    setQuery("")
    setStatusFilter("ALL")
    setSortBy("newest")
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Action Bar */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-violet-ink">
              Test Yourself
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground">Mock Examination Engine</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-0.5">
            Mock Tests
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Build mock test blueprints in competitive patterns, attempt them under timed CBT exam room conditions, and get explainable weak-topic analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canWrite ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
              render={<Link href={workspaceRoutes.mockTests.questions(workspaceSlug)} />}
            >
              <BookOpenTextIcon className="size-3.5 text-brand-cyan-ink" aria-hidden="true" />
              Question Bank
            </Button>
          ) : null}

          {canWrite ? (
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold bg-brand-violet-ink text-white hover:bg-brand-violet-ink/90"
              render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
            >
              <PlusIcon className="size-3.5 stroke-[2.5]" aria-hidden="true" />
              New Test
            </Button>
          ) : null}
        </div>
      </div>

      {/* Hero Active In-Progress Test Banner (If Student Has Unfinished Attempt) */}
      {activeAttempt ? (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <ClockIcon className="size-5 animate-spin-slow" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase">
                    In Progress
                  </Badge>
                  <span className="text-xs text-amber-800/80 dark:text-amber-300/80">Started {formatDate(activeAttempt.startedAt)}</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {activeAttempt.assessmentTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  You have an unfinished test attempt. Click Resume to re-enter the CBT exam room.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              className="h-9 px-4 gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs shrink-0"
              render={<Link href={`/mock-test/${encodeURIComponent(activeAttempt.id)}`} />}
            >
              <PlayIcon className="size-3.5 fill-white stroke-none" />
              Resume Exam
            </Button>
          </div>
        </div>
      ) : null}

      {/* Summary High-Level Performance Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Published Tests</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ListChecksIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {stats.published} <span className="text-xs font-normal text-muted-foreground font-sans">/ {stats.total} total</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ready for student attempts</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Attempts</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-cyan-soft text-brand-cyan-ink">
              <TrendingUpIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {stats.attemptsCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed exam attempts</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average Accuracy</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
              <TrophyIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across all graded tests</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Draft Papers</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-amber-soft text-brand-amber-ink">
              <FilePenLineIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {stats.drafts}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Under construction by authors</p>
        </Card>
      </div>

      {/* Filter, Search & Tab Controls */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id={searchId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests by title or exam pattern..."
              className="pl-9 h-9 text-xs sm:text-sm bg-background"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as typeof sortBy)}>
              <SelectTrigger size="sm" className="h-9 min-w-[150px] text-xs">
                <ArrowUpDownIcon className="size-3.5 text-muted-foreground mr-1" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Recently Updated</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="questions">Most Questions</SelectItem>
                <SelectItem value="best_score">Highest Best Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <SlidersHorizontalIcon className="size-3 text-brand-violet-ink" /> Filter:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === "ALL"
                  ? "bg-brand-violet-soft text-brand-violet-ink font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Papers ({assessments.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === "published"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Published ({stats.published})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === "draft"
                  ? "bg-muted text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Drafts ({stats.drafts})
            </button>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterXIcon className="size-3" />
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Actionable Test Blueprint Grid */}
      <section aria-labelledby="blueprints-title" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h2 id="blueprints-title" className="font-heading text-lg font-bold text-foreground">
            Test Papers ({filteredAssessments.length})
          </h2>
          <span className="text-xs text-muted-foreground">Click Start Test to attempt in CBT Exam Room</span>
        </div>

        {filteredAssessments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-3">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AlertCircleIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No matching tests found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search terms or clearing status filters.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssessments.map((item) => {
              const status = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft
              const isPublished = item.status === "published"

              return (
                <Card
                  key={item.id}
                  className="flex flex-col justify-between overflow-hidden border-border/80 bg-card p-5 shadow-xs transition-all hover:border-brand-violet-line/60 hover:shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Status & Attempt Info Header */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                        {status.label}
                      </Badge>
                      {item.myBestPercentage !== null ? (
                        <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                          Best: {Math.round(item.myBestPercentage)}%
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Unattempted</span>
                      )}
                    </div>

                    {/* Test Title */}
                    <h3 className="font-heading text-base font-bold text-foreground line-clamp-2 leading-snug">
                      <Link
                        href={workspaceRoutes.mockTests.detail(workspaceSlug, item.id)}
                        className="hover:text-brand-violet-ink transition-colors"
                      >
                        {item.title}
                      </Link>
                    </h3>

                    {/* Meta Info Badges Strip */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>{item.questionCount} Questions</span>
                      <span>•</span>
                      <span>{item.durationMinutes ? `${item.durationMinutes} min` : "Untimed"}</span>
                      {item.totalMarks !== null ? (
                        <>
                          <span>•</span>
                          <span>{formatNumber(item.totalMarks)} Marks</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      render={<Link href={workspaceRoutes.mockTests.detail(workspaceSlug, item.id)} />}
                    >
                      Details
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {canWrite ? (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 text-xs font-medium"
                          render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, item.id)} />}
                        >
                          Edit
                        </Button>
                      ) : null}

                      {isPublished ? (
                        <StartAttemptButton workspaceSlug={workspaceSlug} assessmentId={item.id} />
                      ) : canWrite ? (
                        <Button
                          size="xs"
                          className="h-8 text-xs font-semibold bg-brand-violet-ink text-white hover:bg-brand-violet-ink/90"
                          render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, item.id)} />}
                        >
                          Add Questions
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Attempts History List */}
      {recentAttempts.length > 0 ? (
        <section aria-labelledby="history-title" className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 id="history-title" className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-brand-cyan-ink" /> Your Recent Attempt Results
            </h2>
            <span className="text-xs text-muted-foreground">Latest evaluated tests</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_100px_130px] sm:items-center sm:gap-3">
              <span>Test Title</span>
              <span>Status</span>
              <span className="text-right">Score</span>
              <span className="text-right">Analysis</span>
            </div>

            <div className="divide-y divide-border">
              {recentAttempts.map((attempt) => {
                const isFinished = attempt.status === "evaluated" || attempt.status === "submitted"
                return (
                  <div
                    key={attempt.id}
                    className="grid gap-2 p-3.5 text-xs sm:grid-cols-[1fr_120px_100px_130px] sm:items-center sm:gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-foreground truncate">{attempt.assessmentTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(attempt.submittedAt)}</p>
                    </div>

                    <div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          isFinished
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {attempt.status === "evaluated" ? "Graded" : attempt.status}
                      </Badge>
                    </div>

                    <div className="font-mono font-bold text-foreground sm:text-right">
                      {attempt.score !== null ? `${formatNumber(attempt.score)}` : "—"}
                      {attempt.maxScore !== null ? ` / ${formatNumber(attempt.maxScore)}` : ""}
                    </div>

                    <div className="sm:text-right">
                      {isFinished ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 text-xs text-brand-violet-ink hover:text-brand-violet-ink font-medium"
                          render={
                            <Link href={workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.id)} />
                          }
                        >
                          View Analysis
                          <ChevronRightIcon className="ml-1 size-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-7 text-xs font-semibold text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                          render={<Link href={`/mock-test/${encodeURIComponent(attempt.id)}`} />}
                        >
                          Resume Exam
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

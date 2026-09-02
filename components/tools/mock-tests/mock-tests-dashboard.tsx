"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FilePenLineIcon,
  FilterXIcon,
  LayersIcon,
  ListChecksIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
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
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  MockTestListItem,
  RecentAttemptItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import { StartAttemptButton } from "./start-attempt-button"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  published: {
    label: "Published",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
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

  // Check for any active attempt to resume
  const activeAttempt = useMemo(() => {
    return recentAttempts.find((a) => a.status === "in_progress") ?? null
  }, [recentAttempts])

  // Summary Metrics
  const stats = useMemo(() => {
    const total = assessments.length
    const published = assessments.filter((a) => a.status === "published").length
    const attemptsCount = recentAttempts.length
    const graded = recentAttempts.filter((a) => a.percentage !== null)
    const avgAccuracy =
      graded.length > 0
        ? Math.round(
            graded.reduce((acc, curr) => acc + (curr.percentage ?? 0), 0) / graded.length
          )
        : null

    return { total, published, attemptsCount, avgAccuracy }
  }, [assessments, recentAttempts])

  // Search, Filter & Sort
  const filteredAssessments = useMemo(() => {
    let result = assessments

    if (query.trim()) {
      const q = query.toLowerCase().trim()
      result = result.filter((item) => item.title.toLowerCase().includes(q))
    }

    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter)
    }

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
    <div className="space-y-8 font-sans antialiased text-foreground">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet-ink">
              Test Engine
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground font-medium">Computer-Based Tests</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Mock Tests &amp; Assessments
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
            Simulate realistic exam conditions with timed CBT papers, KaTeX math formulas, and instant analytics.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 font-semibold gap-1.5"
            render={<Link href={workspaceRoutes.mockTests.questions(workspaceSlug)} />}
          >
            <LayersIcon className="size-3.5" />
            Question Bank
          </Button>

          {canWrite ? (
            <Button
              size="sm"
              className="text-xs h-9 font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
            >
              <PlusIcon className="size-3.5" />
              Create Paper
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2. ACTIVE ATTEMPT BANNER (If any in-progress test exists) */}
      {activeAttempt ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <ClockIcon className="size-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                In-Progress Attempt Active
              </span>
              <h3 className="text-sm font-bold text-foreground">
                {activeAttempt.assessmentTitle}
              </h3>
              <p className="text-xs text-muted-foreground">
                Started {formatDate(activeAttempt.startedAt)} • Timer is running in exam room.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 gap-1.5 shrink-0 shadow-xs"
            render={<Link href={`/mock-test/${encodeURIComponent(activeAttempt.id)}`} />}
          >
            <PlayIcon className="size-3.5 fill-current" />
            Resume Test Room
          </Button>
        </div>
      ) : null}

      {/* 3. HIGH-LEVEL METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Available Papers</span>
          <div className="text-2xl font-mono font-bold text-foreground">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground">{stats.published} published papers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Completed Attempts</span>
          <div className="text-2xl font-mono font-bold text-foreground">{stats.attemptsCount}</div>
          <p className="text-[11px] text-muted-foreground">Evaluated sessions</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Average Accuracy</span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">Across graded tests</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Evaluation Engine</span>
          <div className="text-sm font-bold text-brand-violet-ink pt-1.5">Standard CBT / GATE</div>
          <p className="text-[11px] text-muted-foreground">Negative marking active</p>
        </div>
      </div>

      {/* 4. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mock tests by name..."
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs transition-colors",
                statusFilter === "ALL"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs transition-colors",
                statusFilter === "published"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs transition-colors",
                statusFilter === "draft"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Drafts
            </button>
          </div>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-9 w-36 text-xs rounded-xl bg-card border-border font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="questions">Most Questions</SelectItem>
              <SelectItem value="best_score">Highest Score</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterXIcon className="size-3" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {/* 5. TEST PAPERS GRID */}
      <section aria-labelledby="papers-grid-title" className="space-y-3">
        <h2 id="papers-grid-title" className="sr-only">Test Papers</h2>

        {filteredAssessments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
            <ListChecksIcon className="mx-auto size-8 text-muted-foreground opacity-60" />
            <div>
              <p className="text-sm font-bold text-foreground">No test papers found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasActiveFilters ? "Try clearing search or filters." : "Create your first test paper to get started."}
              </p>
            </div>
            {canWrite && !hasActiveFilters ? (
              <Button
                size="sm"
                className="text-xs font-bold gap-1.5"
                render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
              >
                <PlusIcon className="size-3.5" />
                Create New Paper
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssessments.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft
              const isPublished = item.status === "published"

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-foreground/30 hover:shadow-sm transition-all"
                >
                  <div className="space-y-3">
                    {/* Top Status & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(item.updatedAt)}
                      </span>
                    </div>

                    {/* Paper Title */}
                    <div>
                      <Link
                        href={workspaceRoutes.mockTests.detail(workspaceSlug, item.id)}
                        className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.title}
                      </Link>
                    </div>

                    {/* Paper Metadata Strip */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <ListChecksIcon className="size-3.5" />
                        {item.questionCount} {item.questionCount === 1 ? "Question" : "Questions"}
                      </span>
                      {item.durationMinutes ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <ClockIcon className="size-3.5" />
                          {item.durationMinutes} mins
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">Untimed</span>
                      )}
                      {item.totalMarks ? (
                        <span className="font-mono">
                          {item.totalMarks} Marks
                        </span>
                      ) : null}
                    </div>

                    {/* Personal Best Score Badge */}
                    {item.myBestPercentage !== null ? (
                      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <TrophyIcon className="size-3 text-brand-amber-ink" /> Best Score
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {Math.round(item.myBestPercentage)}%
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Action Footer */}
                  <div className="flex items-center justify-between gap-2 pt-5 mt-3 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                      render={<Link href={workspaceRoutes.mockTests.detail(workspaceSlug, item.id)} />}
                    >
                      View Details
                    </Button>

                    <div className="flex items-center gap-2">
                      {isPublished ? (
                        <StartAttemptButton workspaceSlug={workspaceSlug} assessmentId={item.id} />
                      ) : canWrite ? (
                        <Button
                          size="xs"
                          className="h-8 text-xs font-bold"
                          render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, item.id)} />}
                        >
                          <FilePenLineIcon className="size-3.5 mr-1" />
                          Edit Questions
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 6. RECENT ATTEMPTS HISTORY */}
      {recentAttempts.length > 0 ? (
        <section aria-labelledby="history-title" className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 id="history-title" className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-brand-cyan-ink" /> Recent Attempt History
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {recentAttempts.length} total recorded
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="hidden border-b border-border bg-muted/40 px-5 py-3 text-xs font-bold text-muted-foreground sm:grid sm:grid-cols-[1.5fr_100px_120px_120px] sm:items-center sm:gap-4">
              <span>Test Paper</span>
              <span>Status</span>
              <span className="text-right">Score</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-border">
              {recentAttempts.map((attempt) => {
                const isFinished = attempt.status === "evaluated" || attempt.status === "submitted"

                return (
                  <div
                    key={attempt.id}
                    className="grid gap-2 p-4 text-xs sm:grid-cols-[1.5fr_100px_120px_120px] sm:items-center sm:gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-foreground truncate">{attempt.assessmentTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(attempt.submittedAt)}</p>
                    </div>

                    <div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold",
                          isFinished
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {attempt.status === "evaluated" ? "Evaluated" : attempt.status}
                      </Badge>
                    </div>

                    <div className="font-mono font-bold text-foreground sm:text-right text-xs sm:text-sm">
                      {attempt.score !== null ? `${formatNumber(attempt.score)}` : "—"}
                      {attempt.maxScore !== null ? ` / ${formatNumber(attempt.maxScore)}` : ""}
                    </div>

                    <div className="sm:text-right">
                      {isFinished ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-8 text-xs text-primary hover:text-primary font-bold gap-1"
                          render={
                            <Link href={workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.id)} />
                          }
                        >
                          View Analysis
                          <ArrowRightIcon className="size-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                          render={<Link href={`/mock-test/${encodeURIComponent(attempt.id)}`} />}
                        >
                          Resume
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

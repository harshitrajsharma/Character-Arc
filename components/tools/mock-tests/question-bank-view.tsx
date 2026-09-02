"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowUpDownIcon,
  BookOpenTextIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckBigIcon,
  FilePenIcon,
  FilterXIcon,
  HashIcon,
  HelpCircleIcon,
  ListChecksIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { stripHtml } from "@/components/tools/mock-tests/editor/html-utils"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { QuestionBankItem } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

function questionKindBadgeClass(kind: string): string {
  switch (kind) {
    case "SINGLE_CHOICE":
      return "border-brand-cyan-line/40 bg-brand-cyan-soft text-brand-cyan-ink"
    case "MULTIPLE_CHOICE":
      return "border-brand-violet-line/40 bg-brand-violet-soft text-brand-violet-ink"
    case "TRUE_FALSE":
      return "border-brand-violet-line/40 bg-brand-violet-soft text-brand-violet-ink"
    case "NUMERIC":
      return "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
    case "SHORT_ANSWER":
      return "border-brand-neon-line/40 bg-brand-neon-soft text-brand-neon-ink"
    default:
      return "border-border bg-muted/60 text-foreground"
  }
}

export function QuestionBankView({
  workspaceSlug,
  bank,
  canWrite,
}: {
  workspaceSlug: string
  bank: QuestionBankItem[]
  canWrite: boolean
}) {
  const searchId = useId()
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [difficultyFilter, setDifficultyFilter] = useState("ALL")
  const [usageFilter, setUsageFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "diff_desc" | "diff_asc" | "reused">("newest")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // High-level statistics
  const stats = useMemo(() => {
    const total = bank.length
    const choiceCount = bank.filter(
      (q) => q.kind === "SINGLE_CHOICE" || q.kind === "MULTIPLE_CHOICE" || q.kind === "TRUE_FALSE"
    ).length
    const numericCount = bank.filter((q) => q.kind === "NUMERIC" || q.kind === "SHORT_ANSWER").length
    const reusedCount = bank.filter((q) => q.assessmentsCount > 0).length
    const reuseRate = total > 0 ? Math.round((reusedCount / total) * 100) : 0

    return { total, choiceCount, numericCount, reusedCount, reuseRate }
  }, [bank])

  // Filter & sort logic
  const filteredQuestions = useMemo(() => {
    let result = bank

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((item) => {
        const stemMatch = item.stem.toLowerCase().includes(q)
        const targetMatch = item.targetTitles?.some((t) => t.toLowerCase().includes(q))
        const optionMatch = item.options?.some((o) => o.content.toLowerCase().includes(q))
        const explanationMatch = item.explanation?.toLowerCase().includes(q)
        return stemMatch || targetMatch || optionMatch || explanationMatch
      })
    }

    // Type filter
    if (typeFilter !== "ALL") {
      result = result.filter((item) => item.kind === typeFilter)
    }

    // Difficulty filter
    if (difficultyFilter !== "ALL") {
      if (difficultyFilter === "UNSET") {
        result = result.filter((item) => item.difficulty === null)
      } else {
        const targetDiff = parseInt(difficultyFilter, 10)
        result = result.filter((item) => item.difficulty === targetDiff)
      }
    }

    // Usage filter
    if (usageFilter !== "ALL") {
      if (usageFilter === "REUSED") {
        result = result.filter((item) => item.assessmentsCount > 0)
      } else if (usageFilter === "UNUSED") {
        result = result.filter((item) => item.assessmentsCount === 0)
      }
    }

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      if (sortBy === "diff_desc") {
        return (b.difficulty ?? 0) - (a.difficulty ?? 0)
      }
      if (sortBy === "diff_asc") {
        return (a.difficulty ?? 99) - (b.difficulty ?? 99)
      }
      if (sortBy === "reused") {
        return b.assessmentsCount - a.assessmentsCount
      }
      return 0
    })
  }, [bank, query, typeFilter, difficultyFilter, usageFilter, sortBy])

  const hasActiveFilters =
    query.trim() !== "" ||
    typeFilter !== "ALL" ||
    difficultyFilter !== "ALL" ||
    usageFilter !== "ALL" ||
    sortBy !== "newest"

  function clearAllFilters() {
    setQuery("")
    setTypeFilter("ALL")
    setDifficultyFilter("ALL")
    setUsageFilter("ALL")
    setSortBy("newest")
  }

  if (bank.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-brand-cyan-soft text-brand-cyan-ink">
            <BookOpenTextIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Your question bank is empty</EmptyTitle>
          <EmptyDescription>
            Author questions once with LaTeX math and rich text, then reuse them in any mock test.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {canWrite ? (
            <Button render={<Link href={workspaceRoutes.mockTests.questionNew(workspaceSlug)} />}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create a question
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No questions in this workspace yet.</p>
          )}
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stat Metric Strip */}
      <Card className="overflow-hidden p-0 border-border/80 bg-card shadow-xs">
        <div className="grid grid-cols-1 divide-y divide-border/80 sm:grid-cols-2 sm:divide-y-0 sm:divide-x sm:[&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(n+3)]:border-border/80 lg:grid-cols-4 lg:[&>*:nth-child(n+3)]:border-t-0 lg:divide-x">
          <div className="flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Questions</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
                <BookOpenTextIcon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-heading">
              {stats.total}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Ready for tests & practice</p>
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Choice Questions</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-cyan-soft text-brand-cyan-ink">
                <CircleCheckBigIcon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-heading">
              {stats.choiceCount}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Single, multi & true/false</p>
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Numeric & Short Answer</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-amber-soft text-brand-amber-ink">
                <HashIcon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-heading">
              {stats.numericCount}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Calculations & rubric answers</p>
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Reused in Mock Tests</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
                <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground font-heading">
              {stats.reusedCount} <span className="text-xs font-normal text-muted-foreground font-sans">({stats.reuseRate}%)</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Active in published tests</p>
          </div>
        </div>
      </Card>

      {/* Filter, Search & Sort Bar */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id={searchId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, LaTeX formulas ($x^2$), or topics..."
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
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="diff_desc">Difficulty: High to Low</SelectItem>
                <SelectItem value="diff_asc">Difficulty: Low to High</SelectItem>
                <SelectItem value="reused">Most Reused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <SlidersHorizontalIcon className="size-3 text-brand-violet-ink" /> Filters:
            </span>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(val) => { if (val) setTypeFilter(val) }}>
              <SelectTrigger size="sm" className="h-8 min-w-[130px] text-xs bg-background">
                <SelectValue placeholder="Question type">
                  {typeFilter === "ALL" ? "All Types" : questionKindLabel(typeFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="SINGLE_CHOICE">Single Choice</SelectItem>
                <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                <SelectItem value="NUMERIC">Numeric</SelectItem>
                <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
              </SelectContent>
            </Select>

            {/* Difficulty Filter */}
            <Select value={difficultyFilter} onValueChange={(val) => { if (val) setDifficultyFilter(val) }}>
              <SelectTrigger size="sm" className="h-8 min-w-[130px] text-xs bg-background">
                <SelectValue placeholder="Difficulty">
                  {difficultyFilter === "ALL"
                    ? "All Difficulties"
                    : difficultyFilter === "UNSET"
                      ? "No difficulty"
                      : `Level ${difficultyFilter}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Difficulties</SelectItem>
                <SelectItem value="1">Level 1 · Easy</SelectItem>
                <SelectItem value="2">Level 2 · Easy</SelectItem>
                <SelectItem value="3">Level 3 · Medium</SelectItem>
                <SelectItem value="4">Level 4 · Hard</SelectItem>
                <SelectItem value="5">Level 5 · Advanced</SelectItem>
                <SelectItem value="UNSET">No difficulty</SelectItem>
              </SelectContent>
            </Select>

            {/* Usage Filter */}
            <Select value={usageFilter} onValueChange={(val) => { if (val) setUsageFilter(val) }}>
              <SelectTrigger size="sm" className="h-8 min-w-[125px] text-xs bg-background">
                <SelectValue placeholder="Usage">
                  {usageFilter === "ALL"
                    ? "All Questions"
                    : usageFilter === "REUSED"
                      ? "Used in Tests"
                      : "Unused / Repo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Questions</SelectItem>
                <SelectItem value="REUSED">Used in Tests</SelectItem>
                <SelectItem value="UNUSED">Unused / Repository</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearAllFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterXIcon className="size-3" />
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Questions Data Table */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AlertCircleIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No matching questions found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search terms or clearing your active filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {/* Table Column Headers */}
          <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[1fr_130px_130px_90px_100px_90px] md:items-center md:gap-3">
            <span>Question Stem & Topics</span>
            <span>Type</span>
            <span>Difficulty</span>
            <span className="text-right">Reused</span>
            <span className="text-right">Updated</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filteredQuestions.map((item) => {
              const isExpanded = Boolean(expandedIds[item.id])
              return (
                <div
                  key={item.id}
                  className={cn(
                    "transition-colors",
                    isExpanded ? "bg-muted/15" : "hover:bg-muted/25"
                  )}
                >
                  {/* Main Row summary */}
                  <div className="grid gap-3 p-4 md:grid-cols-[1fr_130px_130px_90px_100px_90px] md:items-center md:gap-3">
                    {/* Stem & Topics */}
                    <div className="min-w-0 space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="text-left w-full group/stem"
                      >
                        <RichContent
                          html={item.stem}
                          className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground group-hover/stem:text-brand-violet-ink transition-colors"
                        />
                      </button>

                      {/* Topic Tags */}
                      {item.targetTitles && item.targetTitles.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {item.targetTitles.slice(0, 3).map((title, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md border border-brand-violet-line/30 bg-brand-violet-soft/30 px-2 py-0.5 text-[11px] font-medium text-brand-violet-ink transition-colors hover:bg-brand-violet-soft/60"
                            >
                              <span className="size-1 rounded-full bg-brand-violet-ink" aria-hidden="true" />
                              {title}
                            </span>
                          ))}
                          {item.targetTitles.length > 3 ? (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              +{item.targetTitles.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Type */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
                          questionKindBadgeClass(item.kind)
                        )}
                      >
                        {item.kind === "SINGLE_CHOICE" ? (
                          <CircleCheckBigIcon className="size-3" aria-hidden="true" />
                        ) : item.kind === "MULTIPLE_CHOICE" ? (
                          <ListChecksIcon className="size-3" aria-hidden="true" />
                        ) : item.kind === "TRUE_FALSE" ? (
                          <CheckCircle2Icon className="size-3" aria-hidden="true" />
                        ) : item.kind === "NUMERIC" ? (
                          <HashIcon className="size-3" aria-hidden="true" />
                        ) : (
                          <FilePenIcon className="size-3" aria-hidden="true" />
                        )}
                        {questionKindLabel(item.kind)}
                      </span>
                    </div>

                    {/* Difficulty */}
                    <div>
                      {item.difficulty !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                            item.difficulty <= 2
                              ? "bg-muted text-muted-foreground"
                              : item.difficulty === 3
                                ? "bg-brand-amber-soft text-brand-amber-ink"
                                : "bg-success-soft text-success-ink"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              item.difficulty <= 2
                                ? "bg-muted-foreground/40"
                                : item.difficulty === 3
                                  ? "bg-brand-amber"
                                  : "bg-success"
                            )}
                          />
                          Level {item.difficulty}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unset</span>
                      )}
                    </div>

                    {/* Reused in */}
                    <div className="md:text-right">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.assessmentsCount} {item.assessmentsCount === 1 ? "test" : "tests"}
                      </span>
                    </div>

                    {/* Updated date */}
                    <div className="md:text-right">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.updatedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => toggleExpand(item.id)}
                        title={isExpanded ? "Collapse preview" : "Quick preview question"}
                        aria-label={isExpanded ? "Collapse preview" : "Quick preview question"}
                        aria-expanded={isExpanded}
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                      </Button>

                      {canWrite ? (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 text-xs font-medium"
                          render={
                            <Link
                              href={workspaceRoutes.mockTests.questionEdit(
                                workspaceSlug,
                                item.id
                              )}
                            />
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* IN-PLACE EXPANDED QUICK PREVIEW */}
                  {isExpanded ? (
                    <div className="border-t border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <SparklesIcon className="size-3.5 text-brand-violet-ink" /> Question Details & Solutions
                        </span>
                        {canWrite ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-7 text-xs text-brand-violet-ink hover:text-brand-violet-ink"
                            render={
                              <Link
                                href={workspaceRoutes.mockTests.questionEdit(
                                  workspaceSlug,
                                  item.id
                                )}
                              />
                            }
                          >
                            Edit in Authoring Suite →
                          </Button>
                        ) : null}
                      </div>

                      {/* Full Stem with LaTeX */}
                      <div className="rounded-lg border border-border/80 bg-card p-3.5">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                          Question Prompt
                        </p>
                        <RichContent html={item.stem} className="text-sm leading-relaxed" />
                      </div>

                      {/* Options Grid (for MCQ / True-False) */}
                      {item.options && item.options.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Options & Answer Key
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {item.options.map((opt) => {
                              const isCorrect = item.answerKeys?.includes(opt.key)
                              return (
                                <div
                                  key={opt.key}
                                  className={cn(
                                    "flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors",
                                    isCorrect
                                      ? "border-success-line bg-success-soft text-success-ink shadow-xs"
                                      : "border-border/80 bg-card text-foreground"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border",
                                      isCorrect
                                        ? "bg-success text-success-foreground border-success"
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    {opt.key}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <RichContent html={opt.content} className="text-xs leading-relaxed" />
                                  </div>
                                  {isCorrect ? (
                                    <CheckCircle2Icon className="size-4 text-success-ink shrink-0 mt-0.5" />
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : item.numericAnswer !== null ? (
                        <div className="rounded-lg border border-border/80 bg-card p-3 text-xs">
                          <span className="font-semibold text-muted-foreground mr-2">Correct Numeric Answer:</span>
                          <span className="font-mono font-bold text-success-ink">
                            {item.numericAnswer}
                          </span>
                        </div>
                      ) : item.textAnswer ? (
                        <div className="rounded-lg border border-border/80 bg-card p-3 text-xs space-y-1">
                          <span className="font-semibold text-muted-foreground">Model Answer:</span>
                          <p className="font-mono text-foreground">{item.textAnswer}</p>
                        </div>
                      ) : null}

                      {/* Solution Explanation */}
                      {item.explanation && stripHtml(item.explanation).trim() ? (
                        <div className="rounded-lg border border-border/80 bg-card p-3.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <HelpCircleIcon className="size-3.5 text-brand-violet-ink" />
                            Step-by-Step Solution Explanation
                          </div>
                          <RichContent html={item.explanation} className="text-xs leading-relaxed text-muted-foreground" />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilePenLineIcon,
  LightbulbIcon,
  ListChecksIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import {
  questionKindLabel,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  AssessmentDetail,
  AssessmentQuestionView,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

function matchesSection(
  qSection: string | null | undefined,
  sec: SectionDefinition
): boolean {
  if (!qSection) return false
  const trimmed = qSection.trim()
  return (
    trimmed === sec.key ||
    trimmed.toLowerCase() === sec.key.toLowerCase() ||
    trimmed === sec.title ||
    trimmed.toLowerCase() === sec.title.toLowerCase()
  )
}

function matchesQuery(q: AssessmentQuestionView, query: string): boolean {
  const qLower = query.toLowerCase()
  if (q.stem && q.stem.toLowerCase().includes(qLower)) return true
  if (q.explanation && q.explanation.toLowerCase().includes(qLower)) return true
  if (
    q.options &&
    q.options.some(
      (opt) =>
        (opt.key && opt.key.toLowerCase().includes(qLower)) ||
        (opt.content && opt.content.toLowerCase().includes(qLower))
    )
  ) {
    return true
  }
  return false
}

interface QuestionPaperRosterProps {
  workspaceSlug: string
  assessment: AssessmentDetail
  effectiveSections: SectionDefinition[]
  groupedSections: Array<{
    key: string
    title: string | null
    description: string | null
    questions: AssessmentQuestionView[]
    count: number
    marks: number
  }>
  selectedSectionFilter: string
  setSelectedSectionFilter: (val: string) => void
  canWrite: boolean
}

export function QuestionPaperRoster({
  workspaceSlug,
  assessment,
  effectiveSections,
  groupedSections,
  selectedSectionFilter,
  setSelectedSectionFilter,
  canWrite,
}: QuestionPaperRosterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<
    Record<string, boolean>
  >({})

  const trimmedQuery = searchQuery.trim().toLowerCase()

  const filteredGroupedSections = useMemo(() => {
    if (!trimmedQuery) {
      return groupedSections
    }
    return groupedSections
      .map((group) => {
        const matchingQuestions = group.questions.filter((q) =>
          matchesQuery(q, trimmedQuery)
        )
        return {
          ...group,
          questions: matchingQuestions,
          count: matchingQuestions.length,
          marks: matchingQuestions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
        }
      })
      .filter((group) => group.questions.length > 0)
  }, [groupedSections, trimmedQuery])

  const totalMatchingQuestions = useMemo(() => {
    return filteredGroupedSections.reduce(
      (sum, g) => sum + g.questions.length,
      0
    )
  }, [filteredGroupedSections])

  function toggleQuestion(id: string) {
    setExpandedQuestionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function toggleAllQuestions(expand: boolean) {
    const updated: Record<string, boolean> = {}
    assessment.questions.forEach((q) => {
      updated[q.id] = expand
    })
    setExpandedQuestionIds(updated)
  }

  return (
    <div className="space-y-4 self-start">
      {/* ── Open Section Header on Canvas ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="size-4 text-foreground" />
            <h2 className="font-heading text-base font-bold text-foreground">
              Question Paper Structure
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {assessment.questions.length} questions •{" "}
            {formatNumber(assessment.totalMarks ?? 0)} total marks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Instant Question Search */}
          {assessment.questions.length > 0 ? (
            <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions & options..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Section Filter Pills */}
          {effectiveSections.length > 1 ? (
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedSectionFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
                  selectedSectionFilter === "ALL"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {effectiveSections.map((sec) => (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setSelectedSectionFilter(sec.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-colors truncate max-w-[130px]",
                    selectedSectionFilter === sec.key
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={sec.title}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          ) : null}

          {assessment.questions.length > 0 ? (
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => toggleAllQuestions(true)}
                className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
              >
                Expand all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => toggleAllQuestions(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
              >
                Collapse all
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filter indicator */}
      {trimmedQuery && totalMatchingQuestions > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs">
          <span className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground font-mono">
              {totalMatchingQuestions}
            </span>{" "}
            matching {totalMatchingQuestions === 1 ? "question" : "questions"}{" "}
            for &ldquo;
            <span className="font-semibold text-foreground">
              {searchQuery}
            </span>
            &rdquo;
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setSearchQuery("")}
            className="h-6 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </Button>
        </div>
      ) : null}

      {/* ── Flat Paper Container ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {assessment.questions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <ListChecksIcon className="mx-auto size-8 text-muted-foreground opacity-50" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No questions added yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Start building this exam paper by adding questions from your
                question bank or creating new ones.
              </p>
            </div>
            {canWrite ? (
              <Button
                size="sm"
                className="text-xs font-bold gap-1.5 rounded-xl mt-2"
                render={
                  <Link
                    href={workspaceRoutes.mockTests.edit(
                      workspaceSlug,
                      assessment.id
                    )}
                  />
                }
              >
                <FilePenLineIcon className="size-3.5" />
                Add Questions in Builder
              </Button>
            ) : null}
          </div>
        ) : trimmedQuery && totalMatchingQuestions === 0 ? (
          <div className="p-10 text-center space-y-3">
            <SearchIcon className="mx-auto size-8 text-muted-foreground opacity-50" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No questions match &ldquo;{searchQuery}&rdquo;.
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for different keywords, question stems, or options.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold rounded-xl mt-2 cursor-pointer"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroupedSections.map((group) => (
              <div key={group.key}>
                {/* Section Banner */}
                {group.title ? (
                  <div className="bg-muted/30 px-5 py-3 border-y first:border-t-0 border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-sky-500" />
                        <h3 className="text-xs font-bold tracking-wide uppercase text-foreground">
                          {group.title}
                        </h3>
                        {group.key !== "__unassigned__" &&
                        group.key !== "__all__" ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] text-muted-foreground"
                          >
                            {group.key}
                          </Badge>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      >
                        {group.count}{" "}
                        {group.count === 1 ? "question" : "questions"} •{" "}
                        {formatNumber(group.marks)} marks
                      </Badge>
                    </div>
                    {group.description?.trim() ? (
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {group.description.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Question Rows */}
                <div className="divide-y divide-border">
                  {group.questions.map((q) => {
                    const isExpanded = expandedQuestionIds[q.id] ?? false

                    return (
                      <div
                        key={q.id}
                        className="p-4 sm:p-5 hover:bg-muted/5 transition-colors"
                      >
                        <div
                          onClick={() => toggleQuestion(q.id)}
                          className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-6 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-foreground">
                              {q.position + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium"
                            >
                              {questionKindLabel(q.kind)}
                            </Badge>
                            {q.section && effectiveSections.length > 1 ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {effectiveSections.find((s) =>
                                  matchesSection(q.section, s)
                                )?.title ?? q.section}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-foreground">
                              +{formatNumber(q.marks)}{" "}
                              {q.negativeMarks < 0
                                ? `| ${formatNumber(q.negativeMarks)} Neg`
                                : ""}
                            </span>
                            <div className="size-5 flex items-center justify-center text-muted-foreground">
                              {isExpanded ? (
                                <ChevronUpIcon className="size-3.5" />
                              ) : (
                                <ChevronDownIcon className="size-3.5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Question Stem preview / content */}
                        <div className="text-xs leading-relaxed text-foreground rich-text pt-2.5">
                          <RichContent html={q.stem} />
                        </div>

                        {/* Expanded Choices / Explanation */}
                        {isExpanded ? (
                          <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
                            {q.options && q.options.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.key}
                                    className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-2.5"
                                  >
                                    <span className="size-5 rounded bg-card border border-border flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                                      {opt.key}
                                    </span>
                                    <div className="flex-1 leading-snug rich-text">
                                      <RichContent html={opt.content} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">
                                Numerical or text response entry.
                              </div>
                            )}

                            {q.explanation?.trim() ? (
                              <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                  <LightbulbIcon className="size-3.5 text-amber-500" />
                                  <span>Explanation &amp; Solution</span>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed rich-text">
                                  <RichContent html={q.explanation} />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


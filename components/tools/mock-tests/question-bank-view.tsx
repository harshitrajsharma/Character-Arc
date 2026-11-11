"use client"

import { useId, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { QuestionBankPageData } from "@/lib/tools/mock-tests/question-bank-page"
import {
  BookOpenTextIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilePenIcon,
  HashIcon,
  LayersIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { FilterSelectField } from "@/components/shared/filter-select-field"
import { QuestionMetadata, QuestionStem } from "./questions/question-view"
import { QuestionInspectionView } from "./questions/question-inspection-view"
import { QuestionCard } from "./questions/question-card"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { QuestionBankItem } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const kindOptions = [
  { value: "ALL", label: "All types" },
  { value: "SINGLE_CHOICE", label: "Single choice (MCQ)" },
  { value: "MULTIPLE_CHOICE", label: "Multiple select (MSQ)" },
  { value: "NUMERIC", label: "Numerical (NAT)" },
  { value: "TRUE_FALSE", label: "True / false" },
  { value: "SHORT_ANSWER", label: "Short answer (legacy)" },
]
const difficultyOptions = [
  { value: "ALL", label: "All levels" },
  { value: "1", label: "Level 1 · Easy" },
  { value: "2", label: "Level 2 · Easy" },
  { value: "3", label: "Level 3 · Medium" },
  { value: "4", label: "Level 4 · Hard" },
  { value: "5", label: "Level 5 · Advanced" },
  { value: "UNSET", label: "Not set" },
]
const usageOptions = [
  { value: "ALL", label: "All questions" },
  { value: "REUSED", label: "Used in papers" },
  { value: "UNUSED", label: "Not used yet" },
]
const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "diff_desc", label: "Hardest first" },
  { value: "diff_asc", label: "Easiest first" },
  { value: "reused", label: "Most used" },
]

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : dateFormatter.format(date)
}
export function QuestionBankView({
  workspaceSlug,
  bank,
  canWrite,
  pageData,
}: {
  workspaceSlug: string
  bank: QuestionBankItem[]
  canWrite: boolean
  pageData: QuestionBankPageData
}) {
  const id = useId()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(pageData.filters.q)
  const {
    type: typeFilter,
    difficulty: difficultyFilter,
    usage: usageFilter,
    sort: sortBy,
  } = pageData.filters
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const stats = pageData.stats
  const filteredQuestions = bank
  const filterCount =
    [typeFilter, difficultyFilter, usageFilter].filter(
      (value) => value !== "ALL"
    ).length + (sortBy !== "newest" ? 1 : 0)
  const hasActiveFilters = Boolean(query.trim()) || filterCount > 0
  function navigate(changes: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("q", query.trim())
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "ALL" || (key === "sort" && value === "newest"))
        params.delete(key)
      else params.set(key, value)
    }
    if (!params.get("q")) params.delete("q")
    if (resetPage) params.delete("page")
    startTransition(() =>
      router.push(pathname + (params.size ? "?" + params.toString() : ""), {
        scroll: false,
      })
    )
  }
  function resetFilters() {
    setQuery("")
    const params = new URLSearchParams()
    if (pageData.pageSize !== 20) params.set("size", String(pageData.pageSize))
    startTransition(() =>
      router.push(pathname + (params.size ? "?" + params.toString() : ""), {
        scroll: false,
      })
    )
  }
  function pageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    return pathname + "?" + params.toString()
  }
  function onPageClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    page: number,
    disabled = false
  ) {
    if (disabled) {
      event.preventDefault()
      return
    }
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    navigate({ page: String(page), q: pageData.filters.q }, false)
  }
  function togglePreview(questionId: string) {
    setExpandedIds((previous) => ({
      ...previous,
      [questionId]: !previous[questionId],
    }))
  }
  if (pageData.total === 0)
    return (
      <Empty className="border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenTextIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Your collection starts here</EmptyTitle>
          <EmptyDescription>
            Create a question with rich text and math, then reuse it in any test
            paper.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {canWrite ? (
            <Link
              className={buttonVariants({ className: "h-11" })}
              href={workspaceRoutes.mockTests.questionNew(workspaceSlug)}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create first question
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              A workspace editor can add the first question.
            </p>
          )}
        </EmptyContent>
      </Empty>
    )
  return (
    <div className="flex min-w-0 flex-col gap-6" aria-busy={pending}>
      <section
        aria-label="Question bank summary"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total questions",
              value: stats.total,
              detail: "In this workspace",
              icon: BookOpenTextIcon,
            },
            {
              label: "Choice questions",
              value: stats.choice,
              detail: "MCQ, MSQ & true / false",
              icon: CheckCircle2Icon,
            },
            {
              label: "Numerical",
              value: stats.numeric,
              detail: "Numerical answer type",
              icon: HashIcon,
            },
            {
              label: "Used in papers",
              value: stats.used,
              detail: stats.total - stats.used + " not used yet",
              icon: LayersIcon,
            },
          ].map((metric, index) => (
            <div
              key={metric.label}
              className={cn(
                "flex min-w-0 flex-col gap-2 p-4 sm:p-5",
                index % 2 === 1 && "border-l border-border",
                index > 1 && "border-t border-border lg:border-t-0",
                index === 2 && "lg:border-l lg:border-border"
              )}
            >
              <dt className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                {metric.label}
                <metric.icon
                  className="hidden size-4 text-brand-cyan-ink sm:block"
                  aria-hidden="true"
                />
              </dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">
                {metric.value}
              </dd>
              <dd className="hidden text-xs leading-relaxed text-muted-foreground sm:block">
                {metric.detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-label="Find questions"
        className="flex min-w-0 flex-col gap-4"
      >
        <FieldGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field className="col-span-2 min-w-0 gap-2 lg:col-span-3">
            <FieldLabel htmlFor={id + "-search"}>
              Search your questions
            </FieldLabel>
            <InputGroup className="h-11 sm:h-10">
              <InputGroupInput
                id={id + "-search"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    navigate({ q: query.trim() })
                  }
                }}
                placeholder="Search questions, topics, or solutions…"
                className="min-w-0"
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              {query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    aria-label="Clear search"
                    className="size-11 sm:size-8"
                    onClick={() => {
                      setQuery("")
                      navigate({ q: "" })
                    }}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Search questions"
                  disabled={pending}
                  onClick={() => navigate({ q: query.trim() })}
                  className="h-11 px-3 sm:h-9"
                >
                  Search
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <div className="col-span-2 lg:hidden">
            <Button
              variant="outline"
              className="h-11 w-full"
              aria-expanded={filtersOpen}
              aria-controls={id + "-filters"}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontalIcon
                data-icon="inline-start"
                aria-hidden="true"
              />
              Filters & sort{filterCount > 0 ? ` (${filterCount} active)` : ""}
              {filtersOpen ? (
                <ChevronUpIcon data-icon="inline-end" aria-hidden="true" />
              ) : (
                <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
              )}
            </Button>
          </div>
          <div
            id={id + "-filters"}
            className={cn(
              "col-span-2 grid grid-cols-2 gap-3 lg:contents",
              !filtersOpen && "hidden"
            )}
          >
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <FilterSelectField
                density="compact"
                disabled={pending}
                id={id + "-sort"}
                label="Sort by"
                value={sortBy}
                items={sortOptions}
                onChange={(value) => navigate({ sort: value })}
              />
            </div>
            <FilterSelectField
              density="compact"
              disabled={pending}
              id={id + "-type"}
              label="Question type"
              value={typeFilter}
              items={kindOptions}
              onChange={(value) => navigate({ type: value })}
            />
            <FilterSelectField
              density="compact"
              disabled={pending}
              id={id + "-difficulty"}
              label="Difficulty"
              value={difficultyFilter}
              items={difficultyOptions}
              onChange={(value) => navigate({ difficulty: value })}
            />
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <FilterSelectField
                density="compact"
                disabled={pending}
                id={id + "-usage"}
                label="Paper usage"
                value={usageFilter}
                items={usageOptions}
                onChange={(value) => navigate({ usage: value })}
              />
            </div>
            {hasActiveFilters ? (
              <div className="col-span-2 flex items-end lg:col-span-1">
                <Button
                  variant="ghost"
                  className="h-11 sm:h-9"
                  onClick={resetFilters}
                >
                  <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                  Reset filters
                </Button>
              </div>
            ) : null}
          </div>
        </FieldGroup>
      </section>
      <section
        aria-labelledby={id + "-results"}
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={id + "-results"} className="text-sm font-semibold">
            Questions
          </h2>
          <p role="status" className="text-xs text-muted-foreground">
            {pageData.filteredTotal > 0
              ? `${(pageData.page - 1) * pageData.pageSize + 1}–${(pageData.page - 1) * pageData.pageSize + bank.length} of ${pageData.filteredTotal} questions`
              : "0 matching questions"}
            {pending ? " · Updating…" : ""}
          </p>
        </div>
        {filteredQuestions.length === 0 ? (
          <Empty className="border border-dashed py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No matching questions</EmptyTitle>
              <EmptyDescription>
                Try another keyword or reset the filters to see your full
                collection.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-11" onClick={resetFilters}>
                Reset filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid min-w-0 gap-4">
            <ul className="grid min-w-0 gap-3">
              {filteredQuestions.map((item, index) => {
                const expanded = Boolean(expandedIds[item.id])
                const questionNumber =
                  (pageData.page - 1) * pageData.pageSize + index + 1
                return (
                  <li key={item.id}>
                    <QuestionCard
                      mode="disclosure"
                      question={item}
                      allocation={{ number: questionNumber }}
                      summary={
                        <div
                          className="grid min-w-0 gap-3"
                          data-question-bank-summary
                        >
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="text-sm font-semibold">
                              Question {questionNumber}
                            </span>
                            <QuestionMetadata question={{ kind: item.kind }} />
                            <span className="text-xs text-muted-foreground">
                              Difficulty:{" "}
                              {item.difficulty == null
                                ? "Not set"
                                : `Level ${item.difficulty}`}
                            </span>
                          </div>
                          {!expanded ? (
                            <QuestionStem
                              stem={item.stem}
                              compact
                              className="text-base leading-7 font-medium"
                            />
                          ) : null}
                        </div>
                      }
                      expanded={expanded}
                      onToggle={() => togglePreview(item.id)}
                      label={
                        (expanded
                          ? "Hide preview for question "
                          : "Preview question ") + questionNumber
                      }
                      footerPlacement="bottom"
                      footer={
                        <div
                          className="flex min-w-0 items-center justify-between gap-3"
                          data-question-library-details
                        >
                          <dl
                            aria-label="Library details"
                            className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"
                          >
                            <div className="flex min-w-0 basis-full gap-2">
                              <dt className="shrink-0 font-medium">Coverage</dt>
                              <dd className="min-w-0 [overflow-wrap:anywhere]">
                                {item.targetTitles.length
                                  ? item.targetTitles
                                      .slice(0, expanded ? undefined : 2)
                                      .join(" · ")
                                  : "Not linked"}
                                {!expanded && item.targetTitles.length > 2
                                  ? ` · +${item.targetTitles.length - 2} more`
                                  : ""}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <dt className="font-medium">Usage</dt>
                              <dd>
                                {item.assessmentsCount
                                  ? `${item.assessmentsCount} ${item.assessmentsCount === 1 ? "assessment" : "assessments"}`
                                  : "Not used yet"}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <dt className="font-medium">Updated</dt>
                              <dd>
                                <time dateTime={item.updatedAt}>
                                  {formatDate(item.updatedAt)}
                                </time>
                              </dd>
                            </div>
                          </dl>
                          {canWrite ? (
                            <Link
                              className={buttonVariants({
                                variant: "outline",
                                className: "h-11",
                              })}
                              aria-label={"Edit question " + questionNumber}
                              href={workspaceRoutes.mockTests.questionEdit(
                                workspaceSlug,
                                item.id
                              )}
                            >
                              <FilePenIcon
                                data-icon="inline-start"
                                aria-hidden="true"
                              />
                              Edit
                            </Link>
                          ) : null}
                        </div>
                      }
                    >
                      <QuestionInspectionView question={item} solution={item} />
                    </QuestionCard>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor={id + "-page-size"}>Per page</label>
                <Select
                  items={[10, 20, 50].map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                  value={String(pageData.pageSize)}
                  disabled={pending}
                  onValueChange={(value) => {
                    if (value) navigate({ size: value })
                  }}
                >
                  <SelectTrigger
                    id={id + "-page-size"}
                    className="w-20 data-[size=default]:h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    <SelectGroup>
                      {[10, 20, 50].map((size) => (
                        <SelectItem
                          key={size}
                          value={String(size)}
                          className="min-h-11"
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <PaginationControls
                page={pageData.page}
                totalPages={pageData.totalPages}
                label="Question bank pagination"
                href={pageHref}
                pending={pending}
                onNavigate={(event, page) => onPageClick(event, page, pending)}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

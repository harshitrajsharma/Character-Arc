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
  CircleDotIcon,
  FilePenIcon,
  HashIcon,
  LayersIcon,
  ListChecksIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
const kindOptions = [
  { value: "ALL", label: "All types" },
  { value: "SINGLE_CHOICE", label: "Single choice (MCQ)" },
  { value: "MULTIPLE_CHOICE", label: "Multiple select (MSQ)" },
  { value: "NUMERIC", label: "Numerical (NAT)" },
  { value: "TRUE_FALSE", label: "True / false" },
  { value: "SHORT_ANSWER", label: "Short answer (legacy)" },
]
const questionTypeStyles: Record<
  string,
  { className: string; icon: typeof HashIcon }
> = {
  SINGLE_CHOICE: {
    className: "border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink",
    icon: CircleDotIcon,
  },
  MULTIPLE_CHOICE: {
    className: "border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink",
    icon: ListChecksIcon,
  },
  NUMERIC: {
    className:
      "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
    icon: HashIcon,
  },
}
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

function BankSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Field className="min-w-0 gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full min-w-0 data-[size=default]:h-11 sm:data-[size=default]:h-9"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="min-h-11 sm:min-h-0"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : dateFormatter.format(date)
}
function kindLabel(kind: string) {
  return (
    kindOptions.find((option) => option.value === kind)?.label ??
    questionKindLabel(kind)
  )
}
// Contain wide equations and tables without widening the page.
const richContentClass =
  "min-w-0 max-w-full overflow-x-auto [overflow-wrap:anywhere] [&_img]:max-w-full [&_table]:max-w-full"
// KaTeX fractions can extend beyond their line box. Give math room inside the
// horizontal scroller so it neither clips nor creates a vertical scrollbar.
const previewContentClass = cn(
  richContentClass,
  "overflow-y-hidden [&_.katex]:text-[1.5rem]! [&:has(.math-inline)]:py-3"
)

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
  const pageNumbers = [
    ...new Set([
      1,
      pageData.page - 1,
      pageData.page,
      pageData.page + 1,
      pageData.totalPages,
    ]),
  ]
    .filter((page) => page >= 1 && page <= pageData.totalPages)
    .sort((a, b) => a - b)
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
              <BankSelect
                id={id + "-sort"}
                label="Sort by"
                value={sortBy}
                options={sortOptions}
                onChange={(value) => navigate({ sort: value })}
              />
            </div>
            <BankSelect
              id={id + "-type"}
              label="Question type"
              value={typeFilter}
              options={kindOptions}
              onChange={(value) => navigate({ type: value })}
            />
            <BankSelect
              id={id + "-difficulty"}
              label="Difficulty"
              value={difficultyFilter}
              options={difficultyOptions}
              onChange={(value) => navigate({ difficulty: value })}
            />
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <BankSelect
                id={id + "-usage"}
                label="Paper usage"
                value={usageFilter}
                options={usageOptions}
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
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {filteredQuestions.map((item, index) => {
                const expanded = Boolean(expandedIds[item.id])
                const questionNumber =
                  (pageData.page - 1) * pageData.pageSize + index + 1
                const difficulty = difficultyOptions
                  .find((option) => option.value === String(item.difficulty))
                  ?.label.split(" · ")[1]
                const previewId = id + "-preview-" + item.id
                const typeStyle = questionTypeStyles[item.kind]
                const TypeIcon = typeStyle?.icon
                return (
                  <li key={item.id}>
                    <article aria-label={"Question " + questionNumber}>
                      <div
                        className={cn(
                          "group relative isolate grid min-w-0 gap-3 p-4 transition-colors hover:bg-muted/40 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-6",
                          expanded && "bg-card"
                        )}
                      >
                        <button
                          type="button"
                          aria-label={
                            (expanded
                              ? "Hide preview for question "
                              : "Preview question ") + questionNumber
                          }
                          aria-expanded={expanded}
                          aria-controls={previewId}
                          onClick={() => togglePreview(item.id)}
                          className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        />
                        <div className="pointer-events-none flex min-w-0 flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {questionNumber.toString().padStart(2, "0")}
                            </span>
                            <Badge
                              variant="outline"
                              className={typeStyle?.className}
                            >
                              {TypeIcon ? (
                                <TypeIcon aria-hidden="true" />
                              ) : null}
                              {kindLabel(item.kind)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                item.difficulty === null
                                  ? "text-muted-foreground"
                                  : item.difficulty <= 2
                                    ? "border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink"
                                    : item.difficulty === 3
                                      ? "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink"
                                      : "border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink"
                              )}
                            >
                              {item.difficulty === null
                                ? "Difficulty not set"
                                : `${difficulty ?? "Level"} · Level ${item.difficulty}`}
                            </Badge>
                          </div>
                          <RichContent
                            html={item.stem}
                            className={cn(
                              richContentClass,
                              "line-clamp-2 overflow-hidden text-sm leading-relaxed"
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="pointer-events-none inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground sm:h-9"
                          >
                            {expanded ? (
                              <ChevronUpIcon className="size-4" />
                            ) : (
                              <ChevronDownIcon className="size-4" />
                            )}
                            {expanded ? "Hide preview" : "Preview"}
                          </span>
                          {canWrite ? (
                            <Link
                              className={buttonVariants({
                                variant: "outline",
                                className:
                                  "relative z-20 h-11 flex-1 sm:h-9 lg:flex-none",
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
                        <div className="pointer-events-none flex min-w-0 flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between lg:col-span-2">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            {(expanded
                              ? item.targetTitles
                              : item.targetTitles.slice(0, 2)
                            ).map((title, topicIndex) => (
                              <Badge
                                key={title + topicIndex}
                                variant="outline"
                                className="h-auto max-w-full py-0.5 [overflow-wrap:anywhere] whitespace-normal"
                              >
                                {title}
                              </Badge>
                            ))}
                            {!expanded && item.targetTitles.length > 2 ? (
                              <span>
                                +{item.targetTitles.length - 2} topics in
                                preview
                              </span>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                            <span>
                              {item.assessmentsCount > 0
                                ? "Used in " +
                                  item.assessmentsCount +
                                  (item.assessmentsCount === 1
                                    ? " paper"
                                    : " papers")
                                : "Not used yet"}
                            </span>
                            <span>
                              Updated{" "}
                              <time dateTime={item.updatedAt}>
                                {formatDate(item.updatedAt)}
                              </time>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div id={previewId} hidden={!expanded}>
                        {expanded ? (
                          <div className="flex min-w-0 flex-col gap-5 border-t border-border bg-surface-inset p-4 inset-shadow-recessed sm:p-5">
                            <div className="flex flex-col gap-2">
                              <h3 className="text-sm font-semibold">
                                Question preview
                              </h3>
                              <RichContent
                                html={item.stem}
                                className={cn(
                                  previewContentClass,
                                  "text-sm leading-relaxed"
                                )}
                              />
                            </div>
                            <Separator />
                            <div className="flex min-w-0 flex-col gap-3">
                              <h4 className="text-sm font-semibold">
                                Answer key
                              </h4>
                              {item.options.length > 0 ? (
                                <ul className="grid min-w-0 gap-2 sm:grid-cols-2">
                                  {item.options.map((option) => {
                                    const correct = item.answerKeys.includes(
                                      option.key
                                    )
                                    return (
                                      <li
                                        key={option.key}
                                        className={cn(
                                          "flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3",
                                          correct &&
                                            "border-success-line bg-success-soft"
                                        )}
                                      >
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-xs font-medium">
                                          {option.key}
                                        </span>
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                          <RichContent
                                            html={option.content}
                                            className={cn(
                                              previewContentClass,
                                              "text-sm"
                                            )}
                                          />
                                          {correct ? (
                                            <span className="flex items-center gap-1 text-xs font-medium text-success-ink">
                                              <CheckCircle2Icon
                                                className="size-3.5"
                                                aria-hidden="true"
                                              />
                                              Correct answer
                                            </span>
                                          ) : null}
                                        </div>
                                      </li>
                                    )
                                  })}
                                </ul>
                              ) : item.numericAnswer !== null ? (
                                <p className="text-sm">
                                  Correct numerical answer:{" "}
                                  <strong className="text-success-ink">
                                    {item.numericAnswer}
                                  </strong>
                                </p>
                              ) : item.textAnswer ? (
                                <p className="text-sm [overflow-wrap:anywhere]">
                                  {item.textAnswer}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No answer key available.
                                </p>
                              )}
                            </div>
                            {item.explanation &&
                            stripHtml(item.explanation).trim() ? (
                              <>
                                <Separator />
                                <div className="flex min-w-0 flex-col gap-2">
                                  <h4 className="text-sm font-semibold">
                                    Solution
                                  </h4>
                                  <RichContent
                                    html={item.explanation}
                                    className={cn(
                                      previewContentClass,
                                      "text-sm leading-relaxed"
                                    )}
                                  />
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
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
              <Pagination
                aria-label="Question bank pagination"
                className="mx-0 w-auto sm:justify-end"
              >
                <PaginationContent className="flex-wrap justify-center">
                  <PaginationItem>
                    <PaginationPrevious
                      role="link"
                      href={pageHref(Math.max(1, pageData.page - 1))}
                      aria-disabled={pending || pageData.page <= 1}
                      tabIndex={pending || pageData.page <= 1 ? -1 : undefined}
                      className={cn(
                        "h-11 min-w-11",
                        (pending || pageData.page <= 1) &&
                          "pointer-events-none opacity-50"
                      )}
                      onClick={(event) =>
                        onPageClick(
                          event,
                          pageData.page - 1,
                          pending || pageData.page <= 1
                        )
                      }
                    />
                  </PaginationItem>
                  {pageNumbers.map((page, index) => (
                    <PaginationItem
                      key={page}
                      className={cn(
                        "flex items-center",
                        page !== 1 &&
                          page !== pageData.totalPages &&
                          page !== pageData.page &&
                          "hidden sm:flex"
                      )}
                    >
                      {index > 0 && page - pageNumbers[index - 1] > 1 ? (
                        <PaginationEllipsis className="hidden sm:flex" />
                      ) : null}
                      <PaginationLink
                        role="link"
                        href={pageHref(page)}
                        isActive={page === pageData.page}
                        aria-label={`Page ${page}`}
                        aria-disabled={pending}
                        tabIndex={pending ? -1 : undefined}
                        className={cn(
                          "size-11",
                          pending && "pointer-events-none opacity-50"
                        )}
                        onClick={(event) => onPageClick(event, page, pending)}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      role="link"
                      href={pageHref(
                        Math.min(pageData.totalPages, pageData.page + 1)
                      )}
                      aria-disabled={
                        pending || pageData.page >= pageData.totalPages
                      }
                      tabIndex={
                        pending || pageData.page >= pageData.totalPages
                          ? -1
                          : undefined
                      }
                      className={cn(
                        "h-11 min-w-11",
                        (pending || pageData.page >= pageData.totalPages) &&
                          "pointer-events-none opacity-50"
                      )}
                      onClick={(event) =>
                        onPageClick(
                          event,
                          pageData.page + 1,
                          pending || pageData.page >= pageData.totalPages
                        )
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

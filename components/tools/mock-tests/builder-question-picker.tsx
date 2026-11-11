"use client"

import { useId, useRef, useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  allocationError,
  type QuestionAllocation,
} from "@/lib/tools/mock-tests/question-authoring"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { FilterSelectField } from "@/components/shared/filter-select-field"
import type {
  QuestionBankItem,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"
import type { BuilderBankFilters } from "@/lib/tools/mock-tests/builder-bank-cache"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { cn } from "@/lib/utils"
import { QuestionCard } from "./questions/question-card"
import {
  QuestionMetadata,
  QuestionSummary,
  QuestionView,
} from "./questions/question-view"
import { hasSolution } from "./questions/question-types"
import { useBuilderQuestionBank } from "./use-builder-question-bank"

const types = [
  { value: "ALL", label: "All types" },
  ...(
    ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "NUMERIC", "TRUE_FALSE"] as const
  ).map((value) => ({ value, label: questionKindLabel(value) })),
]
const difficulties = [
  { value: "ALL", label: "All levels" },
  { value: "UNSET", label: "Not set" },
  ...[1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: `Level ${value}`,
  })),
]

function PickerSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-3" data-picker-skeleton>
      {[0, 1, 2, 3].map((index) => (
        <li
          key={index}
          className="flex min-h-36 flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-4 w-36 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-full motion-reduce:animate-none" />
          <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
          <Skeleton className="mt-auto h-8 w-24 self-end motion-reduce:animate-none" />
        </li>
      ))}
    </ul>
  )
}

function PickerQuestion({
  item,
  expanded,
  onToggle,
  selected,
  onSelect,
  added,
  onAdd,
}: {
  item: QuestionBankItem
  expanded: boolean
  onToggle: () => void
  selected: boolean
  onSelect: () => void
  added: boolean
  onAdd: () => void
}) {
  const [reveal, setReveal] = useState(false)
  const title =
    item.stem
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || "Untitled question"
  const question = { ...item, topicTitles: item.targetTitles }
  return (
    <QuestionCard
      mode="disclosure"
      question={question}
      expanded={expanded}
      onToggle={onToggle}
      label={`${expanded ? "Collapse" : "Preview"} question: ${title}`}
      summary={
        expanded ? (
          <QuestionMetadata question={question} />
        ) : (
          <QuestionSummary question={question} />
        )
      }
      actions={
        <label className="flex size-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-ring">
          <Checkbox
            checked={added || selected}
            disabled={added}
            onCheckedChange={onSelect}
            aria-label={
              added ? `Already in assessment: ${title}` : `Select: ${title}`
            }
          />
        </label>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-xs [overflow-wrap:anywhere] text-muted-foreground">
            {item.targetTitles.length
              ? item.targetTitles.join(" · ")
              : "No topic labels"}
          </p>
          <Button
            variant={added ? "ghost" : "outline"}
            className="h-11 shrink-0"
            disabled={added}
            onClick={onAdd}
          >
            {added ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <PlusIcon aria-hidden="true" />
            )}
            {added ? "Added" : "Add question"}
          </Button>
        </div>
      }
    >
      <QuestionView
        mode="readOnly"
        header={null}
        question={question}
        solution={reveal ? item : undefined}
      />
      {hasSolution(item) ? (
        <Button
          variant="outline"
          className="min-h-11 justify-self-start"
          aria-pressed={reveal}
          onClick={() => setReveal((value) => !value)}
        >
          {reveal ? "Hide answer key" : "Show answer key"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          No answer key available.
        </p>
      )}
    </QuestionCard>
  )
}

export function BuilderQuestionPicker({
  open,
  onOpenChange,
  workspaceSlug,
  viewerId,
  assessmentId,
  addedIds,
  onAddMany,
  onCreate,
  sections,
  target,
  onTargetChange,
  defaultAllocation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug: string
  viewerId: string
  assessmentId: string
  addedIds: Set<string>
  onAddMany: (items: QuestionBankItem[], allocation: QuestionAllocation) => void
  defaultAllocation: QuestionAllocation
  onCreate: () => void
  sections: SectionDefinition[]
  target: string | null
  onTargetChange: (key: string | null) => void
}) {
  const {
    initial,
    filters,
    change: updateFilter,
    reset,
    query: bankQuery,
    loading,
    scroller: scrollerRef,
    onScroll,
    remember: rememberPosition,
  } = useBuilderQuestionBank({
    open,
    workspaceSlug,
    viewerId,
    assessmentId,
  })
  const [selection, setSelection] = useState(
    () => new Map(initial.selected.map((item) => [item.id, item]))
  )
  const [expanded, setExpanded] = useState(() => new Set(initial.expanded))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [marks, setMarks] = useState(String(defaultAllocation.marks))
  const [penalty, setPenalty] = useState(
    String(defaultAllocation.negativeMarks)
  )
  const scoringError = allocationError(marks, penalty)
  const searchRef = useRef<HTMLInputElement>(null),
    titleRef = useRef<HTMLHeadingElement>(null)
  const filterId = useId(),
    searchId = useId(),
    resultsId = useId()
  const selected = [...selection.values()].filter(
    (item) => !addedIds.has(item.id)
  )
  const { data, isError, isFetching } = bankQuery
  const filterCount =
    Number(filters.type !== "ALL") + Number(filters.difficulty !== "ALL")
  function remember() {
    rememberPosition(selected, [...expanded])
  }
  function close(next: boolean) {
    if (!next) {
      remember()
      setAnnouncement("")
    }
    onOpenChange(next)
  }
  function add(items: QuestionBankItem[]) {
    const fresh = items.filter((item) => !addedIds.has(item.id))
    if (!fresh.length || scoringError) {
      if (scoringError) setAnnouncement(scoringError)
      return
    }
    onAddMany(fresh, { marks: Number(marks), negativeMarks: Number(penalty) })
    setSelection((previous) => {
      const next = new Map(previous)
      fresh.forEach((item) => next.delete(item.id))
      return next
    })
    setAnnouncement(
      `Added ${fresh.length} ${fresh.length === 1 ? "question" : "questions"} to this draft. Save changes to keep them.`
    )
  }
  function change<K extends keyof BuilderBankFilters>(
    key: K,
    value: BuilderBankFilters[K]
  ) {
    setAnnouncement("")
    updateFilter(key, value)
  }
  const status = loading
    ? "Loading questions…"
    : isError
      ? data
        ? "Could not refresh. Showing previously loaded questions."
        : "Could not load questions."
      : `${data?.filteredTotal ?? 0} matching questions · ${addedIds.size} in assessment${isFetching ? " · Updating…" : ""}`
  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        side="right"
        className="w-full min-w-0 overflow-hidden sm:max-w-2xl!"
        initialFocus={titleRef}
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3 pr-14 sm:px-6 sm:pr-14">
          <SheetTitle ref={titleRef} tabIndex={-1} className="outline-none">
            Add questions
          </SheetTitle>
          <SheetDescription className="text-xs">
            Choose from your bank. Additions are unsaved until you save the
            assessment.
          </SheetDescription>
        </SheetHeader>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
          data-picker-scroller
        >
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 self-start"
              onClick={() => {
                remember()
                onCreate()
              }}
            >
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              Create new question
            </Button>
            <p className="text-xs font-medium text-muted-foreground">
              Or use existing questions
            </p>
            <FieldGroup className="flex flex-row items-end gap-2">
              <Field className="min-w-0 flex-1 gap-1">
                <FieldLabel htmlFor={searchId} className="sr-only">
                  Search questions
                </FieldLabel>
                <InputGroup className="h-11">
                  <InputGroupAddon>
                    <SearchIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    ref={searchRef}
                    id={searchId}
                    name="questionSearch"
                    value={filters.query}
                    maxLength={500}
                    onChange={(event) => change("query", event.target.value)}
                    placeholder="Search questions or topics…"
                    autoComplete="off"
                  />
                  {filters.query ? (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label="Clear search"
                        onClick={() => change("query", "")}
                      >
                        <XIcon aria-hidden="true" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  ) : null}
                </InputGroup>
              </Field>
              <Button
                variant="outline"
                className="h-11 shrink-0 min-[1000px]:hidden"
                aria-expanded={filtersOpen}
                aria-controls={filterId}
                onClick={() => setFiltersOpen((value) => !value)}
              >
                <SlidersHorizontalIcon aria-hidden="true" />
                Filters{filterCount ? ` (${filterCount})` : ""}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(filtersOpen && "rotate-180")}
                />
              </Button>
            </FieldGroup>
            <FieldGroup
              id={filterId}
              className={cn(
                "grid grid-cols-2 gap-3 min-[1000px]:grid",
                !filtersOpen && "hidden"
              )}
            >
              <FilterSelectField
                label="Question type"
                value={filters.type}
                items={types}
                onChange={(value) =>
                  change("type", value as BuilderBankFilters["type"])
                }
              />
              <FilterSelectField
                label="Difficulty"
                value={filters.difficulty}
                items={difficulties}
                onChange={(value) =>
                  change(
                    "difficulty",
                    value as BuilderBankFilters["difficulty"]
                  )
                }
              />
            </FieldGroup>
            {sections.length ? (
              <FilterSelectField
                label="Add to section"
                value={
                  target && sections.some((section) => section.key === target)
                    ? target
                    : "__none__"
                }
                items={[
                  { value: "__none__", label: "Unassigned" },
                  ...sections.map((section) => ({
                    value: section.key,
                    label: section.title,
                  })),
                ]}
                onChange={(value) =>
                  onTargetChange(value === "__none__" ? null : value)
                }
              />
            ) : null}
            {filters.query || filterCount ? (
              <Button
                variant="ghost"
                className="min-h-11 self-start"
                onClick={() => {
                  setAnnouncement("")
                  reset()
                }}
              >
                Reset filters
              </Button>
            ) : null}
            <details className="text-xs">
              <summary className="flex min-h-11 cursor-pointer items-center text-muted-foreground">
                Scoring for additions: {marks || "—"} marks · {penalty || "—"}{" "}
                penalty
              </summary>
              <FieldGroup className="grid grid-cols-2 gap-3 pt-2">
                <Field>
                  <FieldLabel htmlFor={`${filterId}-marks`}>
                    Marks each
                  </FieldLabel>
                  <Input
                    id={`${filterId}-marks`}
                    className="h-11"
                    type="number"
                    min="0.01"
                    max="999999.99"
                    step="0.01"
                    value={marks}
                    onChange={(event) => setMarks(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${filterId}-penalty`}>
                    Penalty each
                  </FieldLabel>
                  <Input
                    id={`${filterId}-penalty`}
                    className="h-11"
                    type="number"
                    min="-999999.99"
                    max="0"
                    step="0.01"
                    value={penalty}
                    onChange={(event) => setPenalty(event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <p className="mt-2 text-muted-foreground">
                Applies to every question added from this sheet. Set 0 for no
                penalty. Save the assessment to keep additions.
              </p>
              {scoringError ? (
                <p role="alert" className="mt-2 text-destructive">
                  {scoringError}
                </p>
              ) : null}
            </details>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-xs text-muted-foreground"
              data-picker-status
            >
              {status}
              {announcement ? (
                <span className="mt-1 block text-foreground">
                  {announcement}
                </span>
              ) : null}
            </p>
            {selected.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{selected.length} selected</span>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => setSelection(new Map())}
                >
                  Clear selection
                </Button>
              </div>
            ) : null}
            {isError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-destructive"
              >
                <span>
                  {data
                    ? "Your loaded results are still available."
                    : "Try again or change your search."}
                </span>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => void bankQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            <div id={resultsId} aria-busy={loading} data-picker-results>
              {loading ? (
                <PickerSkeleton />
              ) : !data ? null : data.bank.length === 0 ? (
                <div className="flex flex-col gap-3 py-6 text-sm">
                  <p>No matching questions.</p>
                  <Button
                    variant="outline"
                    className="min-h-11 self-start"
                    onClick={() => {
                      setAnnouncement("")
                      reset()
                    }}
                  >
                    Clear search and filters
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.bank.map((item) => (
                    <li key={item.id}>
                      <PickerQuestion
                        item={item}
                        expanded={expanded.has(item.id)}
                        onToggle={() =>
                          setExpanded((previous) => {
                            const next = new Set(previous)
                            if (next.has(item.id)) next.delete(item.id)
                            else next.add(item.id)
                            return next
                          })
                        }
                        selected={selection.has(item.id)}
                        added={addedIds.has(item.id)}
                        onSelect={() =>
                          setSelection((previous) => {
                            const next = new Map(previous)
                            if (next.has(item.id)) next.delete(item.id)
                            else next.set(item.id, item)
                            return next
                          })
                        }
                        onAdd={() => add([item])}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {data && data.totalPages > 1 ? (
              <nav
                aria-label="Question picker pages"
                className="flex items-center justify-between gap-2 border-t border-border pt-3"
              >
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={loading || data.page <= 1}
                  onClick={() => change("page", data.page - 1)}
                >
                  Prev
                </Button>
                <span className="text-xs tabular-nums">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={loading || data.page >= data.totalPages}
                  onClick={() => change("page", data.page + 1)}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
          <p className="text-xs text-muted-foreground">
            {selected.length} selected
          </p>
          {selected.length ? (
            <Button className="h-11" onClick={() => add(selected)}>
              Add selected ({selected.length})
            </Button>
          ) : (
            <Button className="h-11" onClick={() => close(false)}>
              Done
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

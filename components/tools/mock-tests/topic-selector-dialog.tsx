"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  StarIcon,
  TargetIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FilterSelectField } from "@/components/shared/filter-select-field"
import { getSyllabusPickerPageAction } from "@/lib/tools/mock-tests/actions/syllabus-picker-actions"
import {
  MAX_QUESTION_TARGETS,
  SYLLABUS_SEARCH_LIMIT,
  syllabusPageKey,
  syllabusTypeLabel,
  type LinkedSyllabusItem,
  type SyllabusCursor,
  type SyllabusItem,
  type SyllabusType,
} from "@/lib/tools/mock-tests/syllabus-picker"
import { cn } from "@/lib/utils"

const typeItems = [
  { value: "ALL", label: "Chapters & topics" },
  { value: "exam-prep.chapter", label: "Chapters" },
  { value: "exam-prep.topic", label: "Topics" },
]
type SelectionProps = {
  targets: LinkedSyllabusItem[]
  onToggleTarget: (item: SyllabusItem) => void
  onUpdateTargetWeight: (blockId: string, weight: number) => void
  onSetTargetPrimary: (blockId: string) => void
}
function SyllabusItemRow({
  item,
  target,
  atLimit,
  onToggleTarget,
  onUpdateTargetWeight,
  onSetTargetPrimary,
}: Omit<SelectionProps, "targets"> & {
  item: SyllabusItem
  target?: LinkedSyllabusItem
  atLimit: boolean
}) {
  const id = useId()
  return (
    <li
      className={cn(
        "rounded-lg border bg-card",
        target ? "border-brand-cyan-line" : "border-border"
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg p-3",
          target ? "bg-brand-cyan-soft" : "hover:bg-muted"
        )}
      >
        <Checkbox
          id={id}
          checked={Boolean(target)}
          disabled={!target && atLimit}
          onCheckedChange={() => onToggleTarget(item)}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium break-words">{item.title}</span>
          {item.parentTitle ? (
            <span className="text-xs break-words text-muted-foreground">
              {item.parentTitle}
            </span>
          ) : null}
        </span>
        <Badge variant="outline" className="shrink-0">
          {syllabusTypeLabel(item.blockTypeKey)}
        </Badge>
      </label>
      {target ? (
        <FieldGroup className="gap-3 border-t border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Field
              orientation="horizontal"
              className="w-auto items-center gap-2"
            >
              <FieldLabel htmlFor={`${id}-weight`}>Weight (%)</FieldLabel>
              <Input
                id={`${id}-weight`}
                aria-label={`Coverage weight for ${item.title}`}
                type="number"
                min={0}
                max={100}
                value={String(target.weight)}
                onChange={(event) =>
                  onUpdateTargetWeight(item.blockId, Number(event.target.value))
                }
                className="h-11 w-20 text-center"
              />
            </Field>
            <Button
              type="button"
              variant={target.isPrimary ? "secondary" : "outline"}
              className="min-h-11"
              aria-pressed={target.isPrimary}
              onClick={() => onSetTargetPrimary(item.blockId)}
            >
              <StarIcon
                data-icon="inline-start"
                className={cn(target.isPrimary && "fill-current")}
                aria-hidden="true"
              />
              {target.isPrimary ? "Primary link" : "Set as primary"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Weight is this item&apos;s share of the question. Primary marks its
            main syllabus link.
          </p>
        </FieldGroup>
      ) : null}
    </li>
  )
}
export function TopicSelectorDialog({
  workspaceSlug,
  viewerId,
  targets,
  onToggleTarget,
  onUpdateTargetWeight,
  onSetTargetPrimary,
  triggerClassName,
}: SelectionProps & {
  workspaceSlug: string
  viewerId: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState("browse")
  const [search, setSearch] = useState("")
  const [type, setType] = useState<SyllabusType>("ALL")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [paging, setPaging] = useState<{
    page: number
    cursors: (SyllabusCursor | null)[]
  }>({ page: 0, cursors: [null] })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const scroll = useRef(0)
  const attachScroller = useCallback((node: HTMLDivElement | null) => {
    scroller.current = node
    if (node) node.scrollTop = scroll.current
  }, [])
  const id = useId()
  const normalizedSearch = search.trim()
  const waitingForSearch = normalizedSearch !== debouncedSearch
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(normalizedSearch), 250)
    return () => clearTimeout(timer)
  }, [normalizedSearch])
  const cursor = paging.cursors[paging.page]
  const { data, dataUpdatedAt, isPending, isFetching, isError, refetch } =
    useQuery({
      queryKey: syllabusPageKey(
        workspaceSlug,
        viewerId,
        debouncedSearch,
        type,
        cursor
      ),
      queryFn: () =>
        getSyllabusPickerPageAction({
          workspaceSlug,
          q: debouncedSearch,
          type,
          cursor,
        }),
      enabled: open && view === "browse" && !waitingForSearch,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: false,
    })
  const loading = waitingForSearch || (isPending && !isError)
  useEffect(() => {
    if (open && view === "browse" && !loading && data && scroller.current)
      scroller.current.scrollTop = scroll.current
  }, [open, view, loading, data, dataUpdatedAt])
  const selectedById = useMemo(
    () => new Map(targets.map((target) => [target.blockId, target])),
    [targets]
  )
  const atLimit = targets.length >= MAX_QUESTION_TARGETS
  function resetPaging() {
    scroll.current = 0
    setPaging({ page: 0, cursors: [null] })
    if (scroller.current) scroller.current.scrollTop = 0
  }
  function clearSearch() {
    setSearch("")
    resetPaging()
    searchRef.current?.focus()
  }
  function nextPage() {
    const next = data?.nextCursor
    if (!next || isFetching) return
    scroll.current = 0
    setPaging((previous) => ({
      page: previous.page + 1,
      cursors: [...previous.cursors.slice(0, previous.page + 1), next],
    }))
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("min-h-11 gap-2", triggerClassName)}
          >
            <TargetIcon data-icon="inline-start" aria-hidden="true" />
            {targets.length ? (
              <>
                Linked syllabus{" "}
                <Badge variant="secondary">{targets.length}</Badge>
              </>
            ) : (
              "Add topics"
            )}
            <ChevronDownIcon
              data-icon="inline-end"
              aria-hidden="true"
              className="ml-auto"
            />
          </Button>
        }
      />
      <DialogContent
        initialFocus={titleRef}
        className="flex max-h-[min(42rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl [&_[data-slot=dialog-close]]:size-11"
      >
        <DialogHeader className="m-0 shrink-0 border-b border-border p-4 pr-16">
          <DialogTitle ref={titleRef} tabIndex={-1}>
            Link syllabus coverage
          </DialogTitle>
          <DialogDescription>
            Select chapters or topics from this workspace.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={attachScroller}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4"
          onScroll={() => {
            if (open && view === "browse" && !loading && scroller.current)
              scroll.current = scroller.current.scrollTop
          }}
        >
          <ToggleGroup
            aria-label="Syllabus view"
            value={[view]}
            onValueChange={(values) => {
              if (values[0]) {
                setView(values[0])
                if (scroller.current) scroller.current.scrollTop = 0
              }
            }}
            className="w-full"
            spacing={1}
          >
            <ToggleGroupItem value="browse" className="min-h-11 flex-1">
              Browse
            </ToggleGroupItem>
            <ToggleGroupItem value="linked" className="min-h-11 flex-1">
              Linked ({targets.length})
            </ToggleGroupItem>
          </ToggleGroup>
          {view === "browse" ? (
            <>
              <FieldGroup className="gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_11rem]">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor={`${id}-search`}>
                    Find syllabus items
                  </FieldLabel>
                  <InputGroup className="h-11">
                    <InputGroupAddon>
                      <SearchIcon aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${id}-search`}
                      ref={searchRef}
                      value={search}
                      maxLength={SYLLABUS_SEARCH_LIMIT}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        resetPaging()
                      }}
                      placeholder="Search by name"
                    />
                    {search ? (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-sm"
                          className="size-11"
                          aria-label="Clear syllabus search"
                          onClick={clearSearch}
                        >
                          <XIcon aria-hidden="true" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    ) : null}
                  </InputGroup>
                </Field>
                <FilterSelectField
                  label="Item type"
                  value={type}
                  items={typeItems}
                  onChange={(value) => {
                    setType(value as SyllabusType)
                    resetPaging()
                  }}
                />
              </FieldGroup>
              <p role="status" className="text-xs text-muted-foreground">
                {loading
                  ? "Loading syllabus items…"
                  : data
                    ? `${data.items.length} ${data.items.length === 1 ? "result" : "results"} on this page${isFetching ? " · Updating…" : ""}`
                    : "Syllabus items"}
              </p>
              {isError && !waitingForSearch ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {data
                      ? "Couldn't refresh these items."
                      : "Couldn't load syllabus items."}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              <div aria-busy={loading} data-syllabus-results>
                {loading ? (
                  <div className="flex flex-col gap-2" aria-hidden="true">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton
                        key={index}
                        className="h-16 w-full motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                ) : data?.items.length ? (
                  <ul className="flex flex-col gap-2">
                    {data.items.map((item) => (
                      <SyllabusItemRow
                        key={item.blockId}
                        item={item}
                        target={selectedById.get(item.blockId)}
                        atLimit={atLimit}
                        onToggleTarget={onToggleTarget}
                        onUpdateTargetWeight={onUpdateTargetWeight}
                        onSetTargetPrimary={onSetTargetPrimary}
                      />
                    ))}
                  </ul>
                ) : data && !isError ? (
                  <div className="flex flex-col items-start gap-3 py-4">
                    <p className="text-sm text-muted-foreground">
                      {normalizedSearch || type !== "ALL"
                        ? "No syllabus items match these filters."
                        : "No chapters or topics yet. Add a syllabus in Exam Prep to link coverage."}
                    </p>
                    {normalizedSearch || type !== "ALL" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setSearch("")
                          setType("ALL")
                          resetPaging()
                        }}
                      >
                        Reset filters
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="min-h-11"
                        render={
                          <Link
                            href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep`}
                          />
                        }
                      >
                        Go to Exam Prep
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
              {!loading && data && (paging.page > 0 || data.nextCursor) ? (
                <nav
                  aria-label="Syllabus pages"
                  className="flex items-center justify-between gap-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={paging.page === 0 || isFetching}
                    onClick={() => {
                      scroll.current = 0
                      setPaging((previous) => ({
                        ...previous,
                        page: previous.page - 1,
                      }))
                    }}
                  >
                    <ChevronLeftIcon
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                    Prev
                  </Button>
                  <span className="text-sm">Page {paging.page + 1}</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={!data.nextCursor || isFetching}
                    onClick={nextPage}
                  >
                    Next
                    <ChevronRightIcon
                      data-icon="inline-end"
                      aria-hidden="true"
                    />
                  </Button>
                </nav>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Linked items stay here while you search or change pages.
              </p>
              {targets.length ? (
                <ul className="flex flex-col gap-2">
                  {targets.map((item) => (
                    <SyllabusItemRow
                      key={item.blockId}
                      item={item}
                      target={item}
                      atLimit={atLimit}
                      onToggleTarget={onToggleTarget}
                      onUpdateTargetWeight={onUpdateTargetWeight}
                      onSetTargetPrimary={onSetTargetPrimary}
                    />
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  No items linked. Browse your syllabus to add coverage.
                </p>
              )}
            </>
          )}
          {atLimit ? (
            <p role="status" className="text-sm text-muted-foreground">
              You can link up to {MAX_QUESTION_TARGETS} items. Remove one to add
              another.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p role="status" className="text-sm font-medium">
              {targets.length} {targets.length === 1 ? "item" : "items"} linked
            </p>
            <p className="text-xs text-muted-foreground">
              Saved with your question.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  InfoIcon,
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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { TargetableBlock } from "@/lib/tools/definitions/mock-tests/repository"
import type { QuestionFormTarget } from "./question-form"

function targetTypeLabel(blockTypeKey: string | null) {
  if (blockTypeKey === "exam-prep.subject") return "Subject"
  if (blockTypeKey === "exam-prep.chapter") return "Chapter"
  if (blockTypeKey === "exam-prep.topic") return "Topic"
  return "Syllabus item"
}

export function TopicSelectorDialog({
  workspaceSlug,
  targetableBlocks,
  targets,
  onToggleTarget,
  onUpdateTargetWeight,
  onSetTargetPrimary,
  triggerClassName,
}: {
  workspaceSlug?: string
  targetableBlocks: TargetableBlock[]
  targets: QuestionFormTarget[]
  onToggleTarget: (blockId: string) => void
  onUpdateTargetWeight: (blockId: string, weight: number) => void
  onSetTargetPrimary: (blockId: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const id = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const selectedCount = targets.length
  const selectedById = useMemo(
    () => new Map(targets.map((target) => [target.blockId, target])),
    [targets]
  )
  const filteredBlocks = useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) return targetableBlocks
    return targetableBlocks.filter(
      (block) =>
        block.title.toLowerCase().includes(query) ||
        targetTypeLabel(block.blockTypeKey).toLowerCase().includes(query)
    )
  }, [targetableBlocks, search])

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setSearch("")
    setOpen(nextOpen)
  }

  function clearSearch() {
    setSearch("")
    searchRef.current?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("min-h-11 gap-2 sm:min-h-9", triggerClassName)}
          >
            <TargetIcon aria-hidden="true" />
            {selectedCount > 0 ? (
              <>
                <span>Linked syllabus</span>
                <Badge variant="secondary">{selectedCount}</Badge>
              </>
            ) : (
              <span>Add topics</span>
            )}
            <ChevronDownIcon aria-hidden="true" className="ml-auto" />
          </Button>
        }
      />

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-xl [&_[data-slot=dialog-close]]:size-11">
        <DialogHeader className="m-0 shrink-0 bg-muted/20 p-4 pr-16 sm:p-5 sm:pr-16">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-cyan-soft text-brand-cyan-ink">
              <TargetIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>Link syllabus coverage</DialogTitle>
              <DialogDescription>
                Select the subjects, chapters, or topics this question covers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-2 border-b border-border p-4">
          <label htmlFor={`${id}-search`} className="text-sm font-medium">
            Find syllabus items
          </label>
          <div className="relative">
            <SearchIcon
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={`${id}-search`}
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or type"
              className="h-11 pr-12 pl-9"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 size-11"
                onClick={clearSearch}
                aria-label="Clear syllabus search"
              >
                <XIcon aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <p role="status" className="text-xs text-muted-foreground">
            {filteredBlocks.length} available{" "}
            {filteredBlocks.length === 1 ? "item" : "items"}
            {search ? " matching your search" : ""}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:max-h-[420px]">
          {targetableBlocks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <BookOpenIcon
                className="size-7 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No syllabus items yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a syllabus in Exam Prep to link this question to its
                  coverage.
                </p>
              </div>
              {workspaceSlug ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  render={
                    <Link
                      href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep`}
                    />
                  }
                >
                  Go to Exam Prep
                  <ExternalLinkIcon aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm break-words text-muted-foreground">
                No syllabus items match &quot;{search}&quot;.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={clearSearch}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredBlocks.map((block) => {
                const target = selectedById.get(block.blockId)
                const selected = Boolean(target)
                const checkboxId = `${id}-target-${block.blockId}`
                const weightId = `${id}-weight-${block.blockId}`
                return (
                  <div
                    key={block.blockId}
                    className={cn(
                      "rounded-lg border bg-card",
                      selected ? "border-brand-cyan-line" : "border-border"
                    )}
                  >
                    {/* Selection has one event source; settings are outside its label. */}
                    <label
                      htmlFor={checkboxId}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-3",
                        selected ? "bg-brand-cyan-soft" : "hover:bg-muted/30"
                      )}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={selected}
                        onCheckedChange={() => onToggleTarget(block.blockId)}
                      />
                      <span className="min-w-0 flex-1 text-sm font-medium break-words">
                        {block.title}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {targetTypeLabel(block.blockTypeKey)}
                      </Badge>
                    </label>
                    {target ? (
                      <div className="flex flex-col gap-3 border-t border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <label htmlFor={weightId} className="text-sm">
                              Weight
                            </label>
                            <Input
                              id={weightId}
                              aria-label={`Coverage weight for ${block.title}`}
                              type="number"
                              min={0}
                              max={100}
                              value={String(target.weight)}
                              onChange={(event) =>
                                onUpdateTargetWeight(
                                  block.blockId,
                                  Number(event.target.value)
                                )
                              }
                              className="h-11 w-20 text-center"
                            />
                            <span className="text-sm text-muted-foreground">
                              %
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant={target.isPrimary ? "secondary" : "outline"}
                            size="sm"
                            className="min-h-11"
                            aria-pressed={target.isPrimary}
                            onClick={() => onSetTargetPrimary(block.blockId)}
                          >
                            <StarIcon
                              className={cn(target.isPrimary && "fill-current")}
                              aria-hidden="true"
                            />
                            {target.isPrimary
                              ? "Primary link"
                              : "Set as primary"}
                          </Button>
                        </div>
                        <p className="flex items-start gap-2 text-xs text-muted-foreground">
                          <InfoIcon
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            Weight describes this item&apos;s share of the
                            question. Primary marks its main syllabus link.
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? "item" : "items"} linked
            </p>
            <p className="text-xs text-muted-foreground">
              Saved with your question.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={() => changeOpen(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

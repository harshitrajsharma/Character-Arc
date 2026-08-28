"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { TargetableBlock } from "@/lib/tools/definitions/mock-tests/repository"
import type { QuestionFormTarget } from "./question-form"

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

  const selectedCount = targets.length

  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return targetableBlocks
    const query = search.toLowerCase().trim()
    return targetableBlocks.filter(
      (block) =>
        block.title.toLowerCase().includes(query) ||
        (block.blockTypeKey && block.blockTypeKey.toLowerCase().includes(query))
    )
  }, [targetableBlocks, search])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-2 text-xs font-medium transition-all rounded-lg",
              selectedCount > 0
                ? "border-brand-violet-line/60 bg-brand-violet-soft/40 text-brand-violet-ink hover:bg-brand-violet-soft/60"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
              triggerClassName
            )}
          >
            <TargetIcon className="size-3.5 shrink-0 text-brand-violet-ink" aria-hidden="true" />
            {selectedCount > 0 ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="font-semibold">Linked Topics</span>
                <Badge
                  variant="secondary"
                  className="bg-brand-violet-ink text-brand-violet-foreground px-1.5 py-0 text-[10px] rounded-full font-bold"
                >
                  {selectedCount}
                </Badge>
              </span>
            ) : (
               <span className="truncate">+ Add topics</span>
            )}
            <ChevronDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        }
      />

      <DialogContent className="max-w-lg overflow-hidden border-border bg-card shadow-lg flex flex-col p-0 gap-0 sm:max-h-[85vh] sm:rounded-2xl !p-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 shrink-0 m-0 w-full pr-14">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-violet-soft text-brand-violet-ink shadow-xs">
              <TargetIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Exam Prep Topic Alignment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-normal">
                Link this question to exam topics. Answering correctly updates your topic proficiency in Exam Prep analytics.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b bg-background shrink-0">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chapters or topics..."
              className="pl-9 h-9 text-xs bg-muted/20"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Scrollable Topics Area */}
        <div className="flex-1 overflow-y-auto max-h-[380px] p-3 sm:p-4">
          {targetableBlocks.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <BookOpenIcon className="size-8 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-semibold text-foreground">No Exam Prep Topics Available</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                  Add chapters or topics in Exam Prep first to map question attempts to curriculum mastery.
                </p>
              </div>
              {workspaceSlug ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep`} />}
                >
                  Go to Exam Prep
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No topics match &quot;{search}&quot;.
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-2.5">
                {filteredBlocks.map((block) => {
                  const target = targets.find((t) => t.blockId === block.blockId)
                  const isSelected = Boolean(target)
                  const isChapter = block.blockTypeKey === "exam-prep.chapter"

                  return (
                    <div
                      key={block.blockId}
                      onClick={() => onToggleTarget(block.blockId)}
                      className={cn(
                        "rounded-xl border p-3 transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-brand-violet-line/70 bg-brand-violet-soft/30 shadow-xs"
                          : "border-border bg-background hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`target-chk-${block.blockId}`}
                          checked={isSelected}
                          onCheckedChange={() => onToggleTarget(block.blockId)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`target-chk-${block.blockId}`}
                              className="cursor-pointer text-xs font-semibold leading-tight text-foreground hover:text-primary"
                            >
                              {block.title}
                            </label>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-medium tracking-wide uppercase shrink-0",
                                isChapter
                                  ? "border-brand-cyan-line/40 bg-brand-cyan-soft/30 text-brand-cyan-ink"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {isChapter ? "Chapter" : "Topic"}
                            </Badge>
                          </div>

                          {/* Selected Topic Controls: Weight & Primary */}
                          {isSelected && target ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3 pt-2 border-t border-brand-violet-line/20 flex flex-wrap items-center justify-between gap-2 text-xs cursor-default"
                            >
                              {/* Weight Input */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">Proficiency Weight:</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={String(target.weight)}
                                  onChange={(e) =>
                                    onUpdateTargetWeight(block.blockId, Number(e.target.value))
                                  }
                                  className="h-6 w-14 text-xs text-center px-1 font-mono"
                                />
                                <span className="text-[11px] text-muted-foreground">%</span>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button type="button" className="text-muted-foreground hover:text-foreground">
                                        <InfoIcon className="size-3" aria-hidden="true" />
                                      </button>
                                    }
                                  />
                                  <TooltipContent side="top" className="text-xs max-w-xs">
                                    Determines how much answering this question affects topic proficiency (0-100%).
                                  </TooltipContent>
                                </Tooltip>
                              </div>

                              {/* Primary Toggle */}
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant={target.isPrimary ? "default" : "outline"}
                                  size="xs"
                                  className={cn(
                                    "h-6 text-[11px] gap-1 px-2",
                                    target.isPrimary
                                      ? "font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                  onClick={() => onSetTargetPrimary(block.blockId)}
                                >
                                  <StarIcon
                                    className={cn("size-3", target.isPrimary && "fill-current")}
                                    aria-hidden="true"
                                  />
                                  {target.isPrimary ? "Primary Topic" : "Set Primary"}
                                </Button>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button type="button" className="text-muted-foreground hover:text-foreground">
                                        <HelpCircleIcon className="size-3" aria-hidden="true" />
                                      </button>
                                    }
                                  />
                                  <TooltipContent side="top" className="text-xs max-w-xs">
                                    The primary topic is highlighted in test reports as the main subject of this question.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TooltipProvider>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} topic(s) selected`
              : "Select topics to link this question to your syllabus"}
          </span>
          <Button type="button" size="sm" className="h-8 text-xs px-4" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

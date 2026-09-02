"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon, RouteIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { StudyPathOutput } from "@/lib/tools/exam-prep/study-path"
import { StudyPathTimeline } from "./study-path-timeline"
import type { NavigationTarget } from "./types"

type StudyPathSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectName: string
  studyPath: StudyPathOutput
  onNavigate: (target: NavigationTarget) => void
}

export function StudyPathSheet({
  open,
  onOpenChange,
  subjectName,
  studyPath,
  onNavigate,
}: StudyPathSheetProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  const completedCount = studyPath.allSteps.filter(
    (step) =>
      step.evidence !== "Not required" &&
      (step.status === "completed" || step.status === "overachieved")
  ).length

  const remainingCount = studyPath.allSteps.filter(
    (step) =>
      step.evidence !== "Not required" &&
      step.status !== "completed" &&
      step.status !== "overachieved"
  ).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex flex-col border-l border-border/60 bg-popover/60 p-0 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-2xl sm:max-w-none! data-[side=right]:sm:w-[clamp(28rem,42vw,40rem)]! dark:ring-foreground/10"
        showCloseButton={true}
      >
        {/* Header */}
        <SheetHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-0">
          <div className="flex min-w-0 items-center gap-3 pr-6">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-violet-soft text-brand-violet-ink shadow-2xs">
              <RouteIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
                {subjectName}
              </SheetTitle>
              <p className="truncate text-[11px] text-muted-foreground">
                Study Path Roadmap
              </p>
            </div>
          </div>

          {completedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-8 h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowCompleted((v) => !v)}
              aria-pressed={showCompleted}
            >
              {showCompleted ? (
                <EyeOffIcon className="size-3.5" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-3.5" aria-hidden="true" />
              )}
              <span>
                {showCompleted ? "Hide Done" : `Done (${completedCount})`}
              </span>
            </Button>
          )}
        </SheetHeader>

        {/* Scrollable Timeline */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            <StudyPathTimeline
              studyPath={studyPath}
              onNavigate={onNavigate}
              showCompleted={showCompleted}
            />
          </div>
        </ScrollArea>

        {/* Universal Footer (Desktop & Mobile) with Thumb-Reachable Close */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/10 px-6 py-0">
          <span className="truncate text-xs font-medium text-muted-foreground">
            {remainingCount > 0
              ? `${remainingCount} steps remaining`
              : "All requirements complete"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-5 text-xs font-semibold shadow-xs hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

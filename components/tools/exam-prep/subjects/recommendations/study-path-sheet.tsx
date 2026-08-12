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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex flex-col p-0 sm:max-w-none! data-[side=right]:sm:w-[clamp(28rem,42vw,42.5rem)]!"
        showCloseButton={true}
      >
        <SheetHeader className="shrink-0 gap-0.5 border-b border-border/60 px-5 pt-3 pb-3">
          {/* pr-10 keeps the toggle clear of the sheet's close button (top-4 right-4) */}
          <div className="flex items-center justify-between gap-1 pr-10">
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand-violet-ink">
              <RouteIcon className="size-3.5" aria-hidden="true" />
              Study path
            </div>
            {completedCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setShowCompleted((v) => !v)}
                aria-pressed={showCompleted}
              >
                {showCompleted ? (
                  <EyeOffIcon className="size-3.5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="size-3.5" aria-hidden="true" />
                )}
                {showCompleted
                  ? "Hide completed"
                  : `Show completed${completedCount > 0 ? ` (${completedCount})` : ""}`}
              </Button>
            ) : null}
          </div>
          <SheetTitle className="text-lg leading-tight font-semibold">
            {subjectName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <StudyPathTimeline
              studyPath={studyPath}
              onNavigate={onNavigate}
              showCompleted={showCompleted}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

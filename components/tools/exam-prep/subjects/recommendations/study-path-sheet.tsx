"use client"

import { useState } from "react"
import { CheckCheckIcon, RouteIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DetailSheet } from "@/components/ui/detail-sheet"
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
  const includedSteps = studyPath.allSteps.filter((step) => step.evidence !== "Not required")
  const remainingCount = includedSteps.filter(
    (step) => step.status !== "completed" && step.status !== "overachieved"
  ).length
  const readyCount = studyPath.actionableSteps.filter(
    (step) => step.evidence !== "Not required"
  ).length

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={subjectName}
      eyebrow="Study path"
      description="A clear route from first learning to final test readiness."
      icon={<RouteIcon className="text-brand-violet-ink" aria-hidden="true" />}
      metadata={<span>{remainingCount === 0 ? "Path complete" : `${remainingCount} steps remaining`}</span>}
      headerDensity="compact"
      contentClassName="space-y-6 sm:px-7"
      footer={
        <Button 
          type="button" 
          variant="default" 
          onClick={() => onOpenChange(false)} 
          className="w-full h-12"
        >
          Close
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <p className="text-sm text-muted-foreground">
            {readyCount > 0
              ? `${readyCount} ${readyCount === 1 ? "step" : "steps"} ready now`
              : remainingCount > 0
                ? "Complete the current prerequisite to continue"
                : "Path complete"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:h-9"
          aria-pressed={showCompleted}
          onClick={() => setShowCompleted((current) => !current)}
        >
          <CheckCheckIcon aria-hidden="true" />
          {showCompleted ? "Hide completed" : "Show completed"}
        </Button>
      </div>

      <StudyPathTimeline
        studyPath={studyPath}
        showCompleted={showCompleted}
        onNavigate={onNavigate}
      />
    </DetailSheet>
  )
}

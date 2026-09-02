"use client"

import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { getFoundationLevelColor } from "../shared-styles"
import { Card } from "@/components/ui/card"
import {
  calculateChapterProgress,
  calculateSubjectProgress,
} from "@/lib/tools/exam-prep/calculations/progress"

function StatCell({
  label,
  value,
  valueColor,
  tooltip,
  className,
}: {
  label: string
  value: string
  valueColor?: string
  tooltip: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between p-3 md:p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger
            aria-label={`About ${label}`}
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="size-3" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-64 text-xs leading-relaxed">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <span
        className={cn(
          "mt-1.5 truncate text-lg font-bold tracking-tight md:text-xl",
          valueColor
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SubjectStats({ subject }: { subject: SubjectWithRelations }) {
  const progress = calculateSubjectProgress(subject)
  const foundationLevel = progress.foundationLevel
  const totalTopics = progress.stats.learning.totalTopics
  const completedTopics = progress.stats.learning.completedTopics
  const totalChapters = subject.chapters.length
  const completedChapters = subject.chapters.filter((chapter) => {
    const learningStats = calculateChapterProgress(chapter).stats.learning
    return (
      learningStats.totalTopics > 0 &&
      learningStats.completedTopics === learningStats.totalTopics
    )
  }).length
  const marksEvidence = progress.expectedMarksEvidence
  const totalTestRecords =
    marksEvidence.validChapterRecords + marksEvidence.validSubjectRecords
  const averageMarksTooltip =
    marksEvidence.percentage === null
      ? "No average yet. Add a chapter or full-subject Test Record. Untested chapters are never treated as zero."
      : `Average of ${totalTestRecords} valid Test Record${totalTestRecords === 1 ? "" : "s"}. ${marksEvidence.testedChapters} of ${marksEvidence.activeChapters} chapters have evidence. Full-subject tests contribute 60% and chapter tests contribute 40% when both scopes exist.`

  const cells = [
    {
      label: "Avg Marks",
      value:
        marksEvidence.percentage === null
          ? "—"
          : `${marksEvidence.percentage}%`,
      valueColor: "text-brand-neon-ink",
      tooltip: averageMarksTooltip,
    },
    {
      label: "Foundation",
      value: foundationLevel,
      valueColor: getFoundationLevelColor(foundationLevel),
      tooltip: "Based on your overall progress with emphasis on learning phase",
    },
    {
      label: "Topics",
      value: `${completedTopics}/${totalTopics}`,
      valueColor: "text-brand-cyan-ink",
      tooltip: "Number of topics completed in learning phase",
    },
    {
      label: "Chapters",
      value: `${completedChapters}/${totalChapters}`,
      valueColor: "text-brand-neon-ink",
      tooltip: "Chapters where all topics are completed in learning phase",
    },
  ]

  return (
    <TooltipProvider>
      <Card className="h-full border border-muted py-0">
        <div className="grid h-full grid-cols-2 divide-x divide-border/60">
          <div className="flex flex-col divide-y divide-border/60">
            <StatCell {...cells[0]} className="flex-1" />
            <StatCell {...cells[2]} className="flex-1" />
          </div>
          <div className="flex flex-col divide-y divide-border/60">
            <StatCell {...cells[1]} className="flex-1" />
            <StatCell {...cells[3]} className="flex-1" />
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}

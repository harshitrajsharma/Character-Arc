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
}: {
  label: string
  value: string
  valueColor?: string
  tooltip: string
}) {
  return (
    <div className="flex min-w-0 flex-col px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger
            aria-label={`About ${label}`}
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
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
          "mt-1 truncate text-base leading-tight font-bold md:text-lg",
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
        marksEvidence.percentage === null ? "—" : `${marksEvidence.percentage}%`,
      valueColor: "text-brand-violet-ink",
      tooltip: averageMarksTooltip,
    },
    {
      label: "Foundation",
      value: foundationLevel,
      valueColor: getFoundationLevelColor(foundationLevel),
      tooltip:
        "Based on your overall progress with emphasis on learning phase",
    },
    {
      label: "Topics",
      value: `${completedTopics}/${totalTopics}`,
      valueColor: "text-brand-violet-ink",
      tooltip: "Number of topics completed in learning phase",
    },
    {
      label: "Chapters",
      value: `${completedChapters}/${totalChapters}`,
      valueColor: "text-brand-violet-ink",
      tooltip:
        "Chapters where all topics are completed in learning phase",
    },
  ]

  return (
    <TooltipProvider>
      <Card className="p-1 md:p-1.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-border/60">
          {cells.map((cell) => (
            <StatCell key={cell.label} {...cell} />
          ))}
        </div>
      </Card>
    </TooltipProvider>
  )
}

"use client"

import { BookOpen, GraduationCap, Info, LayoutList } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { getFoundationLevelColor, getFoundationLevelBG, statCardVariants } from "../shared-styles"
import { Card } from "@/components/ui/card"
import { calculateChapterProgress, calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor,
  bgColor,
  valueColor,
  tooltipText,
  description,
}: {
  label: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  iconColor?: string
  bgColor?: string
  valueColor?: string
  tooltipText: string
  description?: string
}) {
  return (
    <Card className={cn("group relative flex cursor-default flex-col overflow-hidden border p-2.5 transition-all hover:shadow-md md:p-3")}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground md:text-xs">{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="bg-transparent border-none p-0 outline-none flex items-center">
              <Icon className={cn("h-4 w-4 cursor-pointer opacity-70 transition-transform group-hover:scale-110", iconColor)} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-lg font-bold leading-tight md:text-xl", valueColor)}>{value}</span>
        {subValue && <span className="text-[10px] text-muted-foreground md:text-xs">{subValue}</span>}
      </div>
      {description ? (
        <p className="mt-0.5 truncate text-[10px] leading-4 text-muted-foreground md:text-xs">
          {description}
        </p>
      ) : null}
    </Card>
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
    return learningStats.totalTopics > 0 && learningStats.completedTopics === learningStats.totalTopics
  }).length
  const marksEvidence = progress.expectedMarksEvidence
  const totalTestRecords =
    marksEvidence.validChapterRecords + marksEvidence.validSubjectRecords
  const coverageLabel =
    marksEvidence.coverageStatus === "none"
      ? "No test data"
      : `${marksEvidence.coverageStatus[0].toUpperCase()}${marksEvidence.coverageStatus.slice(1)} coverage`
  const averageMarksTooltip =
    marksEvidence.percentage === null
      ? "No average yet. Add a chapter or full-subject Test Record. Untested chapters are never treated as zero."
      : `Average of ${totalTestRecords} valid Test Record${totalTestRecords === 1 ? "" : "s"}. ${marksEvidence.testedChapters} of ${marksEvidence.activeChapters} chapters have evidence. Full-subject tests contribute 60% and chapter tests contribute 40% when both scopes exist.`
  const averageMarksDescription =
    marksEvidence.percentage === null
      ? "No test data"
      : `${coverageLabel} • ${marksEvidence.testedChapters}/${marksEvidence.activeChapters} chapters`

  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
      {/* Average Marks */}
      <StatCard
        label="Average Marks"
        value={marksEvidence.percentage === null ? "—" : `${marksEvidence.percentage}%`}
        icon={Info}
        tooltipText={averageMarksTooltip}
        description={averageMarksDescription}
        {...statCardVariants.averageMarks}
      />

      {/* Foundation Level */}
      <StatCard
        label="Foundation Level"
        value={foundationLevel}
        icon={GraduationCap}
        iconColor="text-brand-amber-ink"
        bgColor={getFoundationLevelBG(foundationLevel)}
        valueColor={getFoundationLevelColor(foundationLevel)}
        tooltipText="Based on your overall progress with emphasis on learning phase"
      />

      {/* Topics Completed */}
      <StatCard
        label="Topics Completed"
        value={`${completedTopics}/${totalTopics}`}
        icon={BookOpen}
        tooltipText="Number of topics completed in learning phase"
        {...statCardVariants.topicsCompleted}
      />

      {/* Chapters Completed */}
      <StatCard
        label="Chapters Completed"
        value={`${completedChapters}/${totalChapters}`}
        icon={LayoutList}
        tooltipText="Chapters where all topics are completed in learning phase"
        {...statCardVariants.chaptersCompleted}
      />
    </div>
  )
}

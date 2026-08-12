"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"
import { progressVariants } from "../shared-styles"

function CategoryProgress({
  title,
  data,
  variant,
}: {
  title: string
  data: {
    value: number
    completed: number
    total: number
    notRequired?: boolean
  }
  variant: keyof typeof progressVariants
}) {
  const theme = progressVariants[variant]
  const progressColor = cn(
    "h-1.5 rounded-full shadow-sm transition-all duration-500 md:h-2",
    data.value < 30 && theme.low,
    data.value >= 30 && data.value < 70 && theme.medium,
    data.value >= 70 && theme.high
  )

  return (
    <div className="space-y-1.5 rounded-lg p-1 md:p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground md:text-sm">
          {title}
        </span>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "px-1.5 py-0 text-[10px] font-medium transition-colors md:px-2 md:py-0.5 md:text-xs",
              theme.badge
            )}
          >
            {data.notRequired
              ? "Not required"
              : `${data.completed}/${data.total}`}
          </Badge>
        </div>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted md:h-2">
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-px bg-muted-foreground/20"
            style={{ left: `${milestone}%` }}
          />
        ))}
        <div
          role="progressbar"
          aria-label={`${title} progress`}
          aria-valuenow={data.value}
          aria-valuemin={0}
          aria-valuemax={100}
          className={progressColor}
          style={{
            width: `${data.value}%`,
            transform: `translateX(${data.value === 0 ? "-100%" : "0"})`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] md:text-xs">
        <span
          className={cn(
            "font-medium transition-colors",
            data.value >= 70 && theme.text
          )}
        >
          {data.notRequired
            ? "Excluded by settings"
            : `${data.value}% complete`}
        </span>
        {!data.notRequired && data.value < 100 && (
          <span className="hidden text-muted-foreground md:block">
            {100 - data.value}% to go
          </span>
        )}
      </div>
    </div>
  )
}

export function ProgressOverview({
  subject,
}: {
  subject: SubjectWithRelations
}) {
  const progress = calculateSubjectProgress(subject)
  const overall = Math.round(progress.overall)

  const progressData = {
    categories: {
      learning: {
        value: Math.round(progress.learning),
        completed: progress.stats.learning.completedTopics,
        total: progress.stats.learning.totalTopics,
      },
      revision: {
        value: Math.round(progress.revision),
        completed: progress.stats.revision.completedTopics,
        total: progress.stats.revision.totalTopics,
      },
      practice: {
        value: Math.round(progress.practice),
        completed: progress.stats.practice.completedTopics,
        total: progress.stats.practice.totalTopics,
      },
      test: {
        value: Math.round(progress.test),
        completed: progress.testEvidence.completedRecords,
        total: progress.testEvidence.targetRecords,
        notRequired: progress.testEvidence.targetRecords === 0,
      },
    },
  }

  return (
    <Card className="border border-muted p-3 md:p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground md:text-base">
              Overall Progress
            </h2>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-xs font-medium text-foreground md:text-sm">
                {overall}%
              </span>
            </div>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted md:h-2">
            {[25, 50, 75].map((milestone) => (
              <div
                key={milestone}
                className="absolute top-0 bottom-0 w-px bg-muted-foreground/20"
                style={{ left: `${milestone}%` }}
              />
            ))}
            <div
              role="progressbar"
              aria-label="Overall progress"
              aria-valuenow={overall}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 rounded-full bg-foreground shadow-sm transition-all duration-500 md:h-2 dark:bg-white"
              style={{
                width: `${overall}%`,
                transform: `translateX(${overall === 0 ? "-100%" : "0"})`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CategoryProgress
            title="Learning"
            data={progressData.categories.learning}
            variant="learning"
          />
          <CategoryProgress
            title="Revision"
            data={progressData.categories.revision}
            variant="revision"
          />
          <CategoryProgress
            title="Practice"
            data={progressData.categories.practice}
            variant="practice"
          />
          <CategoryProgress
            title="Test"
            data={progressData.categories.test}
            variant="test"
          />
        </div>
      </div>
    </Card>
  )
}

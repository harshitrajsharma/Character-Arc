"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, BarChart3, Layers3, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import { cn } from "@/lib/utils"
import type { SubjectActivity } from "@/types/progressapp/analytics"
import type { ActivityConfig } from "../types"
import type { ActivityType } from "../activity-config"
import { CustomScrollbar } from "./CustomScrollbar"
import { ActivitySubjectCard } from "./activity-subject-card"

interface ActivityInsightsProps {
  subjects: SubjectActivity[]
  activityConfig: Record<string, ActivityConfig>
  focusRecommendation?: Pick<SubjectActivity, "id" | "name">
  getPredominantActivityType: (subject: SubjectActivity) => ActivityType
}

type ActivityTotals = Record<ActivityType | "total", number>

const ACTIVITY_TYPES: ActivityType[] = [
  "learning",
  "revision",
  "practice",
  "test",
]

const PROGRESS_FIELD_BY_ACTIVITY: Record<
  ActivityType,
  "learningProgress" | "revisionProgress" | "practiceProgress" | "testProgress"
> = {
  learning: "learningProgress",
  revision: "revisionProgress",
  practice: "practiceProgress",
  test: "testProgress",
}

const clampProgress = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value || 0)))

export function ActivityInsights({
  subjects,
  activityConfig,
  focusRecommendation,
  getPredominantActivityType,
}: ActivityInsightsProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActivityType | null>(
    null
  )

  const categoryTotals = useMemo(() => {
    const totals: ActivityTotals = {
      learning: 0,
      revision: 0,
      practice: 0,
      test: 0,
      total: 0,
    }

    for (const subject of subjects) {
      for (const category of ACTIVITY_TYPES) {
        totals[category] += subject.activity[category] || 0
      }
      totals.total += subject.activity.total || 0
    }

    return totals
  }, [subjects])

  const activeSubjects = useMemo(() => {
    const activityKey = selectedCategory ?? "total"
    const progressKey = selectedCategory
      ? PROGRESS_FIELD_BY_ACTIVITY[selectedCategory]
      : null

    return [...subjects]
      .filter((subject) => (subject.activity[activityKey] || 0) > 0)
      .sort(
        (left, right) =>
          (right.activity[activityKey] || 0) - (left.activity[activityKey] || 0)
      )
      .map((subject) => ({
        ...subject,
        overallProgress: clampProgress(
          progressKey
            ? subject[progressKey]
            : getProgressSummary(subject).overall
        ),
      }))
  }, [selectedCategory, subjects])

  const selectedConfig = selectedCategory
    ? activityConfig[selectedCategory]
    : null
  const title = selectedConfig
    ? `${selectedConfig.label} Activity`
    : "Subject Activity"
  const description = selectedConfig
    ? `Subjects ranked by ${selectedConfig.label.toLowerCase()} activity`
    : "Subjects ranked by total activity in this period"

  return (
    <Card className="flex min-h-[30rem] flex-col border-border/70 bg-card shadow-sm">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <BarChart3 aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold text-pretty">
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-pretty">
              {description}
            </CardDescription>
          </div>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter subjects by activity type"
        >
          <Button
            type="button"
            variant={selectedCategory === null ? "secondary" : "outline"}
            size="sm"
            className="shrink-0 rounded-md"
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            aria-label={`All activity, ${categoryTotals.total} activities`}
          >
            <Layers3 data-icon="inline-start" aria-hidden="true" />
            All
            <span className="text-muted-foreground tabular-nums">
              {categoryTotals.total}
            </span>
          </Button>

          {ACTIVITY_TYPES.map((category) => {
            const config = activityConfig[category]
            const isSelected = selectedCategory === category

            return (
              <Button
                key={category}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "shrink-0 rounded-md",
                  isSelected && config.bgColorFaded,
                  isSelected && config.color,
                  isSelected && "border-current shadow-none"
                )}
                aria-pressed={isSelected}
                aria-label={`${config.label}, ${categoryTotals[category]} activities`}
              >
                <span aria-hidden="true">{config.icon}</span>
                {config.label}
                <span className="tabular-nums opacity-70">
                  {categoryTotals[category]}
                </span>
              </Button>
            )
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {activeSubjects.length} subjects for{" "}
          {selectedConfig?.label ?? "all activity"}.
        </p>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 border-t p-0">
        <CustomScrollbar maxHeight={460} className="overscroll-contain">
          {activeSubjects.length > 0 ? (
            <ol className="flex flex-col gap-3 p-4 sm:p-5">
              {activeSubjects.map((subject, index) => (
                <li key={subject.id}>
                  <ActivitySubjectCard
                    subject={subject}
                    index={index}
                    activityConfig={activityConfig}
                    predominantActivityType={
                      selectedCategory || getPredominantActivityType(subject)
                    }
                    isFilterSelected={selectedCategory !== null}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-64 items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <p className="font-medium">No matching subject activity</p>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  No subjects have{" "}
                  {selectedConfig?.label.toLowerCase() ?? "study"} activity in
                  this period.
                </p>
              </div>
            </div>
          )}
        </CustomScrollbar>
      </CardContent>

      {!selectedCategory && focusRecommendation ? (
        <CardFooter className="border-t bg-muted/20 p-4 sm:px-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm ring-1 ring-border">
                <Target aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Needs attention</p>
                <p className="truncate text-sm text-muted-foreground">
                  {focusRecommendation.name} has the lowest activity among
                  incomplete subjects.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0">
              <Link href={`/subjects/${focusRecommendation.id}`}>
                Open Subject
                <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}

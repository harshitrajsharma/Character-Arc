"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { isToday, isSameWeek, isSameMonth } from "date-fns"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAnalytics } from "@/components/tools/exam-prep/contexts/analytics-context"
import { layoutVariants } from "@/lib/tools/exam-prep/design-system"
import { cn } from "@/lib/utils"

// Import the common components
import { ActivityHeader } from "./common/ActivityHeader"
import { ActivitySummary } from "./common/ActivitySummary"
import { ActivityInsights } from "./common/ActivityInsights"
import { LoadingErrorEmpty } from "./common/LoadingErrorEmpty"
import {
  ActivityConfig,
  getPredominantActivityType,
  fetchSubjectProgress,
} from "./common/activity-utils"
import {
  buildSubjectInsights,
  formatSubjectDateRange,
  getAnalyticsDateKey,
  getSubjectProgressQueryKey,
  type SubjectProgressRange,
} from "@/lib/tools/exam-prep/analytics/subject-progress"

export function StudyProgressAnalytics() {
  const { selectedDate } = useAnalytics()

  const [timeRange, setTimeRange] = useState<SubjectProgressRange>(() => {
    // Set default time range based on selected date
    if (isToday(selectedDate)) return "day"
    if (isSameWeek(selectedDate, new Date())) return "week"
    if (isSameMonth(selectedDate, new Date())) return "month"
    return "day"
  })

  // Fetch subject progress data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: getSubjectProgressQueryKey(timeRange, selectedDate),
    queryFn: () =>
      fetchSubjectProgress(timeRange, getAnalyticsDateKey(selectedDate)),
    staleTime: 60000, // 1 minute
  })

  // Format date range for display
  const dateRangeText = useMemo(
    () => formatSubjectDateRange(data?.dateRange, timeRange),
    [data?.dateRange, timeRange]
  )

  // Calculate insights and recommendations
  const insights = useMemo(() => {
    if (!data?.subjects || data.totalStats.total === 0) return null
    return buildSubjectInsights(data.subjects)
  }, [data])

  // Check if there is data to display
  const isEmpty = !data?.totalStats.total

  return (
    <TooltipProvider>
      <section
        className={cn(
          layoutVariants({ variant: "section" }),
          "flex h-full flex-col gap-4"
        )}
        aria-busy={isLoading}
      >
        {/* Header with Time Range Tabs */}
        <ActivityHeader
          title="Subject Progress"
          subtitle="Analyzing your activity for"
          timeRange={timeRange}
          isLoading={isLoading}
          onTimeRangeChange={setTimeRange}
          dateRangeText={dateRangeText}
          tooltipContent="Track your progress and activity across subjects"
        />

        {/* Loading, Error, or Empty State */}
        <div className="flex flex-1 flex-col" aria-live="polite">
          <LoadingErrorEmpty
            isLoading={isLoading}
            isError={isError}
            isEmpty={isEmpty}
            error={error}
            dateRangeText={dateRangeText}
            onViewAllData={() => setTimeRange("all")}
          />

          {/* Show content when there is data */}
          {!isLoading && !isError && !isEmpty && (
            <div className="flex-1">
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
                <div className="order-2 min-w-0 lg:order-1">
                  <ActivityInsights
                    subjects={data!.subjects}
                    activityConfig={ActivityConfig}
                    focusRecommendation={insights?.focusRecommendation}
                    getPredominantActivityType={getPredominantActivityType}
                  />
                </div>

                <div className="order-1 min-w-0 lg:order-2">
                  <ActivitySummary
                    totalStats={data!.totalStats}
                    activityConfig={ActivityConfig}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  )
}

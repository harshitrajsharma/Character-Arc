"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, isAfter, isToday, startOfDay } from "date-fns"
import { useAnalytics } from "@/components/tools/exam-prep/contexts/analytics-context"
import { ActivityFilters } from "./ActivityFilters"
import { ActivityList } from "./ActivityList"

export function ActivityDetailsDaywise() {
  const {
    selectedDate,
    activityData,
    isLoading,
    selectedFilter,
    setSelectedFilter,
    filteredDetails,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  } = useAnalytics()

  const isFutureNavigationDisabled =
    isLoading || !isAfter(startOfDay(new Date()), startOfDay(selectedDate))

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header with Date Navigation */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-8">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousDay}
            className="h-9 w-9 rounded-full border border-border"
            disabled={isLoading}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 text-center">
            <h3 className="truncate text-xl font-semibold tracking-tight">
              {isToday(selectedDate)
                ? "Today"
                : format(selectedDate, "MMMM d, yyyy")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE")}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            className="h-9 w-9 rounded-full border border-border"
            disabled={isFutureNavigationDisabled}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Activity Filters */}
        <ActivityFilters
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          activityCounts={
            activityData
              ? {
                  learning: activityData.learning || 0,
                  revision: activityData.revision || 0,
                  practice: activityData.practice || 0,
                  test: activityData.test || 0,
                }
              : {}
          }
          isLoading={isLoading}
        />
      </div>

      {/* Activity List - takes remaining height */}
      <div className="min-h-0 flex-1">
        <ActivityList
          selectedDate={selectedDate}
          filteredDetails={filteredDetails}
          selectedFilter={selectedFilter}
          isLoading={isLoading}
          onResetTimeline={goToToday}
        />
      </div>
    </div>
  )
}

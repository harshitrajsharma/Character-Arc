"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ExamCountdown } from "@/components/tools/exam-prep/dashboard/exam-countdown"
import {
  useAnalytics,
  TAB_KEYS,
} from "@/components/tools/exam-prep/contexts/analytics-context"
import { AnalyticsTabs } from "./AnalyticsTabs"
import { useQuery } from "@tanstack/react-query"
import { fetchSubjectProgress } from "./common/activity-utils"
import {
  getAnalyticsDateKey,
  getSubjectProgressQueryKey,
} from "@/lib/tools/exam-prep/analytics/subject-progress"

export function CalendarView() {
  const { selectedDate, setSelectedDate, examDate, activeTab } = useAnalytics()

  const isMobile = useMediaQuery("(max-width: 768px)")

  // If no exam date is set, use a default date 90 days from now. The fallback
  // is computed once so rendering stays deterministic across re-renders.
  const [defaultFallbackDate] = useState(
    () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  )
  const effectiveExamDate = examDate || defaultFallbackDate

  // Fetch subject progress data when Subject Progress tab is active
  useQuery({
    queryKey: getSubjectProgressQueryKey("week", selectedDate),
    queryFn: () =>
      fetchSubjectProgress("week", getAnalyticsDateKey(selectedDate)),
    staleTime: 60000, // 1 minute
    enabled: activeTab === TAB_KEYS.PROGRESS,
  })

  return (
    <div className="flex h-full min-h-[600px] flex-col">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        Study Timeline
      </h2>
      <div className="flex flex-1 flex-col gap-6 md:grid md:grid-cols-[0.6fr,1.4fr]">
        {/* Left side - Calendar */}
        <div
          className={cn("space-y-4", isMobile ? "block" : "hidden md:block")}
        >
          <Card className="border border-border bg-card">
            <ExamCountdown
              variant="dashboard"
              onSelectDate={(date) => date && setSelectedDate(date)}
              selectedDate={selectedDate}
              examDate={effectiveExamDate}
            />
          </Card>
        </div>

        {/* Right side - Tabs Component */}
        <div className="flex flex-1 flex-col">
          <AnalyticsTabs />
        </div>
      </div>
    </div>
  )
}

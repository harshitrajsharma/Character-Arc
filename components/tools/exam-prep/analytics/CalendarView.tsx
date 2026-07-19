'use client';

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExamCountdown } from "@/components/tools/exam-prep/dashboard/exam-countdown";
import { useAnalytics, TAB_KEYS } from "@/components/tools/exam-prep/contexts/analytics-context";
import { AnalyticsTabs } from "./AnalyticsTabs";
import { useQuery } from "@tanstack/react-query";
import { fetchSubjectProgress } from "./common/activity-utils";
import {
  getAnalyticsDateKey,
  getSubjectProgressQueryKey,
} from "@/lib/tools/exam-prep/analytics/subject-progress";

export function CalendarView() {
  const {
    selectedDate,
    setSelectedDate,
    examDate,
    activeTab
  } = useAnalytics();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // If no exam date is set, use a default date 90 days from now
  const effectiveExamDate = examDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Fetch subject progress data when Subject Progress tab is active
  useQuery({
    queryKey: getSubjectProgressQueryKey('week', selectedDate),
    queryFn: () => fetchSubjectProgress('week', getAnalyticsDateKey(selectedDate)),
    staleTime: 60000, // 1 minute
    enabled: activeTab === TAB_KEYS.PROGRESS
  });

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">Study Timeline</h2>
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[0.6fr,1.4fr] gap-6">
        {/* Left side - Calendar */}
        <div className={cn(
          "space-y-4",
          isMobile ? "block" : "hidden md:block"
        )}>

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
        <div className="flex-1 flex flex-col">
          <AnalyticsTabs />
        </div>
      </div>
    </div>
  );
} 

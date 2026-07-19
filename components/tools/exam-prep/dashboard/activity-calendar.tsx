import { useCallback, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { InfoIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthActivities } from "@/lib/tools/exam-prep/actions/analytics";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
interface ActivityDetails {
  learning: number;
  revision: number;
  practice: number;
  test: number;
}

interface ActivityData {
  date: Date;
  studyTime: number;
  totalCount?: number;
  details: ActivityDetails;
}

interface MonthActivity {
  date: string;
  totalCount: number;
  learning: number;
  revision: number;
  practice: number;
  test: number;
}

interface ActivityCalendarProps {
  variant?: "sidebar" | "dashboard";
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  examDate: Date | null;
}

const ACTIVITY_QUERY_KEY = "activities";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEGEND_LEVELS = [
  { color: "bg-emerald-200 dark:bg-emerald-900/30", label: "Light" },
  { color: "bg-emerald-400 dark:bg-emerald-700", label: "Med" },
  { color: "bg-emerald-600 dark:bg-emerald-500", label: "High" },
];

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center"
      aria-live="assertive"
    >
      <h2 className="text-red-600 dark:text-red-400 font-bold mb-2">
        Calendar Loading Error
      </h2>
      <p className="text-sm text-red-500 dark:text-red-300 mb-4">
        Unable to load activity calendar. {error instanceof Error ? error.message : String(error)}
      </p>
      <Button
        onClick={resetErrorBoundary}
        variant="destructive"
        aria-label="Retry loading calendar"
      >
        Try Again
      </Button>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }, (_, index) => (
          <div
            key={index}
            className="aspect-square bg-gray-100 dark:bg-gray-800 rounded"
          />
        ))}
      </div>
    </div>
  );
}

function getActivityLevel(totalCount?: number): number {
  if (!totalCount) return 0;
  if (totalCount >= 10) return 3;
  if (totalCount >= 5) return 2;
  return 1;
}

function getActivityColor(level: number): string {
  switch (level) {
    case 1:
      return "bg-green-200 dark:bg-green-900/30";
    case 2:
      return "bg-green-400 dark:bg-green-700";
    case 3:
      return "bg-green-600 dark:bg-green-500";
    default:
      return "";
  }
}

async function fetchMonthActivities(monthStart: Date, monthEnd: Date): Promise<ActivityData[]> {
  const data = await getMonthActivities(monthStart.toISOString(), monthEnd.toISOString());
  return data.map((activity: MonthActivity) => ({
    date: new Date(activity.date),
    studyTime: activity.totalCount * 60,
    totalCount: activity.totalCount,
    details: {
      learning: activity.learning,
      revision: activity.revision,
      practice: activity.practice,
      test: activity.test,
    },
  }));
}

function buildMonthDays(monthStart: Date) {
  const calendarStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

export function ActivityCalendar({
  variant = "dashboard",
  onSelectDate,
  selectedDate,
  examDate,
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const isSidebar = variant === "sidebar";

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ActivityData[]>({
    queryKey: [ACTIVITY_QUERY_KEY, monthStart.toISOString()],
    queryFn: () => fetchMonthActivities(monthStart, monthEnd),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const days = useMemo(() => buildMonthDays(monthStart), [monthStart]);
  const activityByDate = useMemo(() => {
    return new Map(
      activities.map((activity) => [format(activity.date, "yyyy-MM-dd"), activity])
    );
  }, [activities]);

  const nextMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, 1)), []);
  const prevMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, -1)), []);

  const handleDateClick = useCallback((date: Date) => {
    if (onSelectDate && (!examDate || !isAfter(date, examDate))) {
      onSelectDate(date);
    }
  }, [onSelectDate, examDate]);

  const getActivityTooltip = useCallback((date: Date) => {
    const activity = activityByDate.get(format(date, "yyyy-MM-dd"));

    if (!activity?.totalCount) {
      return <span>No activities</span>;
    }

    return (
      <div className="text-xs">
        <p className="font-medium">Total Activities: {activity.totalCount}</p>
        <ul className="list-disc pl-4">
          <li>Learning: {activity.details.learning}</li>
          <li>Revision: {activity.details.revision}</li>
          <li>Practice: {activity.details.practice}</li>
          <li>Test: {activity.details.test}</li>
        </ul>
      </div>
    );
  }, [activityByDate]);

  const renderCalendarGrid = () => {
    if (isLoading) return <CalendarSkeleton />;
    if (error) throw error;

    return (
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Activity Calendar for ${format(currentMonth, "MMMM yyyy")}`}
      >
        {days.map((day) => {
          const activity = activityByDate.get(format(day, "yyyy-MM-dd"));
          const activityLevel = getActivityLevel(activity?.totalCount);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isExamDay = examDate && isSameDay(day, examDate);
          const isFutureDay = examDate && isAfter(day, examDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <Tooltip key={day.toString()}>
              <TooltipTrigger
                  onClick={() => handleDateClick(day)}
                  disabled={Boolean(isFutureDay)}
                  aria-label={`${format(day, "MMMM d, yyyy")} activities`}
                  aria-pressed={selectedDate ? isSameDay(day, selectedDate) : false}
                  aria-disabled={isFutureDay || undefined}
                  className={cn(
                    "aspect-square min-h-[32px] flex items-center justify-center relative transition-colors duration-100 overflow-hidden rounded-md",
                    isSidebar ? "text-[10px]" : "text-[10px] sm:text-sm",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isExamDay && "bg-red-500/20 text-red-600 dark:text-red-400",
                    !isExamDay && !isFutureDay && getActivityColor(activityLevel),
                    isToday(day) && "border-2 border-green-500",
                    isFutureDay && "text-muted-foreground/30 cursor-not-allowed",
                    isSelected && !isExamDay && "bg-primary/20 border-2 border-primary",
                    !isFutureDay && "hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "z-10 relative",
                      isExamDay && "font-bold",
                      activityLevel > 1 && !isFutureDay && "text-white dark:text-green-50"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isExamDay && (
                    <span className="absolute inset-0 animate-ping bg-red-500/20 rounded-md" />
                  )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {getActivityTooltip(day)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        refetch();
      }}
    >
      <div className="space-y-3 select-none" aria-live="polite">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon
              className={cn(
                "text-green-500",
                isSidebar ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
              )}
            />
            <h2
              className={cn(
                "font-semibold text-foreground",
                isSidebar ? "text-xs" : "text-xs sm:text-sm md:text-base"
              )}
            >
              {format(currentMonth, isSidebar ? "MMM yyyy" : "MMMM yyyy")}
            </h2>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-green-900/5 transition-colors",
                isSidebar ? "h-5 w-5" : "h-8 w-8 sm:h-7 sm:w-7"
              )}
              onClick={prevMonth}
              aria-label="Previous Month"
            >
              <ChevronLeft className={isSidebar ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-green-900/5 transition-colors",
                isSidebar ? "h-5 w-5" : "h-8 w-8 sm:h-7 sm:w-7"
              )}
              onClick={nextMonth}
              aria-label="Next Month"
            >
              <ChevronRight className={isSidebar ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"} />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-7 gap-1 mb-1 text-muted-foreground",
            isSidebar ? "text-[10px]" : "text-[10px] sm:text-xs"
          )}
        >
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center font-medium opacity-70">
              {isSidebar ? (
                day[0]
              ) : (
                <>
                  <span className="hidden md:inline">{day}</span>
                  <span className="hidden sm:inline md:hidden">{day.slice(0, 2)}</span>
                  <span className="sm:hidden">{day[0]}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {renderCalendarGrid()}

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-y-1 text-muted-foreground border-t",
            isSidebar ? "mt-2 pt-2 text-[10px]" : "mt-3 pt-3 sm:mt-4 sm:pt-3 text-[10px] sm:text-xs"
          )}
        >
          <div className={cn("flex items-center", isSidebar ? "gap-2" : "gap-2 sm:gap-3")}>
            {LEGEND_LEVELS.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className={cn(
                    color,
                    "rounded-md",
                    isSidebar ? "w-1.5 h-1.5" : "w-1.5 h-1.5 sm:w-2 sm:h-2"
                  )}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <div
              className={cn(
                "bg-red-500/20 rounded-md",
                isSidebar ? "w-1.5 h-1.5" : "w-1.5 h-1.5 sm:w-2 sm:h-2"
              )}
            />
            <span className="text-red-600 dark:text-red-400 font-medium">
              {isSidebar ? "Exam" : "Exam Day"}
            </span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export const EnhancedActivityCalendar = ActivityCalendar;

export const getCalendarUtils = () => ({
  isDateDisabled: (date: Date, examDate?: Date | null) => {
    return examDate ? isAfter(date, examDate) : false;
  },
  calculateActivityIntensity: getActivityLevel,
});

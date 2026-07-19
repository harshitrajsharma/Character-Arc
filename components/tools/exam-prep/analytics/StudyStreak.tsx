import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ActivityConfig, fetchSubjectProgress } from "./common/activity-utils";
import {
  getAnalyticsDateKey,
  getSubjectProgressQueryKey,
} from "@/lib/tools/exam-prep/analytics/subject-progress";

interface StudyStreakProps {
  currentStreak: number;
  maxStreak: number;
  className?: string;
}

export function StudyStreak({ currentStreak, maxStreak, className }: StudyStreakProps) {
  const todayKey = getAnalyticsDateKey(new Date());

  // Fetch today's activity to determine the flame color
  const { data: todayActivity } = useQuery({
    queryKey: getSubjectProgressQueryKey('day', todayKey),
    queryFn: () => fetchSubjectProgress('day', todayKey),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Determine predominant activity type for today
  const getActivityColor = () => {
    if (!todayActivity?.totalStats || todayActivity.totalStats.total === 0) {
      return "text-orange-500 fill-orange-500";
    }

    const stats = todayActivity.totalStats;
    const types = ['learning', 'revision', 'practice', 'test'] as const;

    let maxType = 'learning';
    let maxCount = -1;

    types.forEach(type => {
      if (stats[type] > maxCount) {
        maxCount = stats[type];
        maxType = type;
      }
    });

    // If no activity (maxCount is still 0 or -1), return default
    if (maxCount <= 0) return "text-orange-500 fill-orange-500";

    // Return the color from ActivityConfig, but we need to extract the tailwind class
    // ActivityConfig[maxType].color is like "text-blue-500"
    // We also want to fill it, so we replace "text-" with "fill-"
    const colorClass = ActivityConfig[maxType].color;
    const fillClass = colorClass.replace('text-', 'fill-');

    return `${colorClass} ${fillClass}`;
  };

  const flameColorClass = getActivityColor();

  return (
    <div className={cn("flex gap-2 justify-between", className)}>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Current Streak</span>
        <div className="flex items-center gap-2">
          <Flame className={cn("h-5 w-5 transition-colors duration-500", flameColorClass)} />
          <span className="text-xl font-bold tabular-nums">{currentStreak}</span>
        </div>
      </div>

      <div className="h-8 w-px bg-border/60" />

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Max Streak</span>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
          <span className="text-xl font-bold tabular-nums">{maxStreak}</span>
        </div>
      </div>
    </div>
  );
}

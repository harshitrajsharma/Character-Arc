import { Layers, Target, Clock, Sparkles } from 'lucide-react';

interface SubjectActivityMetrics {
  totalSubjects: number;
  totalActivities: number;
  avgProgress: number;
  completedCount: number;
  activeSubjects: number;
  completionRate: number;
  remainingSubjects: number;
  totalWeight: number;
}

interface SubjectActivityOverviewProps {
  metrics: SubjectActivityMetrics | null;
  formatProgressPercentage: (value: number) => string;
}

export function SubjectActivityOverview({
  metrics,
  formatProgressPercentage,
}: SubjectActivityOverviewProps) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-3 rounded-md border shadow-sm">
        <div className="text-xs text-muted-foreground flex items-center">
          <Layers className="h-3 w-3 mr-1" />
          Total Subjects
        </div>
        <div className="text-lg font-semibold">{metrics.totalSubjects}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {metrics.activeSubjects} active
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 p-3 rounded-md border shadow-sm">
        <div className="text-xs text-muted-foreground flex items-center">
          <Target className="h-3 w-3 mr-1" />
          Completion
        </div>
        <div className="text-lg font-semibold">{metrics.completedCount}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatProgressPercentage(metrics.completionRate)} of all
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-950/30 dark:to-amber-950/30 p-3 rounded-md border shadow-sm">
        <div className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Activities
        </div>
        <div className="text-lg font-semibold">{metrics.totalActivities}</div>
        <div className="text-xs text-muted-foreground mt-1">
          across all subjects
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-purple-50 dark:from-amber-950/30 dark:to-purple-950/30 p-3 rounded-md border shadow-sm">
        <div className="text-xs text-muted-foreground flex items-center">
          <Sparkles className="h-3 w-3 mr-1" />
          Average Progress
        </div>
        <div className="text-lg font-semibold">{formatProgressPercentage(metrics.avgProgress)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {metrics.totalWeight}% total weightage
        </div>
      </div>
    </div>
  );
}

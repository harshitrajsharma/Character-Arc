import { Layers, Target, Clock, Sparkles } from "lucide-react"

interface SubjectActivityMetrics {
  totalSubjects: number
  totalActivities: number
  avgProgress: number
  completedCount: number
  activeSubjects: number
  completionRate: number
  remainingSubjects: number
  totalWeight: number
}

interface SubjectActivityOverviewProps {
  metrics: SubjectActivityMetrics | null
  formatProgressPercentage: (value: number) => string
}

export function SubjectActivityOverview({
  metrics,
  formatProgressPercentage,
}: SubjectActivityOverviewProps) {
  if (!metrics) return null

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      <div className="rounded-md border bg-gradient-to-br from-purple-50 to-blue-50 p-3 shadow-sm dark:from-purple-950/30 dark:to-blue-950/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Layers className="mr-1 h-3 w-3" />
          Total Subjects
        </div>
        <div className="text-lg font-semibold">{metrics.totalSubjects}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {metrics.activeSubjects} active
        </div>
      </div>

      <div className="rounded-md border bg-gradient-to-br from-blue-50 to-green-50 p-3 shadow-sm dark:from-blue-950/30 dark:to-green-950/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Target className="mr-1 h-3 w-3" />
          Completion
        </div>
        <div className="text-lg font-semibold">{metrics.completedCount}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatProgressPercentage(metrics.completionRate)} of all
        </div>
      </div>

      <div className="rounded-md border bg-gradient-to-br from-green-50 to-amber-50 p-3 shadow-sm dark:from-green-950/30 dark:to-amber-950/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1 h-3 w-3" />
          Activities
        </div>
        <div className="text-lg font-semibold">{metrics.totalActivities}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          across all subjects
        </div>
      </div>

      <div className="rounded-md border bg-gradient-to-br from-amber-50 to-purple-50 p-3 shadow-sm dark:from-amber-950/30 dark:to-purple-950/30">
        <div className="flex items-center text-xs text-muted-foreground">
          <Sparkles className="mr-1 h-3 w-3" />
          Average Progress
        </div>
        <div className="text-lg font-semibold">
          {formatProgressPercentage(metrics.avgProgress)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {metrics.totalWeight}% total weightage
        </div>
      </div>
    </div>
  )
}

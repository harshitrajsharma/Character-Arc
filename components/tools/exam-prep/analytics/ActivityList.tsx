import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock } from "lucide-react"
import { format, isAfter, startOfDay } from "date-fns"
import { ActivityType, ACTIVITIES } from "./activity-config"
import { cn } from "@/lib/utils"
import { layoutVariants } from "@/lib/tools/exam-prep/design-system"
import { ActivityDetail } from "@/types/progressapp/analytics"
import { TVAWarning } from "./TVAWarning"

interface ActivityListProps {
  selectedDate: Date
  filteredDetails: Record<ActivityType, ActivityDetail[]> | null
  selectedFilter: ActivityType | null
  isLoading: boolean
  onResetTimeline: () => void
}

export function ActivityList({
  selectedDate,
  filteredDetails,
  selectedFilter,
  isLoading,
  onResetTimeline,
}: ActivityListProps) {
  const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()))
  const activityGroups = filteredDetails ? Object.entries(filteredDetails) : []
  const totalVisibleActivities = activityGroups.reduce(
    (total, [, activities]) => total + (activities?.length || 0),
    0
  )

  // Render activity item
  const renderActivityItem = (
    activity: ActivityDetail,
    type: ActivityType,
    index: number
  ) => {
    const {
      icon: Icon,
      color,
      lightBg,
      darkBg,
      lightBorder,
      darkBorder,
    } = ACTIVITIES[type]
    const key = `${type}-${activity.subject}-${activity.topic}-${activity.completedAt}-${index}`

    return (
      <div
        key={key}
        className={cn(
          "flex flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-sm sm:flex-row sm:items-center",
          lightBg,
          darkBg,
          lightBorder,
          darkBorder
        )}
      >
        <div className={cn("flex items-center gap-2", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-medium text-foreground">
            {activity.subject}
          </h4>
          <p className="text-sm text-muted-foreground">{activity.topic}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(new Date(activity.completedAt), "h:mm a")}
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full min-h-[360px] border-border/70 bg-card/60 shadow-sm">
      <ScrollArea className="h-full max-h-[500px]">
        <div className={cn(layoutVariants({ variant: "stack" }), "p-4")}>
          {isLoading ? (
            // Loading skeletons for activities
            <div className={layoutVariants({ variant: "stack" })}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-md border bg-muted/10 p-4 sm:flex-row sm:items-center"
                >
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : isFutureDate ? (
            <TVAWarning selectedDate={selectedDate} onReset={onResetTimeline} />
          ) : (
            <>
              {activityGroups.map(([type, activities]) => {
                if (!activities?.length) return null
                return (
                  <div key={type} className="space-y-4">
                    {activities.map((activity: ActivityDetail, index: number) =>
                      renderActivityItem(activity, type as ActivityType, index)
                    )}
                  </div>
                )
              })}
              {totalVisibleActivities === 0 && (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/10 px-4 py-12 text-center">
                  <div className="mb-4 rounded-md bg-muted p-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-base font-medium text-foreground">
                    No Activities Yet
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedFilter
                      ? `No ${ACTIVITIES[selectedFilter].label.toLowerCase()} activities recorded for this date`
                      : "No activities have been recorded for this date"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

"use client"

import { TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TotalStats } from "@/types/progressapp/analytics"
import type { ActivityType } from "../activity-config"
import type { ActivityConfig } from "../types"

interface ActivitySummaryProps {
  totalStats: TotalStats
  activityConfig: Record<string, ActivityConfig>
}

const ACTIVITY_TYPES: ActivityType[] = [
  "learning",
  "revision",
  "practice",
  "test",
]
const NUMBER_FORMATTER = new Intl.NumberFormat()

export function ActivitySummary({
  totalStats,
  activityConfig,
}: ActivitySummaryProps) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <TrendingUp aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold text-pretty">
                Activity Summary
              </CardTitle>
              <CardDescription className="mt-1 text-pretty">
                Distribution across study modes
              </CardDescription>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-3xl leading-none font-semibold tabular-nums">
              {NUMBER_FORMATTER.format(totalStats.total || 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total activities
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 border-t pt-5">
        {ACTIVITY_TYPES.map((activityType) => {
          const config = activityConfig[activityType]
          const count = totalStats[activityType] || 0
          const percentage =
            totalStats.total > 0
              ? Math.round((count / totalStats.total) * 100)
              : 0

          return (
            <div key={activityType} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md ${config.bgColorFaded} ${config.color}`}
                    aria-hidden="true"
                  >
                    {config.icon}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {config.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <span className="text-sm font-semibold">
                    {NUMBER_FORMATTER.format(count)}
                  </span>
                  <span className="w-9 text-right text-xs text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              </div>
              <Progress
                value={percentage}
                className="h-1.5 bg-muted"
                indicatorClassName={config.bgColor}
                aria-label={`${config.label}: ${percentage}% of activity`}
                aria-valuetext={`${count} activities, ${percentage}% of total`}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

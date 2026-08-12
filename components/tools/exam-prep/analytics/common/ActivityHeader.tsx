"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import type { SubjectProgressRange } from "@/lib/tools/exam-prep/analytics/subject-progress"

interface ActivityHeaderProps {
  title: string
  subtitle: string
  timeRange: SubjectProgressRange
  isLoading: boolean
  onTimeRangeChange: (range: SubjectProgressRange) => void
  dateRangeText: string
  tooltipContent?: string
}

export function ActivityHeader({
  title,
  subtitle,
  timeRange,
  isLoading,
  onTimeRangeChange,
  dateRangeText,
  tooltipContent,
}: ActivityHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h2 className="flex items-center text-xl font-semibold tracking-tight text-foreground">
          <span>{title}</span>
          {tooltipContent && (
            <Tooltip>
              <TooltipTrigger>
                <span>
                  <HelpCircle className="ml-2 h-4 w-4 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm">
                <p>{tooltipContent}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </h2>
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="inline-block h-4 w-56" />
          ) : (
            <>
              {subtitle}{" "}
              <span className="font-semibold text-foreground">
                {dateRangeText}
              </span>
            </>
          )}
        </div>
      </div>

      <Tabs
        value={timeRange}
        onValueChange={(value: string) =>
          onTimeRangeChange(value as SubjectProgressRange)
        }
        className="w-full md:w-auto"
      >
        <TabsList className="grid w-full grid-cols-4 rounded-md border bg-muted/30 p-1 shadow-none md:w-auto">
          <TabsTrigger
            value="day"
            className="rounded-sm px-3 text-xs data-[state=active]:shadow-sm sm:text-sm"
          >
            Day
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="rounded-sm px-3 text-xs data-[state=active]:shadow-sm sm:text-sm"
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className="rounded-sm px-3 text-xs data-[state=active]:shadow-sm sm:text-sm"
          >
            Month
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="rounded-sm px-3 text-xs data-[state=active]:shadow-sm sm:text-sm"
          >
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

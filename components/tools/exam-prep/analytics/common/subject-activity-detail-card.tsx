"use client"

import { SubjectActivity } from "@/types/progressapp/analytics"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useProgress } from "@/components/tools/exam-prep/contexts/progress-context"
import { cn } from "@/lib/utils"
import { ActivityConfig } from "../types"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Scale,
  TrendingUp,
} from "lucide-react"
import { formatDistance } from "date-fns"

interface SubjectActivityDetailCardProps {
  subject: SubjectActivity
  activityConfig: Record<string, ActivityConfig>
  predominantActivityType: string
  isExpanded: boolean
  onToggle: () => void
}

export function SubjectActivityDetailCard({
  subject,
  activityConfig,
  predominantActivityType,
  isExpanded,
  onToggle,
}: SubjectActivityDetailCardProps) {
  const { formatProgressPercentage, getActivityDays } = useProgress()
  const activityDays = getActivityDays(subject.activity)

  const progressClass = cn(
    subject.overallProgress >= 100
      ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10"
      : subject.overallProgress >= 75
        ? "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10"
        : subject.overallProgress >= 50
          ? "border-purple-200 bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/10"
          : subject.overallProgress > 0
            ? "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
            : "border-slate-200 bg-slate-50 dark:border-slate-800/50 dark:bg-slate-800/20"
  )

  const inactiveStyle = subject.activity.total === 0 ? "opacity-80" : ""

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-200 hover:shadow-md",
        progressClass,
        isExpanded ? "shadow-sm" : "",
        inactiveStyle
      )}
    >
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border-0 text-foreground",
              subject.activity.total > 0
                ? activityConfig[predominantActivityType].bgColorFaded
                : "bg-muted"
            )}
          >
            {subject.activity.total > 0 ? subject.activity.total : "0"}
          </Badge>
          <div>
            <h3 className="line-clamp-1 font-medium">{subject.name}</h3>
            <div className="mt-0.5 flex items-center text-xs text-muted-foreground">
              <span className="mr-3 whitespace-nowrap">
                {formatProgressPercentage(subject.overallProgress)} complete
              </span>
              {subject.activity.total > 0 && (
                <span className="whitespace-nowrap">
                  {formatProgressPercentage(subject.activityPercentage)} of
                  activity
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subject.weightage > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="border-0 bg-amber-100 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    <Scale className="mr-1 h-3 w-3" />
                    {subject.weightage}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Subject weightage: {subject.weightage}% of your overall study
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <button
            className="rounded-full p-1 hover:bg-muted"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500",
            subject.overallProgress >= 100
              ? "bg-green-500"
              : subject.overallProgress >= 75
                ? "bg-blue-500"
                : subject.overallProgress >= 50
                  ? "bg-purple-500"
                  : subject.overallProgress > 0
                    ? "bg-amber-500"
                    : "bg-slate-300 dark:bg-slate-700"
          )}
          style={{ width: `${subject.overallProgress}%` }}
        />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {["learning", "revision", "practice", "test"].map((category) => (
          <TooltipProvider key={category}>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex flex-col items-center">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={activityConfig[category].bgColor}
                      style={{
                        width: `${subject[`${category}Progress` as keyof SubjectActivity] as number}%`,
                        height: "100%",
                      }}
                    />
                  </div>
                  <span className="mt-1 flex items-center text-[10px] text-muted-foreground">
                    {activityConfig[category].icon}
                    <span className="ml-0.5">
                      {subject.activity[
                        category as keyof typeof subject.activity
                      ] || 0}
                    </span>
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-2 text-xs">
                {activityConfig[category].label}:{" "}
                {formatProgressPercentage(
                  subject[
                    `${category}Progress` as keyof SubjectActivity
                  ] as number
                )}
                <br />
                {subject.activity[category as keyof typeof subject.activity] ||
                  0}{" "}
                activities
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="flex items-center text-sm font-medium">
                  <TrendingUp className="mr-1 h-4 w-4 text-blue-500" />
                  Progress Breakdown
                </h4>

                <div className="space-y-2">
                  {["learning", "revision", "practice", "test"].map(
                    (category) => (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center">
                            {activityConfig[category].icon}
                            <span className="ml-1">
                              {activityConfig[category].label}
                            </span>
                          </span>
                          <span>
                            {formatProgressPercentage(
                              subject[
                                `${category}Progress` as keyof SubjectActivity
                              ] as number
                            )}
                          </span>
                        </div>
                        <Progress
                          value={
                            subject[
                              `${category}Progress` as keyof SubjectActivity
                            ] as number
                          }
                          className="h-1.5"
                          indicatorClassName={activityConfig[category].bgColor}
                        />
                      </div>
                    )
                  )}

                  <div className="mt-2 border-t pt-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Overall Progress</span>
                      <span>
                        {formatProgressPercentage(subject.overallProgress)}
                      </span>
                    </div>
                    <Progress
                      value={subject.overallProgress}
                      className="mt-1 h-2 bg-secondary/50"
                      indicatorClassName="bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center text-sm font-medium">
                  <BarChart3 className="mr-1 h-4 w-4 text-purple-500" />
                  Activity Details
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(activityConfig).map(([key, config]) => {
                      const activityKey = key as keyof typeof subject.activity
                      const count = subject.activity[activityKey] || 0

                      if (count === 0 && subject.activity.total > 0) return null

                      return (
                        <div key={key} className="flex items-center text-sm">
                          <span
                            className={`rounded-full p-1 ${config.bgColorFaded} ${config.color} mr-2`}
                          >
                            {config.icon}
                          </span>
                          <span>
                            <span className="font-medium">{count}</span>{" "}
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-1.5 h-3.5 w-3.5" />
                      Added{" "}
                      {formatDistance(new Date(subject.createdAt), new Date(), {
                        addSuffix: true,
                      })}
                    </div>

                    {subject.activity.total > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        {activityDays.max > 0 ? (
                          <>
                            Spent ~{activityDays.max} days on{" "}
                            {activityConfig[activityDays.maxType].label}
                          </>
                        ) : (
                          <>Recently active</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-1 mt-1 flex justify-end border-t pt-2 sm:col-span-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <a href={`/subjects/${subject.id}`}>
                    View Subject Details
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

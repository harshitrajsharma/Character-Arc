"use client"

import * as React from "react"
import { SparklesIcon, CalendarIcon, BuildingIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type DashboardHeroProps = {
  userName: string
  workspaceName: string
  workspaceKind: string
  timezone?: string | null
}

function getTimeOfDayGreeting(timezone?: string | null): {
  greeting: string
  timePhase: string
  phaseColor: string
} {
  const date = new Date()
  let hour = date.getHours()

  if (timezone) {
    try {
      const timeString = date.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour12: false,
        hour: "numeric",
      })
      hour = parseInt(timeString, 10)
    } catch {
      hour = date.getHours()
    }
  }

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good morning",
      timePhase: "Morning Momentum",
      phaseColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    }
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      timePhase: "Afternoon Focus",
      phaseColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    }
  }
  if (hour >= 17 && hour < 21) {
    return {
      greeting: "Good evening",
      timePhase: "Evening Reflection",
      phaseColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    }
  }
  return {
    greeting: "Good night",
    timePhase: "Quiet Hours",
    phaseColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  }
}

export function DashboardHero({
  userName,
  workspaceName,
  workspaceKind,
  timezone,
}: DashboardHeroProps) {
  const { greeting, timePhase, phaseColor } = React.useMemo(
    () => getTimeOfDayGreeting(timezone),
    [timezone]
  )

  const formattedDate = React.useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date())
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-b from-muted/30 via-background to-background p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              suppressHydrationWarning
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${phaseColor}`}
            >
              <SparklesIcon className="size-3.5" />
              {timePhase}
            </span>
            <span suppressHydrationWarning className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              {formattedDate}
            </span>
          </div>

          <h1 suppressHydrationWarning className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {greeting}, {userName}.
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base leading-relaxed">
            Here is your momentum across active goals, upcoming exams, and AI agent memory.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border-border/70"
          >
            <BuildingIcon className="size-3 text-muted-foreground" />
            <span className="font-semibold text-foreground">{workspaceName}</span>
            <span className="capitalize text-muted-foreground">({workspaceKind.toLowerCase()})</span>
          </Badge>
        </div>
      </div>
    </div>
  )
}

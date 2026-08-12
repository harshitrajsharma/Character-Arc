"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ExamCountdownDisplay } from "./exam-countdown-display"
import { surfaceVariants } from "@/lib/tools/exam-prep/design-system"

const ActivityCalendar = dynamic(
  () => import("./activity-calendar").then((mod) => mod.ActivityCalendar),
  { ssr: false }
)

const StudyStreak = dynamic(
  () =>
    import("@/components/tools/exam-prep/analytics/StudyStreak").then(
      (mod) => mod.StudyStreak
    ),
  { ssr: false }
)

interface ExamCountdownProps {
  variant?: "sidebar" | "dashboard"
  onSelectDate?: (date: Date) => void
  selectedDate?: Date
  examDate: Date | null
}

interface StudyStreakSummary {
  currentStreak: number
  longestStreak: number
}

export function ExamCountdown({
  variant = "dashboard",
  onSelectDate,
  selectedDate,
  examDate,
}: ExamCountdownProps) {
  const isSidebar = variant === "sidebar"

  if (isSidebar) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center rounded-lg bg-green-900/10">
          <ExamCountdownDisplay examDate={examDate} />
        </div>
      </div>
    )
  }

  return (
    <DashboardExamCountdown
      variant={variant}
      onSelectDate={onSelectDate}
      selectedDate={selectedDate}
      examDate={examDate}
    />
  )
}

function DashboardExamCountdown({
  variant,
  onSelectDate,
  selectedDate,
  examDate,
}: Required<Pick<ExamCountdownProps, "variant">> &
  Omit<ExamCountdownProps, "variant">) {
  const [streak, setStreak] = useState<StudyStreakSummary | null>(null)

  useEffect(() => {
    let isActive = true

    async function fetchStreak() {
      try {
        const response = await fetch("/api/study-streak")
        if (!response.ok) return

        const data = (await response.json()) as StudyStreakSummary
        if (isActive) {
          setStreak(data)
        }
      } catch {
        if (isActive) {
          setStreak(null)
        }
      }
    }

    fetchStreak()

    return () => {
      isActive = false
    }
  }, [])

  const content = (
    <div className={cn("space-y-3 px-4")}>
      {/* Exam Countdown Display */}
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-green-900/10 p-2"
        )}
      >
        <ExamCountdownDisplay examDate={examDate} />
      </div>

      {/* Activity Calendar */}
      <TooltipProvider>
        <ActivityCalendar
          variant={variant}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
          examDate={examDate}
        />
      </TooltipProvider>

      {/* Study Streak Stats */}
      <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
        <StudyStreak
          currentStreak={streak?.currentStreak || 0}
          maxStreak={streak?.longestStreak || 0}
        />
      </div>
    </div>
  )

  return (
    <Card
      className={cn(
        surfaceVariants({ variant: "default", padding: "none" }),
        "py-4 shadow-lg"
      )}
    >
      {content}
    </Card>
  )
}

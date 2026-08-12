import { useMemo, useState, useEffect, useSyncExternalStore } from "react"
import { intervalToDuration } from "date-fns"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Calendar, Timer, Target, Trophy, AlertTriangle } from "lucide-react"

type CountdownStage =
  "unset" | "distant" | "preparing" | "critical" | "imminent"

const subscribeToClient = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

interface ExamCountdownProps {
  examDate?: Date | null
  onConfigureExam?: () => void
}

export function ExamCountdownDisplay({
  examDate,
  onConfigureExam,
}: ExamCountdownProps) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  )

  // Tick the countdown only after the component has mounted on the client.
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const countdownContext = useMemo(() => {
    // No exam date configured
    if (!examDate || !isClient) {
      return {
        stage: "unset" as CountdownStage,
        icon: Calendar,
        color: "text-blue-500",
        primaryText: "Set Exam Date",
        secondaryText: "Start your preparation journey",
        urgency: 0,
      }
    }

    const { hours, minutes, seconds } = intervalToDuration({
      start: currentTime,
      end: examDate,
    })

    const totalDaysRemaining = Math.max(
      0,
      Math.floor(
        (examDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)
      )
    )

    // Stage Determination Logic
    const determineStage = (): CountdownStage => {
      // Check if it's exam day by comparing year, month, and day
      const isExamDay =
        examDate.getFullYear() === currentTime.getFullYear() &&
        examDate.getMonth() === currentTime.getMonth() &&
        examDate.getDate() === currentTime.getDate()

      if (isExamDay) return "imminent"
      if (totalDaysRemaining <= 3) return "critical"
      if (totalDaysRemaining <= 14) return "preparing"
      return "distant"
    }

    const stage = determineStage()

    // Formatter to ensure two-digit display
    const formatTime = (time?: number) =>
      time !== undefined ? time.toString().padStart(2, "0") : "00"

    // Contextual Rendering Strategy
    const stageConfigurations = {
      unset: {
        icon: Calendar,
        color: "text-blue-500",
        primaryText: "Set Exam Date",
        secondaryText: "Begin your preparation",
        urgency: 0,
      },
      distant: {
        icon: Target,
        color: "text-green-500",
        primaryText: `${totalDaysRemaining} Days`,
        secondaryText: "Consistent study plan 📚",
        urgency: 1,
      },
      preparing: {
        icon: Timer,
        color: "text-orange-500",
        primaryText: `${totalDaysRemaining} Days`,
        secondaryText: "Focused preparation time 🎯",
        urgency: 2,
      },
      critical: {
        icon: AlertTriangle,
        color: "text-red-500",
        primaryText: `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`,
        secondaryText: `${totalDaysRemaining} Days Remaining`,
        urgency: 3,
      },
      imminent: {
        icon: Trophy,
        color: "text-yellow-500",
        primaryText: "Exam Today",
        secondaryText: "All the best for the exam 🍀",
        urgency: 4,
      },
    }

    return {
      stage,
      ...stageConfigurations[stage],
    }
  }, [examDate, currentTime, isClient])

  const handleInteraction = () => {
    if (countdownContext.stage === "unset" && onConfigureExam) {
      onConfigureExam()
    }
  }

  // Prevent rendering on server
  if (!isClient) {
    return (
      <div className="w-full rounded-xl bg-white shadow-sm dark:bg-neutral-900">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-accent/10 p-1.5 md:p-2">
            <Calendar className="h-6 w-6 stroke-[1.5] text-blue-500 md:h-8 md:w-8" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-base font-bold tracking-tight text-blue-500 md:text-lg">
              Set Exam Date
            </h3>
            <p className="text-xs text-muted-foreground opacity-80 md:text-sm">
              Start your preparation journey
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        "w-full rounded-xl p-2.5 shadow-sm sm:p-3",
        "flex items-center space-x-2",
        "cursor-pointer select-none",
        "transition-all duration-300 ease-in-out",
        "hover:shadow-md active:scale-[0.98]",
        "bg-white dark:bg-neutral-900",
        countdownContext.color
      )}
      onClick={handleInteraction}
    >
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <h3
            className={cn(
              "w-full truncate text-center text-xl font-bold tracking-tight lg:text-2xl",
              countdownContext.color,
              countdownContext.stage === "critical" ? "tabular-nums" : ""
            )}
          >
            {countdownContext.primaryText}
          </h3>
        </div>
        <p className="truncate text-center text-xs text-muted-foreground opacity-80 md:text-sm">
          {countdownContext.secondaryText}
        </p>
      </div>
    </motion.div>
  )
}

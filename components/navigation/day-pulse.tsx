"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

type DayPulseProps = {
  className?: string
}

function dayPhase(progress: number) {
  if (progress < 25) {
    return {
      fill: "bg-brand-violet",
      message: "A quiet start still counts.",
    }
  }

  if (progress < 50) {
    return {
      fill: "bg-brand-cyan",
      message: "Build a little momentum.",
    }
  }

  if (progress < 75) {
    return {
      fill: "bg-brand-neon",
      message: "Keep your arc moving.",
    }
  }

  return {
    fill: "bg-brand-amber",
    message: "Close the loop, then rest.",
  }
}

export function DayPulse({ className }: DayPulseProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()

    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const elapsedSeconds = now
    ? now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    : 0
  const progress = (elapsedSeconds / 86400) * 100
  const roundedProgress = Math.round(progress)
  const phase = dayPhase(progress)

  return (
    <div
      role="progressbar"
      aria-label={`${roundedProgress}% of today has passed`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
      className={cn("hidden shrink-0 md:block md:w-40", className)}
    >
      <div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <motion.div
              className={cn("h-full rounded-full", phase.fill)}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
          <span className="w-8 text-right font-mono text-xs text-muted-foreground tabular-nums">
            {roundedProgress}%
          </span>
        </div>

        <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
          {now ? phase.message : "Your day is loading."}
        </p>
      </div>
    </div>
  )
}

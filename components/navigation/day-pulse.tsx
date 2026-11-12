"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { dayProgress, getDayPhase } from "./day-phase"

type DayPulseProps = {
  className?: string
}

export function DayPulse({ className }: DayPulseProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()

    // 60-second update interval aligns with minute-level progress change
    const interval = window.setInterval(update, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const progress = now ? dayProgress(now) : 0
  const roundedProgress = Math.round(progress)
  const phase = getDayPhase(progress)

  return (
    <div
      role="progressbar"
      aria-label={`${roundedProgress}% of today has passed`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
      className={cn("hidden shrink-0 md:block md:w-40", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="relative h-full overflow-hidden rounded-full transition-[width,background,box-shadow] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(
                90deg,
                ${phase.cssVar},
                ${phase.accentCssVar}
              )`,
              boxShadow: `
                0 0 10px
                color-mix(in oklch, ${phase.cssVar} 45%, transparent)
              `,
            }}
          >
            <div
              className="absolute inset-0 z-10 w-full animate-pulse"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              }}
            />
          </div>
        </div>

        <span className="w-8 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {roundedProgress}%
        </span>
      </div>

      <div className="mt-1 h-4">
        <p className="truncate text-[11px] leading-4 text-muted-foreground transition-opacity duration-200">
          {isHovered
            ? "Current Day progress"
            : now
              ? phase.message
              : "Your day is loading."}
        </p>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

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

    const interval = window.setInterval(update, 1000)

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
          <motion.div
            className="relative h-full overflow-hidden rounded-full transition-[background,box-shadow] duration-1000 ease-out"
            style={{
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
            initial={false}
            animate={{
              width: `${progress}%`,
            }}
            transition={{
              width: {
                duration: 0.25,
                ease: "easeOut",
              },
            }}
          >
            <motion.div
              className="absolute inset-0 z-10 w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              }}
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1.5,
              }}
            />
          </motion.div>
        </div>

        <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {roundedProgress}%
        </span>
      </div>

      <div className="mt-1 h-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={isHovered ? "hover" : (now ? phase.key : "loading")}
            className="truncate text-[11px] leading-4 text-muted-foreground"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
            }}
          >
            {isHovered ? "Current Day progress" : now ? phase.message : "Your day is loading."}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type NavClockProps = {
  className?: string
}

function formatClock(date: Date, is24Hour: boolean) {
  const hour = is24Hour ? date.getHours() : date.getHours() % 12 || 12

  return [hour, date.getMinutes(), date.getSeconds()]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")
}

export function NavClock({ className }: NavClockProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [is24Hour, setIs24Hour] = useState(true)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()

    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const time = now ? formatClock(now, is24Hour) : "--:--:--"
  const period = now ? (now.getHours() >= 12 ? "PM" : "AM") : "--"
  const nextFormat = is24Hour ? "12-hour" : "24-hour"

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={() => setIs24Hour((current) => !current)}
        aria-label={`Switch clock to ${nextFormat} format`}
        className={cn(
          "flex min-h-11 items-center rounded-md px-1 font-mono text-sm text-muted-foreground tabular-nums transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-brand-neon-line sm:min-h-9",
          className
        )}
      >
        <time dateTime={now?.toISOString()}>
          {time}
          <span className="ml-1.5">{period}</span>
        </time>
      </TooltipTrigger>
      <TooltipContent side="bottom">switch to {nextFormat} time</TooltipContent>
    </Tooltip>
  )
}

"use client"

import Link from "next/link"
import { ClockIcon, PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActiveAttemptBannerProps } from "./types"

function formatDate(iso: string | null) {
  if (!iso) return "In progress"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function ActiveAttemptBanner({ activeAttempt }: ActiveAttemptBannerProps) {
  if (!activeAttempt) return null

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <ClockIcon className="size-4.5 animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Active Test Session In Progress
            </span>
          </div>
          <h3 className="text-sm font-bold text-foreground font-heading">
            {activeAttempt.assessmentTitle}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            Started {formatDate(activeAttempt.startedAt)} • Timer is actively running in the test room.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        className="h-9 rounded-full px-4 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs gap-1.5 shrink-0 shadow-xs"
        render={<Link href={`/assessments/${encodeURIComponent(activeAttempt.id)}`} />}
      >
        <PlayIcon className="size-3.5 fill-current" />
        Resume Test Room
      </Button>
    </div>
  )
}

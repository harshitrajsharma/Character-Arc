"use client"

import { CalendarDaysIcon, MapPinIcon, TargetIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import type { ArcTheme } from "@/components/tools/create-arc/arc-themes"
import { markdownToPlainText } from "@/lib/wiki/markdown"
import { cn } from "@/lib/utils"

type ArcCoverPreviewProps = {
  theme: ArcTheme
  title: string
  objective: string
  currentReality: string
  targetDate: string
}

export function ArcCoverPreview({
  theme,
  title,
  objective,
  currentReality,
  targetDate,
}: ArcCoverPreviewProps) {
  const reduceMotion = useReducedMotion()
  const objectivePreview = markdownToPlainText(objective)
  const currentRealityPreview = markdownToPlainText(currentReality)

  return (
    <article
      aria-label="Arc cover preview"
      className={cn(
        "relative flex aspect-[5/4] min-h-0 flex-col overflow-hidden rounded-lg border p-5 shadow-sm transition-colors duration-300 lg:aspect-[4/5] lg:p-6",
        theme.coverClass
      )}
    >
      <motion.div
        key={theme.key}
        initial={reduceMotion ? false : { opacity: 0, scaleX: 0.65 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
        className={cn(
          "absolute inset-x-0 top-0 h-1 origin-left",
          theme.lineClass
        )}
      />

      <header className="flex items-center justify-between gap-4 text-xs font-medium">
        <span>Ch. Arc</span>
        <span className="opacity-60">New chapter</span>
      </header>

      <div className="my-auto py-6">
        <div
          className={cn(
            "mb-5 flex size-10 items-center justify-center rounded-md",
            theme.accentClass
          )}
        >
          <TargetIcon aria-hidden="true" />
        </div>
        <p className="text-xs font-medium opacity-60">My next arc</p>
        <h2
          className={cn(
            "mt-2 line-clamp-4 font-heading text-2xl leading-tight font-semibold break-words lg:text-3xl",
            title.length === 0 && "opacity-35"
          )}
        >
          {title || "A direction worth following"}
        </h2>
        <p
          className={cn(
            "mt-3 line-clamp-3 text-sm leading-5 opacity-65",
            objectivePreview.length === 0 && "opacity-35"
          )}
        >
          {objectivePreview || "What I am moving toward"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className={cn("h-px w-full opacity-60", theme.lineClass)} />
        <div className="flex items-start gap-2 text-xs leading-5">
          <MapPinIcon
            className="mt-0.5 size-3.5 shrink-0 opacity-60"
            aria-hidden="true"
          />
          <p
            className={cn(
              "line-clamp-2 break-words",
              currentRealityPreview.length === 0 && "opacity-45"
            )}
          >
            {currentRealityPreview || "Starting from where I honestly am"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <CalendarDaysIcon
            className="size-3.5 opacity-60"
            aria-hidden="true"
          />
          <span className="opacity-60">Target</span>
          <span className="ml-auto font-medium">
            {targetDate || "Open-ended"}
          </span>
        </div>
      </div>
    </article>
  )
}

"use client"

import { CircleCheckIcon, MinusIcon, PlusIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { SyllabusStage } from "./syllabus-model"

type TopicProgressStepperProps = {
  className?: string
  stage: Exclude<SyllabusStage, "learning">
  count: number
  required: number
  pending: boolean
  onChange: (count: number) => void
}

export function TopicProgressStepper({
  className,
  stage,
  count,
  required,
  pending,
  onChange,
}: TopicProgressStepperProps) {
  const targetMet = count >= required
  const isOverachieving = count > required

  return (
    <div
      className={cn("flex shrink-0 items-center gap-1.5", className)}
      role="group"
      aria-label={`${stage} progress: ${count} completed, target ${required}`}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={pending || count <= 0}
        onClick={() => onChange(count - 1)}
        aria-label={`Decrease ${stage} progress`}
      >
        <MinusIcon />
      </Button>

      {isOverachieving ? (
        <Badge
          variant="outline"
          className="min-w-12 border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink"
          aria-label={`${count} total ${stage} completions`}
        >
          <SparklesIcon />
          {count}
        </Badge>
      ) : (
        <div className="flex min-w-20 flex-col items-center gap-1" aria-hidden="true">
          <div className="flex items-center gap-1">
            {Array.from({ length: required }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 w-3 rounded-full bg-muted transition-[background-color,transform] duration-200",
                  index < count && "scale-y-125 bg-brand-violet"
                )}
              />
            ))}
          </div>
          <span className={cn("flex items-center gap-1 text-xs tabular-nums text-muted-foreground", targetMet && "font-medium text-success-ink")}>
            {targetMet ? <CircleCheckIcon className="size-3" /> : null}
            {count}/{required}
          </span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn(targetMet && "border-success-line bg-success-soft text-success-ink hover:bg-success-soft")}
        disabled={pending || count >= 100}
        onClick={() => onChange(count + 1)}
        aria-label={`Increase ${stage} progress`}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

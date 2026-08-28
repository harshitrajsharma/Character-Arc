"use client"

import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Clock,
  FlaskConical,
  Lock,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  StudyPathStep,
  StudyPathStepStatus,
} from "@/lib/tools/exam-prep/study-path"
import {
  type NavigationTarget,
  getActionLabelForStep,
  getNavigationTargetForStep,
} from "./types"

export const statusConfig: Record<
  StudyPathStepStatus,
  {
    label: string
    icon: typeof CheckCircle2
    /** Full-color classes for actionable statuses; muted set applied when locked/done. */
    textClass: string
    badgeClass: string
  }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    textClass: "text-success-ink",
    badgeClass: "border-success-line bg-success-soft text-success-ink",
  },
  ready: {
    label: "Ready",
    icon: Sparkles,
    textClass: "text-brand-violet-ink",
    badgeClass: "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink",
  },
  due: {
    label: "Due now",
    icon: Clock,
    textClass: "text-destructive",
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    textClass: "text-muted-foreground",
    badgeClass: "border-border bg-muted text-muted-foreground",
  },
  overachieved: {
    label: "Overachieved",
    icon: Star,
    textClass: "text-brand-amber-ink",
    badgeClass: "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
  },
}

export const phaseConfig = {
  learn: {
    label: "Learn",
    icon: BookOpen,
    iconClass: "text-brand-violet-ink",
    dotClass: "bg-brand-violet-line",
    buttonClass:
      "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink hover:border-brand-violet hover:bg-brand-violet-surface-hover hover:text-brand-violet-ink! dark:hover:border-brand-violet dark:hover:bg-brand-violet-surface-hover! dark:hover:text-brand-violet-ink!",
  },
  revise: {
    label: "Revise",
    icon: RotateCcw,
    iconClass: "text-brand-violet-ink",
    dotClass: "bg-brand-violet-line",
    buttonClass:
      "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink hover:border-brand-violet hover:bg-brand-violet-surface-hover hover:text-brand-violet-ink! dark:hover:border-brand-violet dark:hover:bg-brand-violet-surface-hover! dark:hover:text-brand-violet-ink!",
  },
  practice: {
    label: "Practice",
    icon: FlaskConical,
    iconClass: "text-brand-amber-ink",
    dotClass: "bg-brand-amber",
    buttonClass:
      "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink hover:border-brand-amber hover:bg-brand-amber-surface-hover hover:text-brand-amber-ink! dark:hover:border-brand-amber dark:hover:bg-brand-amber-surface-hover! dark:hover:text-brand-amber-ink!",
  },
  test: {
    label: "Test",
    icon: CircleDot,
    iconClass: "text-brand-violet-ink",
    dotClass: "bg-brand-violet-line",
    buttonClass:
      "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink hover:border-brand-violet hover:bg-brand-violet-surface-hover hover:text-brand-violet-ink! dark:hover:border-brand-violet dark:hover:bg-brand-violet-surface-hover! dark:hover:text-brand-violet-ink!",
  },
}

export function getPhaseForKind(kind: StudyPathStep["kind"]) {
  if (kind === "learn") return "learn"
  if (kind === "revise") return "revise"
  if (kind === "practice") return "practice"
  return "test"
}

export interface UpNextCardProps {
  step: StudyPathStep
  onNavigate: (target: NavigationTarget) => void
}

export function UpNextCard({ step, onNavigate }: UpNextCardProps) {
  const statusInfo = statusConfig[step.status] || statusConfig.ready
  const StatusIcon = statusInfo.icon
  const phaseKey = getPhaseForKind(step.kind)
  const phaseInfo = phaseConfig[phaseKey]

  const actionLabel = getActionLabelForStep(step.kind)
  const isLocked = step.status === "locked"
  const isDone = step.status === "completed" || step.status === "overachieved"

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors",
        "hover:border-border/80",
        (isLocked || isDone) && "opacity-70"
      )}
      role="listitem"
    >
      <div className="space-y-2.5">
        {/* Header: phase + status */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase",
              isLocked || isDone ? "text-muted-foreground" : phaseInfo.iconClass
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                isLocked || isDone ? "bg-muted-foreground/60" : phaseInfo.dotClass
              )}
            />
            {phaseInfo.label}
          </span>

          <Badge
            variant="outline"
            className={cn(
              "gap-1 border px-2 py-0.5 text-[11px] font-medium",
              statusInfo.badgeClass
            )}
          >
            <StatusIcon className="size-3 shrink-0" aria-hidden="true" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "text-sm leading-snug font-semibold break-words",
            isLocked || isDone ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {step.title}
        </h3>

        {/* Reason caption */}
        {step.reason && !isDone ? (
          <p className="text-xs leading-relaxed break-words text-muted-foreground">
            {step.reason}
          </p>
        ) : null}

        {/* Evidence — separate quiet line */}
        {step.evidence && step.evidence !== "Not required" && !isDone ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <Star className="size-3 shrink-0" aria-hidden="true" />
            {step.evidence}
          </p>
        ) : null}
      </div>

      {/* Footer action strip */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-11 w-full shrink-0 gap-1.5 px-3 text-xs font-semibold sm:h-9",
            isLocked ? "border-border bg-muted text-muted-foreground hover:bg-muted" : phaseInfo.buttonClass,
            "focus-visible:ring-2 focus-visible:ring-offset-1"
          )}
          onClick={() => onNavigate(getNavigationTargetForStep(step))}
          aria-label={`${actionLabel}: ${step.title}`}
          disabled={isLocked || isDone}
        >
          <span>{isLocked ? "Locked" : isDone ? "Done" : actionLabel}</span>
        </Button>
      </div>
    </div>
  )
}

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
    badgeClass: string
  }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass: "border-success-line bg-success-soft text-success-ink",
  },
  ready: {
    label: "Ready",
    icon: Sparkles,
    badgeClass:
      "border-brand-violet-line/50 bg-brand-violet-soft text-brand-violet-ink",
  },
  due: {
    label: "Due now",
    icon: Clock,
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    badgeClass: "border-border bg-muted text-muted-foreground",
  },
  overachieved: {
    label: "Overachieved",
    icon: Sparkles,
    badgeClass:
      "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
  },
}

export const phaseConfig = {
  learn: {
    label: "Learn",
    icon: BookOpen,
    iconClass: "text-brand-cyan-ink",
    dotClass: "bg-brand-cyan",
    buttonClass:
      "border-brand-cyan-line/50 bg-brand-cyan-soft text-brand-cyan-ink hover:bg-brand-cyan-surface hover:border-brand-cyan-line hover:shadow-2xs active:scale-[0.98]",
  },
  revise: {
    label: "Revise",
    icon: RotateCcw,
    iconClass: "text-brand-neon-ink",
    dotClass: "bg-brand-neon",
    buttonClass:
      "border-brand-neon-line/50 bg-brand-neon-soft text-brand-neon-ink hover:bg-brand-neon-surface hover:border-brand-neon-line hover:shadow-2xs active:scale-[0.98]",
  },
  practice: {
    label: "Practice",
    icon: FlaskConical,
    iconClass: "text-brand-amber-ink",
    dotClass: "bg-brand-amber",
    buttonClass:
      "border-brand-amber-line/50 bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-surface hover:border-brand-amber-line hover:shadow-2xs active:scale-[0.98]",
  },
  test: {
    label: "Test",
    icon: CircleDot,
    iconClass: "text-brand-violet-ink",
    dotClass: "bg-brand-violet",
    buttonClass:
      "border-brand-violet-line/50 bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-surface hover:border-brand-violet-line hover:shadow-2xs active:scale-[0.98]",
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
        "flex flex-1 flex-col justify-between gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-2xs transition-all",
        "md:min-h-[148px]",
        "hover:border-border hover:shadow-xs",
        (isLocked || isDone) && "opacity-65"
      )}
      role="listitem"
    >
      <div className="space-y-1.5">
        {/* Top Header: Phase + Status Badge */}
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
                isLocked || isDone
                  ? "bg-muted-foreground/60"
                  : phaseInfo.dotClass
              )}
            />
            {phaseInfo.label}
          </span>

          <Badge
            variant="outline"
            className={cn(
              "gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              statusInfo.badgeClass
            )}
          >
            <StatusIcon className="size-2.5 shrink-0" aria-hidden="true" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Topic Title */}
        <h4
          className={cn(
            "line-clamp-2 text-sm leading-snug font-semibold",
            isLocked || isDone ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {step.title}
        </h4>

        {/* Reason / Subtitle */}
        {step.reason && !isDone && (
          <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
            {step.reason}
          </p>
        )}

        {/* Evidence Count */}
        {step.evidence && step.evidence !== "Not required" && !isDone && (
          <p className="text-[11px] font-medium text-muted-foreground/80">
            {step.evidence}
          </p>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-auto pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-full rounded-full text-xs font-semibold shadow-2xs transition-all",
            isLocked
              ? "cursor-not-allowed border-border bg-muted text-muted-foreground hover:bg-muted"
              : isDone
                ? "border-success-line bg-success-soft text-success-ink"
                : phaseInfo.buttonClass
          )}
          onClick={() => onNavigate(getNavigationTargetForStep(step))}
          aria-label={`${actionLabel}: ${step.title}`}
          disabled={isLocked || isDone}
        >
          <span>
            {isLocked ? "Locked" : isDone ? "Completed" : actionLabel}
          </span>
        </Button>
      </div>
    </div>
  )
}

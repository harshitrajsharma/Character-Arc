"use client"

import { CheckCircle2, Clock, Lock, Sparkles, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { StudyPathStep, StudyPathStepStatus } from "@/lib/tools/exam-prep/study-path"
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
    iconClass: string
  }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass: "bg-success-soft text-success-ink border-success-line",
    iconClass: "text-success-ink",
  },
  ready: {
    label: "Ready",
    icon: Sparkles,
    badgeClass: "bg-brand-violet-soft text-brand-violet-ink border-brand-violet-line",
    iconClass: "text-brand-violet-ink",
  },
  due: {
    label: "Due",
    icon: Clock,
    badgeClass: "bg-brand-amber-soft text-brand-amber-ink border-brand-amber-line",
    iconClass: "text-brand-amber-ink",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  },
  overachieved: {
    label: "Overachieved",
    icon: Star,
    badgeClass: "bg-brand-amber-soft text-brand-amber-ink border-brand-amber-line",
    iconClass: "text-brand-amber-ink",
  },
}

export interface UpNextCardProps {
  step: StudyPathStep
  onNavigate: (target: NavigationTarget) => void
}

export function UpNextCard({ step, onNavigate }: UpNextCardProps) {
  const statusInfo = statusConfig[step.status] || statusConfig.ready
  const StatusIcon = statusInfo.icon
  const actionLabel = getActionLabelForStep(step.kind)

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-colors",
        "hover:border-border/80 focus-within:ring-1 focus-within:ring-ring"
      )}
      role="listitem"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("px-2 py-0.5 text-[11px] font-medium gap-1 border", statusInfo.badgeClass)}
            >
              <StatusIcon className={cn("h-3 w-3 shrink-0", statusInfo.iconClass)} aria-hidden="true" />
              <span>{statusInfo.label}</span>
            </Badge>

            {step.isHighYield && (
              <Badge
                variant="outline"
                className="bg-brand-amber-soft text-brand-amber-ink border-brand-amber-line px-2 py-0.5 text-[11px] font-medium gap-1"
              >
                <Star className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />
                <span>High yield</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground break-words">
            {step.title}
          </h3>

          <p className="text-xs leading-relaxed text-muted-foreground break-words">
            {step.reason}
            {step.evidence && step.evidence !== "Not required" && (
              <span className="ml-1 font-medium text-foreground">
                • {step.evidence}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-11 sm:h-9 px-3 text-xs font-semibold shrink-0 gap-1.5",
            "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet hover:text-brand-violet-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
          onClick={() => onNavigate(getNavigationTargetForStep(step))}
          aria-label={`${actionLabel}: ${step.title}`}
        >
          <span>{actionLabel}</span>
        </Button>
      </div>
    </div>
  )
}

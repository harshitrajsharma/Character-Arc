"use client"

import {
  ArrowRightIcon,
  CheckIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  StudyPathOutput,
  StudyPathStep,
} from "@/lib/tools/exam-prep/study-path"
import { cn } from "@/lib/utils"
import {
  getActionLabelForStep,
  getNavigationTargetForStep,
  type NavigationTarget,
} from "./types"
import { getPhaseForKind, phaseConfig } from "./up-next-card"

type PhaseKey = keyof typeof phaseConfig

// One color set per stage, matching the app's phase color language.
// Hover lifts the tint (surface-hover) instead of flashing to a solid fill,
// so it stays calm in dark mode. The dark: overrides beat the Button
// outline variant's grey `dark:hover:bg-input/30`.
const phaseNode = {
  learn: {
    soft: "border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink",
    solid: "border-brand-cyan bg-brand-cyan text-brand-cyan-foreground",
    text: "text-brand-cyan-ink",
    hover:
      "hover:border-brand-cyan hover:bg-brand-cyan-surface-hover hover:text-brand-cyan-ink! dark:hover:border-brand-cyan dark:hover:bg-brand-cyan-surface-hover! dark:hover:text-brand-cyan-ink!",
  },
  revise: {
    soft: "border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink",
    solid: "border-brand-neon bg-brand-neon text-brand-neon-foreground",
    text: "text-brand-neon-ink",
    hover:
      "hover:border-brand-neon hover:bg-brand-neon-surface-hover hover:text-brand-neon-ink! dark:hover:border-brand-neon dark:hover:bg-brand-neon-surface-hover! dark:hover:text-brand-neon-ink!",
  },
  practice: {
    soft: "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
    solid: "border-brand-amber bg-brand-amber text-brand-amber-foreground",
    text: "text-brand-amber-ink",
    hover:
      "hover:border-brand-amber hover:bg-brand-amber-surface-hover hover:text-brand-amber-ink! dark:hover:border-brand-amber dark:hover:bg-brand-amber-surface-hover! dark:hover:text-brand-amber-ink!",
  },
  test: {
    soft: "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink",
    solid: "border-brand-violet bg-brand-violet text-brand-violet-foreground",
    text: "text-brand-violet-ink",
    hover:
      "hover:border-brand-violet hover:bg-brand-violet-surface-hover hover:text-brand-violet-ink! dark:hover:border-brand-violet dark:hover:bg-brand-violet-surface-hover! dark:hover:text-brand-violet-ink!",
  },
} satisfies Record<PhaseKey, {
  soft: string
  solid: string
  text: string
  hover: string
}>

const doneNodeClass =
  "border-success-line bg-success-soft text-success-ink"
const lockedNodeClass = "border-border bg-muted text-muted-foreground"

const completeChipClass =
  "border-success-line bg-success-soft text-success-ink"
const remainingChipClass =
  "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink"

export interface StudyPathTimelineProps {
  studyPath: StudyPathOutput
  onNavigate: (target: NavigationTarget) => void
  /** When false, completed steps are hidden from the journey. */
  showCompleted: boolean
}

function JourneyStepRow({
  step,
  onNavigate,
}: {
  step: StudyPathStep
  onNavigate: (target: NavigationTarget) => void
}) {
  const phaseKey = getPhaseForKind(step.kind)
  const phase = phaseConfig[phaseKey]
  const node = phaseNode[phaseKey]
  const PhaseIcon = phase.icon

  const isDone = step.status === "completed" || step.status === "overachieved"
  const isLocked = step.status === "locked"
  const isCurrent = step.status === "ready" || step.status === "due"
  const actionLabel = getActionLabelForStep(step.kind)

  let NodeIcon = PhaseIcon
  let nodeClass = node.soft
  if (isDone) {
    NodeIcon = CheckIcon
    nodeClass = doneNodeClass
  } else if (isLocked) {
    NodeIcon = LockIcon
    nodeClass = lockedNodeClass
  } else if (isCurrent) {
    nodeClass = cn("shadow-sm", node.solid)
  }

  return (
    <article
      className={cn(
        "relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-2.5 rounded-xl py-2 pr-1 pl-7 transition-colors",
        !isDone && !isLocked && "hover:bg-accent/40",
        (isDone || isLocked) && "opacity-60"
      )}
      role="listitem"
    >
      {/* Phase node — indentation marks the timeline, no rail */}
      <div className="flex justify-center pt-0.5">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full border",
            nodeClass
          )}
          aria-hidden="true"
        >
          <NodeIcon className="size-3" />
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0">
        <h4
          className={cn(
            "text-sm leading-snug font-medium break-words",
            isDone || isLocked ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {step.title}
        </h4>

        {isLocked && step.dependencyIds.length > 0 ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <LockIcon className="size-3 shrink-0" aria-hidden="true" />
            {step.dependencyIds.length} prerequisite
            {step.dependencyIds.length === 1 ? "" : "s"} required
          </p>
        ) : null}
      </div>

      {/* Compact action for the current step only; completion date for done steps */}
      {isCurrent ? (
        <div className="pt-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 shrink-0 gap-1 rounded-full px-3 text-xs font-semibold",
              node.soft,
              node.hover
            )}
            onClick={() => onNavigate(getNavigationTargetForStep(step))}
            aria-label={`${actionLabel}: ${step.title}`}
          >
            {actionLabel}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : isDone && step.completedAt ? (
        <div className="flex items-start justify-end pt-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-success-line bg-success-soft px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-success-ink">
            <CheckIcon className="size-3" aria-hidden="true" />
            {new Intl.DateTimeFormat(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(step.completedAt))}
          </span>
        </div>
      ) : null}
    </article>
  )
}

function ChapterMilestone({
  position,
  name,
  remaining,
}: {
  position: number
  name: string
  remaining: number
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rotate-45 rounded-[2px] border border-brand-violet-line bg-brand-violet-soft"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-violet-ink">
            Chapter {position + 1}
          </p>
          <h4 className="truncate text-sm font-semibold text-foreground">
            {name}
          </h4>
        </div>
      </div>
      {remaining > 0 ? (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            remainingChipClass
          )}
        >
          {remaining} left
        </span>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            completeChipClass
          )}
        >
          Complete
        </span>
      )}
    </div>
  )
}

function SubjectMilestoneHeader({
  remaining,
}: {
  remaining: number
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink"
        >
          <SparklesIcon className="size-2.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-violet-ink">
            Final stretch
          </p>
          <h4 className="truncate text-sm font-semibold text-foreground">
            Subject milestones
          </h4>
        </div>
      </div>
      {remaining > 0 ? (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            remainingChipClass
          )}
        >
          {remaining} left
        </span>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            completeChipClass
          )}
        >
          Complete
        </span>
      )}
    </div>
  )
}

function EmptyState({
  completed,
}: {
  completed: boolean
}) {
  if (!completed) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No steps available.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-success-line bg-success-soft text-success-ink">
        <CheckIcon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">Path complete</p>
        <p className="mx-auto mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
          Every step is done. Toggle “Show completed” in the header to review
          the full journey.
        </p>
      </div>
    </div>
  )
}

export function StudyPathTimeline({
  studyPath,
  onNavigate,
  showCompleted,
}: StudyPathTimelineProps) {
  const isVisible = (step: StudyPathStep) => step.evidence !== "Not required"
  const isDone = (step: StudyPathStep) =>
    step.status === "completed" || step.status === "overachieved"
  // Hide completed steps unless the header toggle is on.
  const shouldShow = (step: StudyPathStep) =>
    isVisible(step) && (showCompleted || !isDone(step))

  const chapters = studyPath.chapters
    .map((chapter) => {
      const steps = chapter.steps.filter(shouldShow)
      const remaining = chapter.steps
        .filter(isVisible)
        .filter((step) => !isDone(step)).length
      return { ...chapter, steps, remaining }
    })
    .filter((chapter) => chapter.steps.length > 0)

  const subjectSteps = studyPath.subjectSteps.filter(shouldShow)
  const remainingSubject = studyPath.subjectSteps
    .filter(isVisible)
    .filter((step) => !isDone(step)).length

  if (chapters.length === 0 && subjectSteps.length === 0) {
    // No visible steps at all → "No steps available".
    // Visible steps but every one completed (and hidden) → "Path complete".
    const hasAnyVisible = studyPath.allSteps.some(isVisible)
    return <EmptyState completed={hasAnyVisible} />
  }

  return (
    <div>
      {chapters.map((chapter, chapterIndex) => (
        <section
          key={chapter.id}
          aria-labelledby={`study-path-chapter-${chapter.id}`}
          className={cn(chapterIndex > 0 && "mt-6 border-t border-border/60 pt-5")}
        >
          <ChapterMilestone
            position={chapter.position}
            name={chapter.name}
            remaining={chapter.remaining}
          />
          <div className="mt-1" role="list">
            {chapter.steps.map((step) => (
              <JourneyStepRow
                key={step.id}
                step={step}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ))}

      {subjectSteps.length > 0 ? (
        <section
          aria-labelledby="study-path-subject-milestones"
          className={cn(chapters.length > 0 && "mt-6 border-t border-border/60 pt-5")}
        >
          <SubjectMilestoneHeader remaining={remainingSubject} />
          <div className="mt-1" role="list">
            {subjectSteps.map((step) => (
              <JourneyStepRow
                key={step.id}
                step={step}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

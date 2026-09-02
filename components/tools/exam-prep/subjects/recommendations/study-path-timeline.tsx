"use client"

import { ArrowRightIcon, CheckIcon, LockIcon, SparklesIcon } from "lucide-react"

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

const phaseNode = {
  learn: {
    soft: "border-brand-cyan-line/50 bg-brand-cyan-soft text-brand-cyan-ink",
    solid: "border-brand-cyan bg-brand-cyan text-brand-cyan-foreground",
    text: "text-brand-cyan-ink",
    hover:
      "hover:bg-brand-cyan-surface hover:border-brand-cyan-line hover:text-brand-cyan-ink hover:shadow-2xs active:scale-[0.98]",
  },
  revise: {
    soft: "border-brand-neon-line/50 bg-brand-neon-soft text-brand-neon-ink",
    solid: "border-brand-neon bg-brand-neon text-brand-neon-foreground",
    text: "text-brand-neon-ink",
    hover:
      "hover:bg-brand-neon-surface hover:border-brand-neon-line hover:text-brand-neon-ink hover:shadow-2xs active:scale-[0.98]",
  },
  practice: {
    soft: "border-brand-amber-line/50 bg-brand-amber-soft text-brand-amber-ink",
    solid: "border-brand-amber bg-brand-amber text-brand-amber-foreground",
    text: "text-brand-amber-ink",
    hover:
      "hover:bg-brand-amber-surface hover:border-brand-amber-line hover:text-brand-amber-ink hover:shadow-2xs active:scale-[0.98]",
  },
  test: {
    soft: "border-brand-violet-line/50 bg-brand-violet-soft text-brand-violet-ink",
    solid: "border-brand-violet bg-brand-violet text-brand-violet-foreground",
    text: "text-brand-violet-ink",
    hover:
      "hover:bg-brand-violet-surface hover:border-brand-violet-line hover:text-brand-violet-ink hover:shadow-2xs active:scale-[0.98]",
  },
} satisfies Record<
  PhaseKey,
  {
    soft: string
    solid: string
    text: string
    hover: string
  }
>

const doneNodeClass = "border-success-line bg-success-soft text-success-ink"
const lockedNodeClass = "border-border/60 bg-muted/80 text-muted-foreground"

export interface StudyPathTimelineProps {
  studyPath: StudyPathOutput
  onNavigate: (target: NavigationTarget) => void
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
    nodeClass = cn("shadow-xs ring-2 ring-primary/20", node.solid)
  }

  return (
    <article
      className={cn(
        "group/step relative flex items-center justify-between gap-3 rounded-2xl p-2.5 transition-all sm:px-3 sm:py-2",
        isCurrent && "bg-muted/40 ring-1 ring-border/50",
        !isDone && !isLocked && !isCurrent && "hover:bg-muted/25",
        (isDone || isLocked) && "opacity-60"
      )}
      role="listitem"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Node Icon on continuous rail */}
        <span
          className={cn(
            "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border shadow-2xs transition-transform group-hover/step:scale-105",
            nodeClass
          )}
          aria-hidden="true"
        >
          <NodeIcon className="size-3.5" />
        </span>

        {/* Step Title & Details */}
        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "truncate text-xs leading-snug font-medium sm:text-sm",
              isDone || isLocked ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {step.title}
          </h4>

          {isLocked && step.dependencyIds.length > 0 ? (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <LockIcon className="size-2.5 shrink-0" aria-hidden="true" />
              <span>{step.dependencyIds.length} prerequisite required</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Action button on right */}
      {isCurrent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 shrink-0 gap-1 rounded-full px-3 text-xs font-semibold shadow-2xs transition-all",
            node.soft,
            node.hover
          )}
          onClick={() => onNavigate(getNavigationTargetForStep(step))}
          aria-label={`${actionLabel}: ${step.title}`}
        >
          <span>{actionLabel}</span>
          <ArrowRightIcon
            className="size-3 transition-transform group-hover/step:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
      ) : isDone && step.completedAt ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success-line bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success-ink">
          <CheckIcon className="size-2.5" aria-hidden="true" />
          <span>Done</span>
        </span>
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
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rotate-45 rounded-[2px] border border-brand-violet-line bg-brand-violet-soft"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wider text-brand-violet-ink uppercase">
            Chapter {position + 1}
          </p>
          <h4 className="truncate text-sm font-semibold text-foreground">
            {name}
          </h4>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
          remaining > 0
            ? "border-border bg-muted/60 text-muted-foreground"
            : "border-success-line bg-success-soft text-success-ink"
        )}
      >
        {remaining > 0 ? `${remaining} left` : "Complete"}
      </span>
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
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No active steps waiting. Toggle &quot;Show completed&quot; to view past
        progress.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {chapters.map((chapter, chapterIndex) => (
        <section
          key={chapter.id}
          aria-labelledby={`study-path-chapter-${chapter.id}`}
          className={cn(chapterIndex > 0 && "border-t border-border/60 pt-5")}
        >
          <ChapterMilestone
            position={chapter.position}
            name={chapter.name}
            remaining={chapter.remaining}
          />
          {/* Vertical timeline connector rail */}
          <div
            className="relative mt-2 space-y-1 before:absolute before:top-2 before:bottom-2 before:left-[1.375rem] before:w-[1.5px] before:bg-border/60"
            role="list"
          >
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

      {subjectSteps.length > 0 && (
        <section
          className={cn(
            chapters.length > 0 && "border-t border-border/60 pt-5"
          )}
        >
          <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink"
              >
                <SparklesIcon className="size-2.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wider text-brand-violet-ink uppercase">
                  Final Stretch
                </p>
                <h4 className="truncate text-sm font-semibold text-foreground">
                  Subject Milestones
                </h4>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                remainingSubject > 0
                  ? "border-border bg-muted/60 text-muted-foreground"
                  : "border-success-line bg-success-soft text-success-ink"
              )}
            >
              {remainingSubject > 0 ? `${remainingSubject} left` : "Complete"}
            </span>
          </div>

          <div
            className="relative mt-2 space-y-1 before:absolute before:top-2 before:bottom-2 before:left-[1.375rem] before:w-[1.5px] before:bg-border/60"
            role="list"
          >
            {subjectSteps.map((step) => (
              <JourneyStepRow
                key={step.id}
                step={step}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

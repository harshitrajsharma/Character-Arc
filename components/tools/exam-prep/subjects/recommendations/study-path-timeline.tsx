"use client"

import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarCheck2Icon,
  CheckCircle2Icon,
  CircleDotIcon,
  FlaskConicalIcon,
  LockIcon,
  RotateCcwIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StudyPathOutput, StudyPathStep } from "@/lib/tools/exam-prep/study-path"
import { cn } from "@/lib/utils"
import {
  getActionLabelForStep,
  getNavigationTargetForStep,
  isPendingStudyPathStep,
  type NavigationTarget,
} from "./types"
import { statusConfig } from "./up-next-card"

const stepKindConfig = {
  learn: { label: "Learn", icon: BookOpenIcon },
  revise: { label: "Revise", icon: RotateCcwIcon },
  practice: { label: "Practice", icon: FlaskConicalIcon },
  "chapter-test": { label: "Chapter test", icon: CircleDotIcon },
  "subject-test": { label: "Subject test", icon: CircleDotIcon },
  remediation: { label: "Review", icon: RotateCcwIcon },
} satisfies Record<StudyPathStep["kind"], { label: string; icon: typeof BookOpenIcon }>

export interface StudyPathTimelineProps {
  studyPath: StudyPathOutput
  onNavigate: (target: NavigationTarget) => void
  showCompleted?: boolean
}

function TimelineStepRow({
  step,
  onNavigate,
}: {
  step: StudyPathStep
  onNavigate: (target: NavigationTarget) => void
}) {
  const statusInfo = statusConfig[step.status] || statusConfig.ready
  const StatusIcon = statusInfo.icon
  const kindInfo = stepKindConfig[step.kind]
  const KindIcon = kindInfo.icon
  const actionLabel = getActionLabelForStep(step.kind)
  const isActionable = step.status === "ready" || step.status === "due"
  const isLocked = step.status === "locked"
  const isFinished = step.status === "completed" || step.status === "overachieved"

  const lockedExplanation = isLocked
    ? step.dependencyIds.length > 0
      ? `${step.dependencyIds.length} prerequisite${step.dependencyIds.length === 1 ? "" : "s"} required`
      : step.reason
    : null

  const completionLabel = isFinished
    ? step.completedAt
      ? `Completed ${new Intl.DateTimeFormat(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(step.completedAt))}`
      : "Completion date unavailable"
    : null

  return (
    <article
      className={cn(
        "group relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-4",
        isLocked && "opacity-70"
      )}
      role="listitem"
    >
      <div className="relative z-10 flex justify-center pt-0.5" aria-hidden="true">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full border bg-background transition-colors",
            step.status === "ready" && "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink",
            step.status === "due" && "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
            isFinished && "border-success-line bg-success-soft text-success-ink",
            isLocked && "border-border bg-muted text-muted-foreground"
          )}
        >
          {isFinished ? <CheckCircle2Icon className="size-4" /> : <KindIcon className="size-4" />}
        </span>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {kindInfo.label}
          </span>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", statusInfo.iconClass)}>
            <StatusIcon className="size-3" aria-hidden="true" />
            {statusInfo.label}
          </span>
          {step.isHighYield ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-amber-ink">
              <StarIcon className="size-3 fill-current" aria-hidden="true" />
              High yield
            </span>
          ) : null}
        </div>

        <h5 className="break-words text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
          {step.title}
        </h5>
        <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
          {step.reason}
        </p>
        {step.evidence && step.evidence !== "Not required" ? (
          <p className="mt-1.5 text-xs font-medium text-foreground">{step.evidence}</p>
        ) : null}
        {lockedExplanation ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {lockedExplanation}
          </p>
        ) : null}
        {completionLabel ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-ink">
            <CalendarCheck2Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {completionLabel}
          </p>
        ) : null}
      </div>

      {isActionable ? (
        <div className="col-start-2 mt-3 shrink-0 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:self-center">
          <Button
            variant={step.status === "ready" ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-11 w-full shrink-0 gap-1.5 px-4 text-xs font-semibold sm:h-9 sm:w-auto",
              step.status === "ready"
                ? "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet hover:text-brand-violet-foreground"
                : "border-brand-amber-line text-brand-amber-ink hover:bg-brand-amber-soft",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            )}
            onClick={() => onNavigate(getNavigationTargetForStep(step))}
            aria-label={`${actionLabel}: ${step.title}`}
          >
            {actionLabel}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </article>
  )
}

export function StudyPathTimeline({
  studyPath,
  onNavigate,
  showCompleted = false,
}: StudyPathTimelineProps) {
  const isVisible = (step: StudyPathStep) =>
    step.evidence !== "Not required" && (showCompleted || isPendingStudyPathStep(step))
  const visibleChapters = studyPath.chapters
    .map((chapter) => ({
      ...chapter,
      steps: chapter.steps.filter(isVisible),
      remainingSteps: chapter.steps.filter(isPendingStudyPathStep).length,
    }))
    .filter((chapter) => chapter.steps.length > 0)
  const visibleSubjectSteps = studyPath.subjectSteps.filter(isVisible)

  return (
    <div className="space-y-8">
      {visibleChapters.map((chapter) => (
        <section key={chapter.id} aria-labelledby={`study-path-chapter-${chapter.id}`}>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-violet-ink">
                Chapter {chapter.position}
              </p>
              <h4 id={`study-path-chapter-${chapter.id}`} className="break-words text-base font-semibold text-foreground">
                {chapter.name}
              </h4>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {chapter.remainingSteps > 0 ? `${chapter.remainingSteps} remaining` : "Complete"}
            </span>
          </div>

          <div role="list" className="relative divide-y divide-border/50 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border sm:before:left-5">
            {chapter.steps.map((step) => (
              <TimelineStepRow key={step.id} step={step} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ))}

      {visibleSubjectSteps.length > 0 ? (
        <section aria-labelledby="study-path-subject-milestones">
          <div className="mb-1 border-b border-border/60 pb-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-violet-ink">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              Final stretch
            </p>
            <h4 id="study-path-subject-milestones" className="text-base font-semibold text-foreground">
              Subject milestones
            </h4>
          </div>

          <div role="list" className="relative divide-y divide-border/50 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border sm:before:left-5">
            {visibleSubjectSteps.map((step) => (
              <TimelineStepRow key={step.id} step={step} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

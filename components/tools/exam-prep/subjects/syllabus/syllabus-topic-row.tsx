"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { StarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { getRequiredRevisions, getRequiredPractices, getRequiredTests } from "@/lib/tools/exam-prep/progress/rules"
import { cn } from "@/lib/utils"
import type { BaseTopic } from "@/types/progressapp/domain"
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

import { SyllabusDragHandle } from "./syllabus-drag-handle"
import { highYieldBadgeClass } from "../shared-styles"
import { SyllabusItemActions } from "./syllabus-item-actions"
import { getTopicStageCount, type SyllabusItemUpdate, type SyllabusStage } from "./syllabus-model"
import { TopicProgressStepper } from "./topic-progress-stepper"
import type { NavigationTarget } from "../recommendations"

type SyllabusTopicRowProps = {
  topic: BaseTopic
  progressPolicy?: SubjectProgressPolicy
  stage: SyllabusStage
  pending: boolean
  navigationTarget?: NavigationTarget | null
  onNavigationComplete?: () => void
  onProgress: (topic: BaseTopic, value: boolean | number) => void
  onUpdate: (update: SyllabusItemUpdate) => Promise<void>
  onDelete: () => Promise<void>
}

export function SyllabusTopicRow({ 
  topic, 
  progressPolicy, 
  stage, 
  pending, 
  navigationTarget,
  onNavigationComplete,
  onProgress, 
  onUpdate, 
  onDelete 
}: SyllabusTopicRowProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: topic.id })

  const isTarget = navigationTarget?.topicId === topic.id
  const [highlighted, setHighlighted] = useState(false)
  const localRef = useRef<HTMLDivElement | null>(null)

  const setCombinedRef = useCallback((node: HTMLDivElement | null) => {
    localRef.current = node
    setNodeRef(node)
  }, [setNodeRef])

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | undefined
    let highlightTimer: ReturnType<typeof setTimeout> | undefined

    if (isTarget && onNavigationComplete) {
      delayTimer = setTimeout(() => {
        const element = localRef.current
        if (element) {
          const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          })
          setHighlighted(true)
          highlightTimer = setTimeout(() => {
            setHighlighted(false)
            onNavigationComplete()
          }, 2000)
        }
      }, 100)
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (highlightTimer) clearTimeout(highlightTimer)
      setHighlighted(false)
    }
  }, [isTarget, onNavigationComplete])

  const count = getTopicStageCount(topic, stage)
  let required = 1
  if (stage === "revision") required = getRequiredRevisions(topic, progressPolicy)
  if (stage === "practice") required = getRequiredPractices(topic, progressPolicy)
  if (stage === "test") required = getRequiredTests(topic)

  const completed = stage === "learning" ? topic.learningStatus : count >= required
  return (
    <div
      ref={setCombinedRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/topic grid grid-cols-[auto_minmax(0,1fr)_auto] items-center overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-brand-violet-line hover:shadow-sm sm:flex sm:min-h-12 sm:gap-2 sm:px-2 scroll-mt-28",
        completed && "border-success-line bg-success-soft/30",
        isDragging && "opacity-60 shadow-md",
        highlighted && "ring-2 ring-brand-violet-line ring-offset-2 shadow-md"
      )}
    >
      <div className="col-start-1 row-start-1 p-2 sm:p-0">
        <SyllabusDragHandle listeners={listeners} attributes={attributes} label={`Reorder ${topic.name}`} />
      </div>

      <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 p-2 pl-0 sm:p-0">
        {stage === "learning" ? (
          <Checkbox
            checked={topic.learningStatus}
            onCheckedChange={(checked) => onProgress(topic, checked === true)}
            disabled={pending}
            aria-label={`Mark ${topic.name} as learned`}
            className="data-checked:!border-success data-checked:!bg-success data-checked:!text-success-foreground dark:data-checked:!bg-success"
          />
        ) : null}
        <span className={cn("truncate text-sm font-medium", completed && "text-success-ink")}>
          {topic.name}
        </span>
        {topic.important ? (
          <Badge variant="outline" className={cn("inline-flex px-1.5 sm:px-2.5", highYieldBadgeClass)} title="High yield">
            <StarIcon className="fill-current" />
            <span className="hidden sm:inline">High yield</span>
          </Badge>
        ) : null}
      </div>

      {stage === "learning" ? (
        <span className="hidden text-xs text-muted-foreground sm:inline sm:flex-1 sm:text-right">
          {topic.learningStatus ? "Learned" : "Pending"}
        </span>
      ) : (
        <div className="col-span-3 col-start-1 row-start-2 flex w-full items-center border-t border-border/50 bg-muted/20 p-2.5 px-3 sm:contents">
          <TopicProgressStepper
            className="w-full justify-between sm:w-auto sm:flex-1 sm:justify-end"
            stage={stage}
            count={count}
            required={required}
            pending={pending}
            onChange={(nextCount) => onProgress(topic, nextCount)}
          />
        </div>
      )}

      <div className="col-start-3 row-start-1 p-2 sm:p-0 sm:shrink-0">
        <SyllabusItemActions kind="topic" hoverGroup="topic" name={topic.name} important={topic.important} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  )
}

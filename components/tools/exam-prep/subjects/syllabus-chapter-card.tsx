"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarIcon, ChevronDownIcon, CircleCheckIcon, PlusIcon, StarIcon } from "lucide-react"
import { toast } from "sonner"

import { reorderTopicsAction } from "@/lib/tools/exam-prep/actions/syllabus-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { BaseTopic, ChapterWithRelations } from "@/types/progressapp/domain"
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

import { AddSyllabusTopicRow } from "./add-syllabus-topic-row"
import { highYieldBadgeClass } from "./shared-styles"
import { SyllabusDragHandle } from "./syllabus-drag-handle"
import { SyllabusItemActions } from "./syllabus-item-actions"
import { getChapterStageProgress, type SyllabusItemUpdate, type SyllabusStage } from "./syllabus-model"
import { SyllabusTopicRow } from "./syllabus-topic-row"
import { ChapterTestView } from "./chapter-test-view"
import { SchedulePlannerDialog } from "./schedule-planner-dialog"

type SyllabusChapterCardProps = {
  workspaceSlug: string
  examId: string
  chapter: ChapterWithRelations
  progressPolicy?: SubjectProgressPolicy
  stage: SyllabusStage
  pendingTopicIds: ReadonlySet<string>
  onTopicsChange: (chapterId: string, topics: BaseTopic[]) => void
  onTopicProgress: (chapterId: string, topic: BaseTopic, value: boolean | number) => void
  onChapterUpdate: (chapterId: string, update: SyllabusItemUpdate) => Promise<void>
  onChapterDelete: (chapterId: string) => Promise<void>
  onTopicUpdate: (chapterId: string, topicId: string, update: SyllabusItemUpdate) => Promise<void>
  onTopicDelete: (chapterId: string, topicId: string) => Promise<void>
}

export function SyllabusChapterCard({
  workspaceSlug,
  examId,
  chapter,
  progressPolicy,
  stage,
  pendingTopicIds,
  onTopicsChange,
  onTopicProgress,
  onChapterUpdate,
  onChapterDelete,
  onTopicUpdate,
  onTopicDelete,
}: SyllabusChapterCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [isSchedulePlannerOpen, setIsSchedulePlannerOpen] = useState(false)
  const collapseKey = `exam-prep:chapter:${chapter.id}:collapsed`
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const progress = getChapterStageProgress(chapter, stage, progressPolicy)

  useEffect(() => {
    const savedValue = window.localStorage.getItem(collapseKey)
    if (savedValue !== null) queueMicrotask(() => setExpanded(savedValue !== "true"))
  }, [collapseKey])

  function setChapterExpanded(nextExpanded: boolean) {
    setExpanded(nextExpanded)
    window.localStorage.setItem(collapseKey, String(!nextExpanded))
  }

  async function handleTopicDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = chapter.topics.findIndex((topic) => topic.id === event.active.id)
    const newIndex = chapter.topics.findIndex((topic) => topic.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previousTopics = chapter.topics
    const nextTopics = arrayMove(previousTopics, oldIndex, newIndex).map((topic, position) => ({ ...topic, position }))
    onTopicsChange(chapter.id, nextTopics)

    try {
      await reorderTopicsAction({ workspaceSlug, chapterId: chapter.id, topicIds: nextTopics.map((topic) => topic.id) })
    } catch (error) {
      onTopicsChange(chapter.id, previousTopics)
      toast.error(error instanceof Error ? error.message : "Could not save the topic order.")
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      size="sm"
      className={cn(
        "group/chapter overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-brand-violet-line",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 sm:gap-2">
        <SyllabusDragHandle listeners={listeners} attributes={attributes} label={`Reorder ${chapter.name}`} />
        <button type="button" className="min-w-0 py-1 text-left" onClick={() => setChapterExpanded(!expanded)} aria-expanded={expanded}>
          <CardTitle className="flex items-center gap-2">
            <ChevronDownIcon className={cn("transition-transform duration-200", !expanded && "-rotate-90")} aria-hidden="true" />
            <span className="truncate">{chapter.name}</span>
          </CardTitle>
        </button>
        <div className="flex items-center gap-1">
          <Badge
            variant={progress === 100 ? "outline" : "secondary"}
            className={cn(progress === 100 && "border-success-line bg-success-soft text-success-ink")}
          >
            {progress === 100 ? <CircleCheckIcon /> : null}
            {progress}%
          </Badge>
          {chapter.important ? (
            <Badge variant="outline" className={cn("hidden sm:inline-flex", highYieldBadgeClass)}>
              <StarIcon className="fill-current" />
              High yield
            </Badge>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="hidden sm:inline-flex"
                  onClick={() => setIsSchedulePlannerOpen(true)}
                  aria-label={`Configure test schedule for ${chapter.name}`}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Schedule Test</TooltipContent>
          </Tooltip>
          {stage !== "test" ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setChapterExpanded(true)
                      setIsAddingTopic(true)
                    }}
                    aria-label={`Add topic to ${chapter.name}`}
                  >
                    <PlusIcon />
                  </Button>
                }
              />
              <TooltipContent>Add Topic</TooltipContent>
            </Tooltip>
          ) : null}
          <SyllabusItemActions
            kind="chapter"
            hoverGroup="chapter"
            name={chapter.name}
            important={chapter.important}
            onUpdate={(update) => onChapterUpdate(chapter.id, update)}
            onDelete={() => onChapterDelete(chapter.id)}
            onScheduleTest={() => setIsSchedulePlannerOpen(true)}
          />
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent className="animate-in flex flex-col gap-3 fade-in-0 slide-in-from-top-2 duration-200">
          {stage === "test" ? (
            <ChapterTestView workspaceSlug={workspaceSlug} examId={examId} chapterId={chapter.id} />
          ) : (
            <>
              {isAddingTopic ? (
                <AddSyllabusTopicRow
                  workspaceSlug={workspaceSlug}
                  examId={examId}
                  chapterId={chapter.id}
                  onDone={() => setIsAddingTopic(false)}
                  onCreated={(topic) => onTopicsChange(chapter.id, [...chapter.topics, { ...topic, position: chapter.topics.length }])}
                />
              ) : null}
              {chapter.topics.length > 0 ? (
                <DndContext id={`dnd-context-topics-${chapter.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopicDragEnd}>
                  <SortableContext items={chapter.topics.map((topic) => topic.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {chapter.topics.map((topic) => (
                        <SyllabusTopicRow
                          key={topic.id}
                          topic={topic}
                          progressPolicy={progressPolicy}
                          stage={stage}
                          pending={pendingTopicIds.has(topic.id)}
                          onProgress={(selectedTopic, value) => onTopicProgress(chapter.id, selectedTopic, value)}
                          onUpdate={(update) => onTopicUpdate(chapter.id, topic.id, update)}
                          onDelete={() => onTopicDelete(chapter.id, topic.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : !isAddingTopic ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6">
                  <p className="text-center text-sm text-muted-foreground">Add the first topic to start tracking this chapter.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTopic(true)}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Topic
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      ) : null}
      
      {isSchedulePlannerOpen ? (
        <SchedulePlannerDialog
          workspaceSlug={workspaceSlug}
          open={isSchedulePlannerOpen}
          onOpenChange={setIsSchedulePlannerOpen}
          blockId={chapter.id}
          title={chapter.name}
          initialScheduledTests={chapter.scheduledTests}
        />
      ) : null}
    </Card>
  )
}

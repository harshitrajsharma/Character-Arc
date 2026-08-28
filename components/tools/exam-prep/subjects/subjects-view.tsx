"use client"

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react"
import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  BookIcon,
  LayoutGridIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  SegmentedSelector,
  type SegmentedSelectorOption,
} from "@/components/ui/segmented-selector"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import type { SubjectCategory } from "./subject-card"
import { CreateSubjectDialog } from "./dialogs/create-subject-dialog"
import { getCanonicalSubjectProgress } from "./progress-helper"
import { cn } from "@/lib/utils"
import { reorderSubjectsAction } from "@/lib/tools/exam-prep/actions/subject-actions"
import { SortableSubjectCard } from "./sortable-subject-card"

interface SubjectsViewProps {
  workspaceSlug: string
  examId: string
  subjects: SubjectWithRelations[]
}

type SubjectFilter = SubjectCategory | "all"

export function SubjectsView({
  workspaceSlug,
  examId,
  subjects,
}: SubjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SubjectFilter>("all")
  const [orderedSubjects, setOrderedSubjects] = useOptimistic(
    subjects,
    (_currentSubjects, nextSubjects: SubjectWithRelations[]) => nextSubjects
  )
  const [isSavingOrder, startSavingOrder] = useTransition()
  const activeDragSubjectIdRef = useRef<string | null>(null)
  const suppressNavigationUntilRef = useRef(0)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
      },
    })
  )

  // Normalize search query with trim and locale-safe casing
  const filteredSubjects = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!trimmedQuery) return orderedSubjects
    return orderedSubjects.filter((s) =>
      s.name.toLocaleLowerCase().includes(trimmedQuery)
    )
  }, [orderedSubjects, searchQuery])

  // Categorize filtered subjects using the canonical helper
  const categorized = useMemo(() => {
    const acc = {
      notStarted: [] as SubjectWithRelations[],
      inProgress: [] as SubjectWithRelations[],
      completed: [] as SubjectWithRelations[],
    }

    for (const subject of filteredSubjects) {
      const { category } = getCanonicalSubjectProgress(subject)
      if (category === "not-started") {
        acc.notStarted.push(subject)
      } else if (category === "completed") {
        acc.completed.push(subject)
      } else {
        acc.inProgress.push(subject)
      }
    }

    return acc
  }, [filteredSubjects])

  // Count total subjects in each category (unfiltered) for stable indicators
  const totalCategorized = useMemo(() => {
    const acc = { notStarted: 0, inProgress: 0, completed: 0 }
    for (const s of orderedSubjects) {
      const { category } = getCanonicalSubjectProgress(s)
      if (category === "not-started") {
        acc.notStarted++
      } else if (category === "completed") {
        acc.completed++
      } else {
        acc.inProgress++
      }
    }
    return acc
  }, [orderedSubjects])

  // Build segmented selector options dynamically with counts
  const filterOptions = useMemo<
    SegmentedSelectorOption<SubjectFilter>[]
  >(() => {
    return [
      {
        label: `All (${orderedSubjects.length})`,
        value: "all",
        icon: LayoutGridIcon,
        activeClassName:
          "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground aria-pressed:!border-brand-violet",
      },
      {
        label: `In Progress (${totalCategorized.inProgress})`,
        value: "in-progress",
        icon: Clock,
        activeClassName:
          "aria-pressed:!bg-brand-violet-soft aria-pressed:!text-brand-violet-ink aria-pressed:!border-brand-violet-line",
      },
      {
        label: `Not Started (${totalCategorized.notStarted})`,
        value: "not-started",
        icon: AlertCircle,
        activeClassName:
          "aria-pressed:!bg-muted aria-pressed:!text-foreground aria-pressed:!border-border",
      },
      {
        label: `Completed (${totalCategorized.completed})`,
        value: "completed",
        icon: CheckCircle2,
        activeClassName:
          "aria-pressed:!bg-success aria-pressed:!text-success-foreground aria-pressed:!border-success",
      },
    ]
  }, [orderedSubjects.length, totalCategorized])

  function handleSubjectDragStart(event: DragStartEvent) {
    activeDragSubjectIdRef.current = String(event.active.id)
  }

  function finishDragInteraction() {
    activeDragSubjectIdRef.current = null
    suppressNavigationUntilRef.current = performance.now() + 250
  }

  function handleSubjectDragCancel() {
    finishDragInteraction()
  }

  function shouldSuppressSubjectNavigation(subjectId: string) {
    return (
      activeDragSubjectIdRef.current === subjectId ||
      performance.now() < suppressNavigationUntilRef.current
    )
  }

  function handleSubjectDragEnd(event: DragEndEvent) {
    const { active, over } = event
    finishDragInteraction()
    if (!over || active.id === over.id || isSavingOrder) return

    const previousSubjects = orderedSubjects
    const oldIndex = previousSubjects.findIndex(
      (subject) => subject.id === active.id
    )
    const newIndex = previousSubjects.findIndex(
      (subject) => subject.id === over.id
    )
    if (oldIndex < 0 || newIndex < 0) return

    const nextSubjects = arrayMove(previousSubjects, oldIndex, newIndex)
    startSavingOrder(async () => {
      setOrderedSubjects(nextSubjects)
      try {
        await reorderSubjectsAction({
          workspaceSlug,
          examId,
          subjectIds: nextSubjects.map((subject) => subject.id),
        })
      } catch {
        setOrderedSubjects(previousSubjects)
        toast.error("The subject order could not be saved. Please try again.")
      }
    })
  }

  const renderSortableGrid = (
    sectionSubjects: SubjectWithRelations[],
    contextId: string
  ) => (
    <DndContext
      id={`dnd-context-exam-subjects-${contextId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleSubjectDragStart}
      onDragCancel={handleSubjectDragCancel}
      onDragEnd={handleSubjectDragEnd}
    >
      <SortableContext
        items={sectionSubjects.map((subject) => subject.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectionSubjects.map((subject) => (
            <SortableSubjectCard
              key={subject.id}
              workspaceSlug={workspaceSlug}
              examId={examId}
              subject={subject}
              disabled={isSavingOrder || sectionSubjects.length < 2}
              shouldSuppressNavigation={shouldSuppressSubjectNavigation}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )

  const renderSection = (
    category: SubjectCategory,
    sectionSubjects: SubjectWithRelations[],
    icon: React.ReactNode,
    title: string,
    titleColor: string
  ) => (
    <div className="space-y-4 transition-all duration-200">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={cn("text-lg font-semibold tracking-tight", titleColor)}>
          {title}
        </h3>
      </div>
      {renderSortableGrid(sectionSubjects, category)}
    </div>
  )

  const subjectsToShow = useMemo(() => {
    if (activeTab === "all") return filteredSubjects
    if (activeTab === "in-progress") return categorized.inProgress
    if (activeTab === "not-started") return categorized.notStarted
    return categorized.completed
  }, [activeTab, filteredSubjects, categorized])

  return (
    <div className="flex flex-1 flex-col space-y-6 md:p-4">
      {/* Navigation and Controls */}
      <div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
        <SegmentedSelector
          value={activeTab}
          options={filterOptions}
          onValueChange={setActiveTab}
          ariaLabel="Filter subjects by progress"
          collapsedLabelsOnMobile
          itemClassName="h-11 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
        />
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <label htmlFor="subject-search" className="sr-only">
              Search subjects
            </label>
            <Input
              id="subject-search"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full sm:h-9"
            />
          </div>
          <CreateSubjectDialog workspaceSlug={workspaceSlug} examId={examId}>
            <Button className="h-11 w-full font-medium sm:h-9 sm:w-auto">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Add Subject
            </Button>
          </CreateSubjectDialog>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {isSavingOrder ? "Saving subject order." : "Subject order saved."}
      </p>

      {/* Subjects Grid & Empty States */}
      <div className="space-y-6 pb-4 sm:pb-0">
        {orderedSubjects.length === 0 ? (
          /* Empty State 1: No subjects yet */
          <Empty>
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-brand-violet-soft text-brand-violet-ink"
              >
                <BookIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Start your first subject</EmptyTitle>
              <EmptyDescription>
                Break down your exam into subjects to track progress
                effectively.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateSubjectDialog
                workspaceSlug={workspaceSlug}
                examId={examId}
              >
                <Button className="h-11 font-medium sm:h-9">
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  Create a subject
                </Button>
              </CreateSubjectDialog>
            </EmptyContent>
          </Empty>
        ) : filteredSubjects.length === 0 ? (
          /* Empty State 2: No search results */
          <Empty>
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-muted text-muted-foreground"
              >
                <BookIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No matching subjects</EmptyTitle>
              <EmptyDescription>
                We couldn&apos;t find any subjects matching &ldquo;{searchQuery}
                &rdquo;.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="h-11 font-medium sm:h-9"
              >
                Clear search query
              </Button>
            </EmptyContent>
          </Empty>
        ) : activeTab !== "all" && subjectsToShow.length === 0 ? (
          /* Empty State 3: No subjects in selected category */
          <Empty>
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className={cn(
                  activeTab === "completed"
                    ? "bg-success-soft text-success-ink"
                    : activeTab === "in-progress"
                      ? "bg-brand-violet-soft text-brand-violet-ink"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {activeTab === "in-progress" ? (
                  <Clock className="size-5" aria-hidden="true" />
                ) : activeTab === "not-started" ? (
                  <AlertCircle className="size-5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                )}
              </EmptyMedia>
              <EmptyTitle>
                No{" "}
                {activeTab === "in-progress"
                  ? "in-progress"
                  : activeTab === "not-started"
                    ? "not-started"
                    : "completed"}{" "}
                subjects
              </EmptyTitle>
              <EmptyDescription>
                You don&apos;t have any subjects in the{" "}
                {activeTab === "in-progress"
                  ? "In Progress"
                  : activeTab === "not-started"
                    ? "Not Started"
                    : "Completed"}{" "}
                category.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => setActiveTab("all")}
                className="h-11 font-medium sm:h-9"
              >
                View all subjects
              </Button>
            </EmptyContent>
          </Empty>
        ) : activeTab === "all" ? (
          <>
            {categorized.inProgress.length > 0
              ? renderSection(
                  "in-progress",
                  categorized.inProgress,
                  <Clock
                    className="size-5 text-brand-violet-ink"
                    aria-hidden="true"
                  />,
                  "In Progress",
                  "text-brand-violet-ink"
                )
              : null}
            {categorized.notStarted.length > 0
              ? renderSection(
                  "not-started",
                  categorized.notStarted,
                  <AlertCircle
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />,
                  "Not Started",
                  "text-muted-foreground"
                )
              : null}
            {categorized.completed.length > 0
              ? renderSection(
                  "completed",
                  categorized.completed,
                  <CheckCircle2
                    className="size-5 text-success-ink"
                    aria-hidden="true"
                  />,
                  "Completed",
                  "text-success-ink"
                )
              : null}
          </>
        ) : (
          /* Normal Grid: Specific Category View */
          renderSection(
            activeTab,
            subjectsToShow,
            activeTab === "in-progress" ? (
              <Clock
                className="size-5 text-brand-violet-ink"
                aria-hidden="true"
              />
            ) : activeTab === "not-started" ? (
              <AlertCircle
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="size-5 text-success-ink"
                aria-hidden="true"
              />
            ),
            activeTab === "in-progress"
              ? "In Progress"
              : activeTab === "not-started"
                ? "Not Started"
                : "Completed",
            activeTab === "in-progress"
              ? "text-brand-violet-ink"
              : activeTab === "not-started"
                ? "text-muted-foreground"
                : "text-success-ink"
          )
        )}
      </div>
    </div>
  )
}

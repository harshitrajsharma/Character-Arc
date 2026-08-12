"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectCard } from "./subject-card"

type SortableSubjectCardProps = {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
  disabled?: boolean
  shouldSuppressNavigation: (subjectId: string) => boolean
}

export function SortableSubjectCard({
  workspaceSlug,
  examId,
  subject,
  disabled = false,
  shouldSuppressNavigation,
}: SortableSubjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id, disabled })
  const { onKeyDown, ...pointerListeners } = listeners ?? {}

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isDragging ? { zIndex: 50 } : {}),
      }}
      className={cn("relative h-full", isDragging && "opacity-60")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={disabled}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
        aria-label={`Reorder ${subject.name}`}
        {...attributes}
        onKeyDown={
          onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined
        }
      >
        Reorder {subject.name}
      </button>
      <SubjectCard
        workspaceSlug={workspaceSlug}
        examId={examId}
        subject={subject}
        dragActivatorProps={
          disabled
            ? undefined
            : (pointerListeners as unknown as React.HTMLAttributes<HTMLAnchorElement>)
        }
        shouldSuppressNavigation={() => shouldSuppressNavigation(subject.id)}
        isDragging={isDragging}
      />
    </div>
  )
}

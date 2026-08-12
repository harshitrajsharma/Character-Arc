"use client"

import { GripVerticalIcon } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"

type SyllabusDragHandleProps = {
  listeners: ReturnType<typeof useSortable>["listeners"]
  attributes: ReturnType<typeof useSortable>["attributes"]
  label: string
}

export function SyllabusDragHandle({
  listeners,
  attributes,
  label,
}: SyllabusDragHandleProps) {
  return (
    <button
      type="button"
      className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing sm:size-8"
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" aria-hidden="true" />
    </button>
  )
}

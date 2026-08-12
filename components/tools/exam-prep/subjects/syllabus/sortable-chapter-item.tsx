import { memo } from "react"
import { GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

interface SortableChapterItemProps {
  chapterId: string
  renderCard: (dragHandle: React.ReactNode) => React.ReactNode
}

export const SortableChapterItem = memo(
  ({ chapterId, renderCard }: SortableChapterItemProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: chapterId })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      ...(isDragging ? { zIndex: 50 } : {}),
    }

    const dragHandle = (
      <div
        {...attributes}
        {...listeners}
        className="mt-0.5 h-fit cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing sm:mt-0 sm:p-1.5"
      >
        <GripVertical className="h-3 w-3" />
      </div>
    )

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(isDragging && "opacity-50")}
      >
        {renderCard(dragHandle)}
      </div>
    )
  }
)

SortableChapterItem.displayName = "SortableChapterItem"

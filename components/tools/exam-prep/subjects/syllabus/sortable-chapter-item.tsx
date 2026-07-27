import { memo } from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableChapterItemProps {
  chapterId: string;
  renderCard: (dragHandle: React.ReactNode) => React.ReactNode;
}

export const SortableChapterItem = memo(({ chapterId, renderCard }: SortableChapterItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapterId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50 } : {}),
  };

  const dragHandle = (
    <div
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 sm:p-1.5 rounded-md text-muted-foreground mt-0.5 sm:mt-0 h-fit"
    >
      <GripVertical className="h-3 w-3" />
    </div>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      {renderCard(dragHandle)}
    </div>
  );
});

SortableChapterItem.displayName = "SortableChapterItem";

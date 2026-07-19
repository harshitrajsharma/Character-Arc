'use client';

import { EditChapterDialog } from "./edit-chapter-dialog";

type EditChapterDialogProps = {
  chapterId: string;
  initialName: string;
  initialImportant: boolean;
  onSuccess: (updatedChapter: { id: string; name: string; important: boolean }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChapterDialogWrapper(props: EditChapterDialogProps) {
  return <EditChapterDialog {...props} />;
} 
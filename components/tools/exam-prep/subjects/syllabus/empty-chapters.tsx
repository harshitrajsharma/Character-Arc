import { Card } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { AddChapterDialog } from "../dialogs/add-chapter-dialog"

interface EmptyChaptersProps {
  workspaceSlug: string
  examId: string
  subjectId: string
}

export function EmptyChapters({
  workspaceSlug,
  examId,
  subjectId,
}: EmptyChaptersProps) {
  return (
    <Card className="flex flex-col items-center justify-center space-y-4 p-8">
      <BookOpen className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2 text-center">
        <p className="text-muted-foreground">
          No chapters added yet. Start by adding your first chapter!
        </p>
      </div>
      <AddChapterDialog
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
      />
    </Card>
  )
}

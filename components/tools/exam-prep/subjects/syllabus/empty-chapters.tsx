import { Card } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { AddChapterDialog } from "../dialogs/add-chapter-dialog"


interface EmptyChaptersProps {
  workspaceSlug: string;
  examId: string;
  subjectId: string;
}

export function EmptyChapters({ workspaceSlug, examId, subjectId }: EmptyChaptersProps) {

  return (
    <Card className="p-8 flex flex-col items-center justify-center space-y-4">
      <BookOpen className="h-12 w-12 text-muted-foreground" />
      <div className="text-center space-y-2">
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

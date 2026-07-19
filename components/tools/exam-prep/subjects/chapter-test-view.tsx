"use client"

import { useEffect, useState } from "react"
import { PlusIcon, PencilIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getTestRecordsForChapterAction } from "@/lib/tools/exam-prep/actions/test-actions"
import { TestRecordDialog } from "./test-record-dialog"
import { cn } from "@/lib/utils"

type TestRecord = {
  id: string
  title: string
  marksObtained: number
  totalMarks: number
  summary?: string | null
  createdAt: Date
}

type ChapterTestViewProps = {
  workspaceSlug: string
  examId: string
  chapterId: string
}

export function ChapterTestView({ workspaceSlug, examId, chapterId }: ChapterTestViewProps) {
  const [records, setRecords] = useState<TestRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TestRecord | undefined>()

  async function loadRecords() {
    setIsLoading(true)
    try {
      const data = await getTestRecordsForChapterAction(workspaceSlug, chapterId)
      setRecords(data)
    } catch (error) {
      console.error("Failed to load test records", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getTestRecordsForChapterAction(workspaceSlug, chapterId)
      .then((data) => {
        if (!cancelled) setRecords(data)
      })
      .catch((error) => {
        if (!cancelled) console.error("Failed to load test records", error)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [chapterId, workspaceSlug])

  const handleAdd = () => {
    setEditingRecord(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (record: TestRecord) => {
    setEditingRecord(record)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
          Loading tests...
        </div>
      ) : records.length > 0 ? (
        <div className="flex flex-col gap-2">
          {records.map((record) => {
            const percentage = Math.round((record.marksObtained / record.totalMarks) * 100)
            return (
              <Card key={record.id} className="overflow-hidden border-brand-cyan-line/30 transition-colors hover:border-brand-cyan-line">
                <CardContent className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-brand-cyan-solid shrink-0" />
                      <span className="font-medium truncate text-sm sm:text-base">{record.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <span>{record.marksObtained} / {record.totalMarks} marks</span>
                      <span className="select-none">•</span>
                      <span className={cn(
                        "font-medium",
                        percentage >= 80 ? "text-green-600 dark:text-green-500" : 
                        percentage >= 50 ? "text-amber-600 dark:text-amber-500" : 
                        "text-red-600 dark:text-red-500"
                      )}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                    <PencilIcon className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAdd}
            className="mt-2 self-start border-dashed border-brand-cyan-line/50 text-brand-cyan-ink hover:bg-brand-cyan-soft hover:text-brand-cyan-ink"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Test Record
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-brand-cyan-line/50 p-6 bg-brand-cyan-soft/10">
          <p className="text-center text-sm text-muted-foreground">No tests recorded yet.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="border-brand-cyan-line/50 text-brand-cyan-ink hover:bg-brand-cyan-soft hover:text-brand-cyan-ink"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Test Record
          </Button>
        </div>
      )}

      <TestRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceSlug={workspaceSlug}
        examId={examId}
        chapterId={chapterId}
        initialData={editingRecord}
        onSuccess={loadRecords}
      />
    </div>
  )
}

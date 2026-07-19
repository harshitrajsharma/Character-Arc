"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { MarkdownBlockEditor } from "@/components/editor/markdown-block-editor.dynamic"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createTestRecordAction, updateTestRecordAction } from "@/lib/tools/exam-prep/actions/test-actions"

type TestRecordDialogProps = {
  workspaceSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  chapterId?: string
  subjectId?: string
  initialData?: {
    id: string
    title: string
    marksObtained: number
    totalMarks: number
    summary?: string | null
  }
  onSuccess?: () => void
}

export function TestRecordDialog({
  workspaceSlug,
  open,
  onOpenChange,
  examId,
  chapterId,
  subjectId,
  initialData,
  onSuccess,
}: TestRecordDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [marksObtained, setMarksObtained] = useState<number | string>(initialData?.marksObtained ?? 0)
  const [totalMarks, setTotalMarks] = useState<number | string>(initialData?.totalMarks ?? 100)
  const [summary, setSummary] = useState(initialData?.summary ?? "")

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? "")
      setMarksObtained(initialData?.marksObtained ?? 0)
      setTotalMarks(initialData?.totalMarks ?? 100)
      setSummary(initialData?.summary ?? "")
    }
  }, [open, initialData])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const parsedMarks = Number(marksObtained)
    const parsedTotal = Number(totalMarks)

    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    if (isNaN(parsedMarks) || parsedMarks < 0) {
      toast.error("Marks obtained must be >= 0")
      return
    }
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      toast.error("Total marks must be > 0")
      return
    }
    
    startTransition(async () => {
      try {
        if (initialData) {
          await updateTestRecordAction({
            workspaceSlug,
            id: initialData.id,
            title,
            marksObtained: parsedMarks,
            totalMarks: parsedTotal,
            summary: summary,
          })
          toast.success("Test record updated")
        } else {
          await createTestRecordAction({
            workspaceSlug,
            examId,
            chapterId,
            subjectId,
            title,
            marksObtained: parsedMarks,
            totalMarks: parsedTotal,
            summary: summary,
          })
          toast.success("Test record created")
        }
        onOpenChange(false)
        onSuccess?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save test record")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 p-4 sm:h-[95vh] sm:max-w-5xl sm:rounded-xl sm:border sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>{initialData ? "Edit Test Record" : "Add Test Record"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 space-y-2">
            <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Title
            </label>
            <Input 
              id="title" 
              placeholder="e.g. Chapter 1 Mock Test" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
            />
          </div>

          <div className="grid shrink-0 grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="marksObtained" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Marks Obtained
              </label>
              <Input 
                id="marksObtained" 
                type="number" 
                step="0.5" 
                value={marksObtained} 
                onChange={(e) => setMarksObtained(e.target.value)} 
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="totalMarks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Total Marks
              </label>
              <Input 
                id="totalMarks" 
                type="number" 
                step="0.5" 
                value={totalMarks} 
                onChange={(e) => setTotalMarks(e.target.value)} 
                required
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Summary / Notes
            </label>
            <div className="flex-1 overflow-hidden rounded-md border border-input bg-background">
              <MarkdownBlockEditor
                id="test-summary"
                value={summary}
                onChange={setSummary}
                placeholder="Write your summary here..."
                ariaLabelledBy="test-summary"
                className="h-full w-full overflow-y-auto p-1 sm:p-2"
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-brand-cyan-solid hover:bg-brand-cyan-solid/90 text-brand-cyan-ink">
              {isPending ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


"use client"

import { useState, useTransition } from "react"
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
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldContent } from "@/components/ui/field"
import { createTestRecordAction, updateTestRecordAction, type NormalizedTestRecord } from "@/lib/tools/exam-prep/actions/test-actions"
import { validateTestRecordForm } from "./test-record-helpers"

type TestRecordDialogProps = {
  workspaceSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  chapterId?: string
  subjectId: string
  initialData?: {
    id: string
    title: string
    marksObtained: number
    totalMarks: number
    summary?: string | null
  }
  onSuccess?: (record: NormalizedTestRecord) => void
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 p-4 sm:h-[95vh] sm:max-w-5xl sm:rounded-xl sm:border sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>{initialData ? "Edit Test Record" : "Add Test Record"}</DialogTitle>
        </DialogHeader>
        {open && (
          <TestRecordForm
            key={initialData ? initialData.id : "new"}
            workspaceSlug={workspaceSlug}
            examId={examId}
            chapterId={chapterId}
            subjectId={subjectId}
            initialData={initialData}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TestRecordForm({
  workspaceSlug,
  examId,
  chapterId,
  subjectId,
  initialData,
  onSuccess,
  onCancel,
}: Omit<TestRecordDialogProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [marksObtained, setMarksObtained] = useState<number | string>(initialData?.marksObtained ?? 0)
  const [totalMarks, setTotalMarks] = useState<number | string>(initialData?.totalMarks ?? 100)
  const [summary, setSummary] = useState(initialData?.summary ?? "")
  
  const [errors, setErrors] = useState<{ title?: string; marks?: string }>({})

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const parsedMarks = Number(marksObtained)
    const parsedTotal = Number(totalMarks)

    const newErrors: { title?: string; marks?: string } = {}
    if (!title.trim()) {
      newErrors.title = "Title is required."
    }
    
    const marksError = validateTestRecordForm(parsedMarks, parsedTotal)
    if (marksError) {
      newErrors.marks = marksError
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Please fix the errors before saving.")
      return
    }
    
    setErrors({})
    startTransition(async () => {
      try {
        if (initialData) {
          const result = await updateTestRecordAction({
            workspaceSlug,
            id: initialData.id,
            title,
            marksObtained: parsedMarks,
            totalMarks: parsedTotal,
            summary: summary,
          })
          toast.success("Test record updated")
          onSuccess?.(result.record)
          onCancel()
        } else {
          const result = await createTestRecordAction({
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
          onSuccess?.(result.record)
          onCancel()
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save test record")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
      <FieldGroup className="shrink-0">
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <FieldContent>
            <Input 
              id="title" 
              placeholder="e.g. Chapter 1 Mock Test" 
              value={title} 
              onChange={(event) => {
                setTitle(event.target.value)
                if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
              }}
              aria-invalid={Boolean(errors.title)}
              required
              className="h-11 sm:h-9"
            />
            {errors.title && <FieldError errors={[{ message: errors.title }]} />}
          </FieldContent>
        </Field>

        <div className="grid shrink-0 grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!!errors.marks}>
            <FieldLabel htmlFor="marksObtained">Marks Obtained</FieldLabel>
            <FieldContent>
              <Input 
                id="marksObtained" 
                type="number" 
                step="0.5" 
                min="0"
                max={totalMarks}
                value={marksObtained} 
                onChange={(event) => {
                  setMarksObtained(event.target.value)
                  if (errors.marks) setErrors((current) => ({ ...current, marks: undefined }))
                }}
                aria-invalid={Boolean(errors.marks)}
                required
                className="h-11 sm:h-9"
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.marks}>
            <FieldLabel htmlFor="totalMarks">Total Marks</FieldLabel>
            <FieldContent>
              <Input 
                id="totalMarks" 
                type="number" 
                step="0.5" 
                min="0.5"
                value={totalMarks} 
                onChange={(event) => {
                  setTotalMarks(event.target.value)
                  if (errors.marks) setErrors((current) => ({ ...current, marks: undefined }))
                }}
                aria-invalid={Boolean(errors.marks)}
                required
                className="h-11 sm:h-9"
              />
            </FieldContent>
          </Field>
        </div>
        
        {errors.marks && (
          <div className="col-span-full">
            <FieldError errors={[{ message: errors.marks }]} />
          </div>
        )}
      </FieldGroup>

      <Field className="flex min-h-0 flex-1 flex-col">
        <FieldLabel id="test-summary-label">Test summary</FieldLabel>
        <FieldDescription>A concise reflection or evidence of the result, not topic notes.</FieldDescription>
        <FieldContent className="min-h-0 flex-1">
          <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <MarkdownBlockEditor
              id="test-summary"
              value={summary}
              onChange={setSummary}
              placeholder="Write your summary here..."
              ariaLabelledBy="test-summary-label"
              className="h-full w-full overflow-y-auto p-1 sm:p-2"
            />
          </div>
        </FieldContent>
      </Field>

      <div className="flex shrink-0 flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="h-11 sm:h-9 w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="h-11 w-full bg-brand-violet text-brand-violet-foreground hover:bg-brand-violet/90 sm:h-9 sm:w-auto">
          {isPending ? "Saving..." : "Save Record"}
        </Button>
      </div>
    </form>
  )
}

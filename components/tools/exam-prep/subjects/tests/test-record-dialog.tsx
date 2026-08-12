"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { MarkdownBlockEditor } from "@/components/editor/markdown-block-editor.dynamic"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldContent,
} from "@/components/ui/field"
import {
  completeScheduledTestAction,
  createTestRecordAction,
  updateTestRecordAction,
  type NormalizedTestRecord,
} from "@/lib/tools/exam-prep/actions/test-actions"
import type { ScheduledTest } from "@/types/progressapp/domain"
import { validateTestRecordForm } from "./test-record-helpers"

type TestRecordDialogProps = {
  workspaceSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  chapterId?: string
  subjectId: string
  scheduledTest?: ScheduledTest
  initialData?: {
    id: string
    title: string
    marksObtained: number
    totalMarks: number
    summary?: string | null
  }
  onSuccess?: (record: NormalizedTestRecord) => void
  onScheduledTestSuccess?: (scheduledTest: ScheduledTest) => void
}

export function TestRecordDialog({
  workspaceSlug,
  open,
  onOpenChange,
  examId,
  chapterId,
  subjectId,
  scheduledTest,
  initialData,
  onSuccess,
  onScheduledTestSuccess,
}: TestRecordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[95vh] sm:max-w-5xl sm:rounded-xl sm:border">
        <DialogHeader className="m-0 shrink-0 px-4 py-3 pr-14 sm:px-6 sm:py-4">
          <DialogTitle>
            {initialData
              ? "Edit test record"
              : scheduledTest
                ? "Record scheduled test result"
                : "Add test record"}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <TestRecordForm
            key={initialData ? initialData.id : "new"}
            workspaceSlug={workspaceSlug}
            examId={examId}
            chapterId={chapterId}
            subjectId={subjectId}
            scheduledTest={scheduledTest}
            initialData={initialData}
            onSuccess={onSuccess}
            onScheduledTestSuccess={onScheduledTestSuccess}
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
  scheduledTest,
  initialData,
  onSuccess,
  onScheduledTestSuccess,
  onCancel,
}: Omit<TestRecordDialogProps, "open" | "onOpenChange"> & {
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [scheduledCompletionKey] = useState(createIdempotencyKey)
  const [unscheduledCreateKey] = useState(createIdempotencyKey)
  const [updateKey] = useState(createIdempotencyKey)
  const [title, setTitle] = useState(
    initialData?.title ?? scheduledTest?.title ?? ""
  )
  const [marksObtained, setMarksObtained] = useState<number | string>(
    initialData?.marksObtained ?? 0
  )
  const [totalMarks, setTotalMarks] = useState<number | string>(
    initialData?.totalMarks ?? scheduledTest?.totalMarks ?? 100
  )
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
            idempotencyKey: updateKey,
          })
          toast.success("Test record updated")
          onSuccess?.(result.record)
          onCancel()
        } else if (scheduledTest) {
          const result = await completeScheduledTestAction({
            workspaceSlug,
            scheduledTestId: scheduledTest.id,
            expectedRevision: scheduledTest.revision,
            idempotencyKey: scheduledCompletionKey,
            marksObtained: parsedMarks,
            totalMarks: parsedTotal,
            summary,
          })
          toast.success("Scheduled test completed")
          onSuccess?.(result.record)
          onScheduledTestSuccess?.(result.scheduledTest)
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
            idempotencyKey: unscheduledCreateKey,
          })
          toast.success("Test record created")
          onSuccess?.(result.record)
          onCancel()
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save test record"
        )
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
    >
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
                if (errors.title)
                  setErrors((current) => ({ ...current, title: undefined }))
              }}
              aria-invalid={Boolean(errors.title)}
              required
              readOnly={Boolean(scheduledTest)}
              className="h-11 sm:h-9"
            />
            {scheduledTest ? (
              <FieldDescription>
                The saved schedule supplies the test title and chapter coverage.
              </FieldDescription>
            ) : null}
            {errors.title && (
              <FieldError errors={[{ message: errors.title }]} />
            )}
          </FieldContent>
        </Field>

        <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.marks}>
            <FieldLabel htmlFor="marksObtained">Marks Obtained</FieldLabel>
            <FieldContent>
              <Input
                id="marksObtained"
                type="number"
                step="0.01"
                min="0"
                max={Math.min(Number(totalMarks) || 999999.99, 999999.99)}
                value={marksObtained}
                onChange={(event) => {
                  setMarksObtained(event.target.value)
                  if (errors.marks)
                    setErrors((current) => ({ ...current, marks: undefined }))
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
                step="0.01"
                min="0.01"
                max="999999.99"
                value={totalMarks}
                onChange={(event) => {
                  setTotalMarks(event.target.value)
                  if (errors.marks)
                    setErrors((current) => ({ ...current, marks: undefined }))
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
        <FieldDescription>
          A concise reflection or evidence of the result, not topic notes.
        </FieldDescription>
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

      <DialogFooter className="-mx-4 mt-auto -mb-4 shrink-0 sm:-mx-6 sm:-mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full bg-brand-violet text-brand-violet-foreground hover:bg-brand-violet/90 sm:h-9 sm:w-auto"
        >
          {isPending ? "Saving..." : "Save Record"}
        </Button>
      </DialogFooter>
    </form>
  )
}

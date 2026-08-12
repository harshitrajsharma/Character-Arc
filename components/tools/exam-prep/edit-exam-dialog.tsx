"use client"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"

import { useActionState, useEffect, useState } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  updateExamAction,
  type UpdateExamActionState,
} from "@/lib/tools/exam-prep/actions/create-actions"
import { ExamDatePicker } from "./exam-date-picker"
import { DialogFooter } from "@/components/ui/dialog"

const initialState: UpdateExamActionState = { status: "idle", message: "" }

interface EditExamDialogProps {
  workspaceSlug: string
  examId: string
  initialData: {
    title: string
    summary: string
    expectedStartDate: string
    targetMarks: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type EditExamDialogFormProps = Omit<EditExamDialogProps, "open">

export function EditExamDialog({
  workspaceSlug,
  examId,
  initialData,
  open,
  onOpenChange,
}: EditExamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <EditExamDialogForm
            workspaceSlug={workspaceSlug}
            examId={examId}
            initialData={initialData}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditExamDialogForm({
  workspaceSlug,
  examId,
  initialData,
  onOpenChange,
}: EditExamDialogFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    updateExamAction,
    initialState
  )
  // The form only mounts while the dialog is open, so a per-mount key is
  // stable for retries and unique across reopenings.
  const [idempotencyKey] = useState(() => createIdempotencyKey())

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message)
    }
    if (state.status === "success") {
      toast.success("Exam updated!")
      onOpenChange(false)
      router.refresh()
    }
  }, [state.message, state.status, onOpenChange, router])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Exam</DialogTitle>
        <DialogDescription>
          Update the basic details and goals for this exam.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="examId" value={examId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <FieldGroup className="py-6">
          <Field data-invalid={Boolean(state.fieldErrors?.title)}>
            <FieldLabel htmlFor="edit-title">
              Exam name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="edit-title"
              name="title"
              defaultValue={initialData.title}
              placeholder="e.g., GATE CS 2027"
              maxLength={120}
              required
              aria-invalid={!!state.fieldErrors?.title}
            />
            <FieldError>{state.fieldErrors?.title?.[0]}</FieldError>
          </Field>

          <Field data-invalid={Boolean(state.fieldErrors?.summary)}>
            <FieldLabel htmlFor="edit-summary">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="edit-summary"
              name="summary"
              defaultValue={initialData.summary}
              placeholder="Brief description of your goal..."
              maxLength={4000}
              className="min-h-[100px] resize-y"
              aria-invalid={!!state.fieldErrors?.summary}
            />
            <FieldError>{state.fieldErrors?.summary?.[0]}</FieldError>
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field
              data-invalid={Boolean(state.fieldErrors?.expectedStartDate)}
            >
              <FieldLabel htmlFor="edit-expectedStartDate">
                Expected exam date{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <ExamDatePicker
                id="edit-expectedStartDate"
                name="expectedStartDate"
                defaultValue={initialData.expectedStartDate}
                hasError={!!state.fieldErrors?.expectedStartDate}
              />
              <FieldError>
                {state.fieldErrors?.expectedStartDate?.[0]}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(state.fieldErrors?.targetMarks)}>
              <FieldLabel htmlFor="edit-targetMarks">
                Target score{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="edit-targetMarks"
                name="targetMarks"
                defaultValue={initialData.targetMarks}
                placeholder="e.g., 75"
                type="number"
                step="any"
                min="0"
                aria-invalid={!!state.fieldErrors?.targetMarks}
              />
              <FieldError>{state.fieldErrors?.targetMarks?.[0]}</FieldError>
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClockIcon, Loader2Icon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { cn } from "@/lib/utils"
import {
  updateExamDateAction,
  type UpdateExamDateActionState,
} from "@/lib/tools/exam-prep/actions/create-actions"

import { ExamDatePicker } from "./exam-date-picker"

const initialState: UpdateExamDateActionState = {
  status: "idle",
  message: "",
}

type UpdateExamDateDialogProps = {
  workspaceSlug: string
  examId: string
  expectedStartDate: string | null
  triggerClassName?: string
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

export function UpdateExamDateDialog({
  workspaceSlug,
  examId,
  expectedStartDate,
  triggerClassName,
  tooltipSide = "top",
}: UpdateExamDateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState("")
  const [dateError, setDateError] = useState<string>()
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setIdempotencyKey(createIdempotencyKey())
      setDateError(undefined)
    }

    setOpen(nextOpen)
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateExamDateAction(initialState, formData)

      if (result.status === "error") {
        setDateError(result.fieldErrors?.expectedStartDate?.[0])
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Update actual date"
              onClick={() => handleOpenChange(true)}
              className={cn("text-muted-foreground", triggerClassName)}
            />
          }
        >
          <PencilIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Update actual date</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            Exam schedule
          </div>
          <DialogTitle>Update actual exam date</DialogTitle>
          <DialogDescription>
            Save the date you are preparing for. This will mark the exam
            schedule as confirmed.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <Field className="py-2" data-invalid={Boolean(dateError)}>
            <FieldLabel htmlFor="actual-exam-date">Actual exam date</FieldLabel>
            <FieldDescription>
              Use the confirmed date from the official schedule.
            </FieldDescription>
            <ExamDatePicker
              id="actual-exam-date"
              name="expectedStartDate"
              defaultValue={expectedStartDate ?? ""}
              placeholder="Choose the actual exam date"
              hasError={Boolean(dateError)}
            />
            <FieldError>{dateError}</FieldError>
          </Field>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Saving date...
                </>
              ) : (
                "Save actual date"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

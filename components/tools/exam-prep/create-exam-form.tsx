"use client"

import { useActionState, useEffect } from "react"
import { GraduationCapIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createExamAction,
  type CreateExamActionState,
} from "@/lib/tools/exam-prep/actions/create-actions"
import { toast } from "sonner"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { cn } from "@/lib/utils"
import { DialogFooter } from "@/components/ui/dialog"
import { ExamDatePicker } from "./exam-date-picker"

const initialState: CreateExamActionState = { status: "idle", message: "" }

type CreateExamFormProps = {
  workspaceSlug: string
  idempotencyKey: string
  mode?: "page" | "dialog"
  onCancel?: () => void
  onCreated?: (rootBlockId?: string) => void
}

export function CreateExamForm({
  workspaceSlug,
  idempotencyKey,
  mode = "page",
  onCancel,
  onCreated,
}: CreateExamFormProps) {
  const [state, formAction, pending] = useActionState(
    createExamAction,
    initialState
  )

  useEffect(() => {
    if (state.status === "success") {
      if (mode === "dialog") {
        onCreated?.(state.rootBlockId)
      }
    } else if (state.status === "error" && state.message) {
      if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
        toast.warning("Incomplete Form", { description: state.message })
      } else {
        toast.error("Error", { description: state.message })
      }
    }
  }, [
    state.status,
    state.message,
    state.fieldErrors,
    state.rootBlockId,
    mode,
    onCreated,
  ])

  if (state.status === "success" && mode === "page") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-neon-soft text-brand-neon-ink">
          <GraduationCapIcon className="size-8" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-2xl font-semibold">Exam created!</h2>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={workspaceRoutes.examPrep.home(workspaceSlug)}
            className={buttonVariants({ variant: "outline" })}
          >
            View all exams
          </Link>
          {state.rootBlockId ? (
            <Link
              href={workspaceRoutes.examPrep.exam(
                workspaceSlug,
                state.rootBlockId
              )}
              className={buttonVariants()}
            >
              Add syllabus
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <form
      key={state.inputs ? JSON.stringify(state.inputs) : "initial"}
      action={formAction}
      className={cn(
        mode === "dialog"
          ? "w-full space-y-6"
          : "mx-auto mt-20 max-w-2xl px-4 py-12 sm:px-6"
      )}
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {mode === "page" && (
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={workspaceRoutes.examPrep.home(workspaceSlug)}
            className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              Track a new exam
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up the foundation to track your syllabus.
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          mode === "dialog"
            ? "flex flex-col gap-6"
            : "flex flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8"
        )}
      >
        <div className="grid gap-2">
          <Label htmlFor="title">
            Exam Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g., GATE 2027 Computer Science"
            required
            maxLength={120}
            defaultValue={state.inputs?.title ?? ""}
            autoFocus={mode === "page"}
            className={cn(
              mode === "dialog" ? "h-11 sm:h-9" : "",
              state.fieldErrors?.title
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            )}
            aria-invalid={Boolean(state.fieldErrors?.title)}
            aria-describedby={
              state.fieldErrors?.title ? "title-error" : undefined
            }
          />
          {state.fieldErrors?.title ? (
            <p id="title-error" className="text-sm text-destructive">
              {state.fieldErrors.title[0]}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="summary">Description <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="summary"
            name="summary"
            placeholder="Brief description or context of what you are preparing for..."
            className={cn(
              "min-h-25 resize-none",
              state.fieldErrors?.summary
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            )}
            maxLength={4000}
            defaultValue={state.inputs?.summary ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.summary)}
            aria-describedby={
              state.fieldErrors?.summary ? "summary-error" : undefined
            }
          />
          {state.fieldErrors?.summary ? (
            <p id="summary-error" className="text-sm text-destructive">
              {state.fieldErrors.summary[0]}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="expectedStartDate">Expected exam date <span className="text-muted-foreground">(optional)</span></Label>
            <ExamDatePicker
              id="expectedStartDate"
              name="expectedStartDate"
              defaultValue={state.inputs?.expectedStartDate ?? ""}
              hasError={Boolean(state.fieldErrors?.expectedStartDate)}
              ariaDescribedBy={
                state.fieldErrors?.expectedStartDate
                  ? "expectedStartDate-error"
                  : undefined
              }
            />
            {state.fieldErrors?.expectedStartDate ? (
              <p id="expectedStartDate-error" className="text-sm text-destructive">
                {state.fieldErrors.expectedStartDate[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="targetMarks">Target score <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="targetMarks"
              name="targetMarks"
              type="number"
              min="0"
              placeholder="e.g., 75"
              defaultValue={state.inputs?.targetMarks ?? ""}
              className={cn(
                mode === "dialog" ? "h-11 sm:h-9" : "",
                state.fieldErrors?.targetMarks
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              )}
              aria-invalid={Boolean(state.fieldErrors?.targetMarks)}
              aria-describedby={
                state.fieldErrors?.targetMarks ? "targetMarks-error" : undefined
              }
            />
            {state.fieldErrors?.targetMarks ? (
              <p id="targetMarks-error" className="text-sm text-destructive">
                {state.fieldErrors.targetMarks[0]}
              </p>
            ) : null}
          </div>
        </div>

        {mode === "dialog" ? (
          <DialogFooter className="-mx-6 mt-4 -mb-6 px-6 py-3 sm:-mx-8 sm:-mb-8 sm:px-8">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:h-9 sm:w-auto"
            >
              {pending ? (
                <Loader2Icon
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <GraduationCapIcon className="mr-2 size-4" aria-hidden="true" />
              )}
              {pending ? "Creating..." : "Create Exam"}
            </Button>
          </DialogFooter>
        ) : (
          <div className="mt-4 flex items-center justify-end gap-4 border-t border-border pt-6">
            <Link
              href={workspaceRoutes.examPrep.home(workspaceSlug)}
              className={buttonVariants({ variant: "ghost" })}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2Icon
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <GraduationCapIcon className="mr-2 size-4" aria-hidden="true" />
              )}
              {pending ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}

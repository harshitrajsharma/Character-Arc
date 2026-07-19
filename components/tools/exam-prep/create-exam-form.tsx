"use client"

import { useActionState, useEffect } from "react"
import { CalendarIcon, GraduationCapIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createExamAction, type CreateExamActionState } from "@/lib/tools/exam-prep/actions/create-actions"
import { toast } from "sonner"

const initialState: CreateExamActionState = { status: "idle", message: "" }

type CreateExamFormProps = {
  workspaceSlug: string
  idempotencyKey: string
}

import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function CreateExamForm({
  workspaceSlug,
  idempotencyKey,
}: CreateExamFormProps) {
  const [state, formAction, pending] = useActionState(createExamAction, initialState)

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error("Error", { description: state.message })
    }
  }, [state])

  if (state.status === "success") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-violet-soft text-brand-violet-ink">
          <GraduationCapIcon className="size-8" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-2xl font-semibold">Exam created!</h2>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href={workspaceRoutes.examPrep.home(workspaceSlug)} className={buttonVariants({ variant: "outline" })}>
            View all exams
          </Link>
          {state.rootBlockId ? (
            <Link href={workspaceRoutes.examPrep.exam(workspaceSlug, state.rootBlockId)} className={buttonVariants()}>
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
      className="mx-auto max-w-2xl mt-20 px-4 py-12 sm:px-6"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="mb-8 flex items-center gap-4">
        <Link
          href={workspaceRoutes.examPrep.home(workspaceSlug)}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">Back</span>
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-semibold">Track a new exam</h1>
          <p className="text-sm text-muted-foreground">Setup the foundation to track your syllabus.</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-2">
          <Label htmlFor="title">Exam Name</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g., GATE 2027 Computer Science"
            required
            maxLength={120}
            defaultValue={state.inputs?.title ?? ""}
            autoFocus
          />
          {state.fieldErrors?.title ? (
            <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="summary">Description</Label>
          <Textarea
            id="summary"
            name="summary"
            placeholder="Optional context about why you are taking this exam..."
            className="min-h-[100px] resize-none"
            maxLength={4000}
            defaultValue={state.inputs?.summary ?? ""}
          />
          {state.fieldErrors?.summary ? (
            <p className="text-sm text-destructive">{state.fieldErrors.summary[0]}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="examDate">Target Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="examDate"
                name="examDate"
                type="date"
                className="pl-9"
                defaultValue={state.inputs?.examDate ?? ""}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="targetMarks">Target Score / Rank</Label>
            <Input
              id="targetMarks"
              name="targetMarks"
              type="number"
              min="0"
              placeholder="e.g., 75"
              defaultValue={state.inputs?.targetMarks ?? ""}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-4 border-t border-border pt-6">
          <Link href={workspaceRoutes.examPrep.home(workspaceSlug)} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <GraduationCapIcon className="mr-2 size-4" aria-hidden="true" />
            )}
            {pending ? "Creating..." : "Create Exam"}
          </Button>
        </div>
      </div>
    </form>
  )
}

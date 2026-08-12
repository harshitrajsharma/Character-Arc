"use client"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"

import { startTransition, useActionState, useEffect, useState } from "react"
import { MoreVerticalIcon, Trash2Icon, PencilIcon, SettingsIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import {
  deleteExamAction,
  type DeleteExamActionState,
} from "@/lib/tools/exam-prep/actions/create-actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { EditExamDialog } from "./edit-exam-dialog"

const INITIAL_STATE: DeleteExamActionState = { status: "idle", message: "" }

type ExamListActionsProps = {
  workspaceSlug: string
  examId: string
  title: string
  summary: string | null
  expectedStartDate: string | null
  targetMarks: number | null
}

export function ExamListActions({
  workspaceSlug,
  examId,
  title,
  summary,
  expectedStartDate,
  targetMarks,
}: ExamListActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [idempotencyKey] = useState(() => createIdempotencyKey())
  const [state, formAction, pending] = useActionState(
    deleteExamAction,
    INITIAL_STATE
  )

  useEffect(() => {
    if (state.status === "success") {
      startTransition(() => {
        setOpen(false)
        router.refresh()
      })
    }
  }, [router, state.status])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 sm:size-9"
              aria-label={`Open actions for ${title}`}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation()
              setEditOpen(true)
            }}
          >
            <PencilIcon /> Edit exam
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation()
              router.push(workspaceRoutes.examPrep.settings(workspaceSlug, examId))
            }}
          >
            <SettingsIcon /> Exam settings
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.stopPropagation()
              setOpen(true)
            }}
          >
            <Trash2Icon /> Permanently delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Permanently delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-medium text-foreground">{title}</strong>{" "}
              and its test records will be permanently removed. Subjects and
              their chapters and topics are removed only when no other active
              exam uses them.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {state.status === "error" ? (
            <p className="text-sm text-destructive" aria-live="polite">
              {state.message}
            </p>
          ) : null}

          <form action={formAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="examId" value={examId} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Keep exam</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Deleting" : "Delete permanently"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <EditExamDialog
        workspaceSlug={workspaceSlug}
        examId={examId}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={{
          title,
          summary: summary || "",
          expectedStartDate: expectedStartDate || "",
          targetMarks: targetMarks?.toString() || "",
        }}
      />
    </>
  )
}

'use client';

import { useActionState, useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { createChapterAction, type CreateChapterState } from "@/lib/tools/exam-prep/actions/syllabus-actions"

interface AddChapterDialogProps {
  workspaceSlug: string;
  examId: string;
  subjectId: string;
}

export function AddChapterDialog({ workspaceSlug, examId, subjectId }: AddChapterDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  
  const [state, action, isPending] = useActionState<CreateChapterState, FormData>(
    createChapterAction,
    { status: "idle" }
  )

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Chapter created successfully")
      formRef.current?.reset()
      router.refresh()
      queueMicrotask(() => setOpen(false))
    } else if (state.status === "error") {
      toast.error(state.message || "Failed to create chapter")
    }
  }, [router, state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
          <Plus data-icon="inline-start" />
          Add Chapter
      </DialogTrigger>
      <DialogContent>
        <form action={action} ref={formRef}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>
              Add a new chapter to organize your topics.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4 sm:py-6">
            <Field data-invalid={Boolean(state.fieldErrors?.title)}>
              <FieldLabel htmlFor="title">Chapter name</FieldLabel>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Kinematics"
                required
                aria-invalid={Boolean(state.fieldErrors?.title)}
              />
              <FieldError>{state.fieldErrors?.title?.[0]}</FieldError>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="important"
                name="important"
              />
              <div>
                <FieldLabel htmlFor="important">Mark as high yield</FieldLabel>
                <FieldDescription>
                  Important chapters will be highlighted in your dashboard.
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter className="sm:justify-end gap-2 sm:gap-0 mt-4 sm:mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Spinner className="mr-2" />}
              Create Chapter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 

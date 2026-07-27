"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createSubjectAction } from "@/lib/tools/exam-prep/actions/subject-actions"

interface CreateSubjectDialogProps {
  workspaceSlug: string
  examId: string
  children: React.ReactElement
}

export function CreateSubjectDialog({ workspaceSlug, examId, children }: CreateSubjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createSubjectAction, {
    status: "idle",
  })

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message)
    }
    if (state.status === "success") {
      toast.success("Subject created!")
      const timer = window.setTimeout(() => setOpen(false), 0)
      return () => window.clearTimeout(timer)
    }
  }, [state.message, state.status])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Create Subject</DialogTitle>
          <DialogDescription>
            Add a new subject to track progress for this exam.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="examId" value={examId} />

          <div className="space-y-2">
            <Label htmlFor="title">Subject Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Mathematics, Physics, History..."
              required
              maxLength={120}
              aria-invalid={!!state.fieldErrors?.title}
              aria-errormessage={state.fieldErrors?.title?.join(", ")}
            />
            {state.fieldErrors?.title && (
              <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary (Optional)</Label>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Brief description of the subject..."
              maxLength={4000}
              className="min-h-25 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightage">Weightage</Label>
              <Input
                id="weightage"
                name="weightage"
                placeholder="Ex: 10"
                type="number"
                min="0"
                max="100"
                required
                aria-invalid={!!state.fieldErrors?.weightage}
              />
              <p className="text-xs text-muted-foreground">Marks weight in the exam.</p>
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="ononLevel">Foundation Level</Label>
              <Select 
              name="foundationLevel" 
              defaultValue="Beginner">
                <SelectTrigger id="foundationLevel">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your current proficiency.</p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
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
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Subject"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

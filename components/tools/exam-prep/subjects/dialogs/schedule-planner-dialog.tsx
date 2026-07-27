"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateScheduledTestsAction } from "@/lib/tools/exam-prep/actions/test-actions"
import type { ScheduledTest } from "@/types/progressapp/domain"

type SchedulePlannerDialogProps = {
  workspaceSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  blockId: string
  title: string
  initialScheduledTests?: ScheduledTest[]
}

export function SchedulePlannerDialog({
  workspaceSlug,
  open,
  onOpenChange,
  blockId,
  title,
  initialScheduledTests = [],
}: SchedulePlannerDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [tests, setTests] = useState<ScheduledTest[]>(initialScheduledTests)

  function addTest() {
    setTests([...tests, { id: crypto.randomUUID(), title: "", date: "" }])
  }

  function updateTest(id: string, field: keyof ScheduledTest, value: string) {
    setTests(tests.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function removeTest(id: string) {
    setTests(tests.filter(t => t.id !== id))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Filter out completely empty rows
    const validTests = tests.filter(t => t.title.trim() !== "")
    
    startTransition(async () => {
      try {
        await updateScheduledTestsAction(workspaceSlug, blockId, validTests)
        toast.success("Schedule updated")
        onOpenChange(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save schedule")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Schedule: {title}</DialogTitle>
          <DialogDescription>
            Plan your upcoming tests below. Scheduled tests help you stay organized but do not change your progress targets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-3">
            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm">No tests scheduled yet.</p>
                <p className="text-xs">Add your first test below to plan your schedule.</p>
              </div>
            ) : (
              tests.map((test, index) => (
                <div key={test.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input 
                      placeholder={`Test ${index + 1} Name (e.g. Full Mock 1)`} 
                      value={test.title} 
                      onChange={(e) => updateTest(test.id, "title", e.target.value)} 
                      required
                    />
                  </div>
                  <div className="w-1/3">
                    <Input 
                      placeholder="Date (Optional)" 
                      value={test.date || ""} 
                      onChange={(e) => updateTest(test.id, "date", e.target.value)} 
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTest(test.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addTest} className="w-full border-dashed">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Scheduled Test
          </Button>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-brand-cyan-solid hover:bg-brand-cyan-solid/90 text-brand-cyan-ink">
              {isPending ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

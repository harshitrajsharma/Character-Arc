"use client"

import { useState, useTransition, useEffect } from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { syncSubjectTestScheduleAction } from "@/lib/tools/exam-prep/actions/test-actions"
import type { ScheduledTest, ChapterWithRelations } from "@/types/progressapp/domain"

type SubjectTestPlannerDialogProps = {
  workspaceSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId: string
  subjectName: string
  chapters: ChapterWithRelations[]
  subjectTests: ScheduledTest[]
}

export function SubjectTestPlannerDialog({
  workspaceSlug,
  open,
  onOpenChange,
  subjectId,
  subjectName,
  chapters,
  subjectTests = [],
}: SubjectTestPlannerDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [tests, setTests] = useState<ScheduledTest[]>([])

  // We gather all tests from the subject AND all chapters initially
  useEffect(() => {
    if (open) {
      const unified: ScheduledTest[] = [...subjectTests]
      chapters.forEach(chap => {
        if (chap.scheduledTests) {
          unified.push(...chap.scheduledTests)
        }
      })
      setTests(unified)
    }
  }, [open, subjectTests, chapters])

  function addTest() {
    setTests([...tests, { id: crypto.randomUUID(), title: "", date: "", scope: "subject" }])
  }

  function updateTest(id: string, updates: Partial<ScheduledTest>) {
    setTests(tests.map(t => t.id === id ? { ...t, ...updates } : t))
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
        await syncSubjectTestScheduleAction(workspaceSlug, subjectId, validTests)
        toast.success("Schedule updated and synced across chapters")
        onOpenChange(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save schedule")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 p-4 sm:h-[95vh] sm:max-w-4xl sm:rounded-xl sm:border sm:p-6">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle>Unified Test Schedule: {subjectName}</DialogTitle>
          <DialogDescription>
            Plan your master test series here. Tests assigned to a specific chapter will appear in that chapter's tracker. Multi-chapter and subject tests will appear below the syllabus.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm">No tests scheduled yet.</p>
                <p className="text-xs">Add your first test below.</p>
              </div>
            ) : (
              tests.map((test, index) => (
                <div key={test.id} className="relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-2 sm:p-3">
                  <div className="absolute right-2 top-2 sm:hidden">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTest(test.id)} className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 pr-8 sm:pr-0">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">Test Name</label>
                    <Input 
                      placeholder={`Test ${index + 1} Name`} 
                      value={test.title} 
                      onChange={(e) => updateTest(test.id, { title: e.target.value })} 
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:w-[380px] sm:gap-2">
                    <div className="w-full sm:w-[230px]">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">Scope</label>
                      <Select
                        value={test.scope === "chapter" ? (test.targetChapterIds?.[0] ?? "") : (test.scope || "subject")}
                        onValueChange={(val) => {
                          if (val === "subject" || val === "multi-chapter") {
                            updateTest(test.id, { scope: val as "subject" | "multi-chapter", targetChapterIds: undefined })
                          } else {
                            updateTest(test.id, { scope: "chapter", targetChapterIds: [val || ""] })
                          }
                        }}
                      >
                        <SelectTrigger className="w-full truncate">
                          <span className="truncate block w-full text-left">
                            {(() => {
                              const v = test.scope === "chapter" ? test.targetChapterIds?.[0] : (test.scope || "subject");
                              if (v === "subject") return "Full Subject Test";
                              if (v === "multi-chapter") return "Multi-Chapter Test";
                              const c = chapters.find(ch => ch.id === v);
                              return c ? `Ch: ${c.name}` : "Select Target";
                            })()}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subject" className="font-semibold text-brand-cyan-ink dark:text-brand-cyan-solid">Full Subject Test</SelectItem>
                          <SelectItem value="multi-chapter" className="font-semibold text-brand-violet">Multi-Chapter Test</SelectItem>
                          {chapters.map(c => (
                            <SelectItem key={c.id} value={c.id} className="ml-2 text-sm text-muted-foreground">Ch: {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-[170px]">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">Date</label>
                      <Popover>
                        <PopoverTrigger 
                          render={
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !test.date && "text-muted-foreground"
                              )}
                            />
                          }
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {test.date ? format(new Date(test.date), "PPP") : <span>Pick a date</span>}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={test.date ? new Date(test.date) : undefined}
                            onSelect={(date) => {
                              updateTest(test.id, { date: date ? format(date, "yyyy-MM-dd") : "" })
                            }}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTest(test.id)} className="hidden shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:inline-flex">
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            
            <Button type="button" variant="outline" size="sm" onClick={addTest} className="w-full border-dashed mt-2">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Scheduled Test
            </Button>
          </div>

          <div className="shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-brand-cyan-solid hover:bg-brand-cyan-solid/90 text-brand-cyan-ink">
              {isPending ? "Saving..." : "Save Master Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

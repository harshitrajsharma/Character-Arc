"use client"

import { useEffect, useState } from "react"
import { PlusIcon, FileTextIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TestRecordDialog } from "./test-record-dialog"
import { getTestRecordsForSubjectAction, deleteTestRecordAction } from "@/lib/tools/exam-prep/actions/test-actions"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"
import type { ScheduledTest } from "@/types/progressapp/domain"

type SubjectTestViewProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  scheduledTests?: ScheduledTest[]
  targetTests?: number
}

export function SubjectTestView({ workspaceSlug, examId, subjectId, scheduledTests = [], targetTests = 1 }: SubjectTestViewProps) {
  const [records, setRecords] = useState<BaseTestRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BaseTestRecord | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const subjectLevelScheduledTests = scheduledTests.filter(t => t.scope === "subject" || t.scope === "multi-chapter" || !t.scope)

  async function loadRecords() {
    setIsLoading(true)
    try {
      const data = await getTestRecordsForSubjectAction(workspaceSlug, subjectId)
      setRecords(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getTestRecordsForSubjectAction(workspaceSlug, subjectId)
      .then((data) => {
        if (!cancelled) setRecords(data)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subjectId, workspaceSlug])

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this test record?")) return
    try {
      await deleteTestRecordAction(workspaceSlug, id)
      await loadRecords()
    } catch (e) {
      console.error(e)
    }
  }

  function openNewDialog() {
    setSelectedRecord(undefined)
    setIsDialogOpen(true)
  }

  function openEditDialog(record: BaseTestRecord) {
    setSelectedRecord(record)
    setIsDialogOpen(true)
  }

  const completedCount = records.length
  const totalTarget = Math.max(subjectLevelScheduledTests.length, targetTests)
  const progressPercent = totalTarget === 0 ? 100 : Math.min(Math.round((completedCount / totalTarget) * 100), 100)

  return (
    <Card className="mt-8 border-brand-violet-line/50 shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-lg sm:text-xl">Subject & Multi-Chapter Tests</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Progress: {completedCount} / {totalTarget} tests completed ({progressPercent}%)
          </p>
        </div>
        <Button onClick={openNewDialog} size="sm" className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-4 w-4" />
          Record Test
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <FileTextIcon className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">No subject tests recorded yet.</p>
            <p className="text-xs">Take a mock test and record your score here!</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {records.map(record => {
              const percentage = Math.round((Number(record.marksObtained) / Number(record.totalMarks)) * 100)
              
              return (
                <div key={record.id} className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-brand-violet-line/50">
                  <div>
                    <h3 className="line-clamp-2 font-semibold leading-tight">{record.title}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-brand-violet">{percentage}%</span>
                      <span className="text-xs text-muted-foreground">
                        ({Number(record.marksObtained)}/{Number(record.totalMarks)})
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => openEditDialog(record)}>
                      View & Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(record.id)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <TestRecordDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          workspaceSlug={workspaceSlug}
          examId={examId}
          subjectId={subjectId}
          initialData={selectedRecord ? {
            id: selectedRecord.id,
            title: selectedRecord.title,
            marksObtained: Number(selectedRecord.marksObtained),
            totalMarks: Number(selectedRecord.totalMarks),
            summary: selectedRecord.summary,
          } : undefined}
          onSuccess={loadRecords}
        />
      </CardContent>
    </Card>
  )
}

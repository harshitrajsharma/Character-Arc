"use client"

import { useRef, useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { deleteTestRecordAction } from "@/lib/tools/exam-prep/actions/test-actions"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"
import { getTargetMessage } from "./test-record-helpers"
import { TestRecordCard } from "./test-record-card"
import { TestRecordDialog } from "./test-record-dialog"
import { TestRecordSummaryDialog } from "./test-record-summary-dialog"
import { useSubjectProgress } from "../subject-progress-context"

type TestRecordsSectionProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  chapterId?: string
  title: string
  records: BaseTestRecord[]
  targetTests?: number
  addLabel?: string
}

export function TestRecordsSection({
  workspaceSlug,
  examId,
  subjectId,
  chapterId,
  title,
  records,
  targetTests,
  addLabel = "Record unscheduled result",
}: TestRecordsSectionProps) {
  const { upsertTestRecord, removeTestRecord } = useSubjectProgress()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<
    BaseTestRecord | undefined
  >()
  const [viewingRecord, setViewingRecord] = useState<
    BaseTestRecord | undefined
  >()
  const [deletingRecord, setDeletingRecord] = useState<
    BaseTestRecord | undefined
  >()
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteKeys = useRef(new Map<string, string>())

  function handleAdd() {
    setEditingRecord(undefined)
    setDialogOpen(true)
  }

  function handleEdit(record: BaseTestRecord) {
    setEditingRecord(record)
    setDialogOpen(true)
  }

  function handleDeleteRequest(record: BaseTestRecord) {
    if (!deleteKeys.current.has(record.id)) {
      deleteKeys.current.set(record.id, createIdempotencyKey())
    }
    setDeletingRecord(record)
  }

  async function handleDelete() {
    if (!deletingRecord || isDeleting) return

    setIsDeleting(true)
    try {
      const idempotencyKey = deleteKeys.current.get(deletingRecord.id)
      const { deletedRecord } = await deleteTestRecordAction(
        workspaceSlug,
        deletingRecord.id,
        idempotencyKey
      )
      deleteKeys.current.delete(deletingRecord.id)
      removeTestRecord(deletedRecord.id)
      setDeletingRecord(undefined)
      toast.success("Test record deleted")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the test record"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const hasRecords = records.length > 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {targetTests !== undefined && (
          <p className="text-sm text-muted-foreground">
            {getTargetMessage(records.length, targetTests)}
          </p>
        )}
      </div>

      {hasRecords ? (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <TestRecordCard
              key={record.id}
              record={record}
              onView={setViewingRecord}
              onEdit={record.scheduledTestId ? undefined : handleEdit}
              onDelete={
                record.scheduledTestId ? undefined : handleDeleteRequest
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            className="h-11 w-full border-dashed border-brand-violet-line text-brand-violet-ink hover:bg-brand-violet-soft hover:text-brand-violet-ink"
          >
            <PlusIcon aria-hidden="true" className="mr-2" />
            {addLabel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-brand-violet-line bg-brand-violet-soft p-6">
          <p className="text-center text-sm text-muted-foreground">
            No tests recorded yet.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            className="h-11 border-brand-violet-line text-brand-violet-ink hover:bg-brand-violet-soft hover:text-brand-violet-ink"
          >
            <PlusIcon aria-hidden="true" className="mr-2" />
            {addLabel}
          </Button>
        </div>
      )}

      <TestRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        chapterId={chapterId}
        initialData={editingRecord}
        onSuccess={upsertTestRecord}
      />

      <TestRecordSummaryDialog
        open={Boolean(viewingRecord)}
        onOpenChange={(open) => {
          if (!open) setViewingRecord(undefined)
        }}
        record={viewingRecord}
      />

      <AlertDialog
        open={Boolean(deletingRecord)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingRecord(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test record?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletingRecord?.title}” and its saved summary will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="min-w-28"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Spinner />
              ) : (
                <Trash2Icon aria-hidden="true" className="mr-2" />
              )}
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

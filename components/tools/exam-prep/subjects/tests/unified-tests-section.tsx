"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import {
  CalendarPlusIcon,
  Trash2Icon,
  PlusIcon,
  ChevronDownIcon,
  ClipboardListIcon,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { LinkedAssessmentRow } from "./linked-assessment-row"
import { joinTestRecords, assessmentsForScope } from "./unified-test-helpers"
import { UnifiedTestRow } from "./unified-test-row"
import { TestRecordSummaryDialog } from "./test-record-summary-dialog"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"
import { Spinner } from "@/components/ui/spinner"
import { formatIsoLocalDate } from "@/lib/dates/local-date"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  deleteTestRecordAction,
  cancelScheduledTestAction,
  deleteScheduledTestAction,
  reopenScheduledTestAction,
  restoreScheduledTestAction,
} from "@/lib/tools/exam-prep/actions/test-actions"
import {
  getScheduledTestDisplayStatus,
  getScheduledTestsForChapter,
  getSubjectLevelScheduledTests,
  sortScheduledTests,
} from "@/lib/tools/exam-prep/scheduled-test-selectors"
import type { ScheduledTest } from "@/types/progressapp/domain"
import { useSubjectProgress } from "../subject-progress-context"
import { SubjectTestPlannerDialog } from "./subject-test-planner-dialog"
import { TestRecordDialog } from "./test-record-dialog"

type Confirmation = {
  action: "cancel" | "reopen" | "delete"
  scheduledTest: ScheduledTest
}

type UnifiedTestsSectionProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  chapterId?: string
  title?: string
  records: BaseTestRecord[]
  targetTests?: number
  localDate?: string
}

export function UnifiedTestsSection({
  workspaceSlug,
  examId,
  subjectId,
  chapterId,
  title = "Tests",
  records,
  localDate,
}: UnifiedTestsSectionProps) {
  const {
    subject,
    upsertScheduledTest,
    removeScheduledTest,
    upsertTestRecord,
    removeTestRecord,
  } = useSubjectProgress()
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [isPending, startTransition] = useTransition()
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<ScheduledTest>()
  const [completingTest, setCompletingTest] = useState<ScheduledTest>()
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const actionKeys = useRef(new Map<string, string>())
  const [recordOpen, setRecordOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<BaseTestRecord>()
  const [viewingRecord, setViewingRecord] = useState<BaseTestRecord>()
  const [deletingRecord, setDeletingRecord] = useState<BaseTestRecord>()
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteKeys = useRef(new Map<string, string>())

  function requestDelete(record: BaseTestRecord) {
    if (!deleteKeys.current.has(record.id))
      deleteKeys.current.set(record.id, createIdempotencyKey())
    setDeletingRecord(record)
  }

  async function deleteRecord() {
    if (!deletingRecord || isDeleting) return
    setIsDeleting(true)
    try {
      const { deletedRecord } = await deleteTestRecordAction(
        workspaceSlug,
        deletingRecord.id,
        deleteKeys.current.get(deletingRecord.id)
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

  const today = localDate ?? formatIsoLocalDate(new Date())

  const scheduledTests = useMemo(() => {
    const all = subject.scheduledTests ?? []
    const visible = chapterId
      ? getScheduledTestsForChapter(all, chapterId)
      : getSubjectLevelScheduledTests(all)
    return sortScheduledTests(visible, today)
  }, [chapterId, subject.scheduledTests, today])

  const { scheduled, standalone } = joinTestRecords(scheduledTests, records)
  const linkedAssessments = assessmentsForScope(
    subject.linkedAssessments ?? [],
    chapterId
  )

  function openCreate() {
    setEditingTest(undefined)
    setPlannerOpen(true)
  }

  function openEdit(scheduledTest: ScheduledTest) {
    setEditingTest(scheduledTest)
    setPlannerOpen(true)
  }

  function restore(scheduledTest: ScheduledTest) {
    const actionKey = getActionKey("restore", scheduledTest)
    startTransition(async () => {
      try {
        const result = await restoreScheduledTestAction({
          workspaceSlug,
          scheduledTestId: scheduledTest.id,
          expectedRevision: scheduledTest.revision,
          idempotencyKey: actionKey,
        })
        upsertScheduledTest(result.scheduledTest)
        clearActionKey("restore", scheduledTest)
        toast.success("Scheduled test restored")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not restore the test"
        )
      }
    })
  }

  function confirmAction() {
    if (!confirmation) return
    const { action, scheduledTest } = confirmation
    const actionKey = getActionKey(action, scheduledTest)

    startTransition(async () => {
      try {
        if (action === "cancel") {
          const result = await cancelScheduledTestAction({
            workspaceSlug,
            scheduledTestId: scheduledTest.id,
            expectedRevision: scheduledTest.revision,
            reason: null,
            idempotencyKey: actionKey,
          })
          upsertScheduledTest(result.scheduledTest)
          toast.success("Scheduled test cancelled")
        } else if (action === "reopen") {
          const linkedRecordId = scheduledTest.testRecordId
          const result = await reopenScheduledTestAction({
            workspaceSlug,
            scheduledTestId: scheduledTest.id,
            expectedRevision: scheduledTest.revision,
            idempotencyKey: actionKey,
          })
          upsertScheduledTest(result.scheduledTest)
          if (linkedRecordId) removeTestRecord(linkedRecordId)
          toast.success("Test reopened and its result removed")
        } else {
          await deleteScheduledTestAction({
            workspaceSlug,
            scheduledTestId: scheduledTest.id,
            expectedRevision: scheduledTest.revision,
            idempotencyKey: actionKey,
          })
          removeScheduledTest(scheduledTest.id)
          toast.success("Scheduled test deleted")
        }
        clearActionKey(action, scheduledTest)
        setConfirmation(undefined)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update the test"
        )
      }
    })
  }

  const confirmationCopy = getConfirmationCopy(confirmation)

  function getActionKey(action: string, scheduledTest: ScheduledTest) {
    const operation = `${action}:${scheduledTest.id}:${scheduledTest.revision}`
    const existing = actionKeys.current.get(operation)
    if (existing) return existing
    const key = createIdempotencyKey()
    actionKeys.current.set(operation, key)
    return key
  }

  function clearActionKey(action: string, scheduledTest: ScheduledTest) {
    actionKeys.current.delete(
      `${action}:${scheduledTest.id}:${scheduledTest.revision}`
    )
  }

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" className="min-h-11 shrink-0 sm:min-h-9" />
            }
          >
            <PlusIcon /> Add test <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-60">
            <DropdownMenuItem
              className="min-h-11"
              render={
                <Link href={workspaceRoutes.mockTests.home(workspaceSlug)} />
              }
            >
              <ClipboardListIcon /> Browse mock tests
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onClick={openCreate}>
              <CalendarPlusIcon /> Schedule a test
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11"
              onClick={() => {
                setEditingRecord(undefined)
                setRecordOpen(true)
              }}
            >
              <PlusIcon /> Record external result
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {subject.linkedAssessmentsIssue ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <p className="text-sm text-muted-foreground">
            {subject.linkedAssessmentsIssue}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 sm:min-h-9"
            disabled={isRefreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {isRefreshing ? "Refreshing..." : "Retry"}
          </Button>
        </div>
      ) : null}
      {scheduledTests.length + records.length + linkedAssessments.length ===
      0 ? (
        <div className="rounded-lg bg-muted/30 px-4 py-5">
          <p className="text-sm font-medium">
            {subject.linkedAssessmentsIssue
              ? "No scheduled or recorded tests yet"
              : "No tests yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse mock tests, schedule a test, or record an external result.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {linkedAssessments.flatMap((assessment) =>
            assessment.attempts.length > 0
              ? assessment.attempts.map((attempt) => (
                  <LinkedAssessmentRow
                    key={attempt.id}
                    assessment={assessment}
                    attempt={attempt}
                    workspaceSlug={workspaceSlug}
                  />
                ))
              : [
                  <LinkedAssessmentRow
                    key={assessment.assessmentId}
                    assessment={assessment}
                    workspaceSlug={workspaceSlug}
                  />,
                ]
          )}
          {scheduled.map(({ plan, record }) => {
            return (
              <UnifiedTestRow
                key={plan.id}
                plan={plan}
                chapters={subject.chapters}
                record={record}
                status={getScheduledTestDisplayStatus(plan, today)}
                pending={isPending}
                onView={record ? () => setViewingRecord(record) : undefined}
                onRecord={() => setCompletingTest(plan)}
                onEdit={() => openEdit(plan)}
                onCancel={() =>
                  setConfirmation({ action: "cancel", scheduledTest: plan })
                }
                onRestore={() => restore(plan)}
                onReopen={() =>
                  setConfirmation({ action: "reopen", scheduledTest: plan })
                }
                onDelete={() =>
                  setConfirmation({ action: "delete", scheduledTest: plan })
                }
              />
            )
          })}
          {standalone.map((record) => (
            <UnifiedTestRow
              key={record.id}
              record={record}
              status="completed"
              onView={() => setViewingRecord(record)}
              onEdit={
                record.scheduledTestId
                  ? undefined
                  : () => {
                      setEditingRecord(record)
                      setRecordOpen(true)
                    }
              }
              onDelete={
                record.scheduledTestId ? undefined : () => requestDelete(record)
              }
            />
          ))}
        </div>
      )}
      <TestRecordDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
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
              {deletingRecord?.title} and its saved summary will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteRecord()}
            >
              {isDeleting ? <Spinner /> : <Trash2Icon />} Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubjectTestPlannerDialog
        open={plannerOpen}
        onOpenChange={(open) => {
          setPlannerOpen(open)
          if (!open) setEditingTest(undefined)
        }}
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        subjectName={subject.name}
        chapters={subject.chapters}
        initialData={editingTest}
        defaultChapterId={editingTest ? undefined : chapterId}
        onSuccess={upsertScheduledTest}
      />

      <TestRecordDialog
        open={Boolean(completingTest)}
        onOpenChange={(open) => {
          if (!open) setCompletingTest(undefined)
        }}
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        scheduledTest={completingTest}
        onSuccess={upsertTestRecord}
        onScheduledTestSuccess={upsertScheduledTest}
      />

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirmation(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Keep test
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                confirmation?.action === "delete" ? "destructive" : "default"
              }
              onClick={confirmAction}
              disabled={isPending}
              className="min-w-28"
            >
              {isPending ? (
                <Spinner />
              ) : confirmation?.action === "delete" ? (
                <Trash2Icon />
              ) : null}
              {confirmationCopy.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function getConfirmationCopy(confirmation?: Confirmation) {
  if (confirmation?.action === "reopen") {
    return {
      title: "Reopen this test?",
      description:
        "The linked result and summary will be removed, and the test will return to your schedule.",
      actionLabel: "Reopen test",
    }
  }
  if (confirmation?.action === "delete") {
    return {
      title: "Delete this test plan?",
      description:
        "This permanently removes the schedule. Completed tests must be reopened before they can be deleted.",
      actionLabel: "Delete plan",
    }
  }
  return {
    title: "Cancel this scheduled test?",
    description:
      "It will stay in the list as cancelled and can be restored later.",
    actionLabel: "Cancel test",
  }
}

"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { CalendarPlusIcon, Trash2Icon } from "lucide-react"
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
import { formatIsoLocalDate } from "@/lib/dates/local-date"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
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
import {
  ScheduledTestCard,
  type ScheduledTestDisplayStatus,
} from "./scheduled-test-card"
import { SubjectTestPlannerDialog } from "./subject-test-planner-dialog"
import { TestRecordDialog } from "./test-record-dialog"

type Confirmation = {
  action: "cancel" | "reopen" | "delete"
  scheduledTest: ScheduledTest
}

type ScheduledTestsSectionProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  chapterId?: string
  title?: string
  localDate?: string
}

export function ScheduledTestsSection({
  workspaceSlug,
  examId,
  subjectId,
  chapterId,
  title = "Scheduled tests",
  localDate,
}: ScheduledTestsSectionProps) {
  const {
    subject,
    upsertScheduledTest,
    removeScheduledTest,
    upsertTestRecord,
    removeTestRecord,
  } = useSubjectProgress()
  const [isPending, startTransition] = useTransition()
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<ScheduledTest>()
  const [completingTest, setCompletingTest] = useState<ScheduledTest>()
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const actionKeys = useRef(new Map<string, string>())
  const today = localDate ?? formatIsoLocalDate(new Date())

  const scheduledTests = useMemo(() => {
    const all = subject.scheduledTests ?? []
    const visible = chapterId
      ? getScheduledTestsForChapter(all, chapterId)
      : getSubjectLevelScheduledTests(all)
    return sortScheduledTests(visible, today)
  }, [chapterId, subject.scheduledTests, today])

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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {chapterId
              ? "Plans that cover this chapter."
              : "Full-subject plans and upcoming mocks."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 shrink-0 sm:min-h-9"
          onClick={openCreate}
        >
          <CalendarPlusIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Schedule</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {scheduledTests.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {scheduledTests.map((scheduledTest) => (
            <ScheduledTestCard
              key={scheduledTest.id}
              scheduledTest={scheduledTest}
              chapters={subject.chapters}
              displayStatus={
                getScheduledTestDisplayStatus(
                  scheduledTest,
                  today
                ) as ScheduledTestDisplayStatus
              }
              pending={isPending}
              onComplete={setCompletingTest}
              onEdit={openEdit}
              onCancel={(candidate) =>
                setConfirmation({ action: "cancel", scheduledTest: candidate })
              }
              onRestore={restore}
              onReopen={(candidate) =>
                setConfirmation({ action: "reopen", scheduledTest: candidate })
              }
              onDelete={(candidate) =>
                setConfirmation({ action: "delete", scheduledTest: candidate })
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {chapterId
              ? "No tests are scheduled for this chapter yet."
              : "No full-subject tests are scheduled yet."}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={openCreate}>
            Plan the first test
          </Button>
        </div>
      )}

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

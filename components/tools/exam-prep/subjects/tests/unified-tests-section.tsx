"use client"

import { useId, useMemo, useRef, useState, useTransition } from "react"
import {
  CalendarPlusIcon,
  Trash2Icon,
  PlusIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  LinkIcon,
  SearchIcon,
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
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { LinkedAssessmentRow } from "./linked-assessment-row"
import {
  joinTestRecords,
  assessmentsForScope,
  filterSubjectAssessments,
  type AssessmentListFilter,
  type AssessmentStatusFilter,
} from "./unified-test-helpers"
import { Input } from "@/components/ui/input"
import { PaginationControls } from "@/components/shared/pagination-controls"
import { FilterSelectField } from "@/components/shared/filter-select-field"
import { Field, FieldLabel } from "@/components/ui/field"
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
import { SubjectAssessmentLinkDialog } from "./subject-assessment-link-dialog"
import {
  subjectAssessmentCreationHref,
  subjectTestsHref,
  type SubjectAssessmentScope,
} from "@/lib/tools/exam-prep/assessment-study-context"
import { setSubjectAssessmentLinkAction } from "@/lib/tools/exam-prep/actions/assessment-actions"
import type { SubjectLinkedAssessment } from "@/types/progressapp/domain"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [linkOpen, setLinkOpen] = useState(false)
  const [assessmentPage, setAssessmentPage] = useState(1)
  const [assessmentFilter, setAssessmentFilter] =
    useState<AssessmentListFilter>("all")
  const [assessmentSearch, setAssessmentSearch] = useState("")
  const [assessmentStatus, setAssessmentStatus] =
    useState<AssessmentStatusFilter>("all")
  const headingId = useId()
  const assessmentHeading = useRef<HTMLHeadingElement>(null)
  const [unlinking, setUnlinking] = useState<{
    assessment: SubjectLinkedAssessment
    scope: SubjectAssessmentScope
  } | null>(null)
  const [unlinkError, setUnlinkError] = useState("")
  const unlinkKey = useRef<string | null>(null)
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
  const filteredAssessments = filterSubjectAssessments(
    linkedAssessments,
    assessmentFilter,
    assessmentSearch,
    assessmentStatus
  )
  const linkedCount = linkedAssessments.filter(
    (paper) => paper.linkage === "context"
  ).length
  const scope = { examId, subjectId, ...(chapterId ? { chapterId } : {}) }
  const returnHref = subjectTestsHref(workspaceSlug, scope)
  const scopeTitle = chapterId
    ? (subject.chapters.find((chapter) => chapter.id === chapterId)?.name ??
      "this chapter")
    : subject.name
  const canWrite = subject.canManageAssessments !== false
  const toolAvailable =
    subject.assessmentToolAvailable !== false && !subject.linkedAssessmentsIssue
  const totalAssessmentPages = Math.max(
    1,
    Math.ceil(filteredAssessments.length / 10)
  )
  const currentAssessmentPage = Math.min(assessmentPage, totalAssessmentPages)
  const visibleAssessments = filteredAssessments.slice(
    (currentAssessmentPage - 1) * 10,
    currentAssessmentPage * 10
  )

  function requestUnlink(assessment: SubjectLinkedAssessment) {
    const targetChapter = subject.chapters.find(
      (chapter) => chapter.id === assessment.studyContextId
    )
    if (assessment.studyContextId !== subjectId && !targetChapter) return
    unlinkKey.current = createIdempotencyKey()
    setUnlinkError("")
    setUnlinking({
      assessment,
      scope: {
        examId,
        subjectId,
        ...(targetChapter ? { chapterId: targetChapter.id } : {}),
      },
    })
  }
  function unlinkAssessment() {
    if (!unlinking || !unlinkKey.current) return
    const operation = unlinking
    const idempotencyKey = unlinkKey.current
    startTransition(async () => {
      try {
        await setSubjectAssessmentLinkAction({
          workspaceSlug,
          ...operation.scope,
          assessmentId: operation.assessment.assessmentId,
          expectedRevision: operation.assessment.revision ?? 1,
          operation: "unlink",
          idempotencyKey,
        })
        setUnlinking(null)
        unlinkKey.current = null
        toast.success("Direct link removed", {
          description:
            "The assessment and attempts are retained. Syllabus matches can still appear here.",
        })
        startRefresh(() => router.refresh())
      } catch (cause) {
        setUnlinkError(
          cause instanceof Error
            ? cause.message
            : "Could not remove the link. Try again."
        )
      }
    })
  }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            ref={assessmentHeading}
            tabIndex={-1}
            className="scroll-mt-20 rounded-sm text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {linkedAssessments.length} assessments · {linkedCount} linked{" "}
            {chapterId ? "to this chapter" : "to this subject"}
          </p>
        </div>
        {canWrite ? (
          <div className="flex shrink-0 items-center gap-2">
            {toolAvailable ? (
              <Button
                size="sm"
                className="min-h-11"
                render={
                  <Link
                    href={subjectAssessmentCreationHref(workspaceSlug, scope)}
                  />
                }
              >
                <PlusIcon data-icon="inline-start" /> Create assessment
              </Button>
            ) : subject.assessmentToolAvailable === false ? (
              <Button
                variant="outline"
                className="min-h-11"
                render={
                  <Link href={workspaceRoutes.tools.detail("mock-tests")} />
                }
              >
                Enable assessments
              </Button>
            ) : (
              <Button variant="outline" className="min-h-11" disabled>
                Assessments unavailable
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0"
                  />
                }
              >
                More <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-60">
                <DropdownMenuGroup>
                  {toolAvailable ? (
                    <DropdownMenuItem
                      className="min-h-11"
                      onClick={() => setLinkOpen(true)}
                    >
                      <LinkIcon /> Link existing assessment
                    </DropdownMenuItem>
                  ) : null}
                  {toolAvailable ? (
                    <DropdownMenuItem
                      className="min-h-11"
                      render={
                        <Link
                          href={workspaceRoutes.mockTests.home(workspaceSlug)}
                        />
                      }
                    >
                      <ClipboardListIcon /> All assessments
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem className="min-h-11" onClick={openCreate}>
                    <CalendarPlusIcon /> Schedule an external test
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
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
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
            {subject.linkedAssessmentsIssue
              ? "Retry loading assessments to see available papers. External plans and recorded results remain usable."
              : toolAvailable
                ? "Create an assessment for this study area, link an existing one, or record an external result."
                : "Enable Assessments to create and take tests here. External test plans and results remain available."}
          </p>
        </div>
      ) : (
        <div className="min-w-0">
          {linkedAssessments.length > 0 ? (
            <div className="grid min-w-0 grid-cols-2 items-end gap-3 border-b border-border pb-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Field className="col-span-2 min-w-0 gap-1.5 lg:col-span-1">
                <FieldLabel
                  htmlFor={`${headingId}-search`}
                  className="text-xs text-muted-foreground"
                >
                  Search assessments
                </FieldLabel>
                <div className="relative min-w-0">
                  <SearchIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id={`${headingId}-search`}
                    placeholder="Search by title"
                    value={assessmentSearch}
                    className="min-h-11 pl-9"
                    onChange={(event) => {
                      setAssessmentSearch(event.target.value)
                      setAssessmentPage(1)
                    }}
                  />
                </div>
              </Field>
              <FilterSelectField
                label="Source"
                value={assessmentFilter}
                items={[
                  { value: "all", label: "All sources" },
                  { value: "linked", label: "Linked assessments" },
                  { value: "matched", label: "Syllabus matches" },
                ]}
                onChange={(value) => {
                  setAssessmentFilter(value as AssessmentListFilter)
                  setAssessmentPage(1)
                }}
              />
              <FilterSelectField
                label="Status"
                value={assessmentStatus}
                items={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "In progress" },
                  { value: "published", label: "Published" },
                  { value: "draft", label: "Draft / in review" },
                ]}
                onChange={(value) => {
                  setAssessmentStatus(value as AssessmentStatusFilter)
                  setAssessmentPage(1)
                }}
              />
            </div>
          ) : null}
          <div className="divide-y divide-border">
            {visibleAssessments.map((assessment) => (
              <LinkedAssessmentRow
                key={assessment.assessmentId}
                assessment={assessment}
                workspaceSlug={workspaceSlug}
                returnHref={returnHref}
                canWrite={canWrite}
                onUnlink={
                  assessment.linkage === "context" &&
                  (assessment.studyContextId === subjectId ||
                    subject.chapters.some(
                      (chapter) => chapter.id === assessment.studyContextId
                    ))
                    ? () => requestUnlink(assessment)
                    : undefined
                }
              />
            ))}
            {filteredAssessments.length === 0 &&
            linkedAssessments.length > 0 ? (
              <div className="py-8 text-sm">
                <p className="font-medium">No assessments match this view</p>
                <p className="mt-1 text-muted-foreground">
                  {assessmentFilter === "linked" && !linkedCount
                    ? "Create an assessment here or use More → Link existing assessment."
                    : "Try another filter or clear your search."}
                </p>
                <Button
                  variant="ghost"
                  className="mt-2 min-h-11"
                  onClick={() => {
                    setAssessmentFilter("all")
                    setAssessmentStatus("all")
                    setAssessmentSearch("")
                    setAssessmentPage(1)
                  }}
                >
                  Show all assessments
                </Button>
              </div>
            ) : null}
          </div>
          {filteredAssessments.length > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border py-3 sm:flex-row">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {(currentAssessmentPage - 1) * 10 + 1}–
                {Math.min(
                  currentAssessmentPage * 10,
                  filteredAssessments.length
                )}{" "}
                of {filteredAssessments.length} assessments
              </p>
              {totalAssessmentPages > 1 ? (
                <PaginationControls
                  page={currentAssessmentPage}
                  totalPages={totalAssessmentPages}
                  label="Subject assessment pages"
                  href={() => `#${headingId}`}
                  onNavigate={(event, page) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    )
                      return
                    event.preventDefault()
                    if (page === currentAssessmentPage) return
                    setAssessmentPage(page)
                    requestAnimationFrame(() => {
                      assessmentHeading.current?.focus({ preventScroll: true })
                      assessmentHeading.current?.scrollIntoView({
                        block: "start",
                        behavior: "instant",
                      })
                    })
                  }}
                />
              ) : null}
            </div>
          ) : null}
          {subject.linkedAssessmentsHasMore ? (
            <p className="py-3 text-xs text-muted-foreground">
              Showing the latest 100 matching assessments. Older papers remain
              available in the assessment library.
            </p>
          ) : null}
          {scheduled.length + standalone.length > 0 ? (
            <h3 className="border-t border-border pt-5 pb-2 text-sm font-semibold">
              {chapterId
                ? "External plans and recorded results"
                : "Full-subject external plans and recorded results"}
            </h3>
          ) : null}
          <div className="divide-y divide-border">
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
                  record.scheduledTestId
                    ? undefined
                    : () => requestDelete(record)
                }
              />
            ))}
          </div>
        </div>
      )}
      <SubjectAssessmentLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        workspaceSlug={workspaceSlug}
        scope={scope}
        scopeTitle={scopeTitle}
        viewerId={subject.assessmentViewerId ?? subject.userId}
      />
      <AlertDialog
        open={Boolean(unlinking)}
        onOpenChange={(open) => {
          if (!open && !isPending) setUnlinking(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this direct link?</AlertDialogTitle>
            <AlertDialogDescription>
              The assessment and its attempt history are retained. It can still
              appear here if its questions match this syllabus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {unlinkError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{unlinkError}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                unlinkAssessment()
              }}
            >
              {isPending ? "Unlinking…" : "Unlink assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

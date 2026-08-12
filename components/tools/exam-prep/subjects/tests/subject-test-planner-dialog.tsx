"use client"

import { useState, useTransition } from "react"
import { CalendarClockIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  createScheduledTestAction,
  updateScheduledTestAction,
} from "@/lib/tools/exam-prep/actions/test-actions"
import type {
  ChapterWithRelations,
  ScheduledTest,
} from "@/types/progressapp/domain"

type TestScope = ScheduledTest["scope"]

type SubjectTestPlannerDialogProps = {
  workspaceSlug: string
  examId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId: string
  subjectName: string
  chapters: ChapterWithRelations[]
  initialData?: ScheduledTest
  defaultChapterId?: string
  onSuccess?: (scheduledTest: ScheduledTest) => void
}

type FormErrors = {
  title?: string
  targetChapterIds?: string
  durationMinutes?: string
  totalMarks?: string
}

const scopeOptions = [
  { label: "Full subject", value: "subject" },
  { label: "One chapter", value: "chapter" },
  { label: "Multiple chapters", value: "multi-chapter" },
] satisfies Array<{ label: string; value: TestScope }>

export function SubjectTestPlannerDialog({
  workspaceSlug,
  examId,
  open,
  onOpenChange,
  subjectId,
  subjectName,
  chapters,
  initialData,
  defaultChapterId,
  onSuccess,
}: SubjectTestPlannerDialogProps) {
  const formKey = initialData?.id ?? `new-${defaultChapterId ?? "subject"}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,52rem)] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="m-0 px-5 py-4 pr-14 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-violet-soft text-brand-violet-ink">
              <CalendarClockIcon aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>
                {initialData ? "Edit scheduled test" : "Schedule a test"}
              </DialogTitle>
              <DialogDescription>
                Plan one test for {subjectName}. You can record its result from
                the chapter test section when it is done.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {open ? (
          <ScheduledTestForm
            key={formKey}
            workspaceSlug={workspaceSlug}
            examId={examId}
            subjectId={subjectId}
            chapters={chapters}
            initialData={initialData}
            defaultChapterId={defaultChapterId}
            onSuccess={(scheduledTest) => {
              onSuccess?.(scheduledTest)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ScheduledTestForm({
  workspaceSlug,
  examId,
  subjectId,
  chapters,
  initialData,
  defaultChapterId,
  onSuccess,
  onCancel,
}: Omit<
  SubjectTestPlannerDialogProps,
  "open" | "onOpenChange" | "subjectName"
> & {
  onSuccess: (scheduledTest: ScheduledTest) => void
  onCancel: () => void
}) {
  const initialScope: TestScope =
    initialData?.scope ?? (defaultChapterId ? "chapter" : "subject")
  const initialTargets =
    initialData?.targetChapterIds ??
    (defaultChapterId ? [defaultChapterId] : [])
  const [isPending, startTransition] = useTransition()
  const [idempotencyKey] = useState(createIdempotencyKey)
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [scope, setScope] = useState<TestScope>(initialScope)
  const [targetChapterIds, setTargetChapterIds] = useState(initialTargets)
  const [scheduledFor, setScheduledFor] = useState(
    initialData?.scheduledFor ?? ""
  )
  const [durationMinutes, setDurationMinutes] = useState<number | string>(
    initialData?.durationMinutes ?? ""
  )
  const [totalMarks, setTotalMarks] = useState<number | string>(
    initialData?.totalMarks ?? ""
  )
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [errors, setErrors] = useState<FormErrors>({})

  const availableScopeOptions = scopeOptions.filter((option) => {
    if (option.value === "chapter") return chapters.length >= 1
    if (option.value === "multi-chapter") return chapters.length >= 2
    return true
  })

  function changeScope(nextScope: TestScope | null) {
    if (!nextScope) return
    setScope(nextScope)
    setErrors((current) => ({ ...current, targetChapterIds: undefined }))

    if (nextScope === "subject") {
      setTargetChapterIds([])
      return
    }

    const validTargets = targetChapterIds.filter((targetId) =>
      chapters.some((chapter) => chapter.id === targetId)
    )
    const fallbackTarget =
      defaultChapterId &&
      chapters.some((chapter) => chapter.id === defaultChapterId)
        ? defaultChapterId
        : chapters[0]?.id

    if (nextScope === "chapter") {
      setTargetChapterIds(
        validTargets[0]
          ? [validTargets[0]]
          : fallbackTarget
            ? [fallbackTarget]
            : []
      )
      return
    }

    setTargetChapterIds(
      validTargets.length > 0
        ? validTargets
        : fallbackTarget
          ? [fallbackTarget]
          : []
    )
  }

  function toggleChapter(chapterId: string, checked: boolean) {
    setTargetChapterIds((current) =>
      checked
        ? Array.from(new Set([...current, chapterId]))
        : current.filter((targetId) => targetId !== chapterId)
    )
    setErrors((current) => ({ ...current, targetChapterIds: undefined }))
  }

  function validate() {
    const nextErrors: FormErrors = {}
    const parsedDuration =
      durationMinutes === "" ? null : Number(durationMinutes)
    const parsedTotalMarks = totalMarks === "" ? null : Number(totalMarks)

    if (!title.trim()) nextErrors.title = "Enter a test title."
    if (scope === "chapter" && targetChapterIds.length !== 1) {
      nextErrors.targetChapterIds = "Choose exactly one chapter."
    }
    if (scope === "multi-chapter" && targetChapterIds.length < 2) {
      nextErrors.targetChapterIds = "Choose at least two chapters."
    }
    if (
      parsedDuration !== null &&
      (!Number.isInteger(parsedDuration) ||
        parsedDuration < 1 ||
        parsedDuration > 1440)
    ) {
      nextErrors.durationMinutes = "Use a whole number from 1 to 1440."
    }
    if (
      parsedTotalMarks !== null &&
      (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks <= 0)
    ) {
      nextErrors.totalMarks = "Total marks must be greater than zero."
    } else if (
      parsedTotalMarks !== null &&
      (parsedTotalMarks > 999_999.99 ||
        Math.abs(parsedTotalMarks * 100 - Math.round(parsedTotalMarks * 100)) >=
          1e-8)
    ) {
      nextErrors.totalMarks =
        "Total marks must be at most 999999.99 with up to two decimal places."
    }

    setErrors(nextErrors)
    return {
      valid: Object.keys(nextErrors).length === 0,
      parsedDuration,
      parsedTotalMarks,
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validate()
    if (!validation.valid) {
      toast.error("Check the highlighted schedule fields.")
      return
    }

    startTransition(async () => {
      try {
        const plan = {
          title: title.trim(),
          scope,
          targetChapterIds,
          scheduledFor: scheduledFor || null,
          durationMinutes: validation.parsedDuration,
          totalMarks: validation.parsedTotalMarks,
          notes: notes.trim() || null,
        }
        const result = initialData
          ? await updateScheduledTestAction({
              workspaceSlug,
              scheduledTestId: initialData.id,
              expectedRevision: initialData.revision,
              idempotencyKey,
              ...plan,
            })
          : await createScheduledTestAction({
              workspaceSlug,
              examId,
              subjectId,
              idempotencyKey,
              ...plan,
            })

        toast.success(initialData ? "Scheduled test updated" : "Test scheduled")
        onSuccess(result.scheduledTest)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save the schedule"
        )
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <FieldGroup className="gap-5">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="scheduled-test-title">Test title</FieldLabel>
            <Input
              id="scheduled-test-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setErrors((current) => ({ ...current, title: undefined }))
              }}
              placeholder="e.g. Thermodynamics chapter test"
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
              aria-errormessage={
                errors.title ? "scheduled-test-title-error" : undefined
              }
              autoFocus
              disabled={isPending}
            />
            <FieldError id="scheduled-test-title-error">
              {errors.title}
            </FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.targetChapterIds)}>
            <FieldLabel htmlFor="scheduled-test-scope">Coverage</FieldLabel>
            <Select
              items={availableScopeOptions}
              value={scope}
              onValueChange={changeScope}
              disabled={isPending}
            >
              <SelectTrigger
                id="scheduled-test-scope"
                className="h-11 w-full sm:h-9"
                aria-invalid={Boolean(errors.targetChapterIds)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableScopeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Choose where this test should appear in the syllabus.
            </FieldDescription>
          </Field>

          {scope === "chapter" ? (
            <Field data-invalid={Boolean(errors.targetChapterIds)}>
              <FieldLabel htmlFor="scheduled-test-chapter">Chapter</FieldLabel>
              <Select
                items={chapters.map((chapter) => ({
                  label: chapter.name,
                  value: chapter.id,
                }))}
                value={targetChapterIds[0] ?? null}
                onValueChange={(value) =>
                  setTargetChapterIds(value ? [value] : [])
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="scheduled-test-chapter"
                  className="h-11 w-full sm:h-9"
                  aria-invalid={Boolean(errors.targetChapterIds)}
                >
                  <SelectValue placeholder="Choose a chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError>{errors.targetChapterIds}</FieldError>
            </Field>
          ) : null}

          {scope === "multi-chapter" ? (
            <FieldSet>
              <FieldLegend variant="label">Chapters</FieldLegend>
              <FieldDescription>
                Select at least two. The test will appear in every selected
                chapter, while remaining one schedule.
              </FieldDescription>
              <div
                data-slot="checkbox-group"
                className="grid gap-2 sm:grid-cols-2"
              >
                {chapters.map((chapter) => {
                  const checked = targetChapterIds.includes(chapter.id)
                  return (
                    <FieldLabel
                      key={chapter.id}
                      className="min-h-11 cursor-pointer rounded-2xl border border-border px-3 py-2"
                    >
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            toggleChapter(chapter.id, nextChecked === true)
                          }
                          disabled={isPending}
                          aria-label={chapter.name}
                        />
                        <FieldContent>
                          <span className="line-clamp-2 text-sm font-medium">
                            {chapter.name}
                          </span>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  )
                })}
              </div>
              <FieldError>{errors.targetChapterIds}</FieldError>
            </FieldSet>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="scheduled-test-date">Date</FieldLabel>
              <Input
                id="scheduled-test-date"
                type="date"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                disabled={isPending}
              />
              <FieldDescription>Optional</FieldDescription>
            </Field>

            <Field data-invalid={Boolean(errors.durationMinutes)}>
              <FieldLabel htmlFor="scheduled-test-duration">Minutes</FieldLabel>
              <Input
                id="scheduled-test-duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={1440}
                step={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                placeholder="60"
                aria-invalid={Boolean(errors.durationMinutes)}
                disabled={isPending}
              />
              <FieldError>{errors.durationMinutes}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.totalMarks)}>
              <FieldLabel htmlFor="scheduled-test-total">
                Total marks
              </FieldLabel>
              <Input
                id="scheduled-test-total"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={999999.99}
                step={0.01}
                value={totalMarks}
                onChange={(event) => setTotalMarks(event.target.value)}
                placeholder="100"
                aria-invalid={Boolean(errors.totalMarks)}
                disabled={isPending}
              />
              <FieldError>{errors.totalMarks}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="scheduled-test-notes">Plan notes</FieldLabel>
            <Textarea
              id="scheduled-test-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Focus areas, resources, or conditions for this test"
              maxLength={2000}
              rows={3}
              disabled={isPending}
            />
          </Field>
        </FieldGroup>
      </div>

      <DialogFooter className="m-0 shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : initialData
              ? "Save changes"
              : scheduledFor
                ? "Schedule test"
                : "Save plan"}
        </Button>
      </DialogFooter>
    </form>
  )
}

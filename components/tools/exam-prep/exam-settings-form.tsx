"use client"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDaysIcon,
  Clock3Icon,
  FileTextIcon,
  LandmarkIcon,
  Loader2Icon,
  SaveIcon,
  TargetIcon,
  UserIcon,
  EyeIcon,
  BotIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { FormFooter } from "@/components/ui/form-footer"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  updateExamSettingsAction,
  type UpdateExamSettingsState,
} from "@/lib/tools/exam-prep/actions/create-actions"
import type { ExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { ExamDatePicker } from "./exam-date-picker"
import { cn } from "@/lib/utils"

const initialState: UpdateExamSettingsState = { status: "idle", message: "" }

type ExamSettingsDraft = {
  title: string
  summary: string
  targetMarks: string
  targetRank: string
  scheduleStatus: string
  expectedStartDate: string
  expectedEndDate: string
  patternVersion: string
  durationMinutes: string
  totalMarks: string
  correctMarks: string
  incorrectMarks: string
  unansweredMarks: string
  examCode: string
  conductingBody: string
  officialUrl: string
  allowAgentAccess: boolean
  visibility: string
}

function toInputValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value)
}

function toDraft(exam: ExamDetail): ExamSettingsDraft {
  return {
    title: exam.title,
    summary: exam.summary ?? "",
    targetMarks: toInputValue(exam.targetMarks),
    targetRank: toInputValue(exam.targetRank),
    scheduleStatus: exam.scheduleStatus.toUpperCase(),
    expectedStartDate: toInputValue(exam.expectedStartDate),
    expectedEndDate: toInputValue(exam.expectedEndDate),
    patternVersion: toInputValue(exam.patternVersion),
    durationMinutes: toInputValue(exam.durationMinutes),
    totalMarks: toInputValue(exam.totalMarks),
    correctMarks: toInputValue(exam.scoringRules?.correctMarks),
    incorrectMarks: toInputValue(exam.scoringRules?.incorrectMarks),
    unansweredMarks: toInputValue(exam.scoringRules?.unansweredMarks),
    examCode: toInputValue(exam.examCode),
    conductingBody: toInputValue(exam.conductingBody),
    officialUrl: toInputValue(exam.officialUrl),
    allowAgentAccess: exam.allowAgentAccess ?? false,
    visibility: exam.visibility?.toUpperCase() || "PRIVATE",
  }
}

interface ExamSettingsFormProps {
  workspaceSlug: string
  exam: ExamDetail
  presentation?: "page" | "dialog"
  onCancel?: () => void
  onSaved?: () => void
}

export function ExamSettingsForm({
  workspaceSlug,
  exam,
  presentation = "page",
  onCancel,
  onSaved,
}: ExamSettingsFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    updateExamSettingsAction,
    initialState
  )
  const [draft, setDraft] = useState<ExamSettingsDraft>(() => toDraft(exam))
  const [idempotencyKey] = useState(createIdempotencyKey)

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message)
    if (state.status === "success") {
      toast.success(state.message)
      router.refresh()
      onSaved?.()
    }
  }, [onSaved, router, state])

  function handleChange(field: keyof ExamSettingsDraft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.target.type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : event.target.value
      setDraft((values) => ({ ...values, [field]: value }))
    }
  }

  const errorFor = (field: keyof NonNullable<typeof state.fieldErrors>) =>
    state.fieldErrors?.[field]?.[0]

  const [activeSectionId, setActiveSectionId] = useState("identity")

  const sections = [
    { id: "identity", label: "Identity", icon: UserIcon },
    { id: "preparation", label: "Preparation plan", icon: TargetIcon },
    { id: "pattern", label: "Paper pattern", icon: Clock3Icon },
    { id: "reference", label: "Official reference", icon: LandmarkIcon },
    { id: "access", label: "Access & Integration", icon: BotIcon },
  ] as const

  return (
    <div className={cn(
      "mx-auto max-w-5xl",
      presentation === "dialog" ? "pb-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8" : "pb-24 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-16"
    )}>
      {/* Left Navigation */}
      <nav
        aria-label="Settings sections"
        className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-border/60 px-4 pb-3 sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:mb-0 lg:block lg:overflow-visible lg:border-none lg:pb-0"
      >
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSectionId === section.id

          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setActiveSectionId(section.id)
                document.getElementById(section.id)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2.5 rounded-full px-4 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
                "lg:w-full lg:rounded-lg lg:py-2.5",
                isActive
                  ? "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{section.label}</span>
            </button>
          )
        })}
      </nav>

      <form action={formAction} className="min-w-0 space-y-16">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="examId" value={exam.id} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        {/* A. Identity */}
        <section
          id="identity"
          aria-labelledby="identity-heading"
          className="scroll-mt-24 space-y-6"
        >
          <SectionHeading
            id="identity-heading"
            icon={UserIcon}
            title="Identity"
            description="Exam name and description — the core what and why."
          />

        <FieldGroup className="gap-6">
          <Field data-invalid={Boolean(errorFor("title"))}>
            <FieldLabel htmlFor="title">
              Exam Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="title"
              name="title"
              maxLength={120}
              required
              value={draft.title}
              onChange={handleChange("title")}
              className="min-h-11 rounded-lg text-base"
              aria-invalid={Boolean(errorFor("title"))}
            />
            <FieldError>{errorFor("title")}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errorFor("summary"))}>
            <FieldLabel htmlFor="summary">
              Description <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Brief description or context of what you are preparing for..."
              maxLength={4000}
              value={draft.summary}
              onChange={handleChange("summary")}
              className="min-h-[120px] resize-y rounded-lg text-base"
              aria-invalid={Boolean(errorFor("summary"))}
            />
            <FieldError>{errorFor("summary")}</FieldError>
          </Field>
        </FieldGroup>
      </section>

      {/* B. Preparation Plan */}
      <section id="preparation" aria-labelledby="preparation-heading" className="scroll-mt-24 space-y-6">
        <SectionHeading
          id="preparation-heading"
          icon={TargetIcon}
          title="Preparation plan"
          description="Personal targets and the schedule you're working toward."
        />

        <FieldGroup className="gap-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field data-invalid={Boolean(errorFor("targetMarks"))}>
              <FieldLabel htmlFor="targetMarks">Target score</FieldLabel>
              <Input
                id="targetMarks"
                name="targetMarks"
                type="number"
                min="0"
                step="any"
                value={draft.targetMarks}
                onChange={handleChange("targetMarks")}
                placeholder="e.g. 75"
                className="min-h-11 rounded-lg"
                aria-invalid={Boolean(errorFor("targetMarks"))}
              />
              <FieldError>{errorFor("targetMarks")}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errorFor("targetRank"))}>
              <FieldLabel htmlFor="targetRank">Target rank</FieldLabel>
              <Input
                id="targetRank"
                name="targetRank"
                type="number"
                min="1"
                step="1"
                value={draft.targetRank}
                onChange={handleChange("targetRank")}
                placeholder="e.g. 500"
                className="min-h-11 rounded-lg"
                aria-invalid={Boolean(errorFor("targetRank"))}
              />
              <FieldError>{errorFor("targetRank")}</FieldError>
            </Field>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="mb-6 flex gap-3">
              <CalendarDaysIcon
                className="mt-0.5 size-4 shrink-0 text-brand-amber-ink"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium">Schedule</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use expected dates until the schedule is confirmed.
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field data-invalid={Boolean(errorFor("scheduleStatus"))}>
                <FieldLabel htmlFor="scheduleStatus">Status</FieldLabel>
                <Select
                  name="scheduleStatus"
                  value={draft.scheduleStatus}
                  onValueChange={(value) => {
                    if (!value) return
                    setDraft((values) => ({ ...values, scheduleStatus: value }))
                  }}
                >
                  <SelectTrigger
                    id="scheduleStatus"
                    className="min-h-11 w-full rounded-lg bg-background"
                    aria-invalid={Boolean(errorFor("scheduleStatus"))}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="EXPECTED">Expected</SelectItem>
                    <SelectItem value="ANNOUNCED">Announced</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="POSTPONED">Postponed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{errorFor("scheduleStatus")}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errorFor("expectedStartDate"))}>
                <FieldLabel htmlFor="expectedStartDate">Start date</FieldLabel>
                <ExamDatePicker
                  id="expectedStartDate"
                  name="expectedStartDate"
                  defaultValue={draft.expectedStartDate}
                  hasError={Boolean(errorFor("expectedStartDate"))}
                />
                <FieldError>{errorFor("expectedStartDate")}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errorFor("expectedEndDate"))}>
                <FieldLabel htmlFor="expectedEndDate">End date</FieldLabel>
                <ExamDatePicker
                  id="expectedEndDate"
                  name="expectedEndDate"
                  defaultValue={draft.expectedEndDate}
                  hasError={Boolean(errorFor("expectedEndDate"))}
                />
                <FieldError>{errorFor("expectedEndDate")}</FieldError>
              </Field>
            </div>
          </div>
        </FieldGroup>
      </section>

      {/* C. Paper Pattern */}
      <section id="pattern" aria-labelledby="pattern-heading" className="scroll-mt-24 space-y-6">
        <SectionHeading
          id="pattern-heading"
          icon={Clock3Icon}
          title="Paper pattern"
          description="Format and marking rules for scoring calculations."
        />

        <FieldGroup className="gap-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Field data-invalid={Boolean(errorFor("patternVersion"))}>
              <FieldLabel htmlFor="patternVersion">Version</FieldLabel>
              <Input
                id="patternVersion"
                name="patternVersion"
                type="number"
                min="1"
                step="1"
                value={draft.patternVersion}
                onChange={handleChange("patternVersion")}
                className="min-h-11 rounded-lg"
                aria-invalid={Boolean(errorFor("patternVersion"))}
              />
              <FieldError>{errorFor("patternVersion")}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errorFor("durationMinutes"))}>
              <FieldLabel htmlFor="durationMinutes">Duration (min)</FieldLabel>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="1"
                step="1"
                value={draft.durationMinutes}
                onChange={handleChange("durationMinutes")}
                placeholder="e.g. 180"
                className="min-h-11 rounded-lg"
                aria-invalid={Boolean(errorFor("durationMinutes"))}
              />
              <FieldError>{errorFor("durationMinutes")}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errorFor("totalMarks"))}>
              <FieldLabel htmlFor="totalMarks">Total marks</FieldLabel>
              <Input
                id="totalMarks"
                name="totalMarks"
                type="number"
                min="1"
                step="any"
                value={draft.totalMarks}
                onChange={handleChange("totalMarks")}
                placeholder="e.g. 100"
                className="min-h-11 rounded-lg"
                aria-invalid={Boolean(errorFor("totalMarks"))}
              />
              <FieldError>{errorFor("totalMarks")}</FieldError>
            </Field>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="mb-6 flex gap-3">
              <FileTextIcon
                className="mt-0.5 size-4 shrink-0 text-brand-violet-ink"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium">Marking rules</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Blank values are not stored. Incorrect-answer marks can only be
                  zero or negative.
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field data-invalid={Boolean(errorFor("correctMarks"))}>
                <FieldLabel htmlFor="correctMarks">Correct answer</FieldLabel>
                <Input
                  id="correctMarks"
                  name="correctMarks"
                  type="number"
                  step="any"
                  value={draft.correctMarks}
                  onChange={handleChange("correctMarks")}
                  placeholder="e.g. 4"
                  className="min-h-11 rounded-lg bg-background"
                  aria-invalid={Boolean(errorFor("correctMarks"))}
                />
                <FieldError>{errorFor("correctMarks")}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errorFor("incorrectMarks"))}>
                <FieldLabel htmlFor="incorrectMarks">Incorrect answer</FieldLabel>
                <Input
                  id="incorrectMarks"
                  name="incorrectMarks"
                  type="number"
                  max="0"
                  step="any"
                  value={draft.incorrectMarks}
                  onChange={handleChange("incorrectMarks")}
                  placeholder="e.g. -1 or 0"
                  className="min-h-11 rounded-lg bg-background"
                  aria-invalid={Boolean(errorFor("incorrectMarks"))}
                />
                <FieldError>{errorFor("incorrectMarks")}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errorFor("unansweredMarks"))}>
                <FieldLabel htmlFor="unansweredMarks">Unanswered</FieldLabel>
                <Input
                  id="unansweredMarks"
                  name="unansweredMarks"
                  type="number"
                  step="any"
                  value={draft.unansweredMarks}
                  onChange={handleChange("unansweredMarks")}
                  placeholder="e.g. 0"
                  className="min-h-11 rounded-lg bg-background"
                  aria-invalid={Boolean(errorFor("unansweredMarks"))}
                />
                <FieldError>{errorFor("unansweredMarks")}</FieldError>
              </Field>
            </div>
          </div>
        </FieldGroup>
      </section>

      {/* D. Official Reference */}
      <section id="reference" aria-labelledby="reference-heading" className="scroll-mt-24 space-y-6">
        <SectionHeading
          id="reference-heading"
          icon={LandmarkIcon}
          title="Official reference"
          description="Keep one trustworthy source close to the plan so the latest notices are easy to find."
        />

        <FieldGroup className="gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="examCode">Exam code</FieldLabel>
              <Input
                id="examCode"
                name="examCode"
                value={draft.examCode}
                onChange={handleChange("examCode")}
                placeholder="e.g. GATE-CS-2027"
                maxLength={80}
                className="min-h-11 rounded-lg"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="conductingBody">Conducting body</FieldLabel>
              <Input
                id="conductingBody"
                name="conductingBody"
                value={draft.conductingBody}
                onChange={handleChange("conductingBody")}
                placeholder="e.g. IIT Roorkee"
                maxLength={120}
                className="min-h-11 rounded-lg"
              />
            </Field>
          </div>

          <Field data-invalid={Boolean(errorFor("officialUrl"))}>
            <FieldLabel htmlFor="officialUrl">Official URL</FieldLabel>
            <Input
              id="officialUrl"
              name="officialUrl"
              type="url"
              value={draft.officialUrl}
              onChange={handleChange("officialUrl")}
              placeholder="https://..."
              maxLength={512}
              className="min-h-11 rounded-lg"
              aria-invalid={Boolean(errorFor("officialUrl"))}
            />
            <FieldError>{errorFor("officialUrl")}</FieldError>
          </Field>
        </FieldGroup>
      </section>

      {/* E. Access & Integration */}
      <section id="access" aria-labelledby="access-heading" className="scroll-mt-24 space-y-6">
        <SectionHeading
          id="access-heading"
          icon={BotIcon}
          title="Access & Integration"
          description="Control how your personal agent interacts with this exam."
        />

        <FieldGroup className="gap-0 divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/10">
          <Field className="flex items-start justify-between gap-8 p-5 sm:p-6">
            <div className="space-y-1">
              <FieldLabel htmlFor="allowAgentAccess" className="text-base font-medium">
                Agent access
              </FieldLabel>
              <FieldDescription>
                Allow your local personal agent to read this exam plan and push
                progress updates, feedback, or instructions to it via MCP.
              </FieldDescription>
            </div>
            <div className="pt-1">
              <Switch
                id="allowAgentAccess"
                name="allowAgentAccess"
                checked={draft.allowAgentAccess}
                onCheckedChange={(checked) =>
                  setDraft((values) => ({ ...values, allowAgentAccess: checked }))
                }
              />
              <input
                type="hidden"
                name="allowAgentAccess"
                value={draft.allowAgentAccess ? "on" : "off"}
              />
            </div>
          </Field>

          <Field className="flex items-center justify-between gap-8 p-5 sm:p-6">
            <div className="space-y-1">
              <FieldLabel htmlFor="visibility" className="flex items-center gap-2 text-base font-medium">
                <EyeIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                Visibility
              </FieldLabel>
              <FieldDescription>
                Who can see this exam and its preparation progress.
              </FieldDescription>
            </div>
            <div className="w-40 shrink-0">
              <Select
                name="visibility"
                value={draft.visibility}
                onValueChange={(value) => {
                  if (!value) return
                  setDraft((values) => ({ ...values, visibility: value }))
                }}
              >
                <SelectTrigger id="visibility" className="min-h-10 w-full rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="WORKSPACE">Workspace</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
        </FieldGroup>
      </section>

      {presentation === "dialog" ? (
        <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 rounded-full"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="h-9 px-5 rounded-full bg-primary hover:bg-primary/90"
          >
            {isPending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      ) : (
        <FormFooter className="fixed inset-x-0 bottom-0 z-10 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:px-6 md:px-8 xl:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full sm:min-w-[100px]"
              onClick={() => (onCancel ? onCancel() : router.back())}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-11 rounded-full bg-primary hover:bg-primary/90 sm:min-w-[140px]"
            >
              {isPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 size-4" />
              )}
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </FormFooter>
      )}
      </form>
    </div>
  )
}

function SectionHeading({
  id,
  icon: Icon,
  title,
  description,
}: {
  id: string
  icon: typeof TargetIcon
  title: string
  description: string
}) {
  return (
    <header className="border-b border-border/60 pb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
        <Icon className="size-4" aria-hidden="true" />
        <h2 id={id} className="font-heading text-xl font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </header>
  )
}
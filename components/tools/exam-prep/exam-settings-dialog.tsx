"use client"

import * as React from "react"
import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import {
  BotIcon,
  CalendarDaysIcon,
  Clock3Icon,
  EyeIcon,
  FileTextIcon,
  GraduationCapIcon,
  LandmarkIcon,
  Loader2Icon,
  SaveIcon,
  TargetIcon,
  UserRoundIcon,
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  updateExamSettingsAction,
  type UpdateExamSettingsState,
} from "@/lib/tools/exam-prep/actions/create-actions"
import type { ExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import type { ExamDetailHeaderData } from "./exam-detail-types"
import { ExamDatePicker } from "./exam-date-picker"
import { cn } from "@/lib/utils"

export type ExamSettingsSectionKey =
  "identity" | "preparation" | "pattern" | "reference" | "access"

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

type Section = {
  key: ExamSettingsSectionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const sections: Section[] = [
  { key: "identity", label: "Core Identity", icon: UserRoundIcon },
  { key: "preparation", label: "Goals & Timeline", icon: TargetIcon },
  { key: "pattern", label: "Paper Pattern", icon: Clock3Icon },
  { key: "reference", label: "Official Source", icon: LandmarkIcon },
  { key: "access", label: "Agent & Privacy", icon: BotIcon },
]

const sectionByField: Record<string, ExamSettingsSectionKey> = {
  title: "identity",
  summary: "identity",
  targetMarks: "preparation",
  targetRank: "preparation",
  scheduleStatus: "preparation",
  expectedStartDate: "preparation",
  expectedEndDate: "preparation",
  durationMinutes: "pattern",
  totalMarks: "pattern",
  correctMarks: "pattern",
  incorrectMarks: "pattern",
  unansweredMarks: "pattern",
  examCode: "reference",
  conductingBody: "reference",
  officialUrl: "reference",
  allowAgentAccess: "access",
  visibility: "access",
}

const initialState: UpdateExamSettingsState = { status: "idle", message: "" }

function toInputValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

function toDraft(exam: ExamDetail | ExamDetailHeaderData): ExamSettingsDraft {
  const details = exam as ExamDetail
  return {
    title: exam.title,
    summary: exam.summary ?? "",
    targetMarks: toInputValue(details.targetMarks),
    targetRank: toInputValue(details.targetRank),
    scheduleStatus: exam.scheduleStatus.toUpperCase(),
    expectedStartDate: toInputValue(exam.expectedStartDate),
    expectedEndDate: toInputValue(details.expectedEndDate),
    patternVersion: toInputValue(details.patternVersion || 1),
    durationMinutes: toInputValue(details.durationMinutes),
    totalMarks: toInputValue(details.totalMarks),
    correctMarks: toInputValue(details.scoringRules?.correctMarks ?? 4),
    incorrectMarks: toInputValue(details.scoringRules?.incorrectMarks ?? -1),
    unansweredMarks: toInputValue(details.scoringRules?.unansweredMarks ?? 0),
    examCode: toInputValue(details.examCode),
    conductingBody: toInputValue(details.conductingBody),
    officialUrl: toInputValue(details.officialUrl),
    allowAgentAccess: details.allowAgentAccess ?? false,
    visibility: details.visibility?.toUpperCase() || "PRIVATE",
  }
}

type ExamSettingsDialogProps = {
  workspaceSlug: string
  exam: ExamDetail | ExamDetailHeaderData
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExamSettingsDialog({
  workspaceSlug,
  exam,
  open,
  onOpenChange,
}: ExamSettingsDialogProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] =
    useState<ExamSettingsSectionKey>("identity")
  const [draft, setDraft] = useState<ExamSettingsDraft>(() => toDraft(exam))
  const [idempotencyKey] = useState(createIdempotencyKey)
  const [isAgentAccessConfirmationOpen, setIsAgentAccessConfirmationOpen] =
    useState(false)
  const [state, formAction, isPending] = useActionState(
    updateExamSettingsAction,
    initialState
  )

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message)
    }
    if (state.status === "success") {
      toast.success(state.message || "Exam settings updated.")
      router.refresh()
      onOpenChange(false)
    }
  }, [onOpenChange, router, state])

  function handleChange(field: keyof ExamSettingsDraft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((current) => ({
        ...current,
        [field]: event.currentTarget.value,
      }))
    }
  }

  function handleAgentAccessChange(checked: boolean) {
    if (checked && !draft.allowAgentAccess) {
      setIsAgentAccessConfirmationOpen(true)
      return
    }
    setDraft((current) => ({ ...current, allowAgentAccess: checked }))
  }

  const errorFor = (field: keyof ExamSettingsDraft) =>
    state.fieldErrors?.[field]?.[0]
  const errorSection = Object.keys(state.fieldErrors ?? {}).find(
    (field) => state.fieldErrors?.[field]?.length
  )
  const visibleSection = errorSection
    ? sectionByField[errorSection] || "identity"
    : activeSection

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(700px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-4xl bg-popover/60 p-0 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-2xl sm:max-w-4xl dark:ring-foreground/10"
        >
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand-violet-soft text-brand-violet-ink shadow-xs">
                <GraduationCapIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-heading text-base font-semibold text-foreground">
                  Exam Settings
                </DialogTitle>
                <span className="text-muted-foreground/40">/</span>
                <span className="max-w-[240px] truncate text-xs font-medium text-muted-foreground">
                  {exam.title}
                </span>
              </div>
            </div>
          </div>

          <form
            action={formAction}
            className="flex min-h-0 flex-1 flex-col justify-between"
          >
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="examId" value={exam.id} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <input
              type="hidden"
              name="patternVersion"
              value={draft.patternVersion || "1"}
            />

            {/* Body Layout: Split Sidebar + Content */}
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {/* Sidebar Navigation */}
              <aside className="flex w-full shrink-0 justify-between overflow-x-auto border-b border-border/60 bg-muted/15 p-3 md:w-56 md:flex-col md:border-r md:border-b-0 md:p-3.5">
                <div className="flex w-full gap-1 md:flex-col">
                  <p className="mb-1 hidden px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase md:block">
                    Sections
                  </p>
                  {sections.map((section) => {
                    const Icon = section.icon
                    const isActive = visibleSection === section.key
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => setActiveSection(section.key)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium whitespace-nowrap transition-all outline-none",
                          isActive
                            ? "bg-background font-semibold text-foreground shadow-xs ring-1 ring-border/60"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{section.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="hidden border-t border-border/40 px-2 pt-3 text-[11px] text-muted-foreground md:block">
                  <span className="rounded-md border border-border/50 bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    Esc
                  </span>{" "}
                  to close
                </div>
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 overflow-y-auto p-6 md:p-8">
                {visibleSection === "identity" && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Core Identity
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Name and overview for this preparation roadmap.
                      </p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                      <Field data-invalid={Boolean(errorFor("title"))}>
                        <FieldLabel
                          htmlFor="exam-title"
                          className="text-xs font-semibold"
                        >
                          Exam Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="exam-title"
                          name="title"
                          value={draft.title}
                          onChange={handleChange("title")}
                          maxLength={120}
                          className="h-10 rounded-xl border-border/70 bg-background text-sm"
                          aria-invalid={Boolean(errorFor("title"))}
                          required
                        />
                        <FieldError>{errorFor("title")}</FieldError>
                      </Field>

                      <Field data-invalid={Boolean(errorFor("summary"))}>
                        <FieldLabel
                          htmlFor="exam-summary"
                          className="text-xs font-semibold"
                        >
                          Notes & Context{" "}
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Textarea
                          id="exam-summary"
                          name="summary"
                          value={draft.summary}
                          onChange={handleChange("summary")}
                          maxLength={4000}
                          placeholder="Brief notes or reminders for this exam..."
                          className="min-h-[120px] resize-none rounded-xl border-border/70 bg-background text-sm"
                          aria-invalid={Boolean(errorFor("summary"))}
                        />
                        <FieldError>{errorFor("summary")}</FieldError>
                      </Field>
                    </div>
                  </div>
                )}

                {visibleSection === "preparation" && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Target Score & Timeline
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Define the targets and timeline you are pacing toward.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                        <Field data-invalid={Boolean(errorFor("targetMarks"))}>
                          <FieldLabel
                            htmlFor="target-marks"
                            className="text-xs font-semibold"
                          >
                            Target Score
                          </FieldLabel>
                          <Input
                            id="target-marks"
                            name="targetMarks"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g. 75"
                            value={draft.targetMarks}
                            onChange={handleChange("targetMarks")}
                            className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("targetMarks"))}
                          />
                          <FieldError>{errorFor("targetMarks")}</FieldError>
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                        <Field data-invalid={Boolean(errorFor("targetRank"))}>
                          <FieldLabel
                            htmlFor="target-rank"
                            className="text-xs font-semibold"
                          >
                            Target Rank
                          </FieldLabel>
                          <Input
                            id="target-rank"
                            name="targetRank"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 500"
                            value={draft.targetRank}
                            onChange={handleChange("targetRank")}
                            className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("targetRank"))}
                          />
                          <FieldError>{errorFor("targetRank")}</FieldError>
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <CalendarDaysIcon className="size-4 text-brand-amber-ink" />
                        <span>Exam Timeline & Schedule</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                          data-invalid={Boolean(errorFor("scheduleStatus"))}
                        >
                          <FieldLabel
                            htmlFor="schedule-status"
                            className="text-xs font-semibold"
                          >
                            Status
                          </FieldLabel>
                          <Select
                            name="scheduleStatus"
                            value={draft.scheduleStatus}
                            onValueChange={(val) =>
                              val &&
                              setDraft((curr) => ({
                                ...curr,
                                scheduleStatus: val,
                              }))
                            }
                          >
                            <SelectTrigger
                              id="schedule-status"
                              className="h-10 w-full rounded-xl border-border/70 bg-background text-xs"
                              aria-invalid={Boolean(errorFor("scheduleStatus"))}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectGroup>
                                <SelectItem value="EXPECTED">
                                  Expected
                                </SelectItem>
                                <SelectItem value="ANNOUNCED">
                                  Announced
                                </SelectItem>
                                <SelectItem value="CONFIRMED">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="POSTPONED">
                                  Postponed
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                  Cancelled
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FieldError>{errorFor("scheduleStatus")}</FieldError>
                        </Field>

                        <Field
                          data-invalid={Boolean(errorFor("expectedStartDate"))}
                        >
                          <FieldLabel
                            htmlFor="start-date"
                            className="text-xs font-semibold"
                          >
                            Preparation Start
                          </FieldLabel>
                          <ExamDatePicker
                            id="start-date"
                            name="expectedStartDate"
                            defaultValue={draft.expectedStartDate}
                            hasError={Boolean(errorFor("expectedStartDate"))}
                            className="h-10 rounded-xl border-border/70 bg-background"
                          />
                          <FieldError>
                            {errorFor("expectedStartDate")}
                          </FieldError>
                        </Field>

                        <Field
                          data-invalid={Boolean(errorFor("expectedEndDate"))}
                        >
                          <FieldLabel
                            htmlFor="end-date"
                            className="text-xs font-semibold"
                          >
                            Expected Exam Date
                          </FieldLabel>
                          <ExamDatePicker
                            id="end-date"
                            name="expectedEndDate"
                            defaultValue={draft.expectedEndDate}
                            hasError={Boolean(errorFor("expectedEndDate"))}
                            className="h-10 rounded-xl border-border/70 bg-background"
                          />
                          <FieldError>{errorFor("expectedEndDate")}</FieldError>
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {visibleSection === "pattern" && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Paper Pattern & Marking Rules
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Structure and scoring scheme for automated evaluation.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <Field
                          data-invalid={Boolean(errorFor("durationMinutes"))}
                        >
                          <FieldLabel
                            htmlFor="durationMinutes"
                            className="text-xs font-semibold"
                          >
                            Duration (Minutes)
                          </FieldLabel>
                          <Input
                            id="durationMinutes"
                            name="durationMinutes"
                            type="number"
                            min="1"
                            placeholder="e.g. 180"
                            value={draft.durationMinutes}
                            onChange={handleChange("durationMinutes")}
                            className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("durationMinutes"))}
                          />
                          <FieldError>{errorFor("durationMinutes")}</FieldError>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Total paper duration in minutes.
                          </p>
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <Field data-invalid={Boolean(errorFor("totalMarks"))}>
                          <FieldLabel
                            htmlFor="totalMarks"
                            className="text-xs font-semibold"
                          >
                            Total Marks
                          </FieldLabel>
                          <Input
                            id="totalMarks"
                            name="totalMarks"
                            type="number"
                            min="1"
                            placeholder="e.g. 100"
                            value={draft.totalMarks}
                            onChange={handleChange("totalMarks")}
                            className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("totalMarks"))}
                          />
                          <FieldError>{errorFor("totalMarks")}</FieldError>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Total maximum marks of the entire exam.
                          </p>
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <FileTextIcon className="size-4 text-brand-violet-ink" />
                        <span>Scoring & Marking Breakdown</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field data-invalid={Boolean(errorFor("correctMarks"))}>
                          <FieldLabel
                            htmlFor="correct-marks"
                            className="text-xs font-semibold"
                          >
                            Correct Answer (+)
                          </FieldLabel>
                          <Input
                            id="correct-marks"
                            name="correctMarks"
                            type="number"
                            step="any"
                            placeholder="e.g. 4"
                            value={draft.correctMarks}
                            onChange={handleChange("correctMarks")}
                            className="h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("correctMarks"))}
                          />
                          <FieldError>{errorFor("correctMarks")}</FieldError>
                        </Field>

                        <Field
                          data-invalid={Boolean(errorFor("incorrectMarks"))}
                        >
                          <FieldLabel
                            htmlFor="incorrect-marks"
                            className="text-xs font-semibold"
                          >
                            Incorrect Answer (-)
                          </FieldLabel>
                          <Input
                            id="incorrect-marks"
                            name="incorrectMarks"
                            type="number"
                            step="any"
                            max="0"
                            placeholder="e.g. -1"
                            value={draft.incorrectMarks}
                            onChange={handleChange("incorrectMarks")}
                            className="h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("incorrectMarks"))}
                          />
                          <FieldError>{errorFor("incorrectMarks")}</FieldError>
                        </Field>

                        <Field
                          data-invalid={Boolean(errorFor("unansweredMarks"))}
                        >
                          <FieldLabel
                            htmlFor="unanswered-marks"
                            className="text-xs font-semibold"
                          >
                            Unanswered
                          </FieldLabel>
                          <Input
                            id="unanswered-marks"
                            name="unansweredMarks"
                            type="number"
                            step="any"
                            placeholder="e.g. 0"
                            value={draft.unansweredMarks}
                            onChange={handleChange("unansweredMarks")}
                            className="h-10 rounded-xl border-border/70 bg-background text-sm"
                            aria-invalid={Boolean(errorFor("unansweredMarks"))}
                          />
                          <FieldError>{errorFor("unansweredMarks")}</FieldError>
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {visibleSection === "reference" && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Official Reference & Authority
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Authority links and verification details.
                      </p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel
                            htmlFor="exam-code"
                            className="text-xs font-semibold"
                          >
                            Exam Code{" "}
                            <span className="font-normal text-muted-foreground">
                              (optional)
                            </span>
                          </FieldLabel>
                          <Input
                            id="exam-code"
                            name="examCode"
                            value={draft.examCode}
                            onChange={handleChange("examCode")}
                            maxLength={80}
                            placeholder="e.g. GATE-CS-2027"
                            className="h-10 rounded-xl border-border/70 bg-background text-sm"
                          />
                        </Field>

                        <Field>
                          <FieldLabel
                            htmlFor="conducting-body"
                            className="text-xs font-semibold"
                          >
                            Conducting Body{" "}
                            <span className="font-normal text-muted-foreground">
                              (optional)
                            </span>
                          </FieldLabel>
                          <Input
                            id="conducting-body"
                            name="conductingBody"
                            value={draft.conductingBody}
                            onChange={handleChange("conductingBody")}
                            maxLength={120}
                            placeholder="e.g. IIT Roorkee / NTA"
                            className="h-10 rounded-xl border-border/70 bg-background text-sm"
                          />
                        </Field>
                      </div>

                      <Field data-invalid={Boolean(errorFor("officialUrl"))}>
                        <FieldLabel
                          htmlFor="official-url"
                          className="text-xs font-semibold"
                        >
                          Official Portal URL
                        </FieldLabel>
                        <Input
                          id="official-url"
                          name="officialUrl"
                          type="url"
                          value={draft.officialUrl}
                          onChange={handleChange("officialUrl")}
                          maxLength={512}
                          placeholder="https://gate2027.iitr.ac.in"
                          className="h-10 rounded-xl border-border/70 bg-background text-sm"
                          aria-invalid={Boolean(errorFor("officialUrl"))}
                        />
                        <FieldError>{errorFor("officialUrl")}</FieldError>
                      </Field>
                    </div>
                  </div>
                )}

                {visibleSection === "access" && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Agent Access & Privacy
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Control how connected AI assistants and workspace
                        members interact with this roadmap.
                      </p>
                    </div>

                    <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                      <div className="flex items-start justify-between gap-4 p-5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <BotIcon className="size-4 text-brand-cyan-ink" />
                            <p className="text-sm font-semibold text-foreground">
                              MCP Agent Access
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Allow connected AI assistants (Claude, Cursor,
                            ChatGPT) to read topics and log study progress.
                          </p>
                        </div>
                        <Switch
                          id="agent-access"
                          checked={draft.allowAgentAccess}
                          onCheckedChange={handleAgentAccessChange}
                        />
                        <input
                          type="hidden"
                          name="allowAgentAccess"
                          value={draft.allowAgentAccess ? "on" : "off"}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 p-5">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <EyeIcon className="size-4 text-muted-foreground" />
                            <p className="text-sm font-semibold text-foreground">
                              Workspace Visibility
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Who in this workspace can view this exam roadmap.
                          </p>
                        </div>
                        <Select
                          name="visibility"
                          value={draft.visibility}
                          onValueChange={(val) =>
                            val &&
                            setDraft((curr) => ({ ...curr, visibility: val }))
                          }
                        >
                          <SelectTrigger
                            id="exam-visibility"
                            className="h-9 w-36 rounded-xl border-border/70 bg-background text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectGroup>
                              <SelectItem value="PRIVATE">Private</SelectItem>
                              <SelectItem value="WORKSPACE">
                                Workspace
                              </SelectItem>
                              <SelectItem value="PUBLIC">Public</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </div>

            {/* Footer */}
            <div className="flex h-14 shrink-0 items-center justify-between border-t border-border/60 bg-muted/10 px-6">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                All changes sync automatically to active roadmap
              </span>
              <div className="ml-auto flex items-center gap-2.5">
                <DialogClose
                  disabled={isPending}
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4 text-xs"
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="rounded-full px-5 text-xs font-semibold shadow-xs"
                >
                  {isPending ? (
                    <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <SaveIcon className="mr-1.5 size-3.5" />
                  )}
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Agent Access Confirmation */}
      <AlertDialog
        open={isAgentAccessConfirmationOpen}
        onOpenChange={setIsAgentAccessConfirmationOpen}
      >
        <AlertDialogContent className="rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Agent Access?</AlertDialogTitle>
            <AlertDialogDescription>
              Connected AI assistants using your MCP token will be able to read
              this exam plan, inspect chapters, and record practice attempts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                setDraft((curr) => ({ ...curr, allowAgentAccess: true }))
                setIsAgentAccessConfirmationOpen(false)
              }}
            >
              Enable Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

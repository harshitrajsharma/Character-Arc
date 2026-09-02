"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ClipboardCheckIcon,
  HelpCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  updateSubjectSettingsAction,
  type UpdateSubjectSettingsState,
} from "@/lib/tools/exam-prep/actions/subject-actions"
import {
  normalizeSubjectProgressPolicy,
  type SubjectProgressPolicy,
} from "@/lib/tools/exam-prep/progress/policy"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { ProgressCalculatorExplainer } from "./progress-calculator-explainer"
import { cn } from "@/lib/utils"

const initialState: UpdateSubjectSettingsState = { status: "idle" }

type PolicyField = keyof SubjectProgressPolicy
type PolicyDraft = Record<PolicyField, string>

type SectionKey = "standard" | "high-yield" | "tests" | "explainer"

const policyFields: PolicyField[] = [
  "revisionTarget",
  "practiceTarget",
  "highYieldRevisionTarget",
  "highYieldPracticeTarget",
  "chapterTestTarget",
  "subjectTestTarget",
]

type SubjectSettingsFormProps = {
  workspaceSlug: string
  subject: SubjectWithRelations
  returnHref?: string
  presentation?: "page" | "sheet"
  onCancel?: () => void
  onSaved?: () => void
}

export function SubjectSettingsForm({
  workspaceSlug,
  subject,
  returnHref,
  presentation = "page",
  onCancel,
  onSaved,
}: SubjectSettingsFormProps) {
  const router = useRouter()
  const initialPolicy = normalizeSubjectProgressPolicy(subject.progressPolicy)
  const [draft, setDraft] = useState<PolicyDraft>(() =>
    policyToDraft(initialPolicy)
  )
  const [activeTab, setActiveTab] = useState<SectionKey>("standard")
  const [feedback, setFeedback] = useState<
    Partial<Record<PolicyField, string>>
  >({})
  const [state, formAction, isPending] = useActionState(
    updateSubjectSettingsAction,
    initialState
  )

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      router.refresh()
      onSaved?.()
    }
    if (state.status === "error") toast.error(state.message)
  }, [onSaved, router, state])

  const previewPolicy = draftToPolicy(draft, initialPolicy)
  const clientErrors = getClientErrors(draft)
  const hasClientErrors = policyFields.some((field) => clientErrors[field])

  function handleValueChange(name: PolicyField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.currentTarget.value
      const value = Number(rawValue)
      if (rawValue !== "" && Number.isFinite(value) && value > 100) {
        setDraft((current) => ({ ...current, [name]: "100" }))
        setFeedback((current) => ({ ...current, [name]: "Maximum is 100." }))
        return
      }
      setDraft((current) => ({ ...current, [name]: rawValue }))
      setFeedback((current) => ({ ...current, [name]: undefined }))
    }
  }

  function errorFor(name: PolicyField) {
    return (
      feedback[name] ?? clientErrors[name] ?? state.fieldErrors?.[name]?.[0]
    )
  }

  const isSheet = presentation === "sheet"

  const sections = [
    { key: "standard" as const, label: "Standard Topics", icon: TargetIcon },
    {
      key: "high-yield" as const,
      label: "High-Yield Focus",
      icon: RefreshCwIcon,
    },
    { key: "tests" as const, label: "Testing Rules", icon: ClipboardCheckIcon },
    {
      key: "explainer" as const,
      label: "Algorithm & Logic",
      icon: HelpCircleIcon,
    },
  ]

  return (
    <form
      action={formAction}
      className={
        isSheet
          ? "flex min-h-0 flex-1 flex-col justify-between overflow-hidden"
          : "mx-auto w-full max-w-4xl pt-4 pb-28"
      }
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="subjectId" value={subject.id} />

      {/* Body: Split Sidebar + Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left Sidebar / Mobile Tabs */}
        <aside className="flex w-full min-w-0 shrink-0 scrollbar-none justify-start overflow-x-auto border-b border-border/60 bg-muted/15 p-2.5 sm:p-3 md:w-56 md:flex-col md:justify-between md:border-r md:border-b-0 md:p-3.5">
          <div className="flex shrink-0 gap-1 md:w-full md:flex-col">
            <p className="mb-1 hidden px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase md:block">
              Target Groups
            </p>
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeTab === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveTab(section.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium whitespace-nowrap transition-all outline-none sm:px-3 sm:py-2",
                    isActive
                      ? "bg-background font-semibold text-foreground shadow-xs ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className="size-3.5 shrink-0 sm:size-4"
                    aria-hidden="true"
                  />
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

        {/* Right Content */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {activeTab === "standard" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                  Standard Topics Rhythm
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The baseline repetitions required to consider normal topics
                  completed.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:space-y-5 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field data-invalid={Boolean(errorFor("revisionTarget"))}>
                    <FieldLabel
                      htmlFor="revision-target"
                      className="text-xs font-semibold"
                    >
                      Revisions per Topic
                    </FieldLabel>
                    <Input
                      id="revision-target"
                      name="revisionTarget"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={draft.revisionTarget}
                      onChange={handleValueChange("revisionTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(errorFor("revisionTarget"))}
                      required
                    />
                    <FieldError>{errorFor("revisionTarget")}</FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Required topic review passes.
                    </p>
                  </Field>

                  <Field data-invalid={Boolean(errorFor("practiceTarget"))}>
                    <FieldLabel
                      htmlFor="practice-target"
                      className="text-xs font-semibold"
                    >
                      Practice Sessions
                    </FieldLabel>
                    <Input
                      id="practice-target"
                      name="practiceTarget"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={draft.practiceTarget}
                      onChange={handleValueChange("practiceTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(errorFor("practiceTarget"))}
                      required
                    />
                    <FieldError>{errorFor("practiceTarget")}</FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Required problem-solving sets.
                    </p>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {activeTab === "high-yield" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                  High-Yield Focus
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Elevated revision thresholds for topics with highest exam
                  weightage.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:space-y-5 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field
                    data-invalid={Boolean(errorFor("highYieldRevisionTarget"))}
                  >
                    <FieldLabel
                      htmlFor="high-yield-revision-target"
                      className="text-xs font-semibold"
                    >
                      High-Yield Revisions
                    </FieldLabel>
                    <Input
                      id="high-yield-revision-target"
                      name="highYieldRevisionTarget"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={draft.highYieldRevisionTarget}
                      onChange={handleValueChange("highYieldRevisionTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(
                        errorFor("highYieldRevisionTarget")
                      )}
                      required
                    />
                    <FieldError>
                      {errorFor("highYieldRevisionTarget")}
                    </FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Must meet or exceed standard target.
                    </p>
                  </Field>

                  <Field
                    data-invalid={Boolean(errorFor("highYieldPracticeTarget"))}
                  >
                    <FieldLabel
                      htmlFor="high-yield-practice-target"
                      className="text-xs font-semibold"
                    >
                      High-Yield Practice
                    </FieldLabel>
                    <Input
                      id="high-yield-practice-target"
                      name="highYieldPracticeTarget"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={draft.highYieldPracticeTarget}
                      onChange={handleValueChange("highYieldPracticeTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(
                        errorFor("highYieldPracticeTarget")
                      )}
                      required
                    />
                    <FieldError>
                      {errorFor("highYieldPracticeTarget")}
                    </FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Must meet or exceed standard target.
                    </p>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tests" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                  Testing & Verification Rules
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Test attempt requirements to reach 100% mastery in the testing
                  phase.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:space-y-5 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field data-invalid={Boolean(errorFor("chapterTestTarget"))}>
                    <FieldLabel
                      htmlFor="chapter-test-target"
                      className="text-xs font-semibold"
                    >
                      Tests per Chapter
                    </FieldLabel>
                    <Input
                      id="chapter-test-target"
                      name="chapterTestTarget"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.chapterTestTarget}
                      onChange={handleValueChange("chapterTestTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(errorFor("chapterTestTarget"))}
                      required
                    />
                    <FieldError>{errorFor("chapterTestTarget")}</FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Set 0 to exclude chapter tests.
                    </p>
                  </Field>

                  <Field data-invalid={Boolean(errorFor("subjectTestTarget"))}>
                    <FieldLabel
                      htmlFor="subject-test-target"
                      className="text-xs font-semibold"
                    >
                      Full-Subject Tests
                    </FieldLabel>
                    <Input
                      id="subject-test-target"
                      name="subjectTestTarget"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.subjectTestTarget}
                      onChange={handleValueChange("subjectTestTarget")}
                      className="mt-1 h-10 rounded-xl border-border/70 bg-background text-sm"
                      aria-invalid={Boolean(errorFor("subjectTestTarget"))}
                      required
                    />
                    <FieldError>{errorFor("subjectTestTarget")}</FieldError>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Full mock test records required.
                    </p>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {activeTab === "explainer" && (
            <div className="max-w-2xl space-y-6">
              <ProgressCalculatorExplainer policy={previewPolicy} />
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <div
        className={
          isSheet
            ? "flex h-14 shrink-0 items-center justify-between border-t border-border/60 bg-muted/10 px-4 sm:px-6"
            : "fixed inset-x-0 bottom-0 flex h-14 items-center justify-between border-t border-border/60 bg-background/95 px-6 backdrop-blur"
        }
      >
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Applies across all chapters and topics in this subject
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          {isSheet ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-full px-4 text-xs font-medium"
            >
              Cancel
            </Button>
          ) : (
            <Button
              render={
                <Link
                  href={
                    returnHref ?? workspaceRoutes.examPrep.home(workspaceSlug)
                  }
                />
              }
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs font-medium"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isPending || hasClientErrors}
            className="rounded-full px-5 text-xs font-semibold shadow-xs"
          >
            {isPending ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="mr-1.5 size-3.5" />
            )}
            {isPending ? "Saving..." : "Save Targets"}
          </Button>
        </div>
      </div>
    </form>
  )
}

function policyToDraft(policy: SubjectProgressPolicy): PolicyDraft {
  return {
    revisionTarget: String(policy.revisionTarget),
    practiceTarget: String(policy.practiceTarget),
    highYieldRevisionTarget: String(policy.highYieldRevisionTarget),
    highYieldPracticeTarget: String(policy.highYieldPracticeTarget),
    chapterTestTarget: String(policy.chapterTestTarget),
    subjectTestTarget: String(policy.subjectTestTarget),
  }
}

function draftToPolicy(
  draft: PolicyDraft,
  fallback: SubjectProgressPolicy
): SubjectProgressPolicy {
  return policyFields.reduce<SubjectProgressPolicy>(
    (policy, field) => {
      const value = Number(draft[field])
      policy[field] =
        Number.isInteger(value) && value >= 0 && value <= 100
          ? value
          : fallback[field]
      return policy
    },
    { ...fallback }
  )
}

function getClientErrors(
  draft: PolicyDraft
): Partial<Record<PolicyField, string>> {
  const errors: Partial<Record<PolicyField, string>> = {}
  for (const field of policyFields) {
    const value = draft[field]
    const numberValue = Number(value)
    const minimum =
      field === "chapterTestTarget" || field === "subjectTestTarget" ? 0 : 1
    if (!value.trim()) errors[field] = "Enter a target."
    else if (!Number.isInteger(numberValue))
      errors[field] = "Use a whole number."
    else if (numberValue < minimum)
      errors[field] =
        minimum === 0
          ? "Target cannot be negative."
          : "Target must be at least 1."
    else if (numberValue > 100) errors[field] = "Target cannot exceed 100."
  }
  if (
    !errors.highYieldRevisionTarget &&
    Number(draft.highYieldRevisionTarget) < Number(draft.revisionTarget)
  )
    errors.highYieldRevisionTarget = "Use at least the standard target."
  if (
    !errors.highYieldPracticeTarget &&
    Number(draft.highYieldPracticeTarget) < Number(draft.practiceTarget)
  )
    errors.highYieldPracticeTarget = "Use at least the standard target."
  return errors
}

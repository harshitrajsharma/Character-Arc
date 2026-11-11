"use client"
import {
  SettingsNavigation,
  SettingsBody,
  SettingsPanel,
  SettingsFooter,
} from "@/components/settings/settings-layout"

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
      <SettingsBody>
        {/* Left Sidebar / Mobile Tabs */}
        <SettingsNavigation
          groups={[{ group: "Target Groups", items: sections }]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Right Content */}
        <SettingsPanel>
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
        </SettingsPanel>
      </SettingsBody>

      {/* Footer */}
      <SettingsFooter
        className={
          isSheet
            ? undefined
            : "fixed inset-x-0 bottom-0 bg-background/95 backdrop-blur"
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
      </SettingsFooter>
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

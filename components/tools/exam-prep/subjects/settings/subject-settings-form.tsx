"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { FormFooter } from "@/components/ui/form-footer"
import { Input } from "@/components/ui/input"
import { SegmentedSelector } from "@/components/ui/segmented-selector"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  updateSubjectSettingsAction,
  type UpdateSubjectSettingsState,
} from "@/lib/tools/exam-prep/actions/subject-actions"
import {
  normalizeSubjectProgressPolicy,
  type SubjectProgressPolicy,
} from "@/lib/tools/exam-prep/progress/policy"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"

import { ProgressCalculatorExplainer } from "./progress-calculator-explainer"

const initialState: UpdateSubjectSettingsState = { status: "idle" }

type PolicyField = keyof SubjectProgressPolicy
type PolicyDraft = Record<PolicyField, string>

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
  const [targetFeedback, setTargetFeedback] = useState<
    Partial<Record<PolicyField, string>>
  >({})
  const [state, formAction, isPending] = useActionState(
    updateSubjectSettingsAction,
    initialState
  )
  const [activeSectionId, setActiveSectionId] = useState("standard-targets")

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

  function targetField(
    name: PolicyField,
    label: string,
    description: string,
    minimum: number
  ) {
    const error =
      targetFeedback[name] ??
      clientErrors[name] ??
      state.fieldErrors?.[name]?.[0]

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      const rawValue = event.currentTarget.value
      const parsedValue = Number(rawValue)

      if (rawValue !== "" && Number.isFinite(parsedValue) && parsedValue > 100) {
        setDraft((current) => ({ ...current, [name]: "100" }))
        setTargetFeedback((current) => ({
          ...current,
          [name]: "Maximum is 100, so this target was capped at 100.",
        }))
        return
      }

      setDraft((current) => ({ ...current, [name]: rawValue }))
      setTargetFeedback((current) => ({ ...current, [name]: undefined }))
    }

    return (
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <FieldDescription id={`${name}-description`}>
          {description}
        </FieldDescription>
        <Input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          min={minimum}
          max={100}
          step={1}
          value={draft[name]}
          onChange={handleChange}
          className="min-h-11"
          aria-invalid={Boolean(error)}
          aria-describedby={`${name}-description ${name}-feedback`}
          required
        />
        <FieldError id={`${name}-feedback`}>{error}</FieldError>
      </Field>
    )
  }

  const sections = [
    {
      id: "standard-targets",
      title: "Standard topics",
      description: "The everyday rhythm for each topic.",
      className: "text-brand-neon-ink",
      fields: [
        targetField(
          "revisionTarget",
          "Revision target",
          "Revisions required for a standard topic.",
          1
        ),
        targetField(
          "practiceTarget",
          "Practice target",
          "Practice sessions required for a standard topic.",
          1
        ),
      ],
    },
    {
      id: "high-yield-targets",
      title: "High-yield topics",
      description: "A stronger target for important material.",
      className: "text-warning-ink",
      fields: [
        targetField(
          "highYieldRevisionTarget",
          "Revision target",
          "Must be at least the standard revision target.",
          1
        ),
        targetField(
          "highYieldPracticeTarget",
          "Practice target",
          "Must be at least the standard practice target.",
          1
        ),
      ],
    },
    {
      id: "test-targets",
      title: "Tests",
      description: "Real Test Records complete this stage.",
      className: "text-brand-violet-ink",
      fields: [
        targetField(
          "chapterTestTarget",
          "Tests per chapter",
          "Set 0 to exclude chapter tests.",
          0
        ),
        targetField(
          "subjectTestTarget",
          "Subject tests",
          "Full-subject Test Records required.",
          0
        ),
      ],
    },
  ]

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="subjectId" value={subject.id} />

      {presentation === "page" ? (
        <div className="max-w-2xl border-b border-border/50 pb-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Progress targets
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Targets define 100% completion for this subject everywhere it is
            used. Work beyond a target remains visible as overachievement.
          </p>
        </div>
      ) : null}

      <div className="w-full space-y-4">
        <SegmentedSelector
          value={activeSectionId}
          onValueChange={setActiveSectionId}
          ariaLabel="Progress sections"
          className="w-full rounded-2xl bg-brand-neon-soft/30 p-1 sm:w-full!"
          itemClassName="rounded-xl transition-all duration-200 data-[selected]:bg-brand-neon! data-[state=on]:bg-brand-neon! data-[state=on]:text-brand-neon-foreground! data-[state=on]:shadow-md! aria-pressed:bg-brand-neon! hover:data-[state=on]:bg-brand-neon! sm:flex-1!"
          options={sections.map((section) => ({
            value: section.id,
            label: section.title.split(" ")[0],
          }))}
        />
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "hidden",
              activeSectionId === section.id && "block"
            )}
          >
            <Card className="space-y-5 p-5">
              <div>
                <h3
                  id={section.id}
                  className={cn(
                    "font-heading text-lg font-semibold",
                    section.className
                  )}
                >
                  {section.title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {section.description}
                </p>
              </div>
              <div className="grid gap-5" aria-labelledby={section.id}>
                {section.fields.map((field, index) => (
                  <div key={index}>{field}</div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <ProgressCalculatorExplainer
        policy={previewPolicy}
        compact={presentation === "sheet"}
      />

      <FormFooter
        className={cn(
          presentation === "sheet" &&
            "sticky bottom-0 z-10 -mx-4 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6"
        )}
      >
        {presentation === "sheet" ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-full"
            onClick={onCancel}
            disabled={isPending}
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
            className="min-h-11 rounded-full"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || hasClientErrors}
          className="min-h-11 rounded-full"
        >
          {isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SaveIcon />
          )}
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </FormFooter>
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
  return policyFields.reduce<SubjectProgressPolicy>((policy, field) => {
    const value = Number(draft[field])
    policy[field] =
      Number.isInteger(value) && value >= 0 && value <= 100
        ? value
        : fallback[field]
    return policy
  }, { ...fallback })
}

function getClientErrors(
  draft: PolicyDraft
): Partial<Record<PolicyField, string>> {
  const errors: Partial<Record<PolicyField, string>> = {}

  for (const field of policyFields) {
    const value = draft[field]
    const numericValue = Number(value)
    const minimum =
      field === "chapterTestTarget" || field === "subjectTestTarget" ? 0 : 1

    if (value.trim() === "") {
      errors[field] = "Enter a target."
    } else if (!Number.isInteger(numericValue)) {
      errors[field] = "Use a whole number."
    } else if (numericValue < minimum) {
      errors[field] =
        minimum === 0
          ? "Target cannot be negative."
          : "Target must be at least 1."
    } else if (numericValue > 100) {
      errors[field] = "Target cannot exceed 100."
    }
  }

  const revisionTarget = Number(draft.revisionTarget)
  const highYieldRevisionTarget = Number(draft.highYieldRevisionTarget)
  if (
    Number.isInteger(revisionTarget) &&
    Number.isInteger(highYieldRevisionTarget) &&
    highYieldRevisionTarget < revisionTarget
  ) {
    errors.highYieldRevisionTarget =
      "High-yield revisions must be at least the standard revision target."
  }

  const practiceTarget = Number(draft.practiceTarget)
  const highYieldPracticeTarget = Number(draft.highYieldPracticeTarget)
  if (
    Number.isInteger(practiceTarget) &&
    Number.isInteger(highYieldPracticeTarget) &&
    highYieldPracticeTarget < practiceTarget
  ) {
    errors.highYieldPracticeTarget =
      "High-yield practice must be at least the standard practice target."
  }

  return errors
}

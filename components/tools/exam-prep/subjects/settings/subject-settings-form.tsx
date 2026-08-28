"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDownIcon,
  ClipboardCheckIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SegmentedSelector } from "@/components/ui/segmented-selector"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { FormFooter } from "@/components/ui/form-footer"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const [showExplainer, setShowExplainer] = useState(false)

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

      if (
        rawValue !== "" &&
        Number.isFinite(parsedValue) &&
        parsedValue > 100
      ) {
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
          className="min-h-11 rounded-lg"
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
      navLabel: "Standard",
      title: "Standard topics",
      description: "The everyday rhythm for each topic.",
      icon: TargetIcon,
      className: "text-brand-neon-ink",
      activeClassName:
        "aria-pressed:!bg-brand-neon aria-pressed:!text-brand-neon-foreground",
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
      navLabel: "High-yield",
      title: "High-yield topics",
      description: "A stronger target for important material.",
      icon: RefreshCwIcon,
      className: "text-brand-amber-ink",
      activeClassName:
        "aria-pressed:!bg-brand-amber aria-pressed:!text-brand-amber-foreground",
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
      navLabel: "Tests",
      title: "Tests",
      description: "Real Test Records complete this stage.",
      icon: ClipboardCheckIcon,
      className: "text-brand-violet-ink",
      activeClassName:
        "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground",
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
  ] as const

  return (
    <form
      action={formAction}
      className={cn(
        presentation === "sheet" && "flex min-h-0 flex-1 flex-col"
      )}
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="subjectId" value={subject.id} />

      {presentation === "page" ? (
        <div className="mx-auto w-full max-w-5xl pb-24 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-16">
          <nav
            aria-label="Subject settings sections"
            className="lg:sticky lg:top-24 lg:mb-0 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-border/60 px-4 pb-3 sm:mx-0 sm:px-0 lg:block lg:overflow-visible lg:border-none lg:pb-0"
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
                    "flex min-h-11 shrink-0 items-center gap-2.5 rounded-full px-4 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 lg:w-full lg:rounded-lg lg:py-2.5",
                    isActive
                      ? "bg-brand-neon-soft text-brand-neon-ink hover:bg-brand-neon-soft"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{section.navLabel}</span>
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 space-y-16">
            {sections.map((section) => {
              const Icon = section.icon

              return (
                <section
                  id={section.id}
                  key={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className="scroll-mt-24 space-y-6"
                >
                  <header className="border-b border-border/60 pb-4">
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        section.className
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <h2
                        id={`${section.id}-heading`}
                        className="font-heading text-xl font-semibold text-foreground"
                      >
                        {section.title}
                      </h2>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </header>

                  <FieldGroup className="gap-6 sm:grid sm:grid-cols-2">
                    {section.fields.map((field, index) => (
                      <div key={index}>{field}</div>
                    ))}
                  </FieldGroup>
                </section>
              )
            })}

            <div className="mt-10 border-t border-border/60 pt-6">
              <ProgressCalculatorExplainer policy={previewPolicy} />
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            <SegmentedSelector
              value={activeSectionId}
              options={sections.map((section) => ({
                value: section.id,
                label: section.navLabel,
                icon: section.icon,
                activeClassName: section.activeClassName,
              }))}
              onValueChange={setActiveSectionId}
              ariaLabel="Subject settings sections"
              className="mb-6"
            />

            {sections
              .filter((section) => section.id === activeSectionId)
              .map((section) => {
                const Icon = section.icon

                return (
                  <section
                    key={section.id}
                    aria-labelledby={`${section.id}-heading`}
                    className="space-y-3"
                  >
                    <header className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn("size-4 shrink-0", section.className)}
                          aria-hidden="true"
                        />
                        <h2
                          id={`${section.id}-heading`}
                          className="font-heading text-sm font-semibold text-foreground"
                        >
                          {section.title}
                        </h2>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {section.description}
                      </p>
                    </header>

                    <FieldGroup className="gap-5 pt-1">
                      {section.fields.map((field, index) => (
                        <div key={index}>{field}</div>
                      ))}
                    </FieldGroup>
                  </section>
                )
              })}

            <div className="mt-7 border-t border-border/60 pt-4">
              <Collapsible open={showExplainer} onOpenChange={setShowExplainer}>
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                  <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                    <TargetIcon
                      className="size-3.5 text-brand-neon-ink"
                      aria-hidden="true"
                    />
                    How is progress calculated?
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200",
                      showExplainer && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <ProgressCalculatorExplainer policy={previewPolicy} compact />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </ScrollArea>
      )}

      <FormFooter
        className={cn(
          "border-t border-border/60 bg-background/95 backdrop-blur",
          presentation === "sheet"
            ? "shrink-0 px-6 py-4"
            : "fixed inset-x-0 px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 xl:px-10"
        )}
      >
        <div
          className={cn(
            "flex flex-col-reverse justify-end gap-3 sm:flex-row w-full",
            presentation === "page" && "mx-auto max-w-5xl"
          )}
        >
          {presentation === "sheet" ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full sm:min-w-[100px]"
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
              className="min-h-11 rounded-full sm:min-w-[100px]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending || hasClientErrors}
            className="min-h-11 rounded-full bg-primary hover:bg-primary/90 sm:min-w-[140px]"
          >
            {isPending ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SaveIcon className="mr-2 size-4" />}
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
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

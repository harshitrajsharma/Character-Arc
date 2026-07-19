"use client"

import { useActionState, useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { updateSubjectSettingsAction } from "@/lib/tools/exam-prep/actions/subject-actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { normalizeSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { ProgressCalculatorExplainer } from "./progress-calculator-explainer"

const initialState = { status: "idle" as const }

type SubjectSettingsFormProps = {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
  presentation?: "page" | "sheet"
  onCancel?: () => void
  onSaved?: () => void
}

export function SubjectSettingsForm({
  workspaceSlug,
  examId,
  subject,
  presentation = "page",
  onCancel,
  onSaved,
}: SubjectSettingsFormProps) {
  const router = useRouter()
  const initialPolicy = normalizeSubjectProgressPolicy(subject.progressPolicy)
  const [policy, setPolicy] = useState(initialPolicy)
  const [targetFeedback, setTargetFeedback] = useState<Partial<Record<keyof typeof policy, string>>>({})
  const [state, formAction, isPending] = useActionState(updateSubjectSettingsAction, initialState)

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      router.refresh()
      onSaved?.()
    }
    if (state.status === "error") toast.error(state.message)
  }, [onSaved, router, state])

  function targetField(name: keyof typeof policy, label: string, description: string, minimum: number) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      const parsedValue = event.currentTarget.valueAsNumber
      const exceededMaximum = Number.isFinite(parsedValue) && parsedValue > 100
      const normalizedValue = Number.isFinite(parsedValue)
        ? Math.min(100, Math.max(minimum, Math.trunc(parsedValue)))
        : minimum

      event.currentTarget.value = String(normalizedValue)
      setPolicy((current) => ({ ...current, [name]: normalizedValue }))
      setTargetFeedback((current) => ({
        ...current,
        [name]: exceededMaximum ? "Maximum is 100. The value was reset to 100." : undefined,
      }))
    }

    return (
      <Field data-invalid={Boolean(targetFeedback[name])}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
        <Input
          id={name}
          name={name}
          type="number"
          min={minimum}
          max={100}
          step={1}
          value={policy[name]}
          onChange={handleChange}
          className="min-h-11"
          aria-invalid={Boolean(targetFeedback[name])}
          aria-describedby={targetFeedback[name] ? `${name}-feedback` : undefined}
          required
        />
        <FieldError id={`${name}-feedback`}>{targetFeedback[name]}</FieldError>
      </Field>
    )
  }

  const sections = [
    {
      id: "standard-targets",
      title: "Standard topics",
      description: "The everyday rhythm for each topic.",
      className: "text-brand-violet-ink",
      fields: [
        targetField("revisionTarget", "Revision target", "Revisions required for a standard topic.", 1),
        targetField("practiceTarget", "Practice target", "Practice sessions required for a standard topic.", 1),
      ],
    },
    {
      id: "high-yield-targets",
      title: "High-yield topics",
      description: "A stronger target for important material.",
      className: "text-warning-ink",
      fields: [
        targetField("highYieldRevisionTarget", "Revision target", "Revisions required for an important topic.", 1),
        targetField("highYieldPracticeTarget", "Practice target", "Practice sessions required for an important topic.", 1),
      ],
    },
    {
      id: "test-targets",
      title: "Tests",
      description: "Real Test Records complete this stage.",
      className: "text-brand-cyan-ink",
      fields: [
        targetField("chapterTestTarget", "Tests per chapter", "Set 0 to exclude chapter tests.", 0),
        targetField("subjectTestTarget", "Subject tests", "Full-subject Test Records required.", 0),
      ],
    },
  ]

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="subjectId" value={subject.id} />

      {presentation === "page" ? (
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand-violet-ink">Subject settings</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold">Progress targets</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Targets define when progress reaches 100%. Extra work remains visible as overachievement.
          </p>
        </div>
      ) : null}

      <FieldGroup className={cn("grid gap-4", presentation === "page" && "lg:grid-cols-3")}>
        {sections.map((section) => (
          <Card key={section.id} className="space-y-5 p-5 shadow-none">
            <div>
              <h3 id={section.id} className={cn("font-heading text-lg font-semibold", section.className)}>
                {section.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid gap-5" aria-labelledby={section.id}>
              {section.fields.map((field, index) => <div key={index}>{field}</div>)}
            </div>
          </Card>
        ))}
      </FieldGroup>

      <ProgressCalculatorExplainer policy={policy} compact={presentation === "sheet"} />

      <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-end">
        {presentation === "sheet" ? (
          <Button type="button" variant="ghost" className="min-h-11 rounded-full" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : (
          <Button
            render={<Link href={workspaceRoutes.examPrep.subject(workspaceSlug, examId, subject.id)} />}
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="min-h-11 rounded-full">
          {isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  )
}

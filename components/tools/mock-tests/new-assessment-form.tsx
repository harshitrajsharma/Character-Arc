"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDownIcon, ArrowRightIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { hasRichContent } from "./editor/html-utils"
import {
  AssessmentTitleField,
  AssessmentLabelFields,
  AssessmentTimingFields,
  AssessmentInstructionsField,
  AssessmentBenchmarkFields,
} from "./assessment-metadata-fields"
import {
  normalizeAssessmentMetadata,
  validateAssessmentMetadata,
  type AssessmentMetadataValues as Values,
  type AssessmentMetadataKey as Key,
  type AssessmentMetadataErrors as Errors,
} from "./assessment-metadata-model"
import { createAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { cn } from "@/lib/utils"
import {
  withSubjectReturn,
  type SubjectAssessmentContext,
} from "@/lib/tools/exam-prep/assessment-study-context"

const id = (key: Key) => `assessment-${key}`

export function NewAssessmentForm({
  workspaceSlug,
  studyContext,
}: {
  workspaceSlug: string
  studyContext?: SubjectAssessmentContext | null
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const requestKey = useRef<string | null>(null)
  const [pending, setPending] = useState(false)
  const [values, setValues] = useState<Values>({
    title: "",
    paperType: studyContext?.chapterId
      ? "topic_wise"
      : studyContext
        ? "subject_wise"
        : "full_length",
    examTag: studyContext?.examTitle.slice(0, 60) ?? "",
    subjects: studyContext?.subjectTitle.slice(0, 60) ?? "",
    durationMinutes: "",
    totalMarks: "",
    calculatorAllowed: false,
    instructions: "",
    passingBenchmark: "33",
    distinctionBenchmark: "70",
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState("")
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ key: Key } | null>(null)
  useEffect(() => {
    if (!focusRequest || !formRef.current) return
    const form = formRef.current
    function focusInvalidField() {
      const key = focusRequest!.key
      const target =
        key === "instructions"
          ? form.querySelector<HTMLElement>(
              `#${id(key)} [contenteditable=true]`
            )
          : document.getElementById(id(key))
      if (!target) return false
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: "center", behavior: "instant" })
      return true
    }
    if (focusInvalidField()) return
    const observer = new MutationObserver(() => {
      if (focusInvalidField()) observer.disconnect()
    })
    observer.observe(form, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [focusRequest])

  function change<K extends Key>(key: K, value: Values[K]) {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
      ...(key === "passingBenchmark"
        ? { distinctionBenchmark: undefined }
        : {}),
    }))
    setServerError("")
  }
  const fields = { values, errors, id, onChange: change }
  async function submit() {
    if (submitting.current) return
    const next = validateAssessmentMetadata(values)
    const {
      durationMinutes: duration,
      totalMarks: marks,
      passingBenchmark: passing,
      distinctionBenchmark: distinction,
      subjects,
    } = normalizeAssessmentMetadata(values)
    setErrors(next)
    const first = Object.keys(next)[0] as Key | undefined
    if (first) {
      if (next.instructions) setInstructionsOpen(true)
      if (next.passingBenchmark || next.distinctionBenchmark)
        setAdvancedOpen(true)
      setFocusRequest({ key: first })
      return
    }
    submitting.current = true
    setPending(true)
    setServerError("")
    requestKey.current ??= createIdempotencyKey()
    try {
      const result = await createAssessmentAction({
        workspaceSlug,
        title: values.title.trim(),
        ...(studyContext ? { examBlockId: studyContext.targetBlockId } : {}),
        durationMinutes: duration,
        totalMarks: marks,
        instructions: hasRichContent(values.instructions)
          ? values.instructions.trim()
          : null,
        blueprint: {
          sections: [],
          calculatorAllowed: values.calculatorAllowed,
          taxonomy: {
            paperType: values.paperType,
            subjectScope:
              values.paperType === "multi_subject" || subjects.length > 1
                ? "multi_subject"
                : "single_subject",
            subjects,
            examTag: values.examTag.trim() || null,
          },
        },
        passingBenchmark: passing,
        distinctionBenchmark: distinction,
        idempotencyKey: requestKey.current,
      })
      toast.success("Draft created", {
        description: "Add questions, then publish when you're ready.",
      })
      router.push(
        withSubjectReturn(
          workspaceRoutes.mockTests.edit(workspaceSlug, result.assessmentId),
          studyContext?.returnHref
        )
      )
    } catch (error) {
      submitting.current = false
      setPending(false)
      requestKey.current = null
      setServerError(
        error instanceof Error
          ? error.message
          : "Could not create the draft. Try again."
      )
      requestAnimationFrame(() =>
        document.getElementById("assessment-create-error")?.focus()
      )
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault()
          formRef.current?.requestSubmit()
        }
      }}
      className="flex min-w-0 flex-col gap-5 pb-6"
      aria-busy={pending}
    >
      {serverError ? (
        <Alert
          id="assessment-create-error"
          tabIndex={-1}
          role="alert"
          variant="destructive"
          className="scroll-mt-24"
        >
          <AlertTitle>Draft could not be created</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      <fieldset
        disabled={pending}
        inert={pending}
        className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
      >
        <legend className="sr-only">Assessment settings</legend>
        <section
          aria-labelledby="assessment-basic-heading"
          className="flex flex-col gap-5 p-4 sm:p-6"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="assessment-basic-heading"
              className="font-heading text-base font-semibold"
            >
              Basic details
            </h2>
            <p className="text-sm text-muted-foreground">
              Name your assessment and add labels to organize it.
            </p>
          </div>
          <AssessmentTitleField {...fields} />
          <AssessmentLabelFields {...fields} />
        </section>
        <section
          aria-labelledby="assessment-settings-heading"
          className="flex flex-col gap-5 border-t border-border p-4 sm:p-6"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="assessment-settings-heading"
              className="font-heading text-base font-semibold"
            >
              Test settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Set timing and marks now, or adjust them when adding questions.
            </p>
          </div>
          <AssessmentTimingFields {...fields} />
        </section>
        <Collapsible
          open={instructionsOpen}
          onOpenChange={setInstructionsOpen}
          className="border-t border-border"
        >
          <CollapsibleTrigger className="group flex min-h-16 w-full items-center justify-between gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold">
                Instructions (optional)
              </span>
              <span className="text-xs text-muted-foreground">
                Guidelines candidates see before starting.
              </span>
            </span>
            <ChevronDownIcon
              className="size-4 shrink-0 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent
            keepMounted
            className="h-(--collapsible-panel-height) overflow-hidden data-ending-style:h-0 data-starting-style:h-0 data-closed:hidden"
          >
            <div className="px-4 pb-5 sm:px-6">
              {instructionsOpen ? (
                <AssessmentInstructionsField {...fields} />
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          className="border-t border-border"
        >
          <CollapsibleTrigger className="group flex min-h-16 w-full items-center justify-between gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6">
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Score benchmarks</span>
              <span className="text-xs text-muted-foreground">
                Advanced settings. Defaults: 33% passing, 70% distinction.
              </span>
            </span>
            <ChevronDownIcon
              className="size-4 shrink-0 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent
            keepMounted
            className="h-(--collapsible-panel-height) overflow-hidden data-ending-style:h-0 data-starting-style:h-0 data-closed:hidden"
          >
            <div className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
              <AssessmentBenchmarkFields {...fields} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </fieldset>
      <div
        data-assessment-create-actions
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 shadow-sm sm:p-4 md:bottom-3"
      >
        <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
          <p className="text-sm font-medium">Next: add questions</p>
          <p className="text-xs text-muted-foreground">
            Your assessment stays unpublished.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <Link
            href={
              studyContext?.returnHref ??
              workspaceRoutes.mockTests.home(workspaceSlug)
            }
            aria-disabled={pending}
            tabIndex={pending ? -1 : undefined}
            onClick={(event) => {
              if (pending) event.preventDefault()
            }}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11",
              pending && "pointer-events-none opacity-50"
            )}
          >
            Cancel
          </Link>
          <Button type="submit" disabled={pending} className="h-11">
            {pending ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : null}
            {pending ? "Creating draft\u2026" : "Create draft"}
            {!pending ? <ArrowRightIcon aria-hidden="true" /> : null}
          </Button>
        </div>
      </div>
    </form>
  )
}

"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2Icon,
  FilePenLineIcon,
  ListChecksIcon,
  Loader2Icon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { flushSync } from "react-dom"
import { stripHtml, htmlTextLength } from "@/components/tools/mock-tests/editor/html-utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { createAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { cn } from "@/lib/utils"
import {
  BlueprintFormFields,
  PAPER_TYPES,
  type PaperType,
} from "@/components/tools/mock-tests/blueprint-form-fields"

export function NewAssessmentForm({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isActionPending = pending || isSubmitting

  // Form Field State for live Blueprint Preview
  const [title, setTitle] = useState("")
  const [paperType, setPaperType] = useState<PaperType>("full_length")
  const [examTag, setExamTag] = useState("")
  const [subjects, setSubjects] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [totalMarks, setTotalMarks] = useState("")
  const [instructions, setInstructions] = useState("")
  const [passingBenchmark, setPassingBenchmark] = useState<number | "">(33)
  const [distinctionBenchmark, setDistinctionBenchmark] = useState<number | "">(70)
  const [calculatorAllowed, setCalculatorAllowed] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent))
    }
  }, [])

  const activePaperConfig =
    PAPER_TYPES.find((pt) => pt.id === paperType) ?? PAPER_TYPES[0]

  const parsedSubjects = subjects
    ? subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const passingNum = passingBenchmark === "" ? 0 : Number(passingBenchmark)
  const distinctionNum = distinctionBenchmark === "" ? 0 : Number(distinctionBenchmark)
  const isBenchmarkConflict =
    passingBenchmark !== "" &&
    distinctionBenchmark !== "" &&
    distinctionNum <= passingNum

  function handleSubmit() {
    if (isActionPending) return

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      toast.warning("Incomplete form", {
        description: "Please give your mock test paper a title.",
      })
      return
    }

    flushSync(() => {
      setIsSubmitting(true)
    })

    setTimeout(() => {
      const subjectScope =
        paperType === "multi_subject" || parsedSubjects.length > 1
          ? "multi_subject"
          : "single_subject"

      const dur = durationMinutes.trim() === "" ? null : Number(durationMinutes)
      const marks = totalMarks.trim() === "" ? null : Number(totalMarks)

      if (dur !== null && (!Number.isInteger(dur) || dur < 1 || dur > 1440)) {
        setIsSubmitting(false)
        toast.warning("Invalid duration", {
          description: "Duration must be a whole number between 1 and 1440 minutes.",
        })
        return
      }

      if (marks !== null && (!Number.isFinite(marks) || marks <= 0)) {
        setIsSubmitting(false)
        toast.warning("Invalid total marks", {
          description: "Total marks must be greater than zero.",
        })
        return
      }

      if (
        passingBenchmark === "" ||
        !Number.isInteger(passingNum) ||
        passingNum < 1 ||
        passingNum > 100
      ) {
        setIsSubmitting(false)
        toast.warning("Invalid passing cut-off", {
          description: "Passing benchmark must be a whole percentage between 1 and 100.",
        })
        return
      }

      if (
        distinctionBenchmark === "" ||
        !Number.isInteger(distinctionNum) ||
        distinctionNum < 1 ||
        distinctionNum > 100
      ) {
        setIsSubmitting(false)
        toast.warning("Invalid distinction cut-off", {
          description: "Distinction benchmark must be a whole percentage between 1 and 100.",
        })
        return
      }

      if (distinctionNum <= passingNum) {
        setIsSubmitting(false)
        toast.warning("Benchmark conflict", {
          description:
            "Distinction cut-off must be higher than the passing cut-off percentage.",
        })
        return
      }

      if (htmlTextLength(instructions) > 20000) {
        setIsSubmitting(false)
        toast.warning("Instructions too long", {
          description: "Candidate instructions must be under 20,000 characters.",
        })
        return
      }

      const hasInstructions = stripHtml(instructions).length > 0
      const cleanInstructions = hasInstructions ? instructions.trim() : null

      startTransition(async () => {
        try {
          const result = await createAssessmentAction({
            workspaceSlug,
            title: trimmedTitle,
            durationMinutes: dur,
            totalMarks: marks,
            instructions: cleanInstructions,
            blueprint: {
              sections: [],
              calculatorAllowed,
              taxonomy: {
                paperType,
                subjectScope,
                subjects: parsedSubjects,
                examTag: examTag.trim() || null,
              },
            },
            passingBenchmark: passingNum,
            distinctionBenchmark: distinctionNum,
            idempotencyKey,
          })

          toast.success("Mock test blueprint created", {
            description: "Proceeding to the question assembly builder.",
          })
          router.push(
            workspaceRoutes.mockTests.edit(workspaceSlug, result.assessmentId)
          )
        } catch (error) {
          setIsSubmitting(false)
          setIdempotencyKey(createIdempotencyKey())
          const message =
            error instanceof Error ? error.message : "Failed to create the test blueprint."
          toast.error("Error creating blueprint", { description: message })
        }
      })
    }, 0)
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter submits the form
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSubmit])

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      <input type="hidden" name="paperType" value={paperType} />

      {/* ── Left Column: Monolithic Segmented Card (8 Cols on Desktop) ── */}
      <div className="lg:col-span-8">
        <BlueprintFormFields
          title={title}
          setTitle={setTitle}
          instructions={instructions}
          setInstructions={setInstructions}
          paperType={paperType}
          setPaperType={setPaperType}
          examTag={examTag}
          setExamTag={setExamTag}
          subjects={subjects}
          setSubjects={setSubjects}
          durationMinutes={durationMinutes}
          setDurationMinutes={setDurationMinutes}
          totalMarks={totalMarks}
          setTotalMarks={setTotalMarks}
          passingBenchmark={passingBenchmark}
          setPassingBenchmark={setPassingBenchmark}
          distinctionBenchmark={distinctionBenchmark}
          setDistinctionBenchmark={setDistinctionBenchmark}
          calculatorAllowed={calculatorAllowed}
          setCalculatorAllowed={setCalculatorAllowed}
          autoFocusTitle
        />
      </div>

      {/* ── Right Column: Sticky Monolithic Segmented Summary Card (4 Cols on Desktop) ── */}
      <div className="lg:col-span-4 lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border">
          {/* Segment 1: Live Identity & Readiness */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
                  <TargetIcon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="font-heading text-xs font-bold tracking-tight uppercase text-foreground">
                  Blueprint Preview
                </span>
              </div>
              {title.trim() ? (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2Icon className="size-3" aria-hidden="true" />
                  Ready to Create
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  Needs Title
                </Badge>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <Badge
                variant="outline"
                className={cn("text-[10px] font-semibold", activePaperConfig.badgeVariantClass)}
              >
                {activePaperConfig.label}
              </Badge>

              <h3 className="font-heading text-base font-bold leading-snug text-foreground break-words">
                {title.trim() || (
                  <span className="text-muted-foreground/60 italic font-normal">
                    Untitled Mock Test
                  </span>
                )}
              </h3>

              {examTag.trim() || parsedSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {examTag.trim() ? (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {examTag.trim()}
                    </Badge>
                  ) : null}
                  {parsedSubjects.map((sub, idx) => (
                    <Badge
                      key={`${sub}-${idx}`}
                      variant="outline"
                      className="text-[10px] font-mono text-muted-foreground"
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {stripHtml(instructions).length > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-0.5">
                  <FilePenLineIcon className="size-3 text-muted-foreground/60" aria-hidden="true" />
                  <span>Includes candidate guidelines</span>
                </div>
              ) : null}

              {isBenchmarkConflict ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive mt-2">
                  Distinction cut-off must be higher than passing.
                </div>
              ) : null}
            </div>
          </div>

          {/* Segment 2: Fixed 2×2 Specs Grid */}
          <div className="divide-y divide-border bg-muted/15 text-xs">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Duration
                </span>
                <p className="font-mono font-semibold text-foreground">
                  {durationMinutes ? `${durationMinutes}m` : "Untimed"}
                </p>
              </div>
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Total Marks
                </span>
                <p className="font-mono font-semibold text-foreground">
                  {totalMarks ? `${totalMarks} pts` : "Dynamic"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Benchmarks
                </span>
                <p className="font-mono font-semibold text-foreground">
                  {passingNum}% / {distinctionNum}%
                </p>
              </div>
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Calculator
                </span>
                <p className="font-mono font-semibold text-foreground">
                  {calculatorAllowed ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>

          {/* Segment 3: Elevated Primary Command (Placed immediately under Specs Grid) */}
          <div className="p-5 space-y-2.5">
            <Button
              type="submit"
              disabled={isActionPending}
              className="w-full h-10 gap-2 font-bold shadow-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
            >
              {isActionPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  Creating Blueprint...
                </>
              ) : (
                <>
                  <ListChecksIcon className="size-4" aria-hidden="true" />
                  Create Blueprint
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground pt-0.5">
              Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">{isMac ? "⌘" : "Ctrl"}</kbd> + <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to create
            </p>
          </div>

          {/* Segment 4: Creation Workflow Stepper (Positioned below button as contextual footer) */}
          <div className="p-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Workflow
            </span>
            <div className="relative space-y-3.5 text-xs before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border/80">
              <div className="relative flex items-center gap-2.5 text-foreground font-medium">
                <span className="relative z-10 flex size-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold shadow-2xs">
                  1
                </span>
                <span>Blueprint</span>
                <span className="ml-auto text-[10px] font-semibold text-foreground">
                  Current
                </span>
              </div>
              <div className="relative flex items-center gap-2.5 text-muted-foreground">
                <span className="relative z-10 flex size-5 items-center justify-center rounded-full border border-border bg-card text-[10px]">
                  2
                </span>
                <span>Questions</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium">
                  Next step
                </span>
              </div>
              <div className="relative flex items-center gap-2.5 text-muted-foreground">
                <span className="relative z-10 flex size-5 items-center justify-center rounded-full border border-border bg-card text-[10px]">
                  3
                </span>
                <span>Sections</span>
              </div>
              <div className="relative flex items-center gap-2.5 text-muted-foreground">
                <span className="relative z-10 flex size-5 items-center justify-center rounded-full border border-border bg-card text-[10px]">
                  4
                </span>
                <span>Publish</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

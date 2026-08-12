"use client"

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangleIcon,
  AlignLeftIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  CircleDotIcon,
  CodeIcon,
  ColumnsIcon,
  EyeIcon,
  FilePenIcon,
  HashIcon,
  HelpCircleIcon,
  ImageIcon,
  ListChecksIcon,
  Loader2Icon,
  SigmaIcon,
  SlidersIcon,
  SparklesIcon,
  Table2Icon,
  Wand2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { reportSaveError } from "@/components/tools/mock-tests/save-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  createQuestionAction,
  updateQuestionAction,
} from "@/lib/tools/mock-tests/actions/question-actions"
import type { TargetableBlock } from "@/lib/tools/definitions/mock-tests/repository"
import { RichTextEditor } from "@/components/tools/mock-tests/editor/rich-text-editor"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import {
  formatOptionsToUnifiedText,
  parseUnifiedTextToOptions,
} from "./editor/unified-option-parser"
import { stripHtml } from "@/components/tools/mock-tests/editor/html-utils"
import { QuestionPreview } from "./question-preview"
import { TopicSelectorDialog } from "./topic-selector-dialog"

export type QuestionFormTarget = {
  blockId: string
  weight: number
  isPrimary: boolean
}

type OptionRow = { key: string; content: string }

const KIND_OPTIONS = [
  {
    value: "SINGLE_CHOICE",
    label: "Single Choice",
    icon: CircleCheckBigIcon,
    desc: "Exactly one correct answer choice.",
  },
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple Choice",
    icon: ListChecksIcon,
    desc: "One or more correct answer choices.",
  },
  {
    value: "TRUE_FALSE",
    label: "True / False",
    icon: CircleDotIcon,
    desc: "Binary statement evaluation.",
  },
  {
    value: "NUMERIC",
    label: "Numeric Answer",
    icon: HashIcon,
    desc: "Exact numerical value within tolerance.",
  },
  {
    value: "SHORT_ANSWER",
    label: "Short Answer",
    icon: AlignLeftIcon,
    desc: "Short textual response evaluated against model answer.",
  },
] as const

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

const STEM_MAX_HTML = 50000
const OPTION_MAX_HTML = 10000
const EXPLANATION_MAX_HTML = 40000

function optionLetter(index: number): string {
  return LETTERS[index] ?? `Q${index + 1}`
}

function emptyOptions(count: number): OptionRow[] {
  return Array.from({ length: count }, (_, index) => ({
    key: optionLetter(index),
    content: "",
  }))
}

export function QuestionForm({
  workspaceSlug,
  questionId,
  initial,
  targetableBlocks,
}: {
  workspaceSlug: string
  questionId?: string
  initial?: {
    stem: string
    kind: string
    difficulty: number | null
    options: Array<{ key: string; content: string }>
    answerKeys: string[]
    numericAnswer: number | null
    textAnswer: string | null
    explanation: string | null
    targets: QuestionFormTarget[]
  } | null
  targetableBlocks: TargetableBlock[]
}) {
  const router = useRouter()
  const isEdit = Boolean(questionId)
  const [pending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey())

  // View mode switcher: "split" | "form" | "preview"
  const [viewMode, setViewMode] = useState<"split" | "form" | "preview">("form")

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)")
    const handleViewportChange = () => {
      if (!desktopQuery.matches) {
        setViewMode((current) => (current === "split" ? "form" : current))
      }
    }

    handleViewportChange()
    desktopQuery.addEventListener("change", handleViewportChange)
    return () => desktopQuery.removeEventListener("change", handleViewportChange)
  }, [])

  // Form states
  const [stem, setStem] = useState(initial?.stem ?? "")
  const [kind, setKind] = useState<string>(initial?.kind ?? "SINGLE_CHOICE")
  const [difficulty, setDifficulty] = useState(
    initial?.difficulty === null || initial?.difficulty === undefined
      ? ""
      : String(initial.difficulty)
  )
  const [options, setOptions] = useState<OptionRow[]>(() => {
    if (initial && initial.options.length > 0) {
      return initial.options
    }
    return emptyOptions(4)
  })
  const [answerKeys, setAnswerKeys] = useState<string[]>(initial?.answerKeys ?? [])
  const [unifiedOptionText, setUnifiedOptionText] = useState(() =>
    formatOptionsToUnifiedText(
      initial?.options && initial.options.length > 0 ? initial.options : emptyOptions(4),
      initial?.answerKeys ?? []
    )
  )
  const [numericAnswer, setNumericAnswer] = useState(
    initial?.numericAnswer === null || initial?.numericAnswer === undefined
      ? ""
      : String(initial.numericAnswer)
  )
  const [textAnswer, setTextAnswer] = useState(initial?.textAnswer ?? "")
  const [explanation, setExplanation] = useState(initial?.explanation ?? "")
  const [targets, setTargets] = useState<QuestionFormTarget[]>(initial?.targets ?? [])
  const [showExplanation, setShowExplanation] = useState(true)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const choiceKind =
    kind === "SINGLE_CHOICE" || kind === "MULTIPLE_CHOICE" || kind === "TRUE_FALSE"
  const kindDescription =
    KIND_OPTIONS.find((item) => item.value === kind)?.desc ?? ""
  const visibleStemLength = stripHtml(stem).length

  function handleKindChange(newKind: string) {
    setSubmitAttempted(false)
    setKind(newKind)
    if (newKind === "TRUE_FALSE") {
      const tfOptions = [
        { key: "A", content: "True" },
        { key: "B", content: "False" },
      ]
      const tfKeys = answerKeys.length > 0 && (answerKeys[0] === "A" || answerKeys[0] === "B") ? [answerKeys[0]] : ["A"]
      setOptions(tfOptions)
      setAnswerKeys(tfKeys)
      setUnifiedOptionText(formatOptionsToUnifiedText(tfOptions, tfKeys))
    } else if (newKind === "SINGLE_CHOICE" || newKind === "MULTIPLE_CHOICE") {
      setOptions((current) => (current.length >= 2 ? current : emptyOptions(4)))
      setUnifiedOptionText(formatOptionsToUnifiedText(options.length >= 2 ? options : emptyOptions(4), answerKeys))
    }
  }

  function applyPreset(preset: "4_CHOICE" | "TRUE_FALSE" | "5_CHOICE") {
    if (preset === "TRUE_FALSE") {
      handleKindChange("TRUE_FALSE")
    } else if (preset === "4_CHOICE") {
      const newOptions = emptyOptions(4)
      setOptions(newOptions)
      setUnifiedOptionText(formatOptionsToUnifiedText(newOptions, answerKeys))
    } else if (preset === "5_CHOICE") {
      const newOptions = emptyOptions(5)
      setOptions(newOptions)
      setUnifiedOptionText(formatOptionsToUnifiedText(newOptions, answerKeys))
    }
  }

  function toggleAnswer(key: string) {
    setAnswerKeys((keys) => {
      const nextKeys = keys.includes(key)
        ? keys.filter((candidate) => candidate !== key)
        : (kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE" ? [key] : [...keys, key])
      setUnifiedOptionText(formatOptionsToUnifiedText(options, nextKeys))
      return nextKeys
    })
  }

  // Handle live changes inside the Unified Master Text Editor
  function handleUnifiedTextChange(text: string) {
    setUnifiedOptionText(text)
    const parsed = parseUnifiedTextToOptions(text)
    if (parsed.options.length > 0) {
      setOptions(parsed.options)
    }
    if (parsed.answerKeys.length > 0) {
      if (kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE") {
        setAnswerKeys([parsed.answerKeys[0]])
      } else {
        setAnswerKeys(parsed.answerKeys)
      }
    }
  }

  function insertUnifiedSnippet(snippet: string) {
    const next = unifiedOptionText ? `${unifiedOptionText.trimEnd()}\n${snippet}` : snippet
    handleUnifiedTextChange(next)
  }

  function formatUnifiedText() {
    const parsed = parseUnifiedTextToOptions(unifiedOptionText)
    if (parsed.options.length > 0) {
      setOptions(parsed.options)
      const normalized = formatOptionsToUnifiedText(parsed.options, answerKeys)
      setUnifiedOptionText(normalized)
      toast.success("Options formatted & synchronized")
    }
  }

  function toggleTarget(blockId: string) {
    setTargets((current) => {
      if (current.some((target) => target.blockId === blockId)) {
        return current.filter((target) => target.blockId !== blockId)
      }
      return [...current, { blockId, weight: 100, isPrimary: current.length === 0 }]
    })
  }

  function updateTargetWeight(blockId: string, weight: number) {
    setTargets((current) =>
      current.map((target) => (target.blockId === blockId ? { ...target, weight } : target))
    )
  }

  function setTargetPrimary(blockId: string) {
    setTargets((current) =>
      current.map((target) => ({
        ...target,
        isPrimary: target.blockId === blockId,
      }))
    )
  }

  // Insert quick snippets into Question Stem
  function insertStemSnippet(snippetType: "code" | "table" | "image") {
    if (snippetType === "code") {
      setStem((prev) => `${prev} <pre><code>// Type code here</code></pre> `)
    } else if (snippetType === "table") {
      setStem(
        (prev) =>
          `${prev} <table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table> `
      )
    } else if (snippetType === "image") {
      setStem((prev) => `${prev} <img src="https://via.placeholder.com/600x300" alt="Question Diagram" /> `)
    }
  }

  const validate = useCallback((): string | null => {
    if (!stripHtml(stem)) return "Question stem is required."
    if (stem.length > STEM_MAX_HTML) {
      return "The stem is too long — remove large images or simplify the content."
    }

    if (kind === "NUMERIC") {
      const parsed = Number(numericAnswer)
      if (numericAnswer.trim() === "" || !Number.isFinite(parsed)) {
        return "Enter a valid numeric answer."
      }
    } else if (kind === "SHORT_ANSWER") {
      if (!textAnswer.trim()) return "Enter a model answer for grading."
    } else {
      const filled = options.filter((option) => stripHtml(option.content) !== "")
      if (kind === "TRUE_FALSE") {
        if (filled.length !== 2) return "True/False questions need exactly two options."
      } else if (filled.length < 2) {
        return "Add at least two answer options."
      }
      if (options.some((option) => option.content.length > OPTION_MAX_HTML)) {
        return "One of the options is too long — simplify it."
      }
      if (answerKeys.length === 0) {
        return kind === "MULTIPLE_CHOICE"
          ? "Select at least one correct answer."
          : "Select the correct answer choice."
      }
    }
    if (explanation.length > EXPLANATION_MAX_HTML) {
      return "The explanation is too long — simplify it."
    }
    return null
  }, [stem, kind, numericAnswer, textAnswer, options, answerKeys, explanation])

  const submitQuestion = useCallback(
    async (addAnother = false) => {
      setSubmitAttempted(true)
      const validationError = validate()
      if (validationError) {
        toast.warning("Incomplete question", { description: validationError })
        requestAnimationFrame(() => {
          const stemIsEmpty = !stripHtml(stem).trim()
          const validationTarget = stemIsEmpty
            ? document.querySelector("#question-stem .ProseMirror")
            : document.querySelector<HTMLElement>("[data-answer-validation]")
          if (!(validationTarget instanceof HTMLElement)) return

          validationTarget.scrollIntoView({ behavior: "smooth", block: "center" })
          const focusTarget =
            validationTarget.matches("input, textarea, button, [contenteditable=true]")
              ? validationTarget
              : validationTarget.querySelector<HTMLElement>(
                  '[aria-label^="Mark option"], input, textarea, button, [contenteditable=true]'
                )
          focusTarget?.focus()
        })
        return
      }

      const payload = {
        stem: stripHtml(stem) ? stem.trim() : "",
        kind: kind as (typeof KIND_OPTIONS)[number]["value"],
        difficulty: difficulty === "" ? null : Number(difficulty),
        options: choiceKind
          ? options.map((option, position) => ({
              key: option.key,
              content: stripHtml(option.content) ? option.content.trim() : "",
              position,
            }))
          : [],
        answerKeys: choiceKind ? answerKeys : [],
        numericAnswer: kind === "NUMERIC" ? Number(numericAnswer) : null,
        textAnswer: kind === "SHORT_ANSWER" ? textAnswer.trim() : null,
        explanation: stripHtml(explanation) ? explanation.trim() : null,
        targets: targets.map((target) => ({
          blockId: target.blockId,
          weight: target.weight,
          isPrimary: target.isPrimary,
        })),
        idempotencyKey,
      }

      const questionsHref = workspaceRoutes.mockTests.questions(workspaceSlug)

      startTransition(async () => {
        try {
          if (isEdit && questionId) {
            await updateQuestionAction({ workspaceSlug, questionId, ...payload })
            toast.success("Question updated")
            router.push(questionsHref)
          } else {
            await createQuestionAction({ workspaceSlug, ...payload })
            if (addAnother) {
              toast.success("Question created! Ready for the next one.")
              setStem("")
              setDifficulty("")
              if (kind === "SINGLE_CHOICE" || kind === "MULTIPLE_CHOICE") {
                const blankOptions = emptyOptions(4)
                setOptions(blankOptions)
                setUnifiedOptionText(formatOptionsToUnifiedText(blankOptions, []))
              } else if (kind === "TRUE_FALSE") {
                const tfOptions = [
                  { key: "A", content: "True" },
                  { key: "B", content: "False" },
                ]
                setOptions(tfOptions)
                setUnifiedOptionText(formatOptionsToUnifiedText(tfOptions, []))
              }
              setAnswerKeys([])
              setNumericAnswer("")
              setTextAnswer("")
              setExplanation("")
              setTargets([])
              setShowExplanation(false)
              setSubmitAttempted(false)
              setIdempotencyKey(createIdempotencyKey())
            } else {
              toast.success("Question created")
              router.push(questionsHref)
            }
          }
        } catch (error) {
          setIdempotencyKey(createIdempotencyKey())
          reportSaveError(error, "Failed to save the question.")
        }
      })
    },
    [
      stem,
      kind,
      difficulty,
      choiceKind,
      options,
      answerKeys,
      numericAnswer,
      textAnswer,
      explanation,
      targets,
      idempotencyKey,
      validate,
      workspaceSlug,
      isEdit,
      questionId,
      router,
    ]
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitQuestion(false)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        void submitQuestion(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [submitQuestion])

  const questionsHref = workspaceRoutes.mockTests.questions(workspaceSlug)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 relative">
      {/* Top Action Toolbar (Clean, non-intrusive) */}
      <div className="flex flex-col gap-3.5 pb-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            render={<Link href={questionsHref} />}
            title="Back to Question Bank"
            aria-label="Back to Question Bank"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question Bank
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs font-medium text-brand-violet-ink">
                {isEdit ? "Edit Question" : "Authoring Suite"}
              </span>
            </div>
            <h1 className="text-2xl font-heading leading-tight font-semibold text-foreground">
              {isEdit ? "Edit Question" : "New Question"}
            </h1>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 shrink-0 sm:w-auto">
          {/* View Mode Switcher */}
          <div
            className="grid w-full grid-cols-2 rounded-lg border bg-muted/40 p-0.5 text-xs font-medium sm:flex sm:w-auto"
            aria-label="Authoring view"
          >
            <button
              type="button"
              aria-pressed={viewMode === "form"}
              className={cn(
                "flex min-h-10 sm:min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-center transition-[background-color,color,box-shadow]",
                viewMode === "form"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("form")}
            >
              <FilePenIcon className="size-3.5" aria-hidden="true" />
              Form
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "split"}
              className={cn(
                "hidden min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 transition-[background-color,color,box-shadow] lg:flex",
                viewMode === "split"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("split")}
            >
              <ColumnsIcon className="size-3.5" aria-hidden="true" />
              Split
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "preview"}
              className={cn(
                "flex min-h-10 sm:min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-center transition-[background-color,color,box-shadow]",
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("preview")}
            >
              <EyeIcon className="size-3.5" aria-hidden="true" />
              Preview
            </button>
          </div>

          {!isEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void submitQuestion(true)}
              className="hidden lg:inline-flex"
            >
              {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
              Create &amp; Add Another
            </Button>
          ) : null}

          <Button type="submit" disabled={pending} size="sm" className="hidden lg:inline-flex">
            {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
            {isEdit ? "Save changes" : "Create question"}
          </Button>
        </div>
      </div>

      {/* Main Authoring Layout */}
      <div
        className={cn(
          "grid gap-6 sm:gap-8 pt-1 sm:pt-2 items-start",
          viewMode === "split" ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
        )}
      >
        {/* Authoring Form Column — Connected Surface */}
        <div
          className={cn(
            "min-w-0",
            viewMode === "split" ? "lg:col-span-7 xl:col-span-7" : viewMode === "preview" ? "hidden" : "block"
          )}
        >
          {/* Authoring Surface Card */}
          <Card className="border-0 bg-transparent shadow-none ring-0 overflow-visible">
            <CardContent className="flex flex-col gap-6 p-0">
          {/* SECTION: Question Setup */}
          <section className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
              <div className="flex flex-col gap-1.5 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <SlidersIcon className="size-3.5 text-brand-violet-ink" aria-hidden="true" />
                  Question Setup
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground lg:max-w-[32rem] lg:text-right">
                  {kindDescription}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(11rem,0.85fr)_minmax(11rem,0.85fr)_minmax(16rem,1.3fr)] lg:gap-6">
                {/* Question Type */}
                <div className="flex min-w-0 flex-col gap-1">
                  <Label htmlFor="question-type" className="text-xs font-medium text-muted-foreground">
                    Question type
                  </Label>
                  <Select
                    value={kind}
                    onValueChange={(value) => {
                      if (value) handleKindChange(value)
                    }}
                  >
                      <SelectTrigger id="question-type" size="sm" className="w-full min-w-0 lg:min-w-[160px]">
                        <SelectValue placeholder="Select type">
                          {KIND_OPTIONS.find((item) => item.value === kind)?.label}
                        </SelectValue>
                      </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          <div className="flex items-center gap-2">
                            <item.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            {item.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty */}
                <div className="flex min-w-0 flex-col gap-1">
                  <Label htmlFor="question-difficulty" className="text-xs font-medium text-muted-foreground">
                    Difficulty
                  </Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value) => {
                      if (value !== null) setDifficulty(value)
                    }}
                  >
                      <SelectTrigger id="question-difficulty" size="sm" className="w-full min-w-0 lg:min-w-[150px]">
                        <SelectValue placeholder="No difficulty set">
                          {difficulty ? `Level ${difficulty}` : "No difficulty set"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-border" />
                          Any difficulty
                        </span>
                      </SelectItem>
                      <SelectItem value="1">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Level 1 · Easy
                        </span>
                      </SelectItem>
                      <SelectItem value="2">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Level 2 · Easy
                        </span>
                      </SelectItem>
                      <SelectItem value="3">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500" />
                          Level 3 · Medium
                        </span>
                      </SelectItem>
                      <SelectItem value="4">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-rose-500" />
                          Level 4 · Hard
                        </span>
                      </SelectItem>
                      <SelectItem value="5">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-rose-600" />
                          Level 5 · Advanced
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Prep Topics */}
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-auto">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Exam Prep topics <span className="font-normal text-muted-foreground/70">(optional)</span>
                  </Label>
                  <TopicSelectorDialog
                    workspaceSlug={workspaceSlug}
                    targetableBlocks={targetableBlocks}
                    targets={targets}
                    onToggleTarget={toggleTarget}
                    onUpdateTargetWeight={updateTargetWeight}
                    onSetTargetPrimary={setTargetPrimary}
                    triggerClassName="w-full min-w-0 justify-start"
                  />
                </div>
              </div>

              {/* At-a-Glance Linked Topic Badges */}
              {targets.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-brand-violet-line/20 pt-3">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-brand-violet-ink">
                    Linked
                  </span>
                  {targets.map((t) => {
                    const block = targetableBlocks.find((b) => b.blockId === t.blockId)
                    if (!block) return null
                    return (
                      <Badge
                        key={t.blockId}
                        variant="secondary"
                        className="text-xs gap-1 font-normal bg-card text-brand-violet-ink border-brand-violet-line/30"
                      >
                        <span>{block.title}</span>
                        {t.isPrimary ? <span className="font-semibold text-[10px]">(Primary)</span> : null}
                        <button
                          type="button"
                          onClick={() => toggleTarget(t.blockId)}
                          className="ml-0.5 rounded hover:bg-brand-violet-soft text-brand-violet-ink"
                          title="Remove topic link"
                        >
                          <XIcon className="size-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </section>

          {/* SECTION: Question Stem */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 id="question-stem-label" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FilePenIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
                  Question Stem <span className="text-destructive">*</span>
                </h3>
                {/* Quick Snippet Insert Bar */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => insertStemSnippet("code")}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-brand-violet-ink"
                    title="Insert Code Block"
                  >
                    <CodeIcon className="size-3" /> +Code
                  </button>
                  <button
                    type="button"
                    onClick={() => insertStemSnippet("table")}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-brand-violet-ink"
                    title="Insert Table"
                  >
                    <Table2Icon className="size-3" /> +Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertStemSnippet("image")}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-brand-violet-ink"
                    title="Insert Image"
                  >
                    <ImageIcon className="size-3" /> +Image
                  </button>
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {visibleStemLength.toLocaleString()} / {STEM_MAX_HTML.toLocaleString()} chars
              </span>
            </div>
            <RichTextEditor
              id="question-stem"
              ariaLabelledBy="question-stem-label"
              value={stem}
              onChange={setStem}
              placeholder="e.g., What is the time complexity of binary search on a sorted array of size N?"
              minHeight="10rem"
              showMathHint
              invalid={submitAttempted && !stripHtml(stem).trim()}
            />
            {submitAttempted && !stripHtml(stem).trim() ? (
              <p className="text-xs text-destructive" role="alert">
                Add the question prompt before creating the question.
              </p>
            ) : null}
          </section>

          {/* SECTION: Answer Options & Answer Key */}
          <section className="space-y-3" data-answer-validation>
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <ListChecksIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {choiceKind
                      ? "Answer Options & Correct Key"
                      : kind === "NUMERIC"
                        ? "Numeric Answer"
                        : "Model Answer / Rubric Reference"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {choiceKind ? (
                      <>
                        Write or paste all options with LaTeX math ($x^2$, $$\frac&#123;a&#125;&#123;b&#125;$$) and mark the correct key below.
                      </>
                    ) : kind === "NUMERIC" ? (
                      "Exact numerical value within tolerance."
                    ) : (
                      "Canonical short answer or grading rubric guidelines."
                    )}
                  </p>
                </div>
              </div>

              {/* Presets */}
              {choiceKind && kind !== "TRUE_FALSE" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-1 text-xs sm:h-8 sm:min-h-0">
                          <Wand2Icon className="size-3" aria-hidden="true" />
                          Presets
                          <ChevronDownIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <PopoverContent align="end" className="w-48 p-1">
                      <div className="grid gap-0.5">
                        <button
                          type="button"
                          onClick={() => applyPreset("4_CHOICE")}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted text-foreground"
                        >
                          Standard 4 Options (A-D)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("5_CHOICE")}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted text-foreground"
                        >
                          5 Options (A-E)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("TRUE_FALSE")}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted text-foreground"
                        >
                          True / False Preset
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}
            </div>

            {/* Content */}
            {choiceKind ? (
              <>
                {/* Real-time Answer Selection Validation Warning */}
                {submitAttempted && answerKeys.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300" role="alert">
                    <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span>Select at least one correct answer before creating the question.</span>
                  </div>
                ) : null}

                {/* MASTER OPTION TEXT EDITOR */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => insertUnifiedSnippet("A) \nB) \nC) \nD) \n\nCorrect: A")}
                          className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Insert 4 Option Template"
                        >
                          + Template (A-D)
                        </button>
                        <button
                          type="button"
                          onClick={() => insertUnifiedSnippet("$x^2$")}
                          className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Insert Inline Math"
                        >
                          <SigmaIcon className="size-3" /> +Inline Math
                        </button>
                        <button
                          type="button"
                          onClick={() => insertUnifiedSnippet("$$\\frac{a}{b}$$")}
                          className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Insert Display Math"
                        >
                          <SigmaIcon className="size-3" /> +Display Math
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={formatUnifiedText}
                        className="inline-flex min-h-7 items-center gap-1 rounded-md border border-brand-violet-line/40 bg-brand-violet-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-violet-ink hover:bg-brand-violet-surface"
                        title="Auto-format options text"
                      >
                        <SparklesIcon className="size-3" /> Auto-format
                      </button>
                    </div>

                    <Textarea
                      value={unifiedOptionText}
                      onChange={(e) => handleUnifiedTextChange(e.target.value)}
                      rows={7}
                      placeholder={`A) First option text with formula $x^2 + 1$\nB) Second option with $\\frac{a}{b}$\nC) Third option\nD) Fourth option\n\nCorrect: B`}
                      className="min-h-36 resize-y font-mono text-xs leading-relaxed sm:text-sm bg-background"
                    />

                    {/* Live Rendered LaTeX & Options Grid Preview */}
                    <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1.5 text-xs text-foreground">
                          <EyeIcon className="size-3.5 text-brand-violet-ink" /> Live Rendered KaTeX Math Preview
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {options.length} options parsed
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {options.map((opt) => {
                          const isCorrect = answerKeys.includes(opt.key)
                          return (
                            <div
                              key={opt.key}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                                isCorrect
                                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                                  : "border-border/80 bg-card text-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border",
                                  isCorrect
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {opt.key}
                              </span>
                              <div className="min-w-0 flex-1">
                                {stripHtml(opt.content).trim() || opt.content.includes("$") ? (
                                  <RichContent html={opt.content} className="text-xs leading-relaxed" />
                                ) : (
                                  <span className="text-muted-foreground italic">Empty option...</span>
                                )}
                              </div>
                              {isCorrect ? (
                                <CheckIcon className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Interactive Correct Answer Key Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Mark Correct Answer:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {options.map((opt) => {
                            const isCorrect = answerKeys.includes(opt.key)
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => toggleAnswer(opt.key)}
                                aria-pressed={isCorrect}
                                className={cn(
                                  "flex size-8 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all",
                                  isCorrect
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-muted text-muted-foreground border-border hover:border-emerald-500/50 hover:text-foreground"
                                )}
                                title={`Click to toggle option ${opt.key} as correct`}
                              >
                                {isCorrect ? (
                                  <CheckIcon className="size-3.5 stroke-[3]" />
                                ) : (
                                  opt.key
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {options.length} options parsed
                      </span>
                    </div>
                </div>
              </>
            ) : kind === "NUMERIC" ? (
              <div className="rounded-xl border border-input bg-background p-4">
                <Input
                  id="numeric-answer"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={numericAnswer}
                  onChange={(event) => setNumericAnswer(event.target.value)}
                  placeholder="e.g., 42.5"
                  aria-invalid={
                    submitAttempted &&
                    (numericAnswer.trim() === "" || !Number.isFinite(Number(numericAnswer)))
                  }
                  className="max-w-xs font-mono"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Grading accepts exact numeric values within small tolerance.
                </p>
                {submitAttempted &&
                (numericAnswer.trim() === "" || !Number.isFinite(Number(numericAnswer))) ? (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    Enter a valid numeric answer.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-input bg-background p-4">
                <Textarea
                  id="text-answer"
                  rows={4}
                  maxLength={20000}
                  value={textAnswer}
                  onChange={(event) => setTextAnswer(event.target.value)}
                  placeholder="Canonical short answer or grading rubric guidelines..."
                  aria-invalid={submitAttempted && !textAnswer.trim()}
                  className="text-sm"
                />
                {submitAttempted && !textAnswer.trim() ? (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    Add a model answer for grading.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {/* SECTION: Solution Explanation */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircleIcon className="size-4 text-brand-violet-ink" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">
                  Solution Explanation & Step-by-Step Derivation
                </h3>
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                  Recommended for review
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {showExplanation ? (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExplanation(
                          (prev) =>
                            `${prev ? `${prev}<br/>` : ""}<p><strong>Step 1 (Given):</strong> State given parameters and target value.</p><p><strong>Step 2 (Formula & Calculation):</strong> Apply the formula and calculate.</p><p><strong>Conclusion:</strong> Therefore, the correct answer is option ...</p>`
                        )
                      }
                      className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Insert Step-by-Step Template"
                    >
                      <SparklesIcon className="size-3 text-brand-violet-ink" /> +Step Template
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExplanation(
                          (prev) =>
                            `${prev ? `${prev}<br/>` : ""}<p>💡 <em>Key Takeaway:</em> Pay attention to boundary conditions and units.</p>`
                        )
                      }
                      className="inline-flex min-h-7 items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Insert Key Takeaway"
                    >
                      +Takeaway
                    </button>
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <FilePenIcon className="size-3.5 text-brand-violet-ink" aria-hidden="true" />
                  {showExplanation ? "Collapse" : "Add explanation"}
                </Button>
              </div>
            </div>

            {showExplanation ? (
              <div className="space-y-2">
                <RichTextEditor
                  id="question-explanation"
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="Provide a detailed step-by-step solution, mathematical derivation, or common pitfalls shown to students during review..."
                  minHeight="7.5rem"
                  showMathHint
                />
                <p className="text-xs text-muted-foreground">
                  Shown to students on the review & analysis screen after submitting the test. Supports rich text, code, and LaTeX math ($x^2$).
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card p-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    No solution explanation added yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adding a step-by-step derivation helps students learn from their mistakes during test review.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setShowExplanation(true)
                      setExplanation(
                        `<p><strong>Step 1:</strong> Identify the given values and formula.</p><p><strong>Step 2:</strong> Apply the formula and calculate.</p><p><strong>Conclusion:</strong> Therefore, the correct option is ...</p>`
                      )
                    }}
                  >
                    <SparklesIcon className="size-3 text-brand-violet-ink" />
                    Insert Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setShowExplanation(true)}
                  >
                    <FilePenIcon className="size-3.5" />
                    Write Solution
                  </Button>
                </div>
              </div>
            )}
          </section>
            </CardContent>
          </Card>
        </div>

        {/* Live Student Preview Column */}
        <div
          className={cn(
            "min-w-0",
            viewMode === "split"
              ? "hidden lg:col-span-5 lg:block xl:col-span-5 lg:sticky lg:top-20 self-start"
              : viewMode === "form"
                ? "hidden"
                : "block"
          )}
        >
          <QuestionPreview
            stem={stem}
            kind={kind}
            difficulty={difficulty}
            options={options}
            answerKeys={answerKeys}
            numericAnswer={numericAnswer}
            textAnswer={textAnswer}
            explanation={explanation}
            targets={targets}
            targetableBlocks={targetableBlocks}
          />
        </div>
      </div>

      <div
        className={cn(
          "z-30 -mx-1 mt-6 flex items-center gap-2 border-t border-border bg-background pr-1 py-3 !pl-14 shadow-sm lg:hidden",
          viewMode === "preview" ? "relative" : "sticky bottom-0"
        )}
      >
        {!isEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void submitQuestion(true)}
            className="min-w-0 flex-1 min-h-11 sm:min-h-9"
          >
            Add another
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          size="sm"
          className="min-w-0 flex-[1.35] min-h-11 sm:min-h-9"
        >
          {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
          {isEdit ? "Save changes" : "Create question"}
        </Button>
      </div>
    </form>
  )
}

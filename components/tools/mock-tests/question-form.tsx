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
  ArrowLeftIcon,
  CheckIcon,
  CircleCheckBigIcon,
  CircleDotIcon,
  ColumnsIcon,
  EyeIcon,
  FilePenIcon,
  HashIcon,
  ListChecksIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { reportSaveError } from "@/components/tools/mock-tests/save-error"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  NUMERIC_RELATIVE_TOLERANCE,
  NUMERIC_ABSOLUTE_TOLERANCE,
} from "@/lib/tools/definitions/mock-tests/calculations/scoring"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  createQuestionAction,
  updateQuestionAction,
} from "@/lib/tools/mock-tests/actions/question-actions"
import type { TargetableBlock } from "@/lib/tools/definitions/mock-tests/repository"
import dynamic from "next/dynamic"
import { RichTextEditorSkeleton } from "@/components/tools/mock-tests/editor/rich-text-editor"

const RichTextEditor = dynamic(
  () =>
    import("@/components/tools/mock-tests/editor/rich-text-editor").then(
      (mod) => mod.RichTextEditor
    ),
  {
    ssr: false,
    loading: () => <RichTextEditorSkeleton minHeight="160px" />,
  }
)
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import {
  formatOptionsToUnifiedText,
  parseUnifiedTextToOptions,
} from "./editor/unified-option-parser"
import {
  stripHtml,
  hasRichContent,
} from "@/components/tools/mock-tests/editor/html-utils"
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
    label: "Multiple Choice (MCQ)",
    icon: CircleCheckBigIcon,
    desc: "Choose exactly one correct answer.",
  },
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple Select (MSQ)",
    icon: ListChecksIcon,
    desc: "One or more correct answer choices.",
  },
  {
    value: "NUMERIC",
    label: "Numerical Answer (NAT)",
    icon: HashIcon,
    desc: "A numerical response graded within the standard tolerance.",
  },
  {
    value: "TRUE_FALSE",
    label: "True / False",
    icon: CircleDotIcon,
    desc: "Binary statement evaluation.",
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
  fromAssessmentId,
  initial,
  targetableBlocks,
}: {
  fromAssessmentId?: string
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
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  // View mode switcher: "split" | "form" | "preview"
  const [viewMode, setViewMode] = useState<"split" | "form" | "preview">("form")

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)")
    const handleViewportChange = () => {
      if (!desktopQuery.matches) {
        setViewMode((current) => (current === "split" ? "form" : current))
      }
    }

    handleViewportChange()
    desktopQuery.addEventListener("change", handleViewportChange)
    return () =>
      desktopQuery.removeEventListener("change", handleViewportChange)
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
  const [answerKeys, setAnswerKeys] = useState<string[]>(
    initial?.answerKeys ?? []
  )
  const [unifiedOptionText, setUnifiedOptionText] = useState(() =>
    formatOptionsToUnifiedText(
      initial?.options && initial.options.length > 0
        ? initial.options
        : emptyOptions(4),
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
  const [targets, setTargets] = useState<QuestionFormTarget[]>(
    initial?.targets ?? []
  )
  const [showExplanation, setShowExplanation] = useState(
    Boolean(initial?.explanation)
  )
  const [uploadingEditors, setUploadingEditors] = useState<
    Record<string, boolean>
  >({})
  const uploadingImage = Object.values(uploadingEditors).some(Boolean)
  const setImageUploading = (id: string, busy: boolean) =>
    setUploadingEditors((prev) => ({ ...prev, [id]: busy }))
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const choiceKind =
    kind === "SINGLE_CHOICE" ||
    kind === "MULTIPLE_CHOICE" ||
    kind === "TRUE_FALSE"
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
      const tfKeys =
        answerKeys.length > 0 &&
        (answerKeys[0] === "A" || answerKeys[0] === "B")
          ? [answerKeys[0]]
          : []
      setOptions(tfOptions)
      setAnswerKeys(tfKeys)
      setUnifiedOptionText(formatOptionsToUnifiedText(tfOptions, tfKeys))
    } else if (newKind === "SINGLE_CHOICE" || newKind === "MULTIPLE_CHOICE") {
      if (newKind === "SINGLE_CHOICE" && answerKeys.length > 1)
        setAnswerKeys(answerKeys.slice(0, 1))
      setOptions((current) => (current.length >= 2 ? current : emptyOptions(4)))
      setUnifiedOptionText(
        formatOptionsToUnifiedText(
          options.length >= 2 ? options : emptyOptions(4),
          newKind === "SINGLE_CHOICE" ? answerKeys.slice(0, 1) : answerKeys
        )
      )
    }
  }

  function toggleAnswer(key: string) {
    const nextKeys = answerKeys.includes(key)
      ? answerKeys.filter((candidate) => candidate !== key)
      : kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE"
        ? [key]
        : [...answerKeys, key]
    setAnswerKeys(nextKeys)
    setUnifiedOptionText(formatOptionsToUnifiedText(options, nextKeys))
  }
  function handleUnifiedTextChange(text: string) {
    setUnifiedOptionText(text)
    const parsed = parseUnifiedTextToOptions(text)
    setOptions(parsed.options)
    const validKeys = parsed.answerKeys.filter((key) =>
      parsed.options.some((option) => option.key === key)
    )
    setAnswerKeys(
      kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE"
        ? validKeys.slice(0, 1)
        : validKeys
    )
  }
  function formatUnifiedText() {
    const parsed = parseUnifiedTextToOptions(unifiedOptionText)
    if (!parsed.options.length) {
      toast.warning("Start each option with A), B), and so on.")
      return
    }
    const keys = parsed.answerKeys.filter((key) =>
      parsed.options.some((option) => option.key === key)
    )
    const nextKeys = kind === "MULTIPLE_CHOICE" ? keys : keys.slice(0, 1)
    setOptions(parsed.options)
    setAnswerKeys(nextKeys)
    setUnifiedOptionText(formatOptionsToUnifiedText(parsed.options, nextKeys))
    toast.success("Options formatted")
  }
  function addOption() {
    const nextOptions = [
      ...options,
      { key: optionLetter(options.length), content: "" },
    ]
    setOptions(nextOptions)
    setUnifiedOptionText(formatOptionsToUnifiedText(nextOptions, answerKeys))
  }

  function toggleTarget(blockId: string) {
    setTargets((current) => {
      if (current.some((target) => target.blockId === blockId)) {
        return current.filter((target) => target.blockId !== blockId)
      }
      return [
        ...current,
        { blockId, weight: 100, isPrimary: current.length === 0 },
      ]
    })
  }

  function updateTargetWeight(blockId: string, weight: number) {
    setTargets((current) =>
      current.map((target) =>
        target.blockId === blockId ? { ...target, weight } : target
      )
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

  const validate = useCallback((): string | null => {
    if (!hasRichContent(stem)) return "Question stem is required."
    if (stem.length > STEM_MAX_HTML) {
      return "The stem is too long — remove large images or simplify the content."
    }

    if (kind === "NUMERIC") {
      const parsed = Number(numericAnswer)
      if (numericAnswer.trim() === "" || !Number.isFinite(parsed)) {
        return "Enter a valid numeric answer."
      }
    } else {
      const filled = options.filter((option) => hasRichContent(option.content))
      if (kind === "TRUE_FALSE") {
        if (filled.length !== 2)
          return "True/False questions need exactly two options."
      } else if (filled.length < 2) {
        return "Add at least two answer options."
      }
      if (filled.length !== options.length)
        return "Complete each option, or remove its line from the options field."
      if (
        answerKeys.some((key) => !filled.some((option) => option.key === key))
      )
        return "Choose a correct answer from the completed options."
      if (
        (kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE") &&
        answerKeys.length > 1
      )
        return "Choose exactly one correct answer."
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
  }, [stem, kind, numericAnswer, options, answerKeys, explanation])

  const submitQuestion = useCallback(
    async (addAnother = false) => {
      if (uploadingImage) {
        toast.warning("Wait for the image upload to finish before saving.")
        return
      }
      setSubmitAttempted(true)
      const validationError = validate()
      if (validationError) {
        if (viewMode === "preview") setViewMode("form")
        toast.warning("Incomplete question", { description: validationError })
        requestAnimationFrame(() => {
          const stemIsEmpty = !hasRichContent(stem)
          const validationTarget = stemIsEmpty
            ? document.querySelector("#question-stem .ProseMirror")
            : document.querySelector<HTMLElement>("[data-answer-validation]")
          if (!(validationTarget instanceof HTMLElement)) return

          validationTarget.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
          const focusTarget = validationTarget.matches(
            "input, textarea, button, [contenteditable=true]"
          )
            ? validationTarget
            : validationTarget.querySelector<HTMLElement>(
                '[aria-label^="Mark option"], input, textarea, button, [contenteditable=true]'
              )
          focusTarget?.focus()
        })
        return
      }

      const payload = {
        stem: hasRichContent(stem) ? stem.trim() : "",
        kind: kind as (typeof KIND_OPTIONS)[number]["value"],
        difficulty: difficulty === "" ? null : Number(difficulty),
        options: choiceKind
          ? options.map((option, position) => ({
              key: option.key,
              content: hasRichContent(option.content)
                ? option.content.trim()
                : "",
              position,
            }))
          : [],
        answerKeys: choiceKind ? answerKeys : [],
        numericAnswer: kind === "NUMERIC" ? Number(numericAnswer) : null,
        textAnswer: null,
        explanation: hasRichContent(explanation) ? explanation.trim() : null,
        targets: targets.map((target) => ({
          blockId: target.blockId,
          weight: target.weight,
          isPrimary: target.isPrimary,
        })),
        idempotencyKey,
      }

      const questionsHref = fromAssessmentId
        ? workspaceRoutes.mockTests.edit(workspaceSlug, fromAssessmentId)
        : workspaceRoutes.mockTests.questions(workspaceSlug)

      startTransition(async () => {
        try {
          if (isEdit && questionId) {
            await updateQuestionAction({
              workspaceSlug,
              questionId,
              ...payload,
            })
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
                setUnifiedOptionText(
                  formatOptionsToUnifiedText(blankOptions, [])
                )
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
              toast.success(
                fromAssessmentId
                  ? "Question created! Returning to test builder..."
                  : "Question created"
              )
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
      explanation,
      targets,
      idempotencyKey,
      validate,
      workspaceSlug,
      fromAssessmentId,
      isEdit,
      questionId,
      router,
      viewMode,
      uploadingImage,
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

  const validationMessage = submitAttempted ? validate() : null
  const difficultyItems = [
    { value: "", label: "Not set" },
    { value: "1", label: "Easy · Level 1" },
    { value: "2", label: "Easy · Level 2" },
    { value: "3", label: "Medium · Level 3" },
    { value: "4", label: "Hard · Level 4" },
    { value: "5", label: "Advanced · Level 5" },
  ]
  const previewMathClass =
    "min-w-0 max-w-full overflow-x-auto overflow-y-hidden [overflow-wrap:anywhere] [&_.katex]:text-[1.5rem]! [&:has(.math-inline)]:py-3"

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-col gap-6"
      aria-busy={pending}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            className="size-11 shrink-0"
            render={<Link href={questionsHref} />}
            aria-label="Back to Question Bank"
          >
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              Question bank
            </p>
            <h1 className="font-heading text-2xl font-bold">
              {isEdit ? "Edit question" : "New question"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Write a question, link its syllabus coverage, and check the answer
              before saving.
            </p>
          </div>
        </div>
        <ToggleGroup
          aria-label="Authoring view"
          value={[viewMode]}
          onValueChange={(values) => {
            const value = values[0]
            if (value === "form" || value === "split" || value === "preview")
              setViewMode(value)
          }}
          className="w-full shrink-0 rounded-full border border-border bg-muted p-1 sm:w-auto"
          spacing={1}
        >
          <ToggleGroupItem
            value="form"
            className="min-h-11 flex-1 gap-1.5 px-3 aria-pressed:bg-card aria-pressed:shadow-sm sm:flex-none"
          >
            <FilePenIcon aria-hidden="true" />
            Edit
          </ToggleGroupItem>
          <ToggleGroupItem
            value="split"
            className="hidden min-h-11 gap-1.5 px-3 aria-pressed:bg-card aria-pressed:shadow-sm xl:flex"
          >
            <ColumnsIcon aria-hidden="true" />
            Split
          </ToggleGroupItem>
          <ToggleGroupItem
            value="preview"
            className="min-h-11 flex-1 gap-1.5 px-3 aria-pressed:bg-card aria-pressed:shadow-sm sm:flex-none"
          >
            <EyeIcon aria-hidden="true" />
            Preview
          </ToggleGroupItem>
        </ToggleGroup>
      </header>
      {validationMessage ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Check your question</AlertTitle>
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}
      <div
        className={cn(
          "grid min-w-0 items-start gap-6",
          viewMode === "split" && "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        )}
      >
        <fieldset
          disabled={pending || uploadingImage}
          className={cn(
            "min-w-0 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
            viewMode === "preview" && "hidden"
          )}
        >
          <legend className="sr-only">Question authoring</legend>
          <section
            aria-labelledby="question-setup-heading"
            className="flex flex-col gap-5 p-4 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-cyan-soft text-xs font-semibold text-brand-cyan-ink">
                1
              </span>
              <div>
                <h2
                  id="question-setup-heading"
                  className="text-base font-semibold"
                >
                  Question setup
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the format and connect this question to your syllabus.
                </p>
              </div>
            </div>
            <FieldGroup
              className={cn(
                "grid gap-4",
                viewMode !== "split" && "sm:grid-cols-2"
              )}
            >
              <Field>
                <FieldLabel htmlFor="question-type">Question type</FieldLabel>
                <Select
                  items={KIND_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  value={kind}
                  onValueChange={(value) => {
                    if (value) handleKindChange(value)
                  }}
                >
                  <SelectTrigger
                    id="question-type"
                    className="w-full data-[size=default]:h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {KIND_OPTIONS.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                          className="min-h-11"
                        >
                          <item.icon aria-hidden="true" />
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{kindDescription}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="question-difficulty">
                  Difficulty{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Select
                  items={difficultyItems}
                  value={difficulty}
                  onValueChange={(value) => {
                    if (value !== null) setDifficulty(value)
                  }}
                >
                  <SelectTrigger
                    id="question-difficulty"
                    className="w-full data-[size=default]:h-11"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {difficultyItems.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                          className="min-h-11"
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                className={viewMode !== "split" ? "sm:col-span-2" : undefined}
              >
                <FieldLabel>
                  Syllabus coverage{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <TopicSelectorDialog
                  workspaceSlug={workspaceSlug}
                  targetableBlocks={targetableBlocks}
                  targets={targets}
                  onToggleTarget={toggleTarget}
                  onUpdateTargetWeight={updateTargetWeight}
                  onSetTargetPrimary={setTargetPrimary}
                  triggerClassName="h-11 w-full min-w-0 justify-start"
                />
                <FieldDescription>
                  {targets.length
                    ? "Linked areas appear in assessment coverage and topic analysis."
                    : "Link at least one topic to make this question’s coverage visible in Exam Prep."}
                </FieldDescription>
              </Field>
            </FieldGroup>
            {targets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => {
                  const block = targetableBlocks.find(
                    (b) => b.blockId === target.blockId
                  )
                  return block ? (
                    <Badge
                      key={target.blockId}
                      variant="outline"
                      className="h-auto max-w-full gap-1 py-1 whitespace-normal"
                    >
                      <span className="min-w-0 break-words">
                        {block.title}
                        {target.isPrimary ? " · Primary" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleTarget(target.blockId)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                        aria-label={`Remove topic ${block.title}`}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
              </div>
            ) : null}
          </section>
          <section
            aria-labelledby="question-stem-label"
            className="flex flex-col gap-4 p-4 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                2
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="question-stem-label"
                  className="text-base font-semibold"
                >
                  Question <span className="text-destructive">*</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Write the prompt. Use the editor toolbar for equations, code,
                  images, and tables.
                </p>
              </div>
            </div>
            <RichTextEditor
              id="question-stem"
              workspaceSlug={workspaceSlug}
              onImageUploadStateChange={(busy) =>
                setImageUploading("stem", busy)
              }
              ariaLabelledBy="question-stem-label"
              value={stem}
              onChange={setStem}
              placeholder="What should the student solve?"
              minHeight="10rem"
              showMathHint
              invalid={submitAttempted && !hasRichContent(stem)}
            />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>Required</span>
              <span className="tabular-nums">
                {visibleStemLength.toLocaleString()} /{" "}
                {STEM_MAX_HTML.toLocaleString()} characters
              </span>
            </div>
            {submitAttempted && !hasRichContent(stem) ? (
              <p className="text-sm text-destructive">
                Enter a question before saving.
              </p>
            ) : null}
          </section>
          <section
            aria-labelledby="question-answer-heading"
            data-answer-validation
            className="flex flex-col gap-4 p-4 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                3
              </span>
              <div>
                <h2
                  id="question-answer-heading"
                  className="text-base font-semibold"
                >
                  Answer and key <span className="text-destructive">*</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {choiceKind
                    ? kind === "MULTIPLE_CHOICE"
                      ? "Enter the options, then select every correct answer in the rendered list."
                      : "Enter the options, then select the one correct answer in the rendered list."
                    : "Enter the expected numerical answer and check the grading tolerance."}
                </p>
              </div>
            </div>
            {choiceKind ? (
              <div
                className={cn(
                  "grid min-w-0 gap-5",
                  viewMode !== "split" && "xl:grid-cols-2"
                )}
              >
                <FieldGroup className="min-w-0 gap-3">
                  <Field>
                    <FieldLabel htmlFor="question-options">
                      Answer options
                    </FieldLabel>
                    <FieldDescription>
                      One option per line, starting with A), B), C), and so on.
                      Math supports $x^2$ and $$equations$$.
                    </FieldDescription>
                    <Textarea
                      id="question-options"
                      aria-describedby="question-options-help"
                      value={unifiedOptionText}
                      onChange={(event) =>
                        handleUnifiedTextChange(event.target.value)
                      }
                      rows={8}
                      className="min-h-44 resize-y bg-background font-mono text-sm leading-relaxed"
                      placeholder={
                        "A) First option\nB) Second option\nC) Third option\nD) Fourth option"
                      }
                    />
                    <p
                      id="question-options-help"
                      className="text-xs text-muted-foreground"
                    >
                      {options.length} options · {answerKeys.length} correct{" "}
                      {answerKeys.length === 1 ? "answer" : "answers"} selected
                    </p>
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={formatUnifiedText}
                    >
                      Format options
                    </Button>
                    {kind !== "TRUE_FALSE" && options.length < 26 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11"
                        onClick={addOption}
                      >
                        <PlusIcon aria-hidden="true" />
                        Add option
                      </Button>
                    ) : null}
                  </div>
                </FieldGroup>
                <div className="min-w-0">
                  <h3 className="mb-3 text-sm font-medium">
                    Rendered answers · choose the correct key
                  </h3>
                  <ul className="grid min-w-0 gap-3">
                    {options.map((option) => {
                      const correct = answerKeys.includes(option.key)
                      return (
                        <li
                          key={option.key}
                          className={cn(
                            "relative flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background p-3",
                            correct && "border-success-line bg-success-soft"
                          )}
                        >
                          <button
                            type="button"
                            className="absolute inset-0 z-10 min-h-11 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
                            aria-label={`Mark option ${option.key} as correct`}
                            aria-pressed={correct}
                            onClick={() => toggleAnswer(option.key)}
                          />
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-xs font-semibold">
                            {option.key}
                          </span>
                          <div className="pointer-events-none min-w-0 flex-1">
                            {hasRichContent(option.content) ? (
                              <RichContent
                                html={option.content}
                                className={cn(previewMathClass, "text-sm")}
                              />
                            ) : (
                              <p className="py-1 text-sm text-muted-foreground">
                                Option {option.key} is empty
                              </p>
                            )}
                            {correct ? (
                              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success-ink">
                                <CheckIcon
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                Correct answer
                              </p>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {!options.length ? (
                    <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      Enter at least two labeled options to see them here.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : kind === "NUMERIC" ? (
              <Field className="max-w-lg">
                <FieldLabel htmlFor="numeric-answer">
                  Correct numerical answer
                </FieldLabel>
                <Input
                  id="numeric-answer"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={numericAnswer}
                  onChange={(event) => setNumericAnswer(event.target.value)}
                  className="h-11"
                  placeholder="e.g., 42.5"
                  aria-describedby="numeric-tolerance"
                  aria-invalid={
                    submitAttempted &&
                    (numericAnswer.trim() === "" ||
                      !Number.isFinite(Number(numericAnswer)))
                  }
                />
                <FieldDescription id="numeric-tolerance">
                  Accepted error is up to {NUMERIC_RELATIVE_TOLERANCE * 100}% of
                  the expected value or {NUMERIC_ABSOLUTE_TOLERANCE}, whichever
                  is larger.
                </FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="text-answer">Model answer</FieldLabel>
                <Textarea
                  id="text-answer"
                  rows={4}
                  value={textAnswer}
                  onChange={(event) => setTextAnswer(event.target.value)}
                />
              </Field>
            )}
          </section>
          <section
            aria-labelledby="question-explanation-label"
            className="flex flex-col gap-4 p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                  4
                </span>
                <div>
                  <h2
                    id="question-explanation-label"
                    className="text-base font-semibold"
                  >
                    Explanation{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Help students understand the answer after they submit an
                    attempt.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                aria-expanded={showExplanation}
                aria-controls="question-explanation-region"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                {showExplanation ? "Hide explanation" : "Add explanation"}
              </Button>
            </div>
            <div id="question-explanation-region" hidden={!showExplanation}>
              {showExplanation ? (
                <RichTextEditor
                  id="question-explanation"
                  workspaceSlug={workspaceSlug}
                  onImageUploadStateChange={(busy) =>
                    setImageUploading("explanation", busy)
                  }
                  ariaLabelledBy="question-explanation-label"
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="Explain the reasoning, calculations, and common mistakes."
                  minHeight="8rem"
                  showMathHint
                />
              ) : null}
            </div>
          </section>
        </fieldset>
        <div
          className={cn(
            "min-w-0",
            viewMode === "form"
              ? "hidden"
              : viewMode === "split"
                ? "xl:sticky xl:top-24"
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
      <footer className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-md sm:bottom-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {pending
            ? "Saving your question…"
            : "Save to reuse this question in your mock tests."}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isEdit ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || uploadingImage}
              onClick={() => void submitQuestion(true)}
              className="min-h-11 flex-1 sm:flex-none"
            >
              Save &amp; add another
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={pending || uploadingImage}
            className="min-h-11 flex-1 sm:flex-none"
          >
            {pending ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : null}
            {isEdit
              ? "Save changes"
              : fromAssessmentId
                ? "Save & return to builder"
                : "Save & return"}
          </Button>
        </div>
      </footer>
    </form>
  )
}

"use client"

import { useId, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  EyeIcon,
  FilePenLineIcon,
  HelpCircleIcon,
  LayersIcon,
  ListChecksIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TrophyIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SegmentedSelector } from "@/components/ui/segmented-selector"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  saveQuestionsAction,
  updateAssessmentAction,
} from "@/lib/tools/mock-tests/actions/assessment-actions"
import {
  questionKindLabel,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { stripHtml } from "@/components/tools/mock-tests/editor/html-utils"
import { reportSaveError } from "@/components/tools/mock-tests/save-error"
import type {
  AssessmentDetail,
  QuestionBankItem,
} from "@/lib/tools/definitions/mock-tests/repository"

type Entry = AssessmentDetail["questions"][number] & { isNew?: boolean }
type ViewMode = "build" | "preview"

type SavedSnapshot = {
  title: string
  instructions: string
  durationMinutes: number | null
  totalMarks: number | null
  questions: Array<{
    id: string
    section: string | null
    position: number
    marks: number
    negativeMarks: number
    isNew?: boolean
  }>
}

function createSnapshot(
  assessment: AssessmentDetail,
  fields: {
    title: string
    instructions: string
    durationMinutes: number | null
    totalMarks: number | null
  },
  questions: Entry[]
): SavedSnapshot {
  return {
    title: fields.title,
    instructions: fields.instructions,
    durationMinutes: fields.durationMinutes,
    totalMarks: fields.totalMarks,
    questions: questions.map((entry) => ({
      id: entry.id,
      section: entry.section,
      position: entry.position,
      marks: entry.marks,
      negativeMarks: entry.negativeMarks,
      isNew: entry.isNew,
    })),
  }
}

function snapshotsEqual(a: SavedSnapshot, b: SavedSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function questionKindBadgeClass(kind: string): string {
  switch (kind) {
    case "SINGLE_CHOICE":
      return "border-brand-cyan-line/40 bg-brand-cyan-soft text-brand-cyan-ink"
    case "MULTIPLE_CHOICE":
      return "border-brand-violet-line/40 bg-brand-violet-soft text-brand-violet-ink"
    case "TRUE_FALSE":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "NUMERIC":
      return "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
    case "SHORT_ANSWER":
      return "border-brand-neon-line/40 bg-brand-neon-soft text-brand-neon-ink"
    default:
      return "border-border bg-muted/60 text-foreground"
  }
}

function difficultyBadgeClass(difficulty: number | null): string {
  if (difficulty === null)
    return "border-border bg-muted/60 text-muted-foreground"
  if (difficulty <= 2)
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (difficulty === 3)
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
}

function StudentQuestionCard({
  entry,
  number,
  className,
  onEdit,
}: {
  entry: Entry
  number: number
  className?: string
  onEdit?: () => void
}) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [answerText, setAnswerText] = useState("")
  const [showAnswerKey, setShowAnswerKey] = useState(false)

  const canRevealSolution = Boolean(
    entry.answerKeys?.length ||
    (entry.kind === "NUMERIC" && entry.numericAnswer !== null) ||
    (entry.kind === "SHORT_ANSWER" && Boolean(entry.textAnswer)) ||
    (entry.explanation && stripHtml(entry.explanation).trim())
  )

  function toggleOption(key: string) {
    if (entry.kind === "SINGLE_CHOICE" || entry.kind === "TRUE_FALSE") {
      setSelectedKeys((current) => (current.includes(key) ? [] : [key]))
    } else if (entry.kind === "MULTIPLE_CHOICE") {
      setSelectedKeys((current) =>
        current.includes(key)
          ? current.filter((candidate) => candidate !== key)
          : [...current, key]
      )
    }
  }

  const isChoice =
    entry.kind === "SINGLE_CHOICE" ||
    entry.kind === "MULTIPLE_CHOICE" ||
    entry.kind === "TRUE_FALSE"

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className
      )}
    >
      <div className="border-b border-border/80 bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md border border-border bg-card font-mono text-xs font-bold text-foreground">
              {number}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[11px]", questionKindBadgeClass(entry.kind))}
            >
              {questionKindLabel(entry.kind)}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatNumber(entry.marks)} marks
              </span>
              {entry.negativeMarks < 0 ? (
                <span className="text-destructive">
                  -{formatNumber(Math.abs(entry.negativeMarks))} negative
                </span>
              ) : null}
            </div>
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label={`Edit question ${number}`}
                className="size-8 text-muted-foreground hover:bg-card hover:text-brand-violet-ink"
              >
                <FilePenLineIcon className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
        {entry.section ? (
          <p className="mt-1 text-[11px] font-semibold tracking-wide text-brand-violet-ink uppercase">
            {entry.section}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <RichContent html={entry.stem} className="text-sm leading-7" />

        {isChoice ? (
          entry.options.length > 0 ? (
            <div className="space-y-2">
              {entry.options.map((option) => {
                const isSelected = selectedKeys.includes(option.key)
                const isCorrect = entry.answerKeys?.includes(option.key)

                const stateClass = showAnswerKey
                  ? isCorrect
                    ? "border-success-line bg-success-soft"
                    : isSelected
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-border bg-background"
                  : isSelected
                    ? "border-brand-violet-line bg-brand-violet-soft/40 ring-1 ring-brand-violet-line/30"
                    : "border-border bg-background hover:bg-muted/40"

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleOption(option.key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      stateClass
                    )}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
                        showAnswerKey && isCorrect
                          ? "border-success-ink bg-success-ink text-white"
                          : isSelected
                            ? "border-brand-violet-ink bg-brand-violet-ink text-white"
                            : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {showAnswerKey && isCorrect ? (
                        <CheckIcon className="size-3.5" aria-hidden="true" />
                      ) : (
                        option.key
                      )}
                    </span>
                    <RichContent
                      html={option.content}
                      className="min-w-0 flex-1 leading-6"
                    />
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
              No answer options added yet.
            </p>
          )
        ) : entry.kind === "NUMERIC" ? (
          <div className="space-y-2">
            <Label htmlFor={`student-numeric-${entry.id}`} className="text-xs">
              Numeric answer
            </Label>
            <Input
              id={`student-numeric-${entry.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Type your answer..."
              className="h-11"
            />
            {showAnswerKey ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-success-ink">
                <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                Correct answer:{" "}
                <span className="font-mono">
                  {entry.numericAnswer ?? "Not set"}
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`student-text-${entry.id}`} className="text-xs">
              Written answer
            </Label>
            <Textarea
              id={`student-text-${entry.id}`}
              rows={3}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Type your answer..."
              className="min-h-24"
            />
            {showAnswerKey && entry.textAnswer ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-muted-foreground">
                  Model answer
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">
                  {entry.textAnswer}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {canRevealSolution ? (
          <div className="border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn(
                "h-8 gap-1.5 text-xs",
                showAnswerKey &&
                  "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-soft"
              )}
              aria-pressed={showAnswerKey}
              onClick={() => setShowAnswerKey((value) => !value)}
            >
              <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
              {showAnswerKey ? "Hide answer key" : "Reveal answer key"}
            </Button>
            {showAnswerKey && entry.explanation ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <HelpCircleIcon
                    className="size-3.5 text-brand-violet-ink"
                    aria-hidden="true"
                  />
                  Explanation
                </p>
                <RichContent
                  html={entry.explanation}
                  className="mt-1 text-xs leading-relaxed text-muted-foreground"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function StudentPaperPreview({
  title,
  instructions,
  durationMinutes,
  totalMarks,
  entries,
  onSelect,
}: {
  title: string
  instructions: string
  durationMinutes: number | null
  totalMarks: number | null
  entries: Entry[]
  onSelect: (id: string) => void
}) {
  const sections = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const entry of entries) {
      const key = entry.section ?? ""
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return [...map.entries()]
  }, [entries])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card px-4 py-4 sm:px-5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {entries.length} {entries.length === 1 ? "question" : "questions"}
          </span>
          <span>{formatNumber(totalMarks)} total marks</span>
          <span>
            {durationMinutes === null
              ? "Untimed"
              : `${durationMinutes} minutes`}
          </span>
        </div>
      </div>

      {instructions.trim() ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <HelpCircleIcon
              className="size-3.5 text-brand-violet-ink"
              aria-hidden="true"
            />
            Instructions
          </p>
          <p className="whitespace-pre-wrap">{instructions}</p>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Add questions to see the student paper preview.
        </div>
      ) : (
        sections.map(([sectionName, sectionEntries]) => (
          <section key={sectionName || "__unsectioned__"} className="space-y-3">
            {sectionName ? (
              <div className="flex items-center gap-2">
                <LayersIcon
                  className="size-3.5 text-brand-violet-ink"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {sectionName}
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {sectionEntries.length}
                </Badge>
              </div>
            ) : null}
            <div className="space-y-3">
              {sectionEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="block w-full text-left focus-visible:outline-none"
                >
                  <StudentQuestionCard
                    entry={entry}
                    number={entry.position + 1}
                    className="transition-colors hover:border-brand-violet-line/70"
                    onEdit={() => onSelect(entry.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

export function AssessmentBuilder({
  workspaceSlug,
  assessment,
  bank,
}: {
  workspaceSlug: string
  assessment: AssessmentDetail
  bank: QuestionBankItem[]
}) {
  const router = useRouter()
  const sectionListId = useId()
  const [revision, setRevision] = useState(assessment.revision)
  const [showBank, setShowBank] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("build")
  const [selectedId, setSelectedId] = useState<string | null>(
    assessment.questions[0]?.id ?? null
  )
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const [title, setTitle] = useState(assessment.title)
  const [duration, setDuration] = useState(
    assessment.durationMinutes === null
      ? ""
      : String(assessment.durationMinutes)
  )
  const [totalMarks, setTotalMarks] = useState(
    assessment.totalMarks === null ? "" : String(assessment.totalMarks)
  )
  const [instructions, setInstructions] = useState(
    assessment.instructions ?? ""
  )

  const [entries, setEntries] = useState<Entry[]>(assessment.questions)

  const [saving, startSaving] = useTransition()
  const [detailsKey, setDetailsKey] = useState(() => createIdempotencyKey())
  const [questionsKey, setQuestionsKey] = useState(() => createIdempotencyKey())

  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot>(() =>
    createSnapshot(
      assessment,
      {
        title: assessment.title,
        instructions: assessment.instructions ?? "",
        durationMinutes: assessment.durationMinutes,
        totalMarks: assessment.totalMarks,
      },
      assessment.questions
    )
  )

  const [bankQuery, setBankQuery] = useState("")
  const [bankKind, setBankKind] = useState("ALL")
  const [bankDifficulty, setBankDifficulty] = useState("ALL")
  const [bankTopic, setBankTopic] = useState("ALL")

  const availableBank = useMemo(() => {
    const added = new Set(entries.map((entry) => entry.id))
    return bank.filter((item) => !added.has(item.id))
  }, [bank, entries])

  const bankTopics = useMemo(() => {
    const topics = new Set<string>()
    for (const item of availableBank) {
      for (const topic of item.targetTitles) topics.add(topic)
    }
    return [...topics].sort((a, b) => a.localeCompare(b))
  }, [availableBank])

  const filteredBank = useMemo(() => {
    const query = bankQuery.trim().toLowerCase()
    return availableBank.filter((item) => {
      if (query) {
        const stemMatch = item.stem.toLowerCase().includes(query)
        const topicMatch = item.targetTitles.some((topic) =>
          topic.toLowerCase().includes(query)
        )
        const optionMatch = item.options.some((option) =>
          option.content.toLowerCase().includes(query)
        )
        if (!stemMatch && !topicMatch && !optionMatch) return false
      }
      if (bankKind !== "ALL" && item.kind !== bankKind) return false
      if (bankDifficulty === "UNSET" && item.difficulty !== null) return false
      if (bankDifficulty !== "ALL" && bankDifficulty !== "UNSET") {
        if (item.difficulty !== Number(bankDifficulty)) return false
      }
      if (bankTopic !== "ALL" && !item.targetTitles.includes(bankTopic))
        return false
      return true
    })
  }, [availableBank, bankQuery, bankKind, bankDifficulty, bankTopic])

  const sectionOptions = useMemo(() => {
    const sections = new Set<string>()
    for (const entry of entries) {
      if (entry.section && entry.section.trim() !== "") {
        sections.add(entry.section.trim())
      }
    }
    return [...sections]
  }, [entries])

  const paperMarks = useMemo(
    () =>
      entries.reduce(
        (sum, entry) => sum + (Number.isFinite(entry.marks) ? entry.marks : 0),
        0
      ),
    [entries]
  )

  const currentSnapshot = useMemo<SavedSnapshot>(
    () =>
      createSnapshot(
        assessment,
        {
          title,
          instructions,
          durationMinutes: duration.trim() === "" ? null : Number(duration),
          totalMarks: totalMarks.trim() === "" ? null : Number(totalMarks),
        },
        entries
      ),
    [assessment, title, instructions, duration, totalMarks, entries]
  )

  const isDirty = !snapshotsEqual(savedSnapshot, currentSnapshot)
  function clearBankFilters() {
    setBankQuery("")
    setBankKind("ALL")
    setBankDifficulty("ALL")
    setBankTopic("ALL")
  }

  function addFromBank(questionId: string) {
    const item = bank.find((candidate) => candidate.id === questionId)
    if (!item) return
    setEntries((current) => [
      ...current,
      {
        id: item.id,
        kind: item.kind,
        stem: item.stem,
        difficulty: item.difficulty,
        options: item.options,
        answerKeys: item.answerKeys,
        numericAnswer: item.numericAnswer,
        textAnswer: item.textAnswer,
        explanation: item.explanation,
        targetTitles: item.targetTitles,
        position: current.length,
        section: null,
        marks: 1,
        negativeMarks: 0,
        isNew: true,
      },
    ])
    setSelectedId(questionId)
    setExpandedIds((current) => ({ ...current, [questionId]: true }))
    setShowBank(false)
  }

  function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    )
  }

  function removeEntry(id: string) {
    const index = entries.findIndex((entry) => entry.id === id)
    const next = entries
      .filter((entry) => entry.id !== id)
      .map((entry, position) => ({ ...entry, position }))
    setEntries(next)
    if (selectedId === id) {
      const fallback = next[Math.min(index, next.length - 1)]
      setSelectedId(fallback?.id ?? null)
    }
    setExpandedIds((current) => {
      const copy = { ...current }
      delete copy[id]
      return copy
    })
  }

  function moveEntry(id: string, direction: -1 | 1) {
    setEntries((current) => {
      const index = current.findIndex((entry) => entry.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next.map((entry, position) => ({ ...entry, position }))
    })
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  function validateQuestionValues(): boolean {
    for (const entry of entries) {
      if (!Number.isFinite(entry.marks) || entry.marks < 0) {
        toast.warning("Invalid marks", {
          description: "Question marks must be zero or greater.",
        })
        return false
      }
      if (!Number.isFinite(entry.negativeMarks) || entry.negativeMarks > 0) {
        toast.warning("Invalid negative marks", {
          description: "Negative marks must be zero or less.",
        })
        return false
      }
    }
    return true
  }

  function handleSaveAll() {
    const durationMinutes = duration.trim() === "" ? null : Number(duration)
    const marks = totalMarks.trim() === "" ? null : Number(totalMarks)
    if (
      durationMinutes !== null &&
      (!Number.isInteger(durationMinutes) || durationMinutes < 1)
    ) {
      toast.warning("Invalid duration", {
        description: "Duration must be a whole number of minutes.",
      })
      return
    }
    if (marks !== null && (!Number.isFinite(marks) || marks <= 0)) {
      toast.warning("Invalid total marks", {
        description: "Total marks must be greater than zero.",
      })
      return
    }
    if (!validateQuestionValues()) return

    const questions = entries.map((entry) => ({
      questionId: entry.id,
      section:
        entry.section && entry.section.trim() !== ""
          ? entry.section.trim()
          : null,
      position: entry.position,
      marks: entry.marks,
      negativeMarks: entry.negativeMarks,
    }))
    const snapshot = currentSnapshot

    startSaving(async () => {
      try {
        const detailsResult = await updateAssessmentAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: revision,
          title: title.trim(),
          instructions: instructions.trim() === "" ? null : instructions.trim(),
          durationMinutes,
          totalMarks: marks,
          idempotencyKey: detailsKey,
        })
        const questionsResult = await saveQuestionsAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: detailsResult.revision,
          questions,
          idempotencyKey: questionsKey,
        })
        setRevision(questionsResult.revision)
        setDetailsKey(createIdempotencyKey())
        setQuestionsKey(createIdempotencyKey())
        setEntries((current) =>
          current.map((entry) => ({ ...entry, isNew: false }))
        )
        setSavedSnapshot({
          ...snapshot,
          questions: snapshot.questions.map((question) => ({
            ...question,
            isNew: false,
          })),
        })
        setViewMode("build")
        toast.success("Mock test saved")
        router.refresh()
      } catch (error) {
        setDetailsKey(createIdempotencyKey())
        setQuestionsKey(createIdempotencyKey())
        reportSaveError(error, "Failed to save the test.")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Blueprint strip */}
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                assessment.status === "published"
                  ? "border-brand-neon-line/40 bg-brand-neon-soft text-brand-neon-ink"
                  : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
              )}
            >
              {assessment.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Revision {revision}
            </span>
            <Badge
              variant="outline"
              aria-live="polite"
              className={cn(
                "text-[11px]",
                isDirty
                  ? "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
                  : "border-success-line/40 bg-success-soft text-success-ink"
              )}
            >
              {isDirty ? "Unsaved changes" : "All changes saved"}
            </Badge>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="outline"
              onClick={() => setShowBank(true)}
              disabled={saving}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Add from bank
            </Button>
            <Button onClick={handleSaveAll} disabled={!isDirty || saving}>
              {saving ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckIcon data-icon="inline-start" aria-hidden="true" />
              )}
              Save all
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ListChecksIcon
                className="size-3.5 text-brand-violet-ink"
                aria-hidden="true"
              />
              Questions
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold text-foreground">
              {entries.length}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <TrophyIcon
                className="size-3.5 text-brand-cyan-ink"
                aria-hidden="true"
              />
              Paper marks
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold text-foreground">
              {formatNumber(paperMarks)}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ClockIcon
                className="size-3.5 text-brand-amber-ink"
                aria-hidden="true"
              />
              Duration
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold text-foreground">
              {duration.trim() === "" ? "Untimed" : `${duration} min`}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <LayersIcon
                className="size-3.5 text-brand-neon-ink"
                aria-hidden="true"
              />
              Publish readiness
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold text-foreground">
              {entries.length > 0
                ? assessment.status === "published"
                  ? "Published"
                  : "Ready"
                : "Needs questions"}
            </dd>
          </div>
        </dl>
      </section>

      {/* View switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedSelector
          value={viewMode}
          onValueChange={(value) => setViewMode(value)}
          options={[
            {
              value: "build",
              label: "Build",
              icon: FilePenLineIcon,
              activeClassName:
                "bg-brand-violet-soft text-brand-violet-ink data-[pressed]:bg-brand-violet-soft data-[pressed]:text-brand-violet-ink",
            },
            {
              value: "preview",
              label: "Student preview",
              icon: EyeIcon,
              activeClassName:
                "bg-brand-violet-soft text-brand-violet-ink data-[pressed]:bg-brand-violet-soft data-[pressed]:text-brand-violet-ink",
            },
          ]}
          ariaLabel="Editor view"
          className="sm:w-fit"
        />
        <p className="hidden text-xs text-muted-foreground sm:block">
          {viewMode === "build"
            ? "Edit metadata, marks and sections, then save once."
            : "See the paper the way students will attempt it."}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Main builder / paper column */}
        <div className="min-w-0 space-y-6">
          {viewMode === "build" ? (
            <>
              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <FilePenLineIcon
                    className="size-4 text-brand-violet-ink"
                    aria-hidden="true"
                  />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Test setup
                  </h2>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="builder-title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="builder-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      maxLength={200}
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="builder-duration">
                        Duration (minutes)
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          optional
                        </span>
                      </Label>
                      <Input
                        id="builder-duration"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={1440}
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        placeholder="Untimed"
                        className="h-11"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="builder-marks">
                        Total marks
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          optional
                        </span>
                      </Label>
                      <Input
                        id="builder-marks"
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="any"
                        value={totalMarks}
                        onChange={(event) => setTotalMarks(event.target.value)}
                        placeholder="e.g., 100"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="builder-instructions">Instructions</Label>
                    <Textarea
                      id="builder-instructions"
                      rows={4}
                      maxLength={20000}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      placeholder="e.g., Each correct answer carries 3 marks; 1 mark is deducted for every wrong answer."
                      className="min-h-28"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">
                      Question roster
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Set marks, negative marks and a section per question.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowBank(true)}
                    disabled={saving}
                    className="sm:hidden"
                  >
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                    Add from bank
                  </Button>
                </div>

                {entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center">
                    <ListChecksIcon
                      className="mx-auto size-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-medium text-foreground">
                      No questions on this test yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add questions from your bank to build the paper.
                    </p>
                    <Button className="mt-4" onClick={() => setShowBank(true)}>
                      <PlusIcon data-icon="inline-start" aria-hidden="true" />
                      Add from bank
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {entries.map((entry) => {
                      const isExpanded = Boolean(expandedIds[entry.id])
                      return (
                        <li
                          key={entry.id}
                          className={cn(
                            "transition-colors",
                            entry.isNew && "bg-brand-violet-soft/30",
                            selectedId === entry.id &&
                              "border-l-2 border-brand-violet-line/70",
                            selectedId === entry.id &&
                              !isExpanded &&
                              "bg-brand-violet-soft/10",
                            isExpanded && "bg-muted/20"
                          )}
                        >
                          <div className="flex items-start gap-3 p-3 sm:p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpanded(entry.id)}
                              aria-label={
                                isExpanded
                                  ? `Collapse question ${entry.position + 1}`
                                  : `Expand question ${entry.position + 1}`
                              }
                              aria-expanded={isExpanded}
                              className="mt-0.5 size-9 shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground sm:size-10"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronDownIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              )}
                            </Button>

                            <button
                              type="button"
                              aria-current={
                                selectedId === entry.id ? "true" : undefined
                              }
                              onClick={() => {
                                setSelectedId(entry.id)
                                if (!isExpanded) toggleExpanded(entry.id)
                              }}
                              className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-medium text-muted-foreground tabular-nums">
                                  Q{entry.position + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    questionKindBadgeClass(entry.kind)
                                  )}
                                >
                                  {questionKindLabel(entry.kind)}
                                </Badge>
                                {entry.difficulty !== null ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px]",
                                      difficultyBadgeClass(entry.difficulty)
                                    )}
                                  >
                                    Level {entry.difficulty}
                                  </Badge>
                                ) : null}
                                {entry.isNew ? (
                                  <Badge className="bg-brand-violet text-brand-violet-foreground">
                                    New
                                  </Badge>
                                ) : null}
                              </div>

                              <RichContent
                                html={entry.stem}
                                className="mt-1.5 line-clamp-2 text-sm leading-6"
                              />

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {formatNumber(entry.marks)} marks
                                </span>
                                {entry.negativeMarks < 0 ? (
                                  <span className="text-destructive">
                                    -
                                    {formatNumber(
                                      Math.abs(entry.negativeMarks)
                                    )}{" "}
                                    negative
                                  </span>
                                ) : null}
                                <span>
                                  {entry.section?.trim() || "No section"}
                                </span>
                                {entry.targetTitles?.length ? (
                                  <span className="hidden truncate sm:inline">
                                    {entry.targetTitles.join(", ")}
                                  </span>
                                ) : null}
                              </div>
                            </button>

                            <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => moveEntry(entry.id, -1)}
                                disabled={entry.position === 0}
                                aria-label={`Move question ${entry.position + 1} up`}
                                className="size-9 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowUpIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => moveEntry(entry.id, 1)}
                                disabled={entry.position === entries.length - 1}
                                aria-label={`Move question ${entry.position + 1} down`}
                                className="size-9 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowDownIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeEntry(entry.id)}
                                aria-label={`Remove question ${entry.position + 1}`}
                                className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2Icon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="border-t border-border bg-muted/15 p-3 sm:p-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={`marks-${entry.id}`}
                                    className="text-xs"
                                  >
                                    Marks
                                  </Label>
                                  <Input
                                    id={`marks-${entry.id}`}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={999999.99}
                                    step="any"
                                    value={String(entry.marks)}
                                    onChange={(event) =>
                                      updateEntry(entry.id, {
                                        marks: Number(event.target.value),
                                      })
                                    }
                                    className="h-11"
                                  />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={`negative-${entry.id}`}
                                    className="text-xs"
                                  >
                                    Negative marks (0 or less)
                                  </Label>
                                  <Input
                                    id={`negative-${entry.id}`}
                                    type="number"
                                    inputMode="decimal"
                                    min={-999999.99}
                                    max={0}
                                    step="any"
                                    value={String(entry.negativeMarks)}
                                    onChange={(event) =>
                                      updateEntry(entry.id, {
                                        negativeMarks: Number(
                                          event.target.value
                                        ),
                                      })
                                    }
                                    className="h-11"
                                  />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={`section-${entry.id}`}
                                    className="text-xs"
                                  >
                                    Section
                                  </Label>
                                  <Input
                                    id={`section-${entry.id}`}
                                    list={sectionListId}
                                    value={entry.section ?? ""}
                                    maxLength={40}
                                    onChange={(event) =>
                                      updateEntry(entry.id, {
                                        section: event.target.value || null,
                                      })
                                    }
                                    placeholder="Optional"
                                    className="h-11"
                                  />
                                  <datalist id={sectionListId}>
                                    {sectionOptions.map((section) => (
                                      <option value={section} key={section} />
                                    ))}
                                  </datalist>
                                </div>
                              </div>

                              {sectionOptions.length > 0 ? (
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    Reuse:
                                  </span>
                                  {sectionOptions.slice(0, 4).map((section) => (
                                    <button
                                      key={section}
                                      type="button"
                                      onClick={() =>
                                        updateEntry(entry.id, { section })
                                      }
                                      className={cn(
                                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                        entry.section === section
                                          ? "border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink"
                                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                                      )}
                                    >
                                      {section}
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              <div className="mt-4 border-t border-border pt-3">
                                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  Answer key
                                </p>
                                {entry.options.length > 0 ? (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {entry.options.map((option) => {
                                      const isCorrect =
                                        entry.answerKeys?.includes(option.key)
                                      return (
                                        <div
                                          key={option.key}
                                          className={cn(
                                            "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
                                            isCorrect
                                              ? "border-success-line bg-success-soft"
                                              : "border-border bg-card"
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              "flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold",
                                              isCorrect
                                                ? "border-success-ink bg-success-ink text-white"
                                                : "border-border bg-muted text-muted-foreground"
                                            )}
                                          >
                                            {option.key}
                                          </span>
                                          <RichContent
                                            html={option.content}
                                            className="min-w-0 flex-1 leading-relaxed"
                                          />
                                          {isCorrect ? (
                                            <CheckCircle2Icon
                                              className="mt-0.5 size-3.5 shrink-0 text-success-ink"
                                              aria-hidden="true"
                                            />
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : entry.kind === "NUMERIC" &&
                                  entry.numericAnswer !== null ? (
                                  <p className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                                    Correct answer:{" "}
                                    <span className="font-mono font-bold text-success-ink">
                                      {entry.numericAnswer}
                                    </span>
                                  </p>
                                ) : entry.kind === "SHORT_ANSWER" &&
                                  entry.textAnswer ? (
                                  <p className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                                    <span className="font-semibold text-muted-foreground">
                                      Model answer:
                                    </span>{" "}
                                    {entry.textAnswer}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground italic">
                                    No answer key set for this question.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <StudentPaperPreview
              title={title}
              instructions={instructions}
              durationMinutes={duration.trim() === "" ? null : Number(duration)}
              totalMarks={totalMarks.trim() === "" ? null : Number(totalMarks)}
              entries={entries}
              onSelect={(id) => {
                setSelectedId(id)
                setExpandedIds((current) => ({ ...current, [id]: true }))
                setViewMode("build")
              }}
            />
          )}
        </div>
      </div>

      {/* Bank picker */}
      <Sheet open={showBank} onOpenChange={(open) => setShowBank(open)}>
        {/* Wider panel for the bank picker; overrides the sheet default max-w-sm cap */}
        <SheetContent side="right" className="w-full sm:max-w-2xl!">
          <SheetHeader>
            <SheetTitle>Add questions from bank</SheetTitle>
            <SheetDescription>
              Search and filter your repository, then add questions to this
              paper.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-6 pb-4">
            <div className="relative">
              <SearchIcon
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={bankQuery}
                onChange={(event) => setBankQuery(event.target.value)}
                placeholder="Search stems, options or topics..."
                className="h-11 pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={bankKind}
                onValueChange={(value) => {
                  if (value) setBankKind(value)
                }}
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Question type">
                    {bankKind === "ALL"
                      ? "All types"
                      : questionKindLabel(bankKind)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="SINGLE_CHOICE">Single choice</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">
                    Multiple choice
                  </SelectItem>
                  <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                  <SelectItem value="NUMERIC">Numeric</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Short answer</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={bankDifficulty}
                onValueChange={(value) => {
                  if (value) setBankDifficulty(value)
                }}
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Difficulty">
                    {bankDifficulty === "ALL"
                      ? "All levels"
                      : bankDifficulty === "UNSET"
                        ? "No level"
                        : `Level ${bankDifficulty}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All levels</SelectItem>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                  <SelectItem value="UNSET">No level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bankTopics.length > 0 ? (
              <Select
                value={bankTopic}
                onValueChange={(value) => {
                  if (value) setBankTopic(value)
                }}
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Topic">
                    {bankTopic === "ALL" ? "All topics" : bankTopic}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All topics</SelectItem>
                  {bankTopics.map((topic) => (
                    <SelectItem value={topic} key={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                {filteredBank.length}{" "}
                {filteredBank.length === 1 ? "question" : "questions"}
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearBankFilters}
              >
                Reset filters
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {filteredBank.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No matching questions. Adjust the filters or create a new
                question.
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredBank.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <RichContent
                      html={item.stem}
                      className="line-clamp-2 text-sm leading-5"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          questionKindBadgeClass(item.kind)
                        )}
                      >
                        {questionKindLabel(item.kind)}
                      </Badge>
                      {item.difficulty !== null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            difficultyBadgeClass(item.difficulty)
                          )}
                        >
                          Level {item.difficulty}
                        </Badge>
                      ) : null}
                      {item.targetTitles.slice(0, 2).map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center gap-1 rounded-md border border-brand-violet-line/30 bg-brand-violet-soft/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-violet-ink"
                        >
                          <span
                            className="size-1 rounded-full bg-brand-violet-ink"
                            aria-hidden="true"
                          />
                          {topic}
                        </span>
                      ))}
                      {item.targetTitles.length > 2 ? (
                        <span className="text-[10px] text-muted-foreground">
                          +{item.targetTitles.length - 2} more
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {item.assessmentsCount}{" "}
                        {item.assessmentsCount === 1 ? "test" : "tests"}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-8 text-xs"
                        onClick={() => addFromBank(item.id)}
                      >
                        <PlusIcon data-icon="inline-start" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-6 py-4">
            <Button
              variant="secondary"
              className="w-full"
              render={
                <Link
                  href={workspaceRoutes.mockTests.questionNew(workspaceSlug)}
                />
              }
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create a new question
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setShowBank(true)}
            disabled={saving}
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Add
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={handleSaveAll}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
            )}
            Save all
          </Button>
        </div>
      </div>
    </div>
  )
}

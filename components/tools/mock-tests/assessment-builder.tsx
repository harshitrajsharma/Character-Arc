"use client"

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
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
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  TrophyIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Switch } from "@/components/ui/switch"
import { SegmentedSelector } from "@/components/ui/segmented-selector"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  saveQuestionsAction,
  updateAssessmentAction,
  publishAssessmentAction,
} from "@/lib/tools/mock-tests/actions/assessment-actions"
import { createAttemptAction } from "@/lib/tools/mock-tests/actions/attempt-actions"
import {
  questionKindLabel,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { RichTextEditor } from "@/components/tools/mock-tests/editor/rich-text-editor"
import { stripHtml, htmlTextLength } from "@/components/tools/mock-tests/editor/html-utils"
import { reportSaveError } from "@/components/tools/mock-tests/save-error"
import { SectionDialog } from "./section-dialog"
import {
  BlueprintFormFields,
  PAPER_TYPES,
  type PaperType,
} from "@/components/tools/mock-tests/blueprint-form-fields"
import type {
  AssessmentDetail,
  QuestionBankItem,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

type Entry = AssessmentDetail["questions"][number] & { isNew?: boolean }
type ViewMode = "build" | "preview"

type SavedSnapshot = {
  title: string
  instructions: string
  durationMinutes: number | null
  totalMarks: number | null
  passingBenchmark: number
  distinctionBenchmark: number
  calculatorAllowed: boolean
  paperType: PaperType
  examTag: string
  subjectsText: string
  sections: SectionDefinition[]
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
    passingBenchmark: number
    distinctionBenchmark: number
    calculatorAllowed: boolean
    paperType: PaperType
    examTag: string
    subjectsText: string
  },
  sections: SectionDefinition[],
  questions: Entry[]
): SavedSnapshot {
  return {
    title: fields.title,
    instructions: fields.instructions,
    durationMinutes: fields.durationMinutes,
    totalMarks: fields.totalMarks,
    passingBenchmark: fields.passingBenchmark,
    distinctionBenchmark: fields.distinctionBenchmark,
    calculatorAllowed: fields.calculatorAllowed,
    paperType: fields.paperType,
    examTag: fields.examTag,
    subjectsText: fields.subjectsText,
    sections: sections.map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description ?? null,
    })),
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

function orderEntriesBySections(
  entries: Entry[],
  sections: SectionDefinition[]
): Entry[] {
  if (sections.length === 0) {
    return entries.map((entry, position) => ({ ...entry, position }))
  }

  const sectionOrderMap = new Map<string, number>()
  sections.forEach((sec, idx) => sectionOrderMap.set(sec.key, idx))

  const sorted = [...entries].sort((a, b) => {
    const aSecIndex =
      a.section && sectionOrderMap.has(a.section)
        ? sectionOrderMap.get(a.section)!
        : 9999
    const bSecIndex =
      b.section && sectionOrderMap.has(b.section)
        ? sectionOrderMap.get(b.section)!
        : 9999

    if (aSecIndex !== bSecIndex) {
      return aSecIndex - bSecIndex
    }
    return a.position - b.position
  })

  return sorted.map((entry, position) => ({ ...entry, position }))
}

function snapshotsEqual(a: SavedSnapshot, b: SavedSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function questionKindBadgeClass(kind: string): string {
  switch (kind) {
    case "SINGLE_CHOICE":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "MULTIPLE_CHOICE":
      return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300"
    case "TRUE_FALSE":
      return "border-border bg-muted/60 text-muted-foreground"
    case "NUMERIC":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "SHORT_ANSWER":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
    default:
      return "border-border bg-muted/60 text-foreground"
  }
}

function difficultyBadgeClass(difficulty: number | null): string {
  if (difficulty === null)
    return "border-border bg-muted/60 text-muted-foreground"
  if (difficulty <= 2)
    return "border-border bg-muted text-muted-foreground"
  if (difficulty === 3)
    return "border-brand-amber-line/40 bg-brand-amber-soft text-brand-amber-ink"
  return "border-success-line/40 bg-success-soft text-success-ink"
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
                className="size-8 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <FilePenLineIcon className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
        {entry.section ? (
          <p className="mt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
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
                          ? "border-success-ink bg-success-ink text-success-foreground"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
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
                  "bg-muted text-foreground hover:bg-muted"
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
                    className="size-3.5 text-muted-foreground"
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
  sections,
  onSelect,
}: {
  title: string
  instructions: string
  durationMinutes: number | null
  totalMarks: number | null
  entries: Entry[]
  sections: SectionDefinition[]
  onSelect: (id: string) => void
}) {
  const sectionGroups = useMemo(() => {
    if (sections.length > 0) {
      const groups: Array<{
        key: string
        title: string
        description?: string | null
        entries: Entry[]
      }> = []

      const assignedIds = new Set<string>()

      for (const sec of sections) {
        const matching = entries.filter((e) => e.section === sec.key)
        for (const e of matching) assignedIds.add(e.id)
        if (matching.length > 0) {
          groups.push({
            key: sec.key,
            title: sec.title,
            description: sec.description,
            entries: matching,
          })
        }
      }

      const unassigned = entries.filter((e) => !assignedIds.has(e.id))
      if (unassigned.length > 0) {
        groups.push({
          key: "__unassigned__",
          title: "Unassigned Questions",
          description: null,
          entries: unassigned,
        })
      }

      return groups
    }

    const map = new Map<string, Entry[]>()
    for (const entry of entries) {
      const key = entry.section ?? ""
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return [...map.entries()].map(([key, groupEntries]) => ({
      key: key || "__unsectioned__",
      title: key,
      description: null,
      entries: groupEntries,
    }))
  }, [sections, entries])

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
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            Instructions
          </p>
          <p className="whitespace-pre-wrap">{instructions}</p>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Add questions to see the student paper preview.
        </div>
      ) : (
        sectionGroups.map((group) => {
          const groupMarks = group.entries.reduce(
            (sum, e) => sum + (Number.isFinite(e.marks) ? e.marks : 0),
            0
          )
          return (
            <section key={group.key} className="space-y-3">
              {group.title ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LayersIcon
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-foreground">
                        {group.title}
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {group.entries.length}{" "}
                      {group.entries.length === 1 ? "question" : "questions"} •{" "}
                      {formatNumber(groupMarks)} marks
                    </Badge>
                  </div>
                  {group.description?.trim() ? (
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {group.description.trim()}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="block w-full text-left focus-visible:outline-none"
                  >
                    <StudentQuestionCard
                      entry={entry}
                      number={entry.position + 1}
                      className="transition-colors hover:border-foreground/20"
                      onEdit={() => onSelect(entry.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )
        })
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
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [isRemoving, startRemoving] = useTransition()

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
  const [passingBenchmark, setPassingBenchmark] = useState(
    assessment.passingBenchmark ?? 33
  )
  const [distinctionBenchmark, setDistinctionBenchmark] = useState(
    assessment.distinctionBenchmark ?? 70
  )
  const [calculatorAllowed, setCalculatorAllowed] = useState(
    Boolean(assessment.calculatorAllowed)
  )
  const [paperType, setPaperType] = useState<PaperType>(
    assessment.taxonomy?.paperType ?? "full_length"
  )
  const [examTag, setExamTag] = useState<string>(
    assessment.taxonomy?.examTag ?? ""
  )
  const [subjectsText, setSubjectsText] = useState<string>(
    (assessment.taxonomy?.subjects ?? []).join(", ")
  )

  const [sections, setSections] = useState<SectionDefinition[]>(
    assessment.sections ?? []
  )
  const [bankTargetSection, setBankTargetSection] = useState<string | null>(null)
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(
    null
  )
  const [deletingSection, setDeletingSection] = useState<SectionDefinition | null>(
    null
  )
  const [targetQuestionForNewSection, setTargetQuestionForNewSection] = useState<
    string | null
  >(null)
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({})

  const [entries, setEntries] = useState<Entry[]>(() =>
    orderEntriesBySections(assessment.questions, assessment.sections ?? [])
  )

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
        passingBenchmark: assessment.passingBenchmark ?? 33,
        distinctionBenchmark: assessment.distinctionBenchmark ?? 70,
        calculatorAllowed: Boolean(assessment.calculatorAllowed),
        paperType: assessment.taxonomy?.paperType ?? "full_length",
        examTag: assessment.taxonomy?.examTag ?? "",
        subjectsText: (assessment.taxonomy?.subjects ?? []).join(", "),
      },
      assessment.sections ?? [],
      assessment.questions
    )
  )

  const [bankQuery, setBankQuery] = useState("")
  const [bankKind, setBankKind] = useState("ALL")
  const [bankDifficulty, setBankDifficulty] = useState("ALL")
  const [bankTopic, setBankTopic] = useState("ALL")

  const addedQuestionIds = useMemo(
    () => new Set(entries.map((entry) => entry.id)),
    [entries]
  )

  const bankTopics = useMemo(() => {
    const topics = new Set<string>()
    for (const item of bank) {
      for (const topic of item.targetTitles) topics.add(topic)
    }
    return [...topics].sort((a, b) => a.localeCompare(b))
  }, [bank])

  const filteredBank = useMemo(() => {
    const query = bankQuery.trim().toLowerCase()
    return bank.filter((item) => {
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
  }, [bank, bankQuery, bankKind, bankDifficulty, bankTopic])

  const sectionStats = useMemo(() => {
    const map = new Map<string, { count: number; marks: number }>()
    for (const sec of sections) {
      map.set(sec.key, { count: 0, marks: 0 })
    }
    let unassignedCount = 0
    let unassignedMarks = 0
    for (const entry of entries) {
      const key = entry.section?.trim()
      if (key && map.has(key)) {
        const curr = map.get(key)!
        curr.count += 1
        curr.marks += Number.isFinite(entry.marks) ? entry.marks : 0
      } else {
        unassignedCount += 1
        unassignedMarks += Number.isFinite(entry.marks) ? entry.marks : 0
      }
    }
    return {
      sectionMap: map,
      unassigned: { count: unassignedCount, marks: unassignedMarks },
    }
  }, [sections, entries])

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
          passingBenchmark,
          distinctionBenchmark,
          calculatorAllowed,
          paperType,
          examTag,
          subjectsText,
        },
        sections,
        entries
      ),
    [
      assessment,
      title,
      instructions,
      duration,
      totalMarks,
      passingBenchmark,
      distinctionBenchmark,
      calculatorAllowed,
      paperType,
      examTag,
      subjectsText,
      sections,
      entries,
    ]
  )

  const isDirty = !snapshotsEqual(savedSnapshot, currentSnapshot)

  function clearBankFilters() {
    setBankQuery("")
    setBankKind("ALL")
    setBankDifficulty("ALL")
    setBankTopic("ALL")
  }

  function openAddFromBank(targetSectionKey?: string | null) {
    if (targetSectionKey !== undefined) {
      setBankTargetSection(targetSectionKey)
    } else {
      setBankTargetSection(sections[0]?.key ?? null)
    }
    setShowBank(true)
  }

  function addFromBank(questionId: string) {
    const item = bank.find((candidate) => candidate.id === questionId)
    if (!item) return
    const targetSectionKey =
      bankTargetSection ?? (sections[0]?.key ?? null)

    const newEntry: Entry = {
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
      position: entries.length,
      section: targetSectionKey,
      marks: 1,
      negativeMarks: 0,
      isNew: true,
    }

    setEntries((current) => {
      const next = [...current, newEntry]
      return orderEntriesBySections(next, sections)
    })
    setSelectedId(questionId)
    setExpandedIds((current) => ({ ...current, [questionId]: true }))
    toast.success("Question added to blueprint")
  }

  function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    )
  }

  function handleAssignSection(entryId: string, sectionKey: string | null) {
    setEntries((current) => {
      const updated = current.map((entry) =>
        entry.id === entryId ? { ...entry, section: sectionKey } : entry
      )
      return orderEntriesBySections(updated, sections)
    })
  }

  function handleRequestCreateSection(forEntryId?: string) {
    setTargetQuestionForNewSection(forEntryId ?? null)
    setEditingSection(null)
    setIsSectionDialogOpen(true)
  }

  function handleSaveSection(newSection: SectionDefinition) {
    if (editingSection) {
      const oldKey = editingSection.key
      const newKey = newSection.key
      const nextSections = sections.map((s) =>
        s.key === oldKey ? newSection : s
      )
      setSections(nextSections)
      if (oldKey !== newKey) {
        setEntries((prev) =>
          prev.map((e) =>
            e.section === oldKey ? { ...e, section: newKey } : e
          )
        )
      }
      toast.success(`Section "${newSection.title}" updated`)
    } else {
      const nextSections = [...sections, newSection]
      setSections(nextSections)
      if (targetQuestionForNewSection) {
        const targetId = targetQuestionForNewSection
        setEntries((current) => {
          const updated = current.map((entry) =>
            entry.id === targetId ? { ...entry, section: newSection.key } : entry
          )
          return orderEntriesBySections(updated, nextSections)
        })
        setTargetQuestionForNewSection(null)
      }
      toast.success(`Section "${newSection.title}" created`)
    }
    setEditingSection(null)
    setIsSectionDialogOpen(false)
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const nextSections = [...sections]
    const [moved] = nextSections.splice(index, 1)
    nextSections.splice(target, 0, moved)
    setSections(nextSections)
    setEntries((current) => orderEntriesBySections(current, nextSections))
  }

  function confirmDeleteSection() {
    if (!deletingSection) return
    const targetKey = deletingSection.key
    const targetTitle = deletingSection.title
    const nextSections = sections.filter((s) => s.key !== targetKey)
    setSections(nextSections)
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.section === targetKey ? { ...e, section: null } : e
      )
      return orderEntriesBySections(updated, nextSections)
    })
    setDeletingSection(null)
    toast.success(
      `Section "${targetTitle}" removed. Questions reassigned to unassigned.`
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

  function confirmRemove() {
    const id = pendingRemoveId
    if (!id) return
    startRemoving(() => {
      removeEntry(id)
      setPendingRemoveId(null)
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

  function moveEntryInSection(
    id: string,
    direction: -1 | 1,
    siblingIds: string[]
  ) {
    const indexInSiblings = siblingIds.indexOf(id)
    const targetIndexInSiblings = indexInSiblings + direction
    if (
      indexInSiblings < 0 ||
      targetIndexInSiblings < 0 ||
      targetIndexInSiblings >= siblingIds.length
    ) {
      return
    }
    const otherId = siblingIds[targetIndexInSiblings]

    setEntries((current) => {
      const indexCurrent = current.findIndex((e) => e.id === id)
      const indexOther = current.findIndex((e) => e.id === otherId)
      if (indexCurrent < 0 || indexOther < 0) return current

      const next = [...current]
      const temp = next[indexCurrent]
      next[indexCurrent] = next[indexOther]
      next[indexOther] = temp

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

  function validateBenchmarkValues(): boolean {
    if (
      !Number.isInteger(passingBenchmark) ||
      passingBenchmark < 1 ||
      passingBenchmark > 100
    ) {
      toast.warning("Invalid passing cut-off", {
        description: "Passing cut-off must be a percentage between 1 and 100.",
      })
      return false
    }
    if (
      !Number.isInteger(distinctionBenchmark) ||
      distinctionBenchmark < 1 ||
      distinctionBenchmark > 100
    ) {
      toast.warning("Invalid distinction cut-off", {
        description: "Distinction cut-off must be a percentage between 1 and 100.",
      })
      return false
    }
    if (distinctionBenchmark <= passingBenchmark) {
      toast.warning("Benchmark conflict", {
        description: "Distinction cut-off must be higher than the passing cut-off.",
      })
      return false
    }
    return true
  }

  function handleSaveAll() {
    if (!validateBenchmarkValues()) return
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

    const subjects = subjectsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const subjectScope = subjects.length > 1 ? "multi_subject" : "single_subject"

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
          blueprint: {
            sections,
            calculatorAllowed,
            taxonomy: {
              paperType,
              subjectScope,
              subjects,
              examTag: examTag.trim() || null,
            },
          },
          passingBenchmark,
          distinctionBenchmark,
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
          sections: [...sections],
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

  function handlePublishAndStartExam() {
    if (entries.length === 0) {
      toast.warning("Incomplete Paper", {
        description: "Add at least one question before publishing & attempting.",
      })
      return
    }

    if (!validateQuestionValues()) return
    if (!validateBenchmarkValues()) return

    const durationMinutes = duration.trim() === "" ? null : Number(duration)
    const marks = totalMarks.trim() === "" ? null : Number(totalMarks)

    const subjects = subjectsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const subjectScope = subjects.length > 1 ? "multi_subject" : "single_subject"

    const questions = entries.map((entry) => ({
      questionId: entry.id,
      section: entry.section ? entry.section.trim() : null,
      position: entry.position,
      marks: entry.marks,
      negativeMarks: entry.negativeMarks,
    }))

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
          blueprint: {
            sections,
            calculatorAllowed,
            taxonomy: {
              paperType,
              subjectScope,
              subjects,
              examTag: examTag.trim() || null,
            },
          },
          passingBenchmark,
          distinctionBenchmark,
          idempotencyKey: detailsKey,
        })
        const questionsResult = await saveQuestionsAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: detailsResult.revision,
          questions,
          idempotencyKey: questionsKey,
        })

        const currentRev = questionsResult.revision
        setRevision(currentRev)

        if (assessment.status !== "published") {
          await publishAssessmentAction({
            workspaceSlug,
            assessmentId: assessment.id,
            expectedRevision: currentRev,
            idempotencyKey: createIdempotencyKey(),
          })
        }

        const attemptRes = await createAttemptAction({
          workspaceSlug,
          assessmentId: assessment.id,
          idempotencyKey: createIdempotencyKey(),
        })

        toast.success("Exam paper published! Entering CBT Exam Room...")
        router.push(workspaceRoutes.mockTests.attempt(workspaceSlug, attemptRes.attemptId))
      } catch (error) {
        setDetailsKey(createIdempotencyKey())
        setQuestionsKey(createIdempotencyKey())
        reportSaveError(error, "Failed to publish & start exam.")
      }
    })
  }

  const handleSaveAllRef = useRef(handleSaveAll)
  handleSaveAllRef.current = handleSaveAll

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        if (event.key.toLowerCase() === "s") {
          event.preventDefault()
          if (isDirty && !saving) {
            handleSaveAllRef.current()
          }
        } else if (event.key.toLowerCase() === "p") {
          event.preventDefault()
          setViewMode((prev) => (prev === "build" ? "preview" : "build"))
        } else if (event.key.toLowerCase() === "b") {
          event.preventDefault()
          setShowBank((prev) => !prev)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, saving])

  function renderQuestionItem(entry: Entry, siblingIds: string[]) {
    const isExpanded = Boolean(expandedIds[entry.id])
    const indexInSiblings = siblingIds.indexOf(entry.id)
    const isFirstInSiblings = indexInSiblings === 0
    const isLastInSiblings = indexInSiblings === siblingIds.length - 1

    return (
      <li
        key={entry.id}
        className={cn(
          "transition-colors",
          entry.isNew && "bg-emerald-500/5 dark:bg-emerald-500/10",
          selectedId === entry.id &&
            "border-l-2 border-foreground",
          selectedId === entry.id &&
            !isExpanded &&
            "bg-muted/30",
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
              <ChevronUpIcon className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDownIcon className="size-4" aria-hidden="true" />
            )}
          </Button>

          <button
            type="button"
            aria-current={selectedId === entry.id ? "true" : undefined}
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
                <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
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
                  -{formatNumber(Math.abs(entry.negativeMarks))} negative
                </span>
              ) : null}
              <span>
                {(() => {
                  if (!entry.section) return "Unassigned"
                  const matched = sections.find((s) => s.key === entry.section)
                  return matched ? matched.title : entry.section
                })()}
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
              onClick={() => moveEntryInSection(entry.id, -1, siblingIds)}
              disabled={isFirstInSiblings}
              aria-label={`Move question ${entry.position + 1} up`}
              className="size-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowUpIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => moveEntryInSection(entry.id, 1, siblingIds)}
              disabled={isLastInSiblings}
              aria-label={`Move question ${entry.position + 1} down`}
              className="size-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowDownIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPendingRemoveId(entry.id)}
              aria-label={`Remove question ${entry.position + 1}`}
              className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2Icon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <div className="border-t border-border bg-muted/15 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`marks-${entry.id}`} className="text-xs">
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
                <Label htmlFor={`negative-${entry.id}`} className="text-xs">
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
                      negativeMarks: Number(event.target.value),
                    })
                  }
                  className="h-11"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`section-${entry.id}`} className="text-xs">
                  Section
                </Label>
                <Select
                  value={entry.section ?? "__none__"}
                  onValueChange={(val) => {
                    if (val === "__create_new__") {
                      handleRequestCreateSection(entry.id)
                      return
                    }
                    if (val === "__none__") {
                      handleAssignSection(entry.id, null)
                      return
                    }
                    handleAssignSection(entry.id, val)
                  }}
                >
                  <SelectTrigger
                    id={`section-${entry.id}`}
                    className="h-11 w-full text-xs"
                  >
                    <SelectValue placeholder="Select section">
                      {(() => {
                        if (!entry.section || entry.section === "__none__") {
                          return "None / Unassigned"
                        }
                        const matched = sections.find(
                          (s) => s.key === entry.section
                        )
                        return matched
                          ? matched.title
                          : `${entry.section} (Custom)`
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None / Unassigned</SelectItem>
                    {sections.map((sec) => (
                      <SelectItem key={sec.key} value={sec.key}>
                        {sec.title} ({sec.key})
                      </SelectItem>
                    ))}
                    {entry.section &&
                    !sections.some((s) => s.key === entry.section) ? (
                      <SelectItem value={entry.section}>
                        {entry.section} (Legacy)
                      </SelectItem>
                    ) : null}
                    <SelectItem
                      value="__create_new__"
                      className="font-semibold text-foreground"
                    >
                      + Create new section...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Answer key
              </p>
              {entry.options.length > 0 ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {entry.options.map((option) => {
                    const isCorrect = entry.answerKeys?.includes(option.key)
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
                              ? "border-success-ink bg-success-ink text-success-foreground"
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
              ) : entry.kind === "NUMERIC" && entry.numericAnswer !== null ? (
                <p className="mt-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                  Correct answer:{" "}
                  <span className="font-mono font-bold text-success-ink">
                    {entry.numericAnswer}
                  </span>
                </p>
              ) : entry.kind === "SHORT_ANSWER" && entry.textAnswer ? (
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
                  ? "border-success-line/40 bg-success-soft text-success-ink"
                  : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
              )}
            >
              {assessment.status === "published" ? "Published" : "Draft"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Rev {revision}
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
              {isDirty ? "Unsaved changes" : "Saved"}
            </Badge>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="outline"
              onClick={() => openAddFromBank()}
              disabled={saving}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Add from bank
            </Button>
            <Button onClick={handlePublishAndStartExam} disabled={saving} className="font-bold gap-1 text-xs">
              <PlayIcon className="size-3.5 fill-current stroke-none" />
              {assessment.status === "published" ? "Test run CBT" : "Publish paper"}
            </Button>
            <Button onClick={handleSaveAll} disabled={!isDirty || saving}>
              {saving ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckIcon data-icon="inline-start" aria-hidden="true" />
              )}
              Save changes
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ListChecksIcon
                className="size-3.5 text-muted-foreground"
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
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Total marks
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold text-foreground">
              {formatNumber(paperMarks)}
              {totalMarks.trim() !== "" ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {totalMarks} target
                </span>
              ) : null}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ClockIcon
                className="size-3.5 text-muted-foreground"
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
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Readiness
            </dt>
            <dd className="mt-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold",
                  entries.length > 0
                    ? assessment.status === "published"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "border-border bg-muted/60 text-muted-foreground"
                )}
              >
                {entries.length > 0
                  ? assessment.status === "published"
                    ? "Published"
                    : "Ready to publish"
                  : "Needs questions"}
              </Badge>
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
                "bg-background text-foreground shadow-xs font-semibold data-[pressed]:bg-background",
            },
            {
              value: "preview",
              label: "Student preview",
              icon: EyeIcon,
              activeClassName:
                "bg-background text-foreground shadow-xs font-semibold data-[pressed]:bg-background",
            },
          ]}
          ariaLabel="Editor view"
          className="sm:w-fit"
        />
        <p className="hidden text-xs text-muted-foreground sm:block">
          {viewMode === "build"
            ? "Configure questions, sections, and marks."
            : "Review paper layout as candidates will see it."}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Main builder / paper column */}
        <div className="min-w-0 space-y-6">
          {viewMode === "build" ? (
            <>
              {/* Compact Blueprint Summary HUD Card */}
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const currentPaperTypeObj = PAPER_TYPES.find(
                          (p) => p.id === paperType
                        )
                        return (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-semibold",
                              currentPaperTypeObj?.pillClass
                            )}
                          >
                            {currentPaperTypeObj?.label ?? "Full-Length Mock"}
                          </Badge>
                        )
                      })()}
                      {examTag.trim() ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium border-border bg-muted/60 text-foreground"
                        >
                          {examTag.trim()}
                        </Badge>
                      ) : null}
                      {subjectsText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((sub) => (
                          <Badge
                            key={sub}
                            variant="outline"
                            className="text-[11px] font-normal border-border/80 bg-muted/40 text-muted-foreground"
                          >
                            {sub}
                          </Badge>
                        ))}
                    </div>

                    <div>
                      <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                        {title.trim() || "Untitled Mock Test"}
                      </h2>
                      {instructions.trim() ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Instructions: </span>
                          {stripHtml(instructions).trim()}
                        </p>
                      ) : null}
                    </div>

                    {/* Meta Specs Pill Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span>{duration.trim() === "" ? "Untimed" : `${duration} mins`}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <TrophyIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span>{totalMarks.trim() === "" ? "Marks unconstrained" : `${totalMarks} target marks`}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Pass: {passingBenchmark}%</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Distinction: {distinctionBenchmark}%</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            calculatorAllowed ? "bg-emerald-500" : "bg-muted-foreground/40"
                          )}
                          aria-hidden="true"
                        />
                        <span>{calculatorAllowed ? "Calculator allowed" : "No calculator"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSettingsOpen(true)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
                      Edit Settings
                    </Button>
                  </div>
                </div>
              </div>

              {/* Exam Sections Manager Strip */}
              <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                      <LayersIcon className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                        Exam sections
                      </h2>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        Divide questions into timed or categorized test sections.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestCreateSection()}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                    Add section
                  </Button>
                </div>

                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <LayersIcon
                      className="size-6 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-medium text-foreground">
                      No sections yet
                    </p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      Group questions by subject or pattern, or leave paper unsectioned.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestCreateSection()}
                      className="mt-3 gap-1.5 text-xs"
                    >
                      <PlusIcon className="size-3.5" aria-hidden="true" />
                      Add section
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sections.map((section, index) => {
                      const stats = sectionStats.sectionMap.get(section.key) ?? {
                        count: 0,
                        marks: 0,
                      }
                      return (
                        <div
                          key={section.key}
                          className="flex flex-col justify-between rounded-lg border border-border bg-background p-3.5 shadow-xs transition-colors hover:border-foreground/20"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                                    {index + 1}
                                  </span>
                                  <h3 className="truncate text-sm font-semibold text-foreground">
                                    {section.title}
                                  </h3>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="mt-1.5 font-mono text-[10px] text-muted-foreground"
                                >
                                  {section.key}
                                </Badge>
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => moveSection(index, -1)}
                                  disabled={index === 0}
                                  aria-label={`Move section ${section.title} left`}
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                >
                                  <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => moveSection(index, 1)}
                                  disabled={index === sections.length - 1}
                                  aria-label={`Move section ${section.title} right`}
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                >
                                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => {
                                    setEditingSection(section)
                                    setIsSectionDialogOpen(true)
                                  }}
                                  aria-label={`Edit section ${section.title}`}
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                >
                                  <FilePenLineIcon className="size-3.5" aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setDeletingSection(section)}
                                  aria-label={`Delete section ${section.title}`}
                                  className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2Icon className="size-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                            {section.description ? (
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                {section.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-3.5 flex items-center justify-between border-t border-border/80 pt-2.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {stats.count} {stats.count === 1 ? "question" : "questions"}
                            </span>
                            <span>{formatNumber(stats.marks)} marks</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Questions list with sections */}
              <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                      Questions ({entries.length})
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Questions ordered by test sections.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAddFromBank()}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <PlusIcon className="size-3.5" aria-hidden="true" />
                      Add from bank
                    </Button>
                  </div>
                </div>

                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
                    <ListChecksIcon
                      className="size-8 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No questions in this paper yet
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Select questions from your workspace question bank or
                      author a brand-new question.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openAddFromBank()}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <PlusIcon className="size-3.5" aria-hidden="true" />
                        Add from bank
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        render={
                          <Link
                            href={`${workspaceRoutes.mockTests.questionNew(workspaceSlug)}?fromAssessmentId=${encodeURIComponent(assessment.id)}`}
                          />
                        }
                      >
                        New question
                      </Button>
                    </div>
                  </div>
                ) : sections.length > 0 ? (
                  <div className="space-y-4">
                    {sections.map((section) => {
                      const sectionQuestions = entries.filter(
                        (e) => e.section === section.key
                      )
                      const siblingIds = sectionQuestions.map((e) => e.id)
                      const isCollapsed = Boolean(
                        collapsedSections[section.key]
                      )
                      const stats = sectionStats.sectionMap.get(
                        section.key
                      ) ?? { count: 0, marks: 0 }

                      return (
                        <div
                          key={section.key}
                          className="overflow-hidden rounded-lg border border-border bg-background shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5 sm:px-4">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSections((prev) => ({
                                  ...prev,
                                  [section.key]: !prev[section.key],
                                }))
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
                            >
                              <div className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-card text-muted-foreground">
                                {isCollapsed ? (
                                  <ChevronDownIcon
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ChevronUpIcon
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h3 className="text-sm font-semibold text-foreground">
                                    {section.title}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px] text-muted-foreground"
                                  >
                                    {section.key}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-border bg-muted/60 text-[10px] font-semibold text-foreground"
                                  >
                                    {stats.count}{" "}
                                    {stats.count === 1
                                      ? "question"
                                      : "questions"}{" "}
                                    • {formatNumber(stats.marks)} marks
                                  </Badge>
                                </div>
                                {section.description ? (
                                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                    {section.description}
                                  </p>
                                ) : null}
                              </div>
                            </button>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openAddFromBank(section.key)
                                }}
                                className="h-7 gap-1.5 text-xs"
                              >
                                <PlusIcon
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                <span className="hidden sm:inline">Add to</span>{" "}
                                {section.title}
                              </Button>
                            </div>
                          </div>

                          {!isCollapsed ? (
                            sectionQuestions.length === 0 ? (
                              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                                <p>No questions in this section yet.</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => openAddFromBank(section.key)}
                                  className="mt-2 text-foreground hover:text-foreground"
                                >
                                  <PlusIcon
                                    className="mr-1 size-3.5"
                                    aria-hidden="true"
                                  />
                                  Add questions
                                </Button>
                              </div>
                            ) : (
                              <ul className="divide-y divide-border">
                                {sectionQuestions.map((entry) =>
                                  renderQuestionItem(entry, siblingIds)
                                )}
                              </ul>
                            )
                          ) : null}
                        </div>
                      )
                    })}

                    {(() => {
                      const unassignedQuestions = entries.filter(
                        (e) =>
                          !e.section ||
                          !sections.some((s) => s.key === e.section)
                      )
                      if (unassignedQuestions.length === 0) return null
                      const siblingIds = unassignedQuestions.map((q) => q.id)
                      const isCollapsed = Boolean(
                        collapsedSections["__unassigned__"]
                      )

                      return (
                        <div className="overflow-hidden rounded-xl border border-brand-amber-line/50 bg-card shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-amber-line/30 bg-brand-amber-soft/20 px-4 py-3 sm:px-5">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSections((prev) => ({
                                  ...prev,
                                  __unassigned__: !prev.__unassigned__,
                                }))
                              }
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none"
                            >
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand-amber-line/50 bg-brand-amber-soft text-brand-amber-ink">
                                <AlertCircleIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold text-foreground">
                                    Unassigned questions
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="border-brand-amber-line/40 bg-brand-amber-soft text-[10px] font-semibold text-brand-amber-ink"
                                  >
                                    {unassignedQuestions.length}{" "}
                                    {unassignedQuestions.length === 1
                                      ? "question"
                                      : "questions"}{" "}
                                    •{" "}
                                    {formatNumber(
                                      sectionStats.unassigned.marks
                                    )}{" "}
                                    marks
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-brand-amber-ink/90">
                                  These questions are not assigned to a section.
                                </p>
                              </div>
                            </button>

                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                openAddFromBank(null)
                              }}
                              className="h-8 gap-1.5 border-brand-amber-line/50 text-xs"
                            >
                              <PlusIcon
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Add question
                            </Button>
                          </div>

                          {!isCollapsed ? (
                            <ul className="divide-y divide-border">
                              {unassignedQuestions.map((entry) =>
                                renderQuestionItem(entry, siblingIds)
                              )}
                            </ul>
                          ) : null}
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {entries.map((entry) =>
                      renderQuestionItem(
                        entry,
                        entries.map((e) => e.id)
                      )
                    )}
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
              sections={sections}
              onSelect={(id) => {
                setSelectedId(id)
                setExpandedIds((current) => ({ ...current, [id]: true }))
                setViewMode("build")
              }}
            />
          )}
        </div>
      </div>

      {/* Blueprint Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Test Blueprint Settings</SheetTitle>
            <SheetDescription>
              Configure paper format, target exam, scoring thresholds, and candidate instructions.
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-4">
            <BlueprintFormFields
              title={title}
              setTitle={setTitle}
              instructions={instructions}
              setInstructions={setInstructions}
              paperType={paperType}
              setPaperType={setPaperType}
              examTag={examTag}
              setExamTag={setExamTag}
              subjects={subjectsText}
              setSubjects={setSubjectsText}
              durationMinutes={duration}
              setDurationMinutes={setDuration}
              totalMarks={totalMarks}
              setTotalMarks={setTotalMarks}
              passingBenchmark={passingBenchmark}
              setPassingBenchmark={(val) =>
                setPassingBenchmark(val === "" ? 0 : val)
              }
              distinctionBenchmark={distinctionBenchmark}
              setDistinctionBenchmark={(val) =>
                setDistinctionBenchmark(val === "" ? 0 : val)
              }
              calculatorAllowed={calculatorAllowed}
              setCalculatorAllowed={setCalculatorAllowed}
            />
          </div>

          <div className="border-t border-border px-6 py-4 flex items-center justify-end">
            <Button onClick={() => setIsSettingsOpen(false)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bank picker */}
      <Sheet open={showBank} onOpenChange={(open) => setShowBank(open)}>
        {/* Wider panel for the bank picker; overrides the sheet default max-w-sm cap */}
        <SheetContent side="right" className="w-full sm:max-w-2xl!">
          <SheetHeader>
            <SheetTitle>Question bank</SheetTitle>
            <SheetDescription>
              Select questions to add to this paper.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-6 pb-4">
            {bankTargetSection ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
                <LayersIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>
                  Target section:{" "}
                  <strong className="font-semibold">
                    {sections.find((s) => s.key === bankTargetSection)?.title ??
                      bankTargetSection}
                  </strong>
                </span>
              </div>
            ) : null}
            <div className="relative">
              <SearchIcon
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={bankQuery}
                onChange={(event) => setBankQuery(event.target.value)}
                placeholder="Search questions..."
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
                  <SelectItem value="SINGLE_CHOICE">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">Multiple Select (MSQ)</SelectItem>
                  <SelectItem value="NUMERIC">Numerical Answer (NAT)</SelectItem>
                  <SelectItem value="TRUE_FALSE">True / False</SelectItem>
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
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          <span
                            className="size-1 rounded-full bg-muted-foreground"
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
                      {addedQuestionIds.has(item.id) ? (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled
                          className="h-8 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                        >
                          <CheckIcon data-icon="inline-start" className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          Added
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 text-xs hover:border-foreground/20"
                          onClick={() => addFromBank(item.id)}
                        >
                          <PlusIcon data-icon="inline-start" aria-hidden="true" />
                          Add
                        </Button>
                      )}
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
                  href={`${workspaceRoutes.mockTests.questionNew(workspaceSlug)}?fromAssessmentId=${encodeURIComponent(assessment.id)}`}
                />
              }
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Create new question
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Remove question from paper?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-medium text-foreground">
                Q{(entries.find((entry) => entry.id === pendingRemoveId)?.position ?? 0) + 1}
              </strong>{" "}
              will be removed from this paper. It will remain in your question bank.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={isRemoving}
              onClick={confirmRemove}
            >
              {isRemoving ? <Spinner data-icon="inline-start" /> : null}
              {isRemoving ? "Removing" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SectionDialog
        open={isSectionDialogOpen}
        onOpenChange={(open) => {
          setIsSectionDialogOpen(open)
          if (!open) {
            setEditingSection(null)
            setTargetQuestionForNewSection(null)
          }
        }}
        section={editingSection}
        existingKeys={sections.map((s) => s.key)}
        onSave={handleSaveSection}
      />

      <AlertDialog
        open={deletingSection !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSection(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete section &ldquo;{deletingSection?.title}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!deletingSection) return null
                const count =
                  sectionStats.sectionMap.get(deletingSection.key)?.count ?? 0
                if (count > 0) {
                  return (
                    <>
                      This section contains{" "}
                      <strong className="font-semibold text-foreground">
                        {count} {count === 1 ? "question" : "questions"}
                      </strong>
                      . Questions will be moved to{" "}
                      <strong className="font-semibold text-foreground">
                        Unassigned
                      </strong>
                      .
                    </>
                  )
                }
                return "Are you sure you want to remove this section? Unsaved changes can be discarded before saving."
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={confirmDeleteSection}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-11 flex-1"
            onClick={() => openAddFromBank()}
            disabled={saving}
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Add
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 flex-1 font-semibold"
            onClick={handlePublishAndStartExam}
            disabled={saving || entries.length === 0}
          >
            {saving ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <PlayIcon className="size-4 fill-current stroke-none" aria-hidden="true" />
            )}
            {assessment.status === "published" ? "Test run" : "Publish"}
          </Button>
          <Button
            size="lg"
            className="h-11 flex-1"
            onClick={handleSaveAll}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

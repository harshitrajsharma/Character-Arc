"use client"
import { normalizeAssessmentMetadata } from "./assessment-metadata-model"
import type { PaperType } from "./assessment-paper-types"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  HelpCircleIcon,
  LayersIcon,
  FilePenIcon,
  CircleCheckIcon,
  MoreVerticalIcon,
  Trash2Icon,
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  saveQuestionsAction,
  updateAssessmentAction,
  publishAssessmentAction,
} from "@/lib/tools/mock-tests/actions/assessment-actions"
import { createAttemptAction } from "@/lib/tools/mock-tests/actions/attempt-actions"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { QuestionCard } from "./questions/question-card"
import { AuthorQuestionPreview } from "./questions/author-question-preview"
import { QuestionOptions, QuestionSolution } from "./questions/question-view"
import { SectionDialog } from "./section-dialog"
import { BuilderQuestionSection } from "./builder-question-section"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import { AttemptDisplayNotice } from "./attempt-display-notice"
import { canUseAssessmentDisplayNow } from "@/lib/tools/mock-tests/attempt-display"
import { BuilderQuestionPicker } from "./builder-question-picker"
import { useBuilderNavigation } from "./use-builder-navigation"
import { validateBuilder, type BuilderIssue } from "./builder-validation"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { BlueprintFormFields } from "@/components/tools/mock-tests/blueprint-form-fields"
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

function QuestionRowAction({
  label,
  hint,
  disabled,
  onClick,
  children,
  destructive = false,
}: {
  label: string
  hint: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  destructive?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={label}
            onClick={onClick}
            className={cn(
              "size-11 text-muted-foreground hover:text-foreground",
              destructive && "hover:bg-destructive/10 hover:text-destructive"
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
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
      title: "Other questions",
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
          <RichContent html={instructions} />
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
                    <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {group.description.trim()}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="block w-full text-left focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <AuthorQuestionPreview
                      question={entry}
                      solution={entry}
                      allocation={{
                        number: entry.position + 1,
                        marks: entry.marks,
                        negativeMarks: entry.negativeMarks,
                      }}
                      actions={
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => onSelect(entry.id)}
                        >
                          Edit question {entry.position + 1}
                        </Button>
                      }
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
  viewerId,
  assessment,
  addedQuestionId,
  initialTargetSection,
  subjectReturnHref,
}: {
  workspaceSlug: string
  viewerId: string
  assessment: AssessmentDetail
  addedQuestionId?: string
  initialTargetSection?: string | null
  subjectReturnHref?: string | null
}) {
  const [revision, setRevision] = useState(assessment.revision)
  const [showBank, setShowBank] = useState(false)
  const [displayNotice, setDisplayNotice] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("build")
  const [selectedId, setSelectedId] = useState<string | null>(
    addedQuestionId ?? assessment.questions[0]?.id ?? null
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
  const [bankTargetSection, setBankTargetSection] = useState<string | null>(
    initialTargetSection ?? null
  )
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingSection, setEditingSection] =
    useState<SectionDefinition | null>(null)
  const [deletingSection, setDeletingSection] =
    useState<SectionDefinition | null>(null)
  const [targetQuestionForNewSection, setTargetQuestionForNewSection] =
    useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({})

  const [entries, setEntries] = useState<Entry[]>(() =>
    orderEntriesBySections(assessment.questions, assessment.sections ?? [])
  )

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

  const addedQuestionIds = useMemo(
    () => new Set(entries.map((entry) => entry.id)),
    [entries]
  )

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

  function openAddFromBank(targetSectionKey?: string | null) {
    setBankTargetSection((current) => {
      const next = targetSectionKey === undefined ? current : targetSectionKey
      return sections.some((section) => section.key === next) ? next : null
    })
    setShowBank(true)
  }
  function addManyFromBank(
    items: QuestionBankItem[],
    allocation = { marks: 1, negativeMarks: 0 }
  ) {
    setEntries((current) => {
      const existing = new Set(current.map((entry) => entry.id))
      const additions: Entry[] = items
        .filter((item) => {
          if (existing.has(item.id)) return false
          existing.add(item.id)
          return true
        })
        .map((item, index) => ({
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
          position: current.length + index,
          section: sections.some((section) => section.key === bankTargetSection)
            ? bankTargetSection
            : null,
          marks: allocation.marks,
          negativeMarks: allocation.negativeMarks,
          isNew: true,
        }))
      return orderEntriesBySections([...current, ...additions], sections)
    })
    if (items.length) setSelectedId(items[items.length - 1].id)
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
            entry.id === targetId
              ? { ...entry, section: newSection.key }
              : entry
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
    const index = entries.findIndex((entry) => entry.id === id)
    const next = entries[index + 1] ?? entries[index - 1]
    startRemoving(() => {
      removeEntry(id)
      setPendingRemoveId(null)
      setFocusRequest({
        id: next ? `question-${next.id}` : "builder-questions",
        message: "",
      })
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

  const [operation, setOperation] = useState<
    "save" | "publish" | "test" | null
  >(null)
  const busy = operation !== null
  const operationLock = useRef(false)
  const revisionRef = useRef(assessment.revision)
  const [published, setPublished] = useState(assessment.status === "published")
  const [showErrors, setShowErrors] = useState(false)
  const [reviewMode, setReviewMode] = useState<"publish" | "test" | null>(null)
  const [saveError, setSaveError] = useState("")
  const [focusRequest, setFocusRequest] = useState<BuilderIssue | null>(null)
  useEffect(() => {
    if (!addedQuestionId) return
    const row = document.getElementById(`question-${addedQuestionId}`)
    row?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: "center" })
  }, [addedQuestionId])
  const navigation = useBuilderNavigation(isDirty, busy)
  const issues = useMemo(
    () =>
      validateBuilder({
        title,
        instructions,
        duration,
        totalMarks,
        examTag,
        subjectsText,
        passingBenchmark,
        distinctionBenchmark,
        entries,
      }),
    [
      title,
      instructions,
      duration,
      totalMarks,
      examTag,
      subjectsText,
      passingBenchmark,
      distinctionBenchmark,
      entries,
    ]
  )
  const publishIssues: BuilderIssue[] = entries.length
    ? issues
    : [
        {
          id: "builder-questions",
          message: "Add at least one question before publishing.",
        },
        ...issues,
      ]
  const fieldErrors = Object.fromEntries(
    (showErrors ? issues : [])
      .filter((issue) => issue.settings)
      .map((issue) => [issue.id, issue.message])
  )
  const targetMismatch =
    totalMarks.trim() !== "" &&
    Number.isFinite(Number(totalMarks)) &&
    Math.abs(paperMarks - Number(totalMarks)) > 0.005
  const newQuestionHref = withSubjectReturn(
    workspaceRoutes.mockTests.assessmentQuestionNew(
      workspaceSlug,
      assessment.id,
      bankTargetSection
    ),
    subjectReturnHref
  )

  function focusIssue(issue: BuilderIssue) {
    setShowErrors(true)
    if (!issue.settings) setViewMode("build")
    if (issue.settings) setIsSettingsOpen(true)
    if (issue.questionId) {
      setViewMode("build")
      setExpandedIds((current) => ({ ...current, [issue.questionId!]: true }))
    }
    setFocusRequest({ ...issue })
  }
  useEffect(() => {
    if (!focusRequest) return
    const focus = () => {
      const wrapper = document.getElementById(focusRequest.id)
      const target =
        wrapper?.querySelector<HTMLElement>('[contenteditable="true"]') ??
        wrapper
      if (
        !target ||
        (focusRequest.id.endsWith("instructions") && !target.isContentEditable)
      )
        return false
      target.focus()
      target.scrollIntoView({ block: "center" })
      return true
    }
    if (focus()) return
    const observer = new MutationObserver(() => {
      if (focus()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [focusRequest])

  function openReview() {
    if (published && !canUseAssessmentDisplayNow()) {
      setDisplayNotice(true)
      return
    }
    setShowErrors(true)
    setReviewMode(published ? "test" : "publish")
  }

  const [, startSaveTransition] = useTransition()
  function persist(
    mode: "save" | "publish" | "test" = "save"
  ): Promise<boolean> {
    return new Promise((resolve) => {
      startSaveTransition(async () => {
        resolve(await persistNow(mode))
      })
    })
  }
  async function persistNow(
    mode: "save" | "publish" | "test" = "save"
  ): Promise<boolean> {
    if (mode === "test" && !canUseAssessmentDisplayNow()) {
      setReviewMode(null)
      setDisplayNotice(true)
      return false
    }
    if (operationLock.current) return false
    const blocking = mode === "save" ? issues : publishIssues
    if (blocking.length) {
      focusIssue(blocking[0])
      return false
    }
    operationLock.current = true
    setOperation(mode)
    setSaveError("")
    let stage = "details"
    try {
      if (isDirty) {
        const metadata = normalizeAssessmentMetadata({
          title,
          instructions,
          paperType,
          examTag,
          subjects: subjectsText,
          durationMinutes: duration,
          totalMarks,
          calculatorAllowed,
          passingBenchmark: String(passingBenchmark),
          distinctionBenchmark: String(distinctionBenchmark),
        })
        const detailsResult = await updateAssessmentAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: revisionRef.current,
          title: metadata.title,
          instructions: instructions.trim() || null,
          durationMinutes: metadata.durationMinutes,
          totalMarks: metadata.totalMarks,
          blueprint: {
            sections,
            calculatorAllowed,
            taxonomy: {
              paperType,
              subjectScope:
                metadata.subjects.length > 1 || paperType === "multi_subject"
                  ? "multi_subject"
                  : "single_subject",
              subjects: metadata.subjects,
              examTag: metadata.examTag,
            },
          },
          passingBenchmark,
          distinctionBenchmark,
          idempotencyKey: detailsKey,
        })
        revisionRef.current = detailsResult.revision
        setRevision(detailsResult.revision)
        setDetailsKey(createIdempotencyKey())
        stage = "questions"
        const questionResult = await saveQuestionsAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: revisionRef.current,
          questions: entries.map((entry) => ({
            questionId: entry.id,
            section: entry.section?.trim() || null,
            position: entry.position,
            marks: entry.marks,
            negativeMarks: entry.negativeMarks,
          })),
          idempotencyKey: questionsKey,
        })
        revisionRef.current = questionResult.revision
        setRevision(questionResult.revision)
        setQuestionsKey(createIdempotencyKey())
        setSavedSnapshot({
          ...currentSnapshot,
          questions: currentSnapshot.questions.map((q) => ({
            ...q,
            isNew: false,
          })),
        })
        setEntries((current) =>
          current.map((entry) => ({ ...entry, isNew: false }))
        )
      }
      stage = mode
      if (mode === "publish" && !published) {
        const result = await publishAssessmentAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: revisionRef.current,
          idempotencyKey: createIdempotencyKey(),
        })
        revisionRef.current = result.revision
        setRevision(result.revision)
        setPublished(true)
        setReviewMode(null)
        toast.success("Assessment published", {
          description:
            "You can share it from the assessment page. No test attempt was started.",
        })
      } else if (mode === "test") {
        if (!published)
          throw new Error("Publish this assessment before starting a test run.")
        const result = await createAttemptAction({
          workspaceSlug,
          assessmentId: assessment.id,
          idempotencyKey: createIdempotencyKey(),
        })
        navigation.leave(
          workspaceRoutes.mockTests.attempt(workspaceSlug, result.attemptId)
        )
      } else toast.success("Assessment saved")
      return true
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Try again."
      setSaveError(
        stage === "questions"
          ? `Assessment details were saved, but the question list could not be saved. Your edits are retained. Retry saving. ${detail}`
          : `Could not ${mode === "save" ? "save" : mode === "publish" ? "publish" : "start test run"}. Your edits are retained. ${detail}`
      )
      return false
    } finally {
      operationLock.current = false
      setOperation(null)
    }
  }
  const saveShortcut = useRef<() => void>(() => {})
  useEffect(() => {
    saveShortcut.current = () => {
      void persist("save")
    }
  })
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        saveShortcut.current()
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])

  function renderQuestionItem(entry: Entry, siblingIds: string[]) {
    const isExpanded = Boolean(expandedIds[entry.id])
    const indexInSiblings = siblingIds.indexOf(entry.id)
    const isFirstInSiblings = indexInSiblings === 0
    const isLastInSiblings = indexInSiblings === siblingIds.length - 1

    return (
      <li
        id={`question-${entry.id}`}
        tabIndex={-1}
        key={entry.id}
        className={cn(
          "scroll-mt-24 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
          entries.length > 50 &&
            "[contain-intrinsic-size:auto_160px] [content-visibility:auto]",
          entry.isNew && "bg-success-soft/30",
          selectedId === entry.id && !isExpanded && "bg-muted/30",
          isExpanded && "bg-muted/20"
        )}
      >
        <QuestionCard
          mode="disclosure"
          question={entry}
          allocation={{
            number: entry.position + 1,
            marks: entry.marks,
            negativeMarks: entry.negativeMarks,
            section:
              sections.find((s) => s.key === entry.section)?.title ??
              entry.section,
          }}
          expanded={isExpanded}
          onToggle={() => {
            setSelectedId(entry.id)
            toggleExpanded(entry.id)
          }}
          label={`${isExpanded ? "Collapse" : "Expand"} question ${entry.position + 1}`}
          footer={
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {entry.isNew ? (
                <Badge className="border-success-line bg-success-soft text-success-ink">
                  New
                </Badge>
              ) : null}
              {!entry.section && sections.length ? (
                <span>Unassigned</span>
              ) : null}
              {entry.targetTitles?.length ? (
                <span className="[overflow-wrap:anywhere]">
                  {entry.targetTitles.join(", ")}
                </span>
              ) : null}
            </div>
          }
          actions={
            <>
              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                <QuestionRowAction
                  label={`Move question ${entry.position + 1} up`}
                  hint="Move up within this section"
                  disabled={isFirstInSiblings}
                  onClick={() => moveEntryInSection(entry.id, -1, siblingIds)}
                >
                  <ArrowUpIcon className="size-4" aria-hidden="true" />
                </QuestionRowAction>
                <QuestionRowAction
                  label={`Move question ${entry.position + 1} down`}
                  hint="Move down within this section"
                  disabled={isLastInSiblings}
                  onClick={() => moveEntryInSection(entry.id, 1, siblingIds)}
                >
                  <ArrowDownIcon className="size-4" aria-hidden="true" />
                </QuestionRowAction>
                <QuestionRowAction
                  label={`Remove question ${entry.position + 1}`}
                  hint="Remove from this assessment"
                  destructive
                  onClick={() => setPendingRemoveId(entry.id)}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </QuestionRowAction>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="size-11 shrink-0 sm:hidden"
                      aria-label={`Actions for question ${entry.position + 1}`}
                    />
                  }
                >
                  <MoreVerticalIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={isFirstInSiblings}
                    onClick={() => moveEntryInSection(entry.id, -1, siblingIds)}
                  >
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isLastInSiblings}
                    onClick={() => moveEntryInSection(entry.id, 1, siblingIds)}
                  >
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingRemoveId(entry.id)}
                  >
                    Remove question
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >
          {isExpanded ? (
            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-semibold">
                Assessment settings
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`marks-${entry.id}`} className="text-xs">
                    Marks
                  </Label>
                  <Input
                    id={`marks-${entry.id}`}
                    aria-invalid={
                      showErrors &&
                      issues.some((issue) => issue.id === `marks-${entry.id}`)
                    }
                    aria-describedby={
                      showErrors &&
                      issues.some((issue) => issue.id === `marks-${entry.id}`)
                        ? `marks-error-${entry.id}`
                        : undefined
                    }
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={999999.99}
                    step="any"
                    value={
                      Number.isFinite(entry.marks) ? String(entry.marks) : ""
                    }
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
                    aria-invalid={
                      showErrors &&
                      issues.some(
                        (issue) => issue.id === `negative-${entry.id}`
                      )
                    }
                    aria-describedby={
                      showErrors &&
                      issues.some(
                        (issue) => issue.id === `negative-${entry.id}`
                      )
                        ? `negative-error-${entry.id}`
                        : undefined
                    }
                    type="number"
                    inputMode="decimal"
                    min={-999999.99}
                    max={0}
                    step="any"
                    value={
                      Number.isFinite(entry.negativeMarks)
                        ? String(entry.negativeMarks)
                        : ""
                    }
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
                      <SelectItem value="__none__">
                        None / Unassigned
                      </SelectItem>
                      {sections.map((sec) => (
                        <SelectItem key={sec.key} value={sec.key}>
                          {sec.title}
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

              {showErrors
                ? issues
                    .filter((issue) => issue.questionId === entry.id)
                    .map((issue) => (
                      <p
                        id={`${issue.id.startsWith("negative") ? "negative" : "marks"}-error-${entry.id}`}
                        key={issue.id}
                        role="alert"
                        className="mt-2 text-sm text-destructive"
                      >
                        {issue.message}
                      </p>
                    ))
                : null}
              <Button
                variant="outline"
                className="mt-3 h-11"
                onClick={() =>
                  navigation.request(
                    withSubjectReturn(
                      workspaceRoutes.mockTests.questionEdit(
                        workspaceSlug,
                        entry.id
                      ) +
                        `?fromAssessmentId=${encodeURIComponent(assessment.id)}`,
                      subjectReturnHref
                    )
                  )
                }
              >
                Edit question content
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Question content is shared with your question bank. Marks and
                section apply to this assessment.
              </p>
              <div className="mt-4 grid min-w-0 gap-3 border-t border-border pt-3">
                <h3 className="text-sm font-semibold">Answer key</h3>
                {entry.options.length ? (
                  <QuestionOptions question={entry} solution={entry} />
                ) : null}
                <QuestionSolution question={entry} solution={entry} />
              </div>
            </div>
          ) : null}
        </QuestionCard>
      </li>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div inert={busy} className="flex min-w-0 flex-col gap-5">
        <header className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm text-muted-foreground">
                Assessment builder
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="min-w-0 font-heading text-2xl font-semibold [overflow-wrap:anywhere] break-words sm:text-3xl">
                  {title.trim() || "Untitled assessment"}
                </h1>
                <Badge
                  variant="secondary"
                  className={cn(
                    "min-h-8 gap-1.5 px-3 text-sm",
                    published && "bg-success-soft text-success-ink"
                  )}
                  data-assessment-status
                >
                  {published ? (
                    <CircleCheckIcon aria-hidden="true" />
                  ) : (
                    <FilePenIcon aria-hidden="true" />
                  )}
                  {published ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span role="status" aria-live="polite">
                  {busy
                    ? operation === "save"
                      ? "Saving…"
                      : operation === "publish"
                        ? "Publishing…"
                        : "Starting test run…"
                    : isDirty
                      ? "Unsaved changes"
                      : "Saved"}
                </span>
                <span title="Assessment revision">Revision {revision}</span>
              </div>
            </div>
            <div className="hidden gap-2 lg:flex">
              <Button
                variant="outline"
                className="h-11"
                disabled={!isDirty || busy}
                onClick={() => void persist("save")}
              >
                {operation === "save" ? "Saving…" : "Save changes"}
              </Button>
              <Button
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={openReview}
              >
                {published ? "Test run" : "Review & publish"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {entries.length}{" "}
                {entries.length === 1 ? "question" : "questions"}
              </span>
              <span>
                {formatNumber(paperMarks)} marks
                {totalMarks.trim() ? ` / ${totalMarks} target` : ""}
              </span>
              <span>{duration.trim() ? `${duration} min` : "Untimed"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {subjectReturnHref ? (
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => navigation.request(subjectReturnHref)}
                >
                  Subject tests
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => setIsSettingsOpen(true)}
              >
                Edit details
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                aria-pressed={viewMode === "preview"}
                onClick={() =>
                  setViewMode((v) => (v === "build" ? "preview" : "build"))
                }
              >
                {viewMode === "preview" ? "Back to build" : "Student preview"}
              </Button>
              <Button
                variant="ghost"
                className="h-11 lg:hidden"
                onClick={openReview}
              >
                {published ? "Test run" : "Review & publish"}
              </Button>
            </div>
          </div>
        </header>

        {saveError ? (
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            {saveError}
          </div>
        ) : null}

        {viewMode === "preview" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Layout preview only. Answers here are not saved and do not create
              an attempt. Use Test run after publishing to try the CBT player.
            </p>
            <StudentPaperPreview
              title={title}
              instructions={instructions}
              durationMinutes={duration.trim() ? Number(duration) : null}
              totalMarks={totalMarks.trim() ? Number(totalMarks) : paperMarks}
              entries={entries}
              sections={sections}
              onSelect={(id) => {
                setViewMode("build")
                setSelectedId(id)
                setExpandedIds((current) => ({ ...current, [id]: true }))
                setFocusRequest({ id: `question-${id}`, message: "" })
              }}
            />
          </>
        ) : (
          <section
            className="flex min-w-0 flex-col gap-4"
            aria-labelledby="builder-questions"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="builder-questions"
                tabIndex={-1}
                className="scroll-mt-24 font-heading text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring"
              >
                Questions ({entries.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => handleRequestCreateSection()}
                >
                  Add section
                </Button>
                {entries.length > 0 ? (
                  <Button className="h-11" onClick={() => openAddFromBank()}>
                    Add questions
                  </Button>
                ) : null}
              </div>
            </div>
            {entries.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Expand a question to edit its marks or section. Changes stay
                local until you save.
              </p>
            ) : null}
            {entries.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-5 sm:p-8">
                <div>
                  <h3 className="text-base font-semibold">
                    Build your assessment
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose questions from your bank or create a new one.
                    Sections are optional.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="h-11" onClick={() => openAddFromBank()}>
                    Add from bank
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => navigation.request(newQuestionHref)}
                  >
                    New question
                  </Button>
                </div>
              </div>
            ) : null}
            {sections.map((section, index) => {
              const group = entries.filter(
                (entry) => entry.section === section.key
              )
              const siblingIds = group.map((entry) => entry.id)
              return (
                <BuilderQuestionSection
                  key={section.key}
                  section={section}
                  questionCount={group.length}
                  marks={group.reduce((sum, entry) => sum + entry.marks, 0)}
                  open={!collapsedSections[section.key]}
                  onOpenChange={(open) =>
                    setCollapsedSections((current) => ({
                      ...current,
                      [section.key]: !open,
                    }))
                  }
                  onAddQuestions={() => {
                    setCollapsedSections((current) => ({
                      ...current,
                      [section.key]: false,
                    }))
                    openAddFromBank(section.key)
                  }}
                  busy={busy}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            className="size-11 shrink-0"
                            disabled={busy}
                            aria-label={`Actions for section ${section.title}`}
                          />
                        }
                      >
                        <MoreVerticalIcon aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingSection(section)
                              setIsSectionDialogOpen(true)
                            }}
                          >
                            Edit section
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                          >
                            Move section up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                          >
                            Move section down
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingSection(section)}
                          >
                            Remove section
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                >
                  {group.map((entry) => renderQuestionItem(entry, siblingIds))}
                </BuilderQuestionSection>
              )
            })}
            {(() => {
              const group = sections.length
                ? entries.filter(
                    (entry) => !sections.some((s) => s.key === entry.section)
                  )
                : entries
              return group.length ? (
                <div className="min-w-0">
                  {sections.length ? (
                    <h3 className="mb-3 text-sm font-semibold">
                      Unassigned questions
                    </h3>
                  ) : null}
                  <ul className="grid min-w-0 gap-3">
                    {group.map((entry) =>
                      renderQuestionItem(
                        entry,
                        group.map((e) => e.id)
                      )
                    )}
                  </ul>
                </div>
              ) : null
            })()}
          </section>
        )}
      </div>

      <AttemptDisplayNotice
        open={displayNotice}
        onOpenChange={setDisplayNotice}
      />
      <BuilderQuestionPicker
        open={showBank}
        onOpenChange={setShowBank}
        workspaceSlug={workspaceSlug}
        addedIds={addedQuestionIds}
        onAddMany={addManyFromBank}
        defaultAllocation={{
          marks: entries.at(-1)?.marks ?? 1,
          negativeMarks: entries.at(-1)?.negativeMarks ?? 0,
        }}
        viewerId={viewerId}
        assessmentId={assessment.id}
        onCreate={() => {
          setShowBank(false)
          navigation.request(newQuestionHref)
        }}
        sections={sections}
        target={bankTargetSection}
        onTargetChange={setBankTargetSection}
      />

      <AlertDialog
        open={reviewMode !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setReviewMode(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewMode === "test"
                ? "Start a test run?"
                : "Review assessment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewMode === "test"
                ? "This starts a real CBT attempt and adds it to your attempt history. Unsaved edits will be saved first."
                : "Save your changes and publish this assessment. Publishing does not start a test or change its sharing settings."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm">
            {entries.length} questions · {formatNumber(paperMarks)} marks ·{" "}
            {duration.trim() ? `${duration} minutes` : "Untimed"}
          </p>
          {publishIssues.length ? (
            <div className="max-h-52 overflow-y-auto">
              <p className="mb-2 text-sm font-medium">Fix before continuing</p>
              <ul className="flex flex-col gap-2">
                {publishIssues.map((issue) => (
                  <li key={issue.id}>
                    <button
                      className="min-h-11 text-left text-sm text-destructive underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => {
                        setReviewMode(null)
                        focusIssue(issue)
                      }}
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {targetMismatch ? (
            <p className="text-sm text-muted-foreground">
              The question marks total {formatNumber(paperMarks)}, while the
              target is {totalMarks}. This is a warning; it does not prevent
              publishing.
            </p>
          ) : null}
          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <Button
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => setReviewMode(null)}
            >
              Cancel
            </Button>
            <Button
              className="h-11"
              disabled={busy || publishIssues.length > 0}
              onClick={() => void persist(reviewMode ?? "publish")}
            >
              {busy
                ? "Working…"
                : reviewMode === "test"
                  ? "Start test run"
                  : "Publish assessment"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={navigation.pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) navigation.setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved assessment edits. Save them before leaving, or
              discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
          <AlertDialogFooter className="flex-wrap">
            <Button
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => navigation.setPending(null)}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              className="h-11"
              disabled={busy}
              onClick={() => navigation.leave(navigation.pending!)}
            >
              Discard changes
            </Button>
            <Button
              className="h-11"
              disabled={busy}
              onClick={async () => {
                const href = navigation.pending!
                if (await persist("save")) navigation.leave(href)
                else navigation.setPending(null)
              }}
            >
              {busy ? "Saving…" : "Save and continue"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        role="group"
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden"
        aria-label="Assessment editing actions"
      >
        <div className="mx-auto flex max-w-6xl gap-3 sm:pl-16">
          <Button
            variant="outline"
            className="h-11 flex-1"
            disabled={busy}
            onClick={() => openAddFromBank()}
          >
            Add questions
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={!isDirty || busy}
            onClick={() => void persist("save")}
          >
            {operation === "save" ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Blueprint Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-hidden sm:max-w-2xl!"
        >
          <SheetTitle className="sr-only">Edit assessment details</SheetTitle>
          <SheetDescription className="sr-only">
            Configure paper format, target exam, scoring thresholds, and
            candidate instructions.
          </SheetDescription>

          <fieldset
            disabled={busy}
            inert={busy}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <BlueprintFormFields
              errors={fieldErrors}
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
          </fieldset>

          <div className="flex shrink-0 items-center justify-end border-t border-border px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button className="h-11" onClick={() => setIsSettingsOpen(false)}>
              Done
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
            <AlertDialogTitle>Remove question from paper?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-medium text-foreground">
                Q
                {(entries.find((entry) => entry.id === pendingRemoveId)
                  ?.position ?? 0) + 1}
              </strong>{" "}
              will be removed from this paper. It will remain in your question
              bank.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
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
    </div>
  )
}

"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useRouter } from "next/navigation"
import {
  CalculatorIcon,
  CheckIcon,
  CheckCircle2Icon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  SendIcon,
  XIcon,
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  abandonAttemptAction,
  recordAnswerAction,
  submitAttemptAction,
} from "@/lib/tools/mock-tests/actions/attempt-actions"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { flushSync } from "react-dom"
import dynamic from "next/dynamic"

const VirtualCalculator = dynamic(
  () => import("./virtual-calculator").then((mod) => mod.VirtualCalculator),
  { ssr: false }
)

const CBT_RICH_STYLE: React.CSSProperties = { color: "#020617" }

import { InstructionsDialog } from "./instructions-dialog"
import { QuestionPaperDialog } from "./question-paper-dialog"
import type {
  PlayerAttempt,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

type AnswerState = {
  selectedKeys: string[]
  answerText: string | null
  isMarkedForReview: boolean
  visited: boolean
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const hh = String(hours).padStart(2, "0")
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`
}

function ExamCountdown({
  durationMinutes,
  startedAt,
  onTimeUp,
}: {
  durationMinutes: number | null
  startedAt: string | Date
  onTimeUp: () => void
}) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    () => {
      if (!durationMinutes) return null
      const end = new Date(startedAt).getTime() + durationMinutes * 60_000
      return Math.max(0, Math.floor((end - Date.now()) / 1000))
    }
  )

  useEffect(() => {
    if (durationMinutes === null) return
    const interval = window.setInterval(() => {
      const end = new Date(startedAt).getTime() + durationMinutes * 60_000
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
        onTimeUp()
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [durationMinutes, startedAt, onTimeUp])

  if (remainingSeconds === null) return <span>Untimed</span>
  return <span>{formatTimer(remainingSeconds)}</span>
}

const subscribeToMounted = () => () => {}
function getMountedSnapshot() {
  return true
}
function getServerMountedSnapshot() {
  return false
}

function getCbtKindBadge(kind: string): { label: string; full: string } {
  if (kind === "SINGLE_CHOICE" || kind === "TRUE_FALSE") {
    return { label: "MCQ", full: "Multiple Choice Question" }
  }
  if (kind === "MULTIPLE_CHOICE") {
    return { label: "MSQ", full: "Multiple Select Question" }
  }
  if (kind === "NUMERIC" || kind === "SHORT_ANSWER") {
    return { label: "NAT", full: "Numerical Answer Type" }
  }
  return { label: "MCQ", full: "Multiple Choice Question" }
}

function matchesSection(
  qSection: string | null | undefined,
  sec: SectionDefinition
): boolean {
  if (!qSection) return false
  const trimmed = qSection.trim()
  return trimmed === sec.key || trimmed === sec.title
}

function findQuestionSection(
  qSection: string | null | undefined,
  sectionsList: SectionDefinition[]
): SectionDefinition | undefined {
  if (!qSection) return undefined
  const trimmed = qSection.trim()
  return sectionsList.find((s) => s.key === trimmed || s.title === trimmed)
}

export function AttemptPlayer({
  workspaceSlug,
  attempt,
  displayAllowed = true,
  returnTo,
}: {
  workspaceSlug: string
  attempt: PlayerAttempt
  displayAllowed?: boolean
  returnTo?: string | null
}) {
  const router = useRouter()

  const mounted = useSyncExternalStore(
    subscribeToMounted,
    getMountedSnapshot,
    getServerMountedSnapshot
  )
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const initial: Record<string, AnswerState> = {}
    attempt.questions.forEach((question, index) => {
      initial[question.id] = {
        selectedKeys: question.selectedKeys,
        answerText: question.answerText,
        isMarkedForReview: false,
        visited: index === 0,
      }
    })
    return initial
  })

  const [submitting, setSubmitting] = useState(false)
  const [abandoning, setAbandoning] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const sections: SectionDefinition[] = useMemo(() => {
    if (attempt.sections && attempt.sections.length > 0) {
      return attempt.sections
    }
    const uniqueKeys: string[] = []
    const seen = new Set<string>()
    for (const q of attempt.questions) {
      if (q.section && q.section.trim().length > 0) {
        const trimmed = q.section.trim()
        if (!seen.has(trimmed)) {
          seen.add(trimmed)
          uniqueKeys.push(trimmed)
        }
      }
    }
    if (uniqueKeys.length > 0) {
      return uniqueKeys.map((s) => ({ key: s, title: s }))
    }
    return []
  }, [attempt.sections, attempt.questions])

  const [activeSection, setActiveSection] = useState<string>(() => {
    if (attempt.sections && attempt.sections.length > 0) {
      return attempt.sections[0].key
    }
    for (const q of attempt.questions) {
      if (q.section && q.section.trim().length > 0) {
        return q.section.trim()
      }
    }
    return "ALL"
  })

  const activeSectionDef = useMemo(() => {
    return sections.find((s) => s.key === activeSection)
  }, [sections, activeSection])

  const activeSectionQuestions = useMemo(() => {
    if (sections.length === 0 || activeSection === "ALL" || !activeSectionDef) {
      return attempt.questions
    }
    return attempt.questions.filter((q) =>
      matchesSection(q.section, activeSectionDef)
    )
  }, [activeSection, activeSectionDef, attempt.questions, sections.length])

  const [paletteFilter, setPaletteFilter] = useState<"section" | "all">(
    "section"
  )

  const displayedPaletteQuestions = useMemo(() => {
    if (
      paletteFilter === "all" ||
      activeSection === "ALL" ||
      sections.length <= 1
    ) {
      return attempt.questions
    }
    return activeSectionQuestions
  }, [
    paletteFilter,
    activeSection,
    sections.length,
    attempt.questions,
    activeSectionQuestions,
  ])
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false)

  const submitStarted = useRef(false)
  const questionStartedAt = useRef<Record<string, number>>({})
  const questionTimeSpent = useRef<Record<string, number>>({})

  const currentQuestion = attempt.questions[current]

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const latestSaveId = useRef(0)
  const pendingSaveQuestionId = useRef<string | null>(null)
  const saveErrorNotified = useRef(false)

  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Palette stats calculated for the active section (or all if "ALL" / no sections)
  const paletteStats = useMemo(() => {
    let answered = 0
    let notAnswered = 0
    let markedForReview = 0
    let answeredAndMarked = 0
    let notVisited = 0

    activeSectionQuestions.forEach((q) => {
      const st = answers[q.id]
      const hasAnswer =
        st &&
        (q.kind === "SHORT_ANSWER" || q.kind === "NUMERIC"
          ? Boolean(st.answerText && st.answerText.trim() !== "")
          : st.selectedKeys.length > 0)
      const isMarked = st?.isMarkedForReview ?? false
      const isVisited = st?.visited ?? false

      if (hasAnswer && isMarked) {
        answeredAndMarked += 1
      } else if (isMarked) {
        markedForReview += 1
      } else if (hasAnswer) {
        answered += 1
      } else if (isVisited) {
        notAnswered += 1
      } else {
        notVisited += 1
      }
    })

    return {
      answered,
      notAnswered,
      markedForReview,
      answeredAndMarked,
      notVisited,
    }
  }, [answers, activeSectionQuestions])

  // Total stats across the entire assessment for submit confirmation
  const totalStats = useMemo(() => {
    let answered = 0
    let notAnswered = 0
    let markedForReview = 0
    let answeredAndMarked = 0
    let notVisited = 0

    attempt.questions.forEach((q) => {
      const st = answers[q.id]
      const hasAnswer =
        st &&
        (q.kind === "SHORT_ANSWER" || q.kind === "NUMERIC"
          ? Boolean(st.answerText && st.answerText.trim() !== "")
          : st.selectedKeys.length > 0)
      const isMarked = st?.isMarkedForReview ?? false
      const isVisited = st?.visited ?? false

      if (hasAnswer && isMarked) {
        answeredAndMarked += 1
      } else if (isMarked) {
        markedForReview += 1
      } else if (hasAnswer) {
        answered += 1
      } else if (isVisited) {
        notAnswered += 1
      } else {
        notVisited += 1
      }
    })

    return {
      answered,
      notAnswered,
      markedForReview,
      answeredAndMarked,
      notVisited,
    }
  }, [answers, attempt.questions])

  function spendTime(questionId: string, now: number) {
    const started = questionStartedAt.current[questionId] ?? now
    const elapsed = Math.max(0, Math.floor((now - started) / 1000))
    questionTimeSpent.current[questionId] =
      (questionTimeSpent.current[questionId] ?? 0) + elapsed
    questionStartedAt.current[questionId] = now
  }

  async function runSave(
    questionId: string,
    merged: AnswerState,
    isRetry = false
  ) {
    const saveId = ++latestSaveId.current
    setSaveStatus("saving")
    try {
      await recordAnswerAction({
        workspaceSlug,
        attemptId: attempt.attemptId,
        questionId,
        selectedOptionKeys: merged.selectedKeys,
        answerText: merged.answerText,
        timeSpentSeconds: questionTimeSpent.current[questionId] ?? 0,
        idempotencyKey: createIdempotencyKey(),
      })
      if (latestSaveId.current !== saveId) return
      saveErrorNotified.current = false
      setSaveStatus("saved")
      const failedQuestionId = pendingSaveQuestionId.current
      pendingSaveQuestionId.current = null
      if (!isRetry && failedQuestionId && failedQuestionId !== questionId) {
        const failedState = answersRef.current[failedQuestionId]
        if (failedState) void runSave(failedQuestionId, failedState, true)
      }
    } catch {
      if (latestSaveId.current !== saveId) return
      pendingSaveQuestionId.current = questionId
      setSaveStatus("error")
      if (!saveErrorNotified.current) {
        saveErrorNotified.current = true
        toast.error("Answers may not be saved", {
          description:
            "Your latest change could not reach the server. It will retry on your next change.",
        })
      }
    }
  }

  function persistAnswer(
    questionId: string,
    patch: {
      selectedKeys?: string[]
      answerText?: string | null
      isMarkedForReview?: boolean
    },
    now: number
  ) {
    spendTime(questionId, now)
    const prev = answers[questionId] ?? {
      selectedKeys: [],
      answerText: null,
      isMarkedForReview: false,
      visited: true,
    }
    const merged: AnswerState = {
      selectedKeys: patch.selectedKeys ?? prev.selectedKeys,
      answerText:
        patch.answerText !== undefined ? patch.answerText : prev.answerText,
      isMarkedForReview:
        patch.isMarkedForReview !== undefined
          ? patch.isMarkedForReview
          : prev.isMarkedForReview,
      visited: true,
    }
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: merged,
    }))
    void runSave(questionId, merged)
  }

  function toggleOption(key: string, now: number) {
    const question = currentQuestion
    if (!question) return
    const currentKeys = answers[question.id]?.selectedKeys ?? []
    let nextKeys: string[]
    if (question.kind === "SINGLE_CHOICE" || question.kind === "TRUE_FALSE") {
      nextKeys = currentKeys.includes(key) ? [] : [key]
    } else {
      nextKeys = currentKeys.includes(key)
        ? currentKeys.filter((candidate) => candidate !== key)
        : [...currentKeys, key]
    }
    persistAnswer(question.id, { selectedKeys: nextKeys }, now)
  }

  function handleAnswerTextChange(text: string, now: number) {
    const question = currentQuestion
    if (!question) return
    persistAnswer(question.id, { answerText: text }, now)
  }

  function goToQuestion(index: number, now: number) {
    if (index < 0 || index >= attempt.questions.length) return
    if (currentQuestion) {
      spendTime(currentQuestion.id, now)
    }
    const targetQ = attempt.questions[index]
    if (targetQ) {
      setAnswers((prev) => ({
        ...prev,
        [targetQ.id]: {
          ...(prev[targetQ.id] ?? {
            selectedKeys: [],
            answerText: null,
            isMarkedForReview: false,
          }),
          visited: true,
        },
      }))
      questionStartedAt.current[targetQ.id] = now
      const matchingSec = findQuestionSection(targetQ.section, sections)
      if (matchingSec && activeSection !== matchingSec.key) {
        setActiveSection(matchingSec.key)
      }
    }
    setCurrent(index)
  }

  function handleSelectSection(secKey: string, now: number) {
    setActiveSection(secKey)
    if (secKey !== "ALL") {
      const targetSec = sections.find((s) => s.key === secKey)
      const isCurInSec =
        currentQuestion &&
        targetSec &&
        matchesSection(currentQuestion.section, targetSec)
      if (!isCurInSec && targetSec) {
        const firstIdx = attempt.questions.findIndex((q) =>
          matchesSection(q.section, targetSec)
        )
        if (firstIdx !== -1) {
          goToQuestion(firstIdx, now)
        }
      }
    }
  }

  function handleSaveAndNext(now: number) {
    if (!currentQuestion) return
    spendTime(currentQuestion.id, now)
    persistAnswer(currentQuestion.id, { isMarkedForReview: false }, now)
    if (current < attempt.questions.length - 1) {
      goToQuestion(current + 1, now)
    } else {
      toast.info("You are on the last question.", {
        description: "Review your answers or click Submit Exam when ready.",
      })
    }
  }

  function handleMarkForReviewAndNext(now: number) {
    if (!currentQuestion) return
    spendTime(currentQuestion.id, now)
    persistAnswer(currentQuestion.id, { isMarkedForReview: true }, now)
    if (current < attempt.questions.length - 1) {
      goToQuestion(current + 1, now)
    } else {
      toast.info("Marked for review on the last question.")
    }
  }

  function handleClearResponse(now: number) {
    if (!currentQuestion) return
    spendTime(currentQuestion.id, now)
    persistAnswer(
      currentQuestion.id,
      {
        selectedKeys: [],
        answerText: "",
        isMarkedForReview: false,
      },
      now
    )
    toast.info("Response cleared")
  }

  function handlePrevious(now: number) {
    if (current > 0) {
      goToQuestion(current - 1, now)
    }
  }

  const startSubmit = useCallback(async () => {
    try {
      const result = await submitAttemptAction({
        workspaceSlug,
        attemptId: attempt.attemptId,
        idempotencyKey: createIdempotencyKey(),
      })
      router.push(
        withSubjectReturn(
          workspaceRoutes.mockTests.analysis(workspaceSlug, result.attemptId),
          returnTo
        )
      )
    } catch (error) {
      submitStarted.current = false
      setSubmitting(false)
      const message =
        error instanceof Error ? error.message : "Failed to submit attempt."
      toast.error("Submit failed", { description: message })
    }
  }, [attempt.attemptId, router, workspaceSlug, returnTo])

  function handleSubmit(now: number) {
    if (currentQuestion) spendTime(currentQuestion.id, now)
    setShowSubmitModal(true)
  }

  function handleConfirmSubmit() {
    if (submitStarted.current || submitting) return
    submitStarted.current = true
    flushSync(() => {
      setSubmitting(true)
    })
    void startSubmit()
  }

  async function handleConfirmAbandon() {
    if (abandoning) return
    setAbandoning(true)
    try {
      await abandonAttemptAction({
        workspaceSlug,
        attemptId: attempt.attemptId,
        idempotencyKey: createIdempotencyKey(),
      })
      toast.info("Attempt abandoned.")
      router.push(
        returnTo ??
          workspaceRoutes.mockTests.detail(workspaceSlug, attempt.assessmentId)
      )
    } catch (error) {
      setAbandoning(false)
      const message =
        error instanceof Error ? error.message : "Failed to abandon attempt."
      toast.error("Abandon failed", { description: message })
    }
  }

  // Bind current action closures after each render; remove the previous listener.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        !displayAllowed ||
        showSubmitModal ||
        abandonOpen ||
        isCalculatorOpen ||
        isInstructionsOpen ||
        isQuestionPaperOpen
      )
        return
      const target = e.target as HTMLElement | null
      const isInput = Boolean(
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )

      // Alt + hotkeys
      if (e.altKey) {
        const k = e.key.toLowerCase()
        if (k === "s") {
          e.preventDefault()
          handleSaveAndNext(Date.now())
          return
        }
        if (k === "m") {
          e.preventDefault()
          handleMarkForReviewAndNext(Date.now())
          return
        }
        if (k === "c") {
          e.preventDefault()
          handleClearResponse(Date.now())
          return
        }
        if (k === "p") {
          e.preventDefault()
          handlePrevious(Date.now())
          return
        }
      }

      // Choice keys 1-4
      if (!isInput && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const isChoiceKind =
          currentQuestion?.kind === "SINGLE_CHOICE" ||
          currentQuestion?.kind === "MULTIPLE_CHOICE" ||
          currentQuestion?.kind === "TRUE_FALSE"

        if (currentQuestion && isChoiceKind && e.key >= "1" && e.key <= "4") {
          const opt = currentQuestion.options[Number(e.key) - 1]
          if (opt) {
            e.preventDefault()
            toggleOption(opt.key, Date.now())
          }
        } else if (e.key === "Enter" && !target?.closest("button, select, a")) {
          e.preventDefault()
          handleSaveAndNext(Date.now())
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  if (!currentQuestion) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        This test has no questions.
      </div>
    )
  }

  const answer = answers[currentQuestion.id] ?? {
    selectedKeys: [],
    answerText: null,
    isMarkedForReview: false,
    visited: true,
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white font-sans text-xs text-slate-900 select-none">
      {/* ── TIER 1: INSTITUTION / ASSESSMENT BRANDING (h-8, white, center-aligned) ───────── */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-4 font-sans text-xs">
        <div className="hidden w-24 items-center text-slate-400 sm:flex">
          <FileTextIcon className="size-3.5" />
        </div>
        <div className="flex-1 py-0.5 text-center leading-none">
          <span className="block text-sm font-black tracking-wide text-[#800000] uppercase">
            Mock Test Assessment
          </span>
          <span className="mt-0.5 block text-[11px] font-bold text-[#0284c7]">
            Organizer : {attempt.organizerName || "Online Examination Portal"}
          </span>
        </div>
        <div className="hidden w-24 items-center justify-end text-slate-400 sm:flex">
          <InfoIcon className="size-3.5" />
        </div>
      </div>

      {/* ── TIER 2: ASSESSMENT TITLE & TOOLBAR RIBBON (h-9, dark slate) ─────────────────── */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-700 bg-[#1e293b] px-4 text-white">
        <div className="flex max-w-lg items-center gap-2 truncate">
          <span className="truncate text-xs font-bold text-[#fef08a]">
            {attempt.assessmentTitle}
          </span>
          {saveStatus === "saving" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-slate-300">
              <Loader2Icon className="size-2.5 animate-spin text-blue-400" />{" "}
              Saving...
            </span>
          ) : saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-emerald-400">
              <CheckCircle2Icon className="size-2.5" /> Saved
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="flex items-center gap-1 rounded-none border border-slate-600 bg-[#0284c7] px-2 py-0.5 text-[11px] font-semibold text-white shadow-none transition-colors hover:bg-[#0369a1]"
          >
            <InfoIcon className="size-3" />
            Instructions
          </button>
          <button
            type="button"
            onClick={() => setIsQuestionPaperOpen(true)}
            className="flex items-center gap-1 rounded-none border border-slate-600 bg-[#16a34a] px-2 py-0.5 text-[11px] font-semibold text-white shadow-none transition-colors hover:bg-[#15803d]"
          >
            <FileTextIcon className="size-3" />
            Question Paper
          </button>
          {attempt.calculatorAllowed ? (
            <button
              type="button"
              onClick={() => setIsCalculatorOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-none border border-slate-600 bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white shadow-none transition-colors hover:bg-slate-600"
            >
              <CalculatorIcon className="size-3" />
              Calculator
            </button>
          ) : null}
        </div>
      </div>

      {/* ── TIER 3: SECTIONS ROW & TIMER (h-9, white, 1px bottom border) ──────────────────── */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-4 font-sans text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="shrink-0 text-xs font-bold text-slate-800">
            Sections
          </span>
          {sections.length > 0 ? (
            <TooltipProvider delay={100}>
              <div className="cbt-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5">
                {sections.map((sec) => {
                  const isActive = activeSection === sec.key
                  const count = attempt.questions.filter((q) =>
                    matchesSection(q.section, sec)
                  ).length

                  const buttonContent = (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => handleSelectSection(sec.key, Date.now())}
                      className={cn(
                        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-none px-3 py-0.5 text-xs shadow-none transition-colors select-none",
                        isActive
                          ? "bg-[#0284c7] font-bold text-white"
                          : "border border-slate-300 bg-slate-100 font-medium text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <span>
                        {sec.title} ({count})
                      </span>
                      {sec.description ? (
                        <span
                          title={sec.description}
                          className={cn(
                            "inline-flex items-center rounded-xs p-0.5 transition-colors",
                            isActive
                              ? "text-white/90 hover:text-white"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <InfoIcon className="size-3 shrink-0" />
                        </span>
                      ) : null}
                    </button>
                  )

                  if (sec.description) {
                    return (
                      <Tooltip key={sec.key}>
                        <TooltipTrigger render={buttonContent} />
                        <TooltipContent
                          side="bottom"
                          align="start"
                          className="z-50 max-w-xs space-y-1 rounded-none border border-slate-700 bg-slate-900 p-2.5 text-xs text-white shadow-lg"
                        >
                          <div className="font-bold text-amber-300">
                            {sec.title} Instructions
                          </div>
                          <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-200">
                            {sec.description}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return buttonContent
                })}
                {sections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleSelectSection("ALL", Date.now())}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-1 rounded-none px-3 py-0.5 text-xs shadow-none transition-colors select-none",
                      activeSection === "ALL"
                        ? "bg-[#0284c7] font-bold text-white"
                        : "border border-slate-300 bg-slate-100 font-medium text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <span>All ({attempt.questions.length})</span>
                  </button>
                ) : null}
              </div>
            </TooltipProvider>
          ) : (
            <div className="flex shrink-0 items-center gap-1 bg-[#0284c7] px-3 py-0.5 text-xs font-bold text-white">
              <span>All Questions ({attempt.questions.length})</span>
            </div>
          )}
        </div>

        {/* Time Left & Calculator Icon */}
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 sm:text-sm">
          <span>Time Left :</span>
          {mounted ? (
            <ExamCountdown
              durationMinutes={attempt.durationMinutes}
              startedAt={attempt.startedAt}
              onTimeUp={() => {
                if (!submitStarted.current) {
                  submitStarted.current = true
                  setSubmitting(true)
                  toast.info("Time is up. Submitting your attempt…")
                  void startSubmit()
                }
              }}
            />
          ) : (
            <span>--:--</span>
          )}
          {attempt.calculatorAllowed ? (
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              title="Open Virtual Calculator"
              className="ml-1 border border-slate-300 bg-amber-50 p-0.5 text-amber-700 transition-colors hover:bg-amber-100"
            >
              <CalculatorIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── MAIN BODY: LEFT WORKSPACE + RIGHT PALETTE ────────────────────────────────────────── */}
      <div className="m-0 flex flex-1 flex-col gap-0 overflow-hidden md:flex-row">
        {/* ── ZONE B: LEFT PANE: ACTIVE QUESTION WORKSPACE ──────────────────────────────────── */}
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-300 bg-white">
          {/* 1. Question Metadata Ribbon (Question Type & Marks) */}
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-300 bg-[#f8fafc] px-4 font-sans text-xs select-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-600">Question Type :</span>
              <span className="font-bold text-slate-900">
                {getCbtKindBadge(currentQuestion.kind).full}
              </span>
              {currentQuestion.section ? (
                <>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-slate-600">Section :</span>
                  <span className="font-bold text-blue-700">
                    {findQuestionSection(currentQuestion.section, sections)
                      ?.title ?? currentQuestion.section}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 font-sans text-xs">
              <span className="text-slate-600">
                Marks for correct answer{" "}
                <strong className="font-mono font-bold text-[#15803d]">
                  +{currentQuestion.marks.toFixed(2)}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Negative Marks{" "}
                <strong className="font-mono font-bold text-[#dc2626]">
                  {currentQuestion.negativeMarks < 0
                    ? currentQuestion.negativeMarks.toFixed(2)
                    : "0.00"}
                </strong>
              </span>
            </div>
          </div>

          {/* 2. Question Number Bar */}
          <div className="flex h-8 shrink-0 items-center border-b border-slate-200 bg-white px-4 text-xs font-bold text-slate-900 select-none">
            Question Number. {current + 1}
          </div>

          {/* 3. Question Canvas (Scrollable) */}
          <div className="cbt-scrollbar-light flex-1 overflow-y-auto bg-white p-6">
            <div className="max-w-4xl space-y-6">
              {/* Question Statement with KaTeX & Code - guaranteed pitch-black text */}
              <div
                style={{ color: "#020617" }}
                className="font-sans text-sm leading-relaxed text-slate-950 select-text sm:text-base [&_*]:!text-slate-950 [&_.katex]:!text-slate-950 [&_.katex-html]:!text-slate-950 [&_.rich-text]:!text-slate-950"
              >
                <RichContent
                  html={currentQuestion.stem}
                  style={CBT_RICH_STYLE}
                />
              </div>

              {/* Options / Answer Input Area */}
              {currentQuestion.kind === "SINGLE_CHOICE" ||
              currentQuestion.kind === "MULTIPLE_CHOICE" ||
              currentQuestion.kind === "TRUE_FALSE" ? (
                <div className="space-y-4 pt-2">
                  {/* Option rows */}
                  <div className="space-y-2">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answer.selectedKeys.includes(opt.key)
                      const isSingle =
                        currentQuestion.kind === "SINGLE_CHOICE" ||
                        currentQuestion.kind === "TRUE_FALSE"

                      return (
                        <div
                          key={opt.key}
                          onClick={() => toggleOption(opt.key, Date.now())}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-none border p-3 text-sm transition-colors select-none sm:text-base",
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-slate-950"
                              : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-none border text-xs font-bold transition-colors",
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-400 bg-white text-slate-700"
                            )}
                          >
                            {isSelected ? (
                              isSingle ? (
                                opt.key
                              ) : (
                                <CheckIcon className="size-3 stroke-[3]" />
                              )
                            ) : (
                              opt.key
                            )}
                          </div>
                          <div
                            style={{ color: "#020617" }}
                            className="rich-text flex-1 leading-relaxed text-slate-950 [&_*]:!text-slate-950"
                          >
                            <RichContent
                              html={opt.content}
                              style={CBT_RICH_STYLE}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* TCS iON Horizontal Quick Select Checkbox Ribbon */}
                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3 text-sm font-bold text-slate-900 select-none">
                    <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Select:
                    </span>
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answer.selectedKeys.includes(opt.key)
                      return (
                        <label
                          key={opt.key}
                          onClick={() => toggleOption(opt.key, Date.now())}
                          className="flex cursor-pointer items-center gap-1.5 rounded-none px-1.5 py-1 hover:bg-slate-100"
                        >
                          <input
                            type={
                              currentQuestion.kind === "MULTIPLE_CHOICE"
                                ? "checkbox"
                                : "radio"
                            }
                            checked={isSelected}
                            onChange={() => {}} // handled by parent label onClick
                            className="size-4 cursor-pointer accent-blue-600"
                          />
                          <span className="text-sm font-bold text-slate-900">
                            {opt.key}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Numerical Answer Type (NAT) Input + Keypad */
                <div className="max-w-lg space-y-4 rounded-none border border-slate-300 bg-white p-5 shadow-none">
                  <div className="space-y-2">
                    <label
                      htmlFor="nat-input"
                      className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
                    >
                      Enter your numerical answer below:
                    </label>
                    <input
                      id="nat-input"
                      type="text"
                      value={answer.answerText ?? ""}
                      onChange={(e) =>
                        handleAnswerTextChange(e.target.value, Date.now())
                      }
                      placeholder="e.g. 42 or -3.14"
                      className="w-full rounded-none border border-slate-300 bg-white px-4 py-2.5 font-mono text-xl font-bold text-slate-900 shadow-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                    <span className="block text-[11px] text-slate-500">
                      You can use your physical keyboard or the on-screen keypad
                      below.
                    </span>
                  </div>

                  {/* Flat Onscreen Virtual Keypad for NAT */}
                  <div className="border-t border-slate-200 pt-2">
                    <span className="mb-2 block text-[11px] font-semibold text-slate-600">
                      On-screen Keypad:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-sm">
                      {[
                        "7",
                        "8",
                        "9",
                        "Backspace",
                        "4",
                        "5",
                        "6",
                        "Clear",
                        "1",
                        "2",
                        "3",
                        "-",
                        "0",
                        ".",
                        "+/-",
                      ].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            const cur = answer.answerText ?? ""
                            if (k === "Backspace") {
                              handleAnswerTextChange(
                                cur.slice(0, -1),
                                Date.now()
                              )
                            } else if (k === "Clear") {
                              handleAnswerTextChange("", Date.now())
                            } else if (k === "+/-") {
                              if (cur.startsWith("-"))
                                handleAnswerTextChange(cur.slice(1), Date.now())
                              else if (cur)
                                handleAnswerTextChange("-" + cur, Date.now())
                            } else {
                              handleAnswerTextChange(cur + k, Date.now())
                            }
                          }}
                          className={cn(
                            "flex h-10 items-center justify-center rounded-none border font-bold shadow-none transition-colors",
                            k === "Clear" || k === "Backspace"
                              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                          )}
                        >
                          {k === "Backspace" ? "⌫" : k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Sticky Action Footer Bar (matches screenshot) */}
          <footer className="flex h-12 shrink-0 items-center justify-between border-t border-slate-300 bg-white px-4 font-sans select-none">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkForReviewAndNext(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase shadow-none transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Mark for Review &amp; Next
              </button>

              <button
                type="button"
                onClick={() => handleClearResponse(Date.now())}
                disabled={submitting || abandoning}
                className="flex items-center gap-1.5 rounded-none border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase shadow-none transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Clear Response
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrevious(Date.now())}
                disabled={current === 0 || submitting || abandoning}
                className="rounded-none border border-slate-400 bg-white px-4 py-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase shadow-none transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => handleSaveAndNext(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-[#0284c7] bg-[#0284c7] px-5 py-1.5 text-xs font-bold tracking-wider text-white uppercase shadow-none transition-colors hover:bg-[#0369a1] disabled:opacity-50"
              >
                Save &amp; Next
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-[#38bdf8] bg-[#38bdf8] px-5 py-1.5 text-xs font-bold tracking-wider text-white uppercase shadow-none transition-colors hover:bg-[#0ea5e9] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : null}
                Submit
              </button>
            </div>
          </footer>
        </main>

        {/* ── ZONE C: RIGHT PANE: QUESTION PALETTE & TEST TELEMETRY (w-80 / 320px) ─────────── */}
        <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-t border-slate-300 bg-[#f8fafc] font-sans text-xs select-none md:w-80 md:border-t-0 md:border-l lg:w-[320px]">
          {/* 1. Candidate Profile Box (From screenshot) */}
          <div className="flex items-center gap-3 border-b border-slate-300 bg-white p-3">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-[#e0f2fe]">
              <svg
                className="size-9 translate-y-1 text-[#0284c7]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Candidate
              </span>
              <span className="block truncate text-sm leading-tight font-bold text-slate-900">
                {attempt.candidateName || "Candidate"}
              </span>
            </div>
          </div>

          {/* 2. Official TCS iON Shaped Legend */}
          <div className="space-y-2 border-b border-slate-300 bg-white p-3">
            <div className="text-xs font-bold text-slate-800 italic">
              Legend
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              {/* 1 Answered (Green tag) */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center bg-[#16a34a] font-mono text-xs font-bold text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]">
                  {paletteStats.answered}
                </span>
                <span className="truncate text-[11px] font-medium text-slate-800">
                  Answered
                </span>
              </div>

              {/* 2 Not Answered (Red tag) */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center bg-[#dc2626] font-mono text-xs font-bold text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]">
                  {paletteStats.notAnswered}
                </span>
                <span className="truncate text-[11px] font-medium text-slate-800">
                  Not Answered
                </span>
              </div>

              {/* 6 Not Visited (Gray square) */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-[#94a3b8] font-mono text-xs font-bold text-white">
                  {paletteStats.notVisited}
                </span>
                <span className="truncate text-[11px] font-medium text-slate-800">
                  Not Visited
                </span>
              </div>

              {/* 0 Marked for Review (Purple circle) */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] font-mono text-xs font-bold text-white">
                  {paletteStats.markedForReview}
                </span>
                <span className="truncate text-[11px] font-medium text-slate-800">
                  Marked for Review
                </span>
              </div>

              {/* Answered and Marked for Review (Purple circle with green check) */}
              <div className="col-span-2 flex items-start gap-2 border-t border-slate-100 pt-1">
                <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] font-mono text-xs font-bold text-white after:absolute after:right-0 after:bottom-0 after:size-2 after:rounded-full after:bg-emerald-500 after:content-['']">
                  {paletteStats.answeredAndMarked}
                </span>
                <span className="text-[10px] leading-tight font-medium text-slate-800">
                  Answered and Marked for Review (will be considered for
                  evaluation)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Section Banner Header */}
          <div className="flex items-center justify-between bg-[#0284c7] px-3 py-1.5 font-sans text-xs font-bold text-white">
            <span className="truncate">
              {activeSection === "ALL"
                ? "All Sections"
                : `${activeSectionDef?.title ?? activeSection} Section`}
            </span>
            <span className="ml-2 shrink-0 font-mono text-[10px] opacity-90">
              {activeSectionQuestions.length} Questions
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-300 bg-[#f1f5f9] px-3 py-1 text-xs font-bold text-slate-800">
            <span>Choose a Question</span>
            {sections.length > 1 ? (
              <div className="flex items-center gap-1 font-sans text-[10px] font-normal">
                <button
                  type="button"
                  onClick={() => setPaletteFilter("section")}
                  className={cn(
                    "cursor-pointer px-1.5 py-0.5 font-bold transition-colors",
                    paletteFilter === "section" && activeSection !== "ALL"
                      ? "bg-[#0284c7] text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Section ({activeSectionQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter("all")}
                  className={cn(
                    "cursor-pointer px-1.5 py-0.5 font-bold transition-colors",
                    paletteFilter === "all" || activeSection === "ALL"
                      ? "bg-[#0284c7] text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-200"
                  )}
                >
                  All ({attempt.questions.length})
                </button>
              </div>
            ) : null}
          </div>

          {/* 4. Question Palette Grid with TCS iON Shaped Chips */}
          <div className="cbt-scrollbar-light flex-1 space-y-2 overflow-y-auto bg-white p-3">
            <div className="grid grid-cols-5 gap-2 pt-1">
              {displayedPaletteQuestions.map((q) => {
                const actualIdx = attempt.questions.findIndex(
                  (item) => item.id === q.id
                )
                const isCur = actualIdx === current
                const st = answers[q.id]
                const hasAns =
                  st &&
                  (q.kind === "SHORT_ANSWER" || q.kind === "NUMERIC"
                    ? Boolean(st.answerText && st.answerText.trim() !== "")
                    : st.selectedKeys.length > 0)
                const isMrk = st?.isMarkedForReview ?? false
                const isVis = st?.visited ?? false

                let shapeClass = "bg-[#94a3b8] text-white rounded-sm"
                let isAnsAndMarked = false

                if (hasAns && isMrk) {
                  shapeClass = "bg-[#7c3aed] text-white rounded-full"
                  isAnsAndMarked = true
                } else if (isMrk) {
                  shapeClass = "bg-[#7c3aed] text-white rounded-full"
                } else if (hasAns) {
                  shapeClass =
                    "bg-[#16a34a] text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]"
                } else if (isVis) {
                  shapeClass =
                    "bg-[#dc2626] text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]"
                }

                const belongsToActiveSec = activeSectionDef
                  ? matchesSection(q.section, activeSectionDef)
                  : true

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goToQuestion(actualIdx, Date.now())}
                    title={`Question ${actualIdx + 1}${q.section ? ` (${findQuestionSection(q.section, sections)?.title ?? q.section})` : ""}`}
                    className={cn(
                      "relative flex size-9 cursor-pointer items-center justify-center font-mono text-xs font-bold shadow-none transition-all select-none",
                      shapeClass,
                      isCur &&
                        "z-10 scale-110 font-black ring-2 ring-blue-600 ring-offset-2 ring-offset-white",
                      (paletteFilter === "all" || activeSection === "ALL") &&
                        sections.length > 1 &&
                        !belongsToActiveSec &&
                        "opacity-60 hover:opacity-100"
                    )}
                  >
                    {actualIdx + 1}
                    {isAnsAndMarked ? (
                      <span className="absolute right-0 bottom-0 size-2 rounded-full border border-white bg-emerald-500" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Unmount portals immediately on small screens, without a clickable exit animation. */}
      {displayAllowed ? (
        <>
          {/* CBT VIRTUAL CALCULATOR (Floating / Draggable) */}
          {attempt.calculatorAllowed && isCalculatorOpen ? (
            <VirtualCalculator
              isOpen={isCalculatorOpen}
              onClose={() => setIsCalculatorOpen(false)}
            />
          ) : null}

          {/* CBT INSTRUCTIONS DIALOG */}
          <InstructionsDialog
            isOpen={isInstructionsOpen}
            onClose={() => setIsInstructionsOpen(false)}
            durationMinutes={attempt.durationMinutes}
            totalQuestions={attempt.questions.length}
            instructionsText={attempt.instructions}
            calculatorAllowed={attempt.calculatorAllowed}
            hasNegativeMarking={attempt.questions.some(
              (q) => q.negativeMarks < 0
            )}
          />

          {/* CBT QUESTION PAPER MODAL */}
          <QuestionPaperDialog
            isOpen={isQuestionPaperOpen}
            onClose={() => setIsQuestionPaperOpen(false)}
            attempt={attempt}
            onSelectQuestion={(idx) => goToQuestion(idx, Date.now())}
          />

          {/* SUBMIT CONFIRMATION DIALOG */}
          <Dialog
            open={showSubmitModal}
            onOpenChange={(open) => {
              if (!submitting) setShowSubmitModal(open)
            }}
          >
            <DialogContent className="max-w-md space-y-4 rounded-none border border-slate-300 bg-white p-6 font-sans text-slate-900 shadow-xl">
              <DialogHeader className="border-b border-slate-200 pb-3">
                <DialogTitle className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900">
                  <SendIcon className="size-4 text-blue-600" /> Confirm Exam
                  Submission
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Are you sure you want to submit your test? Once submitted,
                  your answers will be evaluated immediately.
                </DialogDescription>
              </DialogHeader>

              {/* Exam Evaluation Rule Notice */}
              <div className="flex items-start gap-2 border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue-600" />
                <span>
                  <strong>Evaluation Note:</strong> Questions marked for review
                  with a selected answer <strong>will be evaluated</strong>{" "}
                  towards your final score.
                </span>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 bg-[#f8fafc] text-xs">
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-600">Total Questions:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {attempt.questions.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="font-semibold text-emerald-700">
                    Answered:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {totalStats.answered + totalStats.answeredAndMarked}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="font-semibold text-red-700">
                    Not Answered:
                  </span>
                  <span className="font-mono font-bold text-red-700">
                    {totalStats.notAnswered}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="font-semibold text-indigo-700">
                    Marked for Review:
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {totalStats.markedForReview}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5">
                  <span className="text-slate-600">Not Visited:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {totalStats.notVisited}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => !submitting && setShowSubmitModal(false)}
                  className="rounded-none border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-900"
                >
                  Resume Test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-none border border-blue-600 bg-blue-600 text-xs font-bold text-white shadow-none hover:bg-blue-700"
                >
                  {submitting ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                  {submitting ? "Submitting Exam..." : "Submit Test"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Full-Screen Grading Overlay Modal */}
          {submitting ? (
            <div
              role="status"
              aria-live="polite"
              className="fixed inset-0 z-50 flex animate-in flex-col items-center justify-center bg-slate-900/85 text-white backdrop-blur-sm duration-200 fade-in"
            >
              <div className="flex max-w-sm flex-col items-center space-y-4 p-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/20">
                  <Loader2Icon
                    className="size-8 animate-spin text-blue-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    Grading Exam Paper
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Evaluating your answers against the official answer key and
                    calculating performance metrics...
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                  Generating diagnostic scorecard
                </div>
              </div>
            </div>
          ) : null}

          {/* ABANDON ATTEMPT CONFIRMATION */}
          <AlertDialog
            open={abandonOpen}
            onOpenChange={(open) => {
              if (!abandoning) setAbandonOpen(open)
            }}
          >
            <AlertDialogContent
              size="sm"
              className="max-w-sm rounded-none border border-slate-300 bg-white font-sans text-slate-900 shadow-xl"
            >
              <AlertDialogHeader>
                <AlertDialogMedia className="rounded-none bg-red-100 text-red-700">
                  <XIcon />
                </AlertDialogMedia>
                <AlertDialogTitle className="text-sm font-bold text-slate-900">
                  Abandon This Attempt?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-600">
                  This attempt will be marked abandoned. Your answers will not
                  be graded and no score will be generated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="border-t border-slate-200 pt-3">
                <AlertDialogCancel
                  disabled={abandoning}
                  className="rounded-none border border-slate-300 bg-white text-xs text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-900"
                >
                  Keep Testing
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleConfirmAbandon}
                  disabled={abandoning}
                  className="rounded-none border border-red-600 bg-red-600 text-xs font-bold text-white shadow-none hover:bg-red-700"
                >
                  {abandoning ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <XIcon className="size-3.5" />
                  )}
                  Abandon Attempt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  )
}

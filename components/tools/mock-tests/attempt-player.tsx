"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { VirtualCalculator } from "./virtual-calculator"
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

const subscribeToMounted = () => () => {}
function getMountedSnapshot() { return true }
function getServerMountedSnapshot() { return false }

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
}: {
  workspaceSlug: string
  attempt: PlayerAttempt
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
    return attempt.questions.filter((q) => matchesSection(q.section, activeSectionDef))
  }, [activeSection, activeSectionDef, attempt.questions, sections.length])

  const [paletteFilter, setPaletteFilter] = useState<"section" | "all">("section")

  const displayedPaletteQuestions = useMemo(() => {
    if (paletteFilter === "all" || activeSection === "ALL" || sections.length <= 1) {
      return attempt.questions
    }
    return activeSectionQuestions
  }, [paletteFilter, activeSection, sections.length, attempt.questions, activeSectionQuestions])
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

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!attempt.durationMinutes) return null
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    return Math.max(0, Math.floor((end - Date.now()) / 1000))
  })

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

    return { answered, notAnswered, markedForReview, answeredAndMarked, notVisited }
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

    return { answered, notAnswered, markedForReview, answeredAndMarked, notVisited }
  }, [answers, attempt.questions])

  function spendTime(questionId: string, now: number) {
    const started = questionStartedAt.current[questionId] ?? now
    const elapsed = Math.max(0, Math.floor((now - started) / 1000))
    questionTimeSpent.current[questionId] =
      (questionTimeSpent.current[questionId] ?? 0) + elapsed
    questionStartedAt.current[questionId] = now
  }

  async function runSave(questionId: string, merged: AnswerState, isRetry = false) {
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
          description: "Your latest change could not reach the server. It will retry on your next change.",
        })
      }
    }
  }

  function persistAnswer(
    questionId: string,
    patch: { selectedKeys?: string[]; answerText?: string | null; isMarkedForReview?: boolean },
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
      answerText: patch.answerText !== undefined ? patch.answerText : prev.answerText,
      isMarkedForReview: patch.isMarkedForReview !== undefined ? patch.isMarkedForReview : prev.isMarkedForReview,
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
        workspaceRoutes.mockTests.analysis(workspaceSlug, result.attemptId)
      )
    } catch (error) {
      submitStarted.current = false
      setSubmitting(false)
      const message =
        error instanceof Error ? error.message : "Failed to submit attempt."
      toast.error("Submit failed", { description: message })
    }
  }, [attempt.attemptId, router, workspaceSlug])

  function handleSubmit(now: number) {
    if (currentQuestion) spendTime(currentQuestion.id, now)
    setShowSubmitModal(true)
  }

  function handleConfirmSubmit() {
    if (submitStarted.current || submitting) return
    submitStarted.current = true
    setSubmitting(true)
    setShowSubmitModal(false)
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
      router.push(workspaceRoutes.mockTests.detail(workspaceSlug, attempt.assessmentId))
    } catch (error) {
      setAbandoning(false)
      const message =
        error instanceof Error ? error.message : "Failed to abandon attempt."
      toast.error("Abandon failed", { description: message })
    }
  }

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showSubmitModal || abandonOpen || isCalculatorOpen || isInstructionsOpen || isQuestionPaperOpen) return
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
        } else if (e.key === "Enter" && !target?.closest('button, select, a')) {
          e.preventDefault()
          handleSaveAndNext(Date.now())
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentQuestion, current, answers, showSubmitModal, abandonOpen, isCalculatorOpen, isInstructionsOpen, isQuestionPaperOpen])

  // Timer countdown hook
  useEffect(() => {
    if (attempt.durationMinutes === null) return
    const interval = window.setInterval(() => {
      const end =
        new Date(attempt.startedAt).getTime() +
        attempt.durationMinutes! * 60_000
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
        if (!submitStarted.current) {
          submitStarted.current = true
          setSubmitting(true)
          toast.info("Time is up. Submitting your attempt…")
          void startSubmit()
        }
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [attempt.durationMinutes, attempt.startedAt, startSubmit])


  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-sm text-muted-foreground">
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
    <div className="flex flex-col h-full w-full bg-white text-slate-900 select-none overflow-hidden font-sans text-xs">
      {/* ── TIER 1: INSTITUTION / ASSESSMENT BRANDING (h-8, white, center-aligned) ───────── */}
      <div className="shrink-0 h-8 px-4 flex items-center justify-between border-b border-slate-300 bg-white text-xs font-sans">
        <div className="w-24 hidden sm:flex items-center text-slate-400">
          <FileTextIcon className="size-3.5" />
        </div>
        <div className="flex-1 text-center leading-none py-0.5">
          <span className="text-[#800000] font-black text-sm uppercase tracking-wide block">
            Mock Test Assessment
          </span>
          <span className="text-[#0284c7] font-bold text-[11px] block mt-0.5">
            Organizer : {attempt.organizerName || "Online Examination Portal"}
          </span>
        </div>
        <div className="w-24 hidden sm:flex items-center justify-end text-slate-400">
          <InfoIcon className="size-3.5" />
        </div>
      </div>

      {/* ── TIER 2: ASSESSMENT TITLE & TOOLBAR RIBBON (h-9, dark slate) ─────────────────── */}
      <div className="shrink-0 h-9 px-4 flex items-center justify-between bg-[#1e293b] text-white border-b border-slate-700">
        <div className="flex items-center gap-2 truncate max-w-lg">
          <span className="font-bold text-[#fef08a] text-xs truncate">
            {attempt.assessmentTitle}
          </span>
          {saveStatus === "saving" ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-300 font-normal">
              <Loader2Icon className="size-2.5 animate-spin text-blue-400" /> Saving...
            </span>
          ) : saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-normal">
              <CheckCircle2Icon className="size-2.5" /> Saved
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="rounded-none bg-[#0284c7] hover:bg-[#0369a1] text-white px-2 py-0.5 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-none border border-slate-600"
          >
            <InfoIcon className="size-3" />
            Instructions
          </button>
          <button
            type="button"
            onClick={() => setIsQuestionPaperOpen(true)}
            className="rounded-none bg-[#16a34a] hover:bg-[#15803d] text-white px-2 py-0.5 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-none border border-slate-600"
          >
            <FileTextIcon className="size-3" />
            Question Paper
          </button>
          {attempt.calculatorAllowed ? (
            <button
              type="button"
              onClick={() => setIsCalculatorOpen((prev) => !prev)}
              className="rounded-none bg-slate-700 hover:bg-slate-600 text-white px-2 py-0.5 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-none border border-slate-600"
            >
              <CalculatorIcon className="size-3" />
              Calculator
            </button>
          ) : null}
        </div>
      </div>

      {/* ── TIER 3: SECTIONS ROW & TIMER (h-9, white, 1px bottom border) ──────────────────── */}
      <div className="shrink-0 h-9 px-4 flex items-center justify-between border-b border-slate-300 bg-white text-xs font-sans">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-slate-800 text-xs shrink-0">Sections</span>
          {sections.length > 0 ? (
            <TooltipProvider delay={100}>
              <div className="flex items-center gap-1.5 overflow-x-auto cbt-scrollbar py-0.5">
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
                        "px-3 py-0.5 rounded-none text-xs transition-colors flex items-center gap-1.5 shrink-0 select-none shadow-none cursor-pointer",
                        isActive
                          ? "bg-[#0284c7] text-white font-bold"
                          : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 font-medium"
                      )}
                    >
                      <span>
                        {sec.title} ({count})
                      </span>
                      {sec.description ? (
                        <span
                          title={sec.description}
                          className={cn(
                            "inline-flex items-center p-0.5 rounded-xs transition-colors",
                            isActive ? "text-white/90 hover:text-white" : "text-slate-500 hover:text-slate-800"
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
                          className="max-w-xs text-xs p-2.5 bg-slate-900 text-white rounded-none border border-slate-700 shadow-lg space-y-1 z-50"
                        >
                          <div className="font-bold text-amber-300">{sec.title} Instructions</div>
                          <div className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">
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
                      "px-3 py-0.5 rounded-none text-xs transition-colors flex items-center gap-1 shrink-0 select-none shadow-none cursor-pointer",
                      activeSection === "ALL"
                        ? "bg-[#0284c7] text-white font-bold"
                        : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 font-medium"
                    )}
                  >
                    <span>All ({attempt.questions.length})</span>
                  </button>
                ) : null}
              </div>
            </TooltipProvider>
          ) : (
            <div className="bg-[#0284c7] text-white px-3 py-0.5 font-bold text-xs flex items-center gap-1 shrink-0">
              <span>All Questions ({attempt.questions.length})</span>
            </div>
          )}
        </div>

        {/* Time Left & Calculator Icon */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 font-mono">
          <span>Time Left :{mounted ? (remainingSeconds !== null ? formatTimer(remainingSeconds) : "Untimed") : "--:--"}</span>
          {attempt.calculatorAllowed ? (
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              title="Open Virtual Calculator"
              className="p-0.5 border border-slate-300 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors ml-1"
            >
              <CalculatorIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── MAIN BODY: LEFT WORKSPACE + RIGHT PALETTE ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden m-0 gap-0">
        {/* ── ZONE B: LEFT PANE: ACTIVE QUESTION WORKSPACE ──────────────────────────────────── */}
        <main className="flex-1 flex flex-col h-full border-r border-slate-300 bg-white overflow-hidden min-w-0">
          {/* 1. Question Metadata Ribbon (Question Type & Marks) */}
          <div className="shrink-0 h-8 px-4 flex items-center justify-between border-b border-slate-300 bg-[#f8fafc] text-xs font-sans select-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-600">Question Type :</span>
              <span className="font-bold text-slate-900">
                {getCbtKindBadge(currentQuestion.kind).full}
              </span>
              {currentQuestion.section ? (
                <>
                  <span className="text-slate-300 mx-1">|</span>
                  <span className="text-slate-600">Section :</span>
                  <span className="font-bold text-blue-700">
                    {findQuestionSection(currentQuestion.section, sections)?.title ?? currentQuestion.section}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs font-sans">
              <span className="text-slate-600">
                Marks for correct answer <strong className="text-[#15803d] font-mono font-bold">+{currentQuestion.marks.toFixed(2)}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Negative Marks <strong className="text-[#dc2626] font-mono font-bold">{currentQuestion.negativeMarks < 0 ? currentQuestion.negativeMarks.toFixed(2) : "0.00"}</strong>
              </span>
            </div>
          </div>

          {/* 2. Question Number Bar */}
          <div className="shrink-0 h-8 px-4 flex items-center border-b border-slate-200 bg-white text-xs font-bold text-slate-900 select-none">
            Question Number. {current + 1}
          </div>

          {/* 3. Question Canvas (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 cbt-scrollbar-light bg-white">
            <div className="max-w-4xl space-y-6">
              {/* Question Statement with KaTeX & Code - guaranteed pitch-black text */}
              <div
                style={{ color: "#020617" }}
                className="text-slate-950 leading-relaxed text-sm sm:text-base font-sans [&_*]:!text-slate-950 [&_.rich-text]:!text-slate-950 [&_.katex]:!text-slate-950 [&_.katex-html]:!text-slate-950 select-text"
              >
                <RichContent html={currentQuestion.stem} style={{ color: "#020617" }} />
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
                            "flex items-start gap-3 p-3 border transition-colors cursor-pointer text-sm sm:text-base rounded-none select-none",
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-slate-950"
                              : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          <div
                            className={cn(
                              "size-5 shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border rounded-none transition-colors",
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-400 bg-white text-slate-700"
                            )}
                          >
                            {isSelected ? (
                              isSingle ? opt.key : <CheckIcon className="size-3 stroke-[3]" />
                            ) : (
                              opt.key
                            )}
                          </div>
                          <div
                            style={{ color: "#020617" }}
                            className="flex-1 rich-text text-slate-950 leading-relaxed [&_*]:!text-slate-950"
                          >
                            <RichContent html={opt.content} style={{ color: "#020617" }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* TCS iON Horizontal Quick Select Checkbox Ribbon */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200 text-sm font-bold text-slate-900 select-none">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Select:</span>
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answer.selectedKeys.includes(opt.key)
                      return (
                        <label
                          key={opt.key}
                          onClick={() => toggleOption(opt.key, Date.now())}
                          className="flex items-center gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-slate-100 rounded-none"
                        >
                          <input
                            type={
                              currentQuestion.kind === "MULTIPLE_CHOICE"
                                ? "checkbox"
                                : "radio"
                            }
                            checked={isSelected}
                            onChange={() => {}} // handled by parent label onClick
                            className="size-4 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-900">{opt.key}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Numerical Answer Type (NAT) Input + Keypad */
                <div className="space-y-4 max-w-lg border border-slate-300 bg-white p-5 rounded-none shadow-none">
                  <div className="space-y-2">
                    <label htmlFor="nat-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Enter your numerical answer below:
                    </label>
                    <input
                      id="nat-input"
                      type="text"
                      value={answer.answerText ?? ""}
                      onChange={(e) => handleAnswerTextChange(e.target.value, Date.now())}
                      placeholder="e.g. 42 or -3.14"
                      className="w-full rounded-none border border-slate-300 bg-white px-4 py-2.5 font-mono text-xl font-bold text-slate-900 placeholder:text-slate-400 shadow-none focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      You can use your physical keyboard or the on-screen keypad below.
                    </span>
                  </div>

                  {/* Flat Onscreen Virtual Keypad for NAT */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-2">On-screen Keypad:</span>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-sm">
                      {["7", "8", "9", "Backspace", "4", "5", "6", "Clear", "1", "2", "3", "-", "0", ".", "+/-"].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            const cur = answer.answerText ?? ""
                            if (k === "Backspace") {
                              handleAnswerTextChange(cur.slice(0, -1), Date.now())
                            } else if (k === "Clear") {
                              handleAnswerTextChange("", Date.now())
                            } else if (k === "+/-") {
                              if (cur.startsWith("-")) handleAnswerTextChange(cur.slice(1), Date.now())
                              else if (cur) handleAnswerTextChange("-" + cur, Date.now())
                            } else {
                              handleAnswerTextChange(cur + k, Date.now())
                            }
                          }}
                          className={cn(
                            "h-10 rounded-none border font-bold transition-colors flex items-center justify-center shadow-none",
                            k === "Clear" || k === "Backspace"
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
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
          <footer className="shrink-0 h-12 px-4 flex items-center justify-between border-t border-slate-300 bg-white select-none font-sans">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkForReviewAndNext(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-slate-400 bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors shadow-none disabled:opacity-50"
              >
                Mark for Review &amp; Next
              </button>

              <button
                type="button"
                onClick={() => handleClearResponse(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-slate-400 bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-none disabled:opacity-50"
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
                className="rounded-none border border-slate-400 bg-white hover:bg-slate-100 text-slate-900 px-4 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors shadow-none disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => handleSaveAndNext(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-[#0284c7] bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors shadow-none disabled:opacity-50"
              >
                Save &amp; Next
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(Date.now())}
                disabled={submitting || abandoning}
                className="rounded-none border border-[#38bdf8] bg-[#38bdf8] hover:bg-[#0ea5e9] text-white px-5 py-1.5 font-bold text-xs uppercase tracking-wider transition-colors shadow-none disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2Icon className="animate-spin size-3.5" />
                ) : null}
                Submit
              </button>
            </div>
          </footer>
        </main>

        {/* ── ZONE C: RIGHT PANE: QUESTION PALETTE & TEST TELEMETRY (w-80 / 320px) ─────────── */}
        <aside className="w-full md:w-80 lg:w-[320px] shrink-0 flex flex-col h-full bg-[#f8fafc] border-t md:border-t-0 md:border-l border-slate-300 overflow-hidden font-sans text-xs select-none">
          {/* 1. Candidate Profile Box (From screenshot) */}
          <div className="p-3 border-b border-slate-300 bg-white flex items-center gap-3">
            <div className="size-11 rounded-full border border-slate-300 bg-[#e0f2fe] flex items-center justify-center shrink-0 overflow-hidden">
              <svg className="size-9 text-[#0284c7] translate-y-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Candidate</span>
              <span className="text-sm font-bold text-slate-900 block truncate leading-tight">
                {attempt.candidateName || "Candidate"}
              </span>
            </div>
          </div>

          {/* 2. Official TCS iON Shaped Legend */}
          <div className="p-3 border-b border-slate-300 bg-white space-y-2">
            <div className="font-bold italic text-slate-800 text-xs">Legend</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
              {/* 1 Answered (Green tag) */}
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#16a34a] text-white font-bold font-mono text-xs flex items-center justify-center [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)] shrink-0">
                  {paletteStats.answered}
                </span>
                <span className="text-[11px] text-slate-800 font-medium truncate">Answered</span>
              </div>

              {/* 2 Not Answered (Red tag) */}
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#dc2626] text-white font-bold font-mono text-xs flex items-center justify-center [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)] shrink-0">
                  {paletteStats.notAnswered}
                </span>
                <span className="text-[11px] text-slate-800 font-medium truncate">Not Answered</span>
              </div>

              {/* 6 Not Visited (Gray square) */}
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#94a3b8] text-white font-bold font-mono text-xs flex items-center justify-center rounded-sm shrink-0">
                  {paletteStats.notVisited}
                </span>
                <span className="text-[11px] text-slate-800 font-medium truncate">Not Visited</span>
              </div>

              {/* 0 Marked for Review (Purple circle) */}
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#7c3aed] text-white font-bold font-mono text-xs flex items-center justify-center rounded-full shrink-0">
                  {paletteStats.markedForReview}
                </span>
                <span className="text-[11px] text-slate-800 font-medium truncate">Marked for Review</span>
              </div>

              {/* Answered and Marked for Review (Purple circle with green check) */}
              <div className="col-span-2 flex items-start gap-2 pt-1 border-t border-slate-100">
                <span className="relative size-6 shrink-0 bg-[#7c3aed] text-white font-bold font-mono text-xs flex items-center justify-center rounded-full after:content-[''] after:absolute after:bottom-0 after:right-0 after:size-2 after:bg-emerald-500 after:rounded-full">
                  {paletteStats.answeredAndMarked}
                </span>
                <span className="text-[10px] text-slate-800 font-medium leading-tight">
                  Answered and Marked for Review (will be considered for evaluation)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Section Banner Header */}
          <div className="bg-[#0284c7] text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between font-sans">
            <span className="truncate">
              {activeSection === "ALL"
                ? "All Sections"
                : `${activeSectionDef?.title ?? activeSection} Section`}
            </span>
            <span className="text-[10px] font-mono opacity-90 shrink-0 ml-2">
              {activeSectionQuestions.length} Questions
            </span>
          </div>

          <div className="bg-[#f1f5f9] text-slate-800 px-3 py-1 text-xs font-bold border-b border-slate-300 flex items-center justify-between">
            <span>Choose a Question</span>
            {sections.length > 1 ? (
              <div className="flex items-center gap-1 font-sans text-[10px] font-normal">
                <button
                  type="button"
                  onClick={() => setPaletteFilter("section")}
                  className={cn(
                    "px-1.5 py-0.5 font-bold transition-colors cursor-pointer",
                    paletteFilter === "section" && activeSection !== "ALL"
                      ? "bg-[#0284c7] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-300"
                  )}
                >
                  Section ({activeSectionQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter("all")}
                  className={cn(
                    "px-1.5 py-0.5 font-bold transition-colors cursor-pointer",
                    paletteFilter === "all" || activeSection === "ALL"
                      ? "bg-[#0284c7] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-300"
                  )}
                >
                  All ({attempt.questions.length})
                </button>
              </div>
            ) : null}
          </div>

          {/* 4. Question Palette Grid with TCS iON Shaped Chips */}
          <div className="p-3 flex-1 overflow-y-auto cbt-scrollbar-light space-y-2 bg-white">
            <div className="grid grid-cols-5 gap-2 pt-1">
              {displayedPaletteQuestions.map((q) => {
                const actualIdx = attempt.questions.findIndex((item) => item.id === q.id)
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
                  shapeClass = "bg-[#16a34a] text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]"
                } else if (isVis) {
                  shapeClass = "bg-[#dc2626] text-white [clip-path:polygon(0%_0%,100%_0%,100%_75%,50%_100%,0%_75%)]"
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
                      "relative flex size-9 items-center justify-center font-mono text-xs font-bold transition-all select-none shadow-none cursor-pointer",
                      shapeClass,
                      isCur && "ring-2 ring-blue-600 ring-offset-2 ring-offset-white z-10 font-black scale-110",
                      (paletteFilter === "all" || activeSection === "ALL") &&
                        sections.length > 1 &&
                        !belongsToActiveSec &&
                        "opacity-60 hover:opacity-100"
                    )}
                  >
                    {actualIdx + 1}
                    {isAnsAndMarked ? (
                      <span className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full border border-white" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* CBT VIRTUAL CALCULATOR (Floating / Draggable) */}
      {attempt.calculatorAllowed ? (
        <VirtualCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      ) : null}

      {/* CBT INSTRUCTIONS DIALOG */}
      <InstructionsDialog
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        durationMinutes={attempt.durationMinutes}
        totalQuestions={attempt.questions.length}
        instructionsText={attempt.instructions}
        calculatorAllowed={attempt.calculatorAllowed}
        hasNegativeMarking={attempt.questions.some((q) => q.negativeMarks < 0)}
      />

      {/* CBT QUESTION PAPER MODAL */}
      <QuestionPaperDialog
        isOpen={isQuestionPaperOpen}
        onClose={() => setIsQuestionPaperOpen(false)}
        attempt={attempt}
        onSelectQuestion={(idx) => goToQuestion(idx, Date.now())}
      />

      {/* SUBMIT CONFIRMATION DIALOG */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-md rounded-none border border-slate-300 bg-white text-slate-900 p-6 shadow-xl font-sans space-y-4">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <SendIcon className="size-4 text-blue-600" /> Confirm Exam Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to submit your test? Once submitted, your answers will be evaluated immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Exam Evaluation Rule Notice */}
          <div className="border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-start gap-2">
            <InfoIcon className="size-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              <strong>Evaluation Note:</strong> Questions marked for review with a selected answer <strong>will be evaluated</strong> towards your final score.
            </span>
          </div>

          <div className="border border-slate-200 bg-[#f8fafc] divide-y divide-slate-200 text-xs">
            <div className="flex justify-between items-center p-2.5">
              <span className="text-slate-600">Total Questions:</span>
              <span className="font-mono font-bold text-slate-900">{attempt.questions.length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="text-emerald-700 font-semibold">Answered:</span>
              <span className="font-mono font-bold text-emerald-700">
                {totalStats.answered + totalStats.answeredAndMarked}
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="text-red-700 font-semibold">Not Answered:</span>
              <span className="font-mono font-bold text-red-700">{totalStats.notAnswered}</span>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="text-violet-700 font-semibold">Marked for Review:</span>
              <span className="font-mono font-bold text-violet-700">{totalStats.markedForReview}</span>
            </div>
            <div className="flex justify-between items-center p-2.5">
              <span className="text-slate-600">Not Visited:</span>
              <span className="font-mono font-bold text-slate-700">{totalStats.notVisited}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(false)}
              className="rounded-none border border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold shadow-none"
            >
              Resume Test
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="rounded-none border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-none flex items-center gap-1.5"
            >
              {submitting ? <Loader2Icon className="animate-spin size-3.5" /> : null}
              Submit Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ABANDON ATTEMPT CONFIRMATION */}
      <AlertDialog
        open={abandonOpen}
        onOpenChange={(open) => {
          if (!abandoning) setAbandonOpen(open)
        }}
      >
        <AlertDialogContent size="sm" className="max-w-sm rounded-none border border-slate-300 bg-white text-slate-900 font-sans shadow-xl">
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-none bg-red-100 text-red-700">
              <XIcon />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-sm font-bold text-slate-900">
              Abandon This Attempt?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              This attempt will be marked abandoned. Your answers will not be graded and no score will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-slate-200 pt-3">
            <AlertDialogCancel
              disabled={abandoning}
              className="rounded-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs shadow-none"
            >
              Keep Testing
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmAbandon}
              disabled={abandoning}
              className="rounded-none border border-red-600 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-none"
            >
              {abandoning ? <Loader2Icon className="animate-spin size-3.5" /> : <XIcon className="size-3.5" />}
              Abandon Attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

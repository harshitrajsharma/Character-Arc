"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  CalculatorIcon,
  CheckIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EraserIcon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  SendIcon,
  UserIcon,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  abandonAttemptAction,
  recordAnswerAction,
  submitAttemptAction,
} from "@/lib/tools/mock-tests/actions/attempt-actions"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { VirtualCalculator } from "./virtual-calculator"
import { InstructionsDialog } from "./instructions-dialog"
import { QuestionPaperDialog } from "./question-paper-dialog"
import type { PlayerAttempt } from "@/lib/tools/definitions/mock-tests/repository"

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
  const [activeSection, setActiveSection] = useState<string>("ALL")
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false)
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false)

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

  const sections = useMemo(() => {
    const set = new Set<string>()
    attempt.questions.forEach((q) => {
      if (q.section) set.add(q.section)
    })
    return Array.from(set)
  }, [attempt.questions])

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!attempt.durationMinutes) return null
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    return Math.max(0, Math.floor((end - Date.now()) / 1000))
  })

  const paletteStats = useMemo(() => {
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
    }
    setCurrent(index)
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

  async function startSubmit() {
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
  }

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
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          Boolean(target.closest('button, select, a, [role="radio"]')))
      ) {
        return
      }

      const isChoiceKind =
        currentQuestion?.kind === "SINGLE_CHOICE" ||
        currentQuestion?.kind === "MULTIPLE_CHOICE" ||
        currentQuestion?.kind === "TRUE_FALSE"

      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault()
        if (currentQuestion && isChoiceKind) {
          const opt = currentQuestion.options[Number(e.key) - 1]
          if (opt) toggleOption(opt.key, Date.now())
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleSaveAndNext(Date.now())
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        handleMarkForReviewAndNext(Date.now())
      } else if (e.key === "c" || e.key === "C") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handleClearResponse(Date.now())
        }
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        handlePrevious(Date.now())
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
  }, [attempt.durationMinutes, attempt.startedAt])

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

  const visibleQuestions = activeSection === "ALL"
    ? attempt.questions
    : attempt.questions.filter((q) => q.section === activeSection)

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground select-none overflow-hidden font-sans">
      {/* 1. TOP BRAND BANNER (Inspired by TCS iON / GATE Exam Portals) */}
      <div className="shrink-0 flex items-center justify-between border-b border-border bg-card px-4 py-1.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Mock Test Portal
          </span>
        </div>
        <div className="text-center">
          <h1 className="text-sm font-black tracking-tight text-primary uppercase">
            Mock Test Assessment
          </h1>
          <p className="text-[10px] font-semibold text-muted-foreground">
            Organizer : {attempt.organizerName || "Character Arc"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Loader2Icon className="size-3 animate-spin" /> Saving…
            </span>
          ) : saveStatus === "error" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-semibold">
              <AlertTriangleIcon className="size-3" /> Save Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2Icon className="size-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* 2. DARK SUB-HEADER WITH EXAM TITLE & QUICK MODAL BUTTONS */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-zinc-900 text-zinc-100 px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2.5 truncate max-w-xl">
          <span className="text-xs font-bold text-zinc-100 truncate">
            {attempt.assessmentTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setIsInstructionsOpen(true)}
            className="h-7 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 gap-1.5 px-2.5"
          >
            <InfoIcon className="size-3.5 text-cyan-400" />
            Instructions
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setIsQuestionPaperOpen(true)}
            className="h-7 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 gap-1.5 px-2.5"
          >
            <FileTextIcon className="size-3.5 text-emerald-400" />
            Question Paper
          </Button>
        </div>
      </div>

      {/* 3. SECTION TABS & TIMER HUD BAR */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        {/* Sections Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-foreground">Sections</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSection("ALL")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition-all border flex items-center gap-1.5",
                activeSection === "ALL"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              All Sections
              <InfoIcon className="size-3 opacity-70" />
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setActiveSection(sec)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-bold transition-all border flex items-center gap-1.5",
                  activeSection === sec
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {sec}
                <InfoIcon className="size-3 opacity-70" />
              </button>
            ))}
          </div>
        </div>

        {/* Timer & Virtual Calculator */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-1.5 font-mono text-sm font-black tabular-nums transition-colors",
              remainingSeconds !== null && remainingSeconds < 300
                ? "text-destructive animate-pulse"
                : remainingSeconds !== null && remainingSeconds < 900
                  ? "text-amber-500"
                  : "text-foreground"
            )}
          >
            <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
            <span>Time Left : {mounted ? (remainingSeconds !== null ? formatTimer(remainingSeconds) : "Untimed") : "--:--"}</span>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setIsCalculatorOpen((prev) => !prev)}
                  className="h-7 text-xs gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-2 font-bold"
                  aria-label="Virtual Scientific Calculator"
                >
                  <CalculatorIcon className="size-3.5" />
                  Calculator
                </Button>
              }
            />
            <TooltipContent>Open CBT Virtual Scientific Calculator</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 4. QUESTION TYPE & MARKS SUB-BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-border bg-muted/20 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            Question Type : <strong>{questionKindLabel(currentQuestion.kind)}</strong>
          </span>
          {currentQuestion.section ? (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
              {currentQuestion.section}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>
            Marks for correct answer: <strong className="text-emerald-600 dark:text-emerald-400">+{currentQuestion.marks}</strong>
          </span>
          <span className="text-muted-foreground">|</span>
          <span>
            Negative Marks: <strong className="text-rose-600 dark:text-rose-400">{currentQuestion.negativeMarks < 0 ? currentQuestion.negativeMarks : "0.00"}</strong>
          </span>
        </div>
      </div>

      {/* 5. MAIN SPLIT BODY: LEFT QUESTION CANVAS + RIGHT PALETTE SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Question Number & Content Canvas */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 bg-card/60">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {/* Question Heading */}
            <div className="border-b border-border/80 pb-2 flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-foreground">
                Question Number. {current + 1}
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {current + 1} of {attempt.questions.length}
              </span>
            </div>

            {/* Question Statement with KaTeX */}
            <div className="text-foreground text-sm sm:text-base leading-relaxed rich-text">
              <RichContent html={currentQuestion.stem} />
            </div>

            {/* Response Section */}
            <div className="pt-4 border-t border-border/60">
              {currentQuestion.kind === "SINGLE_CHOICE" ||
              currentQuestion.kind === "MULTIPLE_CHOICE" ||
              currentQuestion.kind === "TRUE_FALSE" ? (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    {currentQuestion.kind === "MULTIPLE_CHOICE"
                      ? "Select all correct options (MSQ):"
                      : "Select the correct option (MCQ):"}
                  </span>
                  <div className="grid gap-2">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answer.selectedKeys.includes(opt.key)
                      const isSingle = currentQuestion.kind === "SINGLE_CHOICE" || currentQuestion.kind === "TRUE_FALSE"

                      return (
                        <div
                          key={opt.key}
                          onClick={() => toggleOption(opt.key, Date.now())}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all text-sm",
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground shadow-xs ring-1 ring-primary/30"
                              : "border-border bg-card/90 text-foreground hover:bg-muted/40 hover:border-foreground/30"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center font-mono text-xs font-bold transition-all mt-0.5",
                              isSingle ? "rounded-full border" : "rounded border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/50 bg-background text-muted-foreground"
                            )}
                          >
                            {isSelected ? (
                              isSingle ? (
                                <div className="size-2 rounded-full bg-primary-foreground" />
                              ) : (
                                <CheckIcon className="size-3.5 stroke-[3]" />
                              )
                            ) : (
                              opt.key
                            )}
                          </div>
                          <div className="flex-1 leading-snug rich-text">
                            <span className="font-bold mr-2 text-muted-foreground font-mono">{opt.key}.</span>
                            <RichContent html={opt.content} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Numerical / Short Answer Input with On-Screen Keypad */
                <div className="space-y-4 max-w-md rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="space-y-1.5">
                    <label htmlFor="nat-input" className="text-xs font-bold text-foreground block">
                      Enter your numerical answer:
                    </label>
                    <input
                      id="nat-input"
                      type="text"
                      value={answer.answerText ?? ""}
                      onChange={(e) => handleAnswerTextChange(e.target.value, Date.now())}
                      placeholder="e.g. 42 or -3.14"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-base font-bold text-foreground shadow-2xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Virtual Numerical Keypad for NAT */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-xs">
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
                          "h-8 rounded-lg border font-bold transition-colors flex items-center justify-center",
                          k === "Clear" || k === "Backspace"
                            ? "bg-muted/80 text-muted-foreground border-border hover:bg-muted"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        )}
                      >
                        {k === "Backspace" ? "⌫" : k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Sidebar Toggle Tab Button */}
        <button
          type="button"
          onClick={() => setIsPaletteCollapsed((prev) => !prev)}
          className="absolute top-1/2 -translate-y-1/2 right-[280px] sm:right-[320px] z-30 flex h-14 w-4 items-center justify-center rounded-l-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 shadow-md border-y border-l border-zinc-700 transition-all data-[collapsed=true]:right-0"
          data-collapsed={isPaletteCollapsed}
          aria-label={isPaletteCollapsed ? "Show Question Palette" : "Hide Question Palette"}
        >
          {isPaletteCollapsed ? <ChevronLeftIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        </button>

        {/* Right Sidebar: Candidate Card & Question Palette Grid */}
        {!isPaletteCollapsed ? (
          <aside className="w-72 sm:w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">
            {/* Candidate Profile Box (TCS iON style) */}
            <div className="p-3 border-b border-border bg-muted/20 flex items-center gap-3">
              <div className="size-11 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground overflow-hidden shrink-0">
                {attempt.candidateAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attempt.candidateAvatarUrl}
                    alt={attempt.candidateName || "Candidate"}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Candidate
                </span>
                <h3 className="text-xs font-bold text-foreground truncate">
                  {attempt.candidateName || "Harshit Raj Sharma"}
                </h3>
              </div>
            </div>

            {/* Standard CBT Status Legend */}
            <div className="p-3 border-b border-border space-y-2 text-[11px]">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Legend
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Answered */}
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-sm bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {paletteStats.answered}
                  </span>
                  <span className="text-foreground leading-tight">Answered</span>
                </div>

                {/* 2. Not Answered */}
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-sm bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {paletteStats.notAnswered}
                  </span>
                  <span className="text-foreground leading-tight">Not Answered</span>
                </div>

                {/* 3. Not Visited */}
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-sm border border-border bg-muted/70 text-muted-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                    {paletteStats.notVisited}
                  </span>
                  <span className="text-foreground leading-tight">Not Visited</span>
                </div>

                {/* 4. Marked for Review */}
                <div className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-purple-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {paletteStats.markedForReview}
                  </span>
                  <span className="text-foreground leading-tight">Marked for Review</span>
                </div>

                {/* 5. Answered & Marked for Review */}
                <div className="col-span-2 flex items-center gap-2 pt-0.5">
                  <span className="relative size-5 rounded-full bg-purple-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:size-2 after:rounded-full after:bg-emerald-500 after:border after:border-card">
                    {paletteStats.answeredAndMarked}
                  </span>
                  <span className="text-foreground leading-tight">
                    Answered &amp; Marked for Review (will be evaluated)
                  </span>
                </div>
              </div>
            </div>

            {/* Active Section Header */}
            <div className="bg-primary/10 text-primary px-3 py-1.5 border-b border-border text-xs font-bold flex items-center justify-between">
              <span>{activeSection === "ALL" ? "All Questions" : `${activeSection} Section`}</span>
              <span className="text-[10px] font-mono font-normal">
                {visibleQuestions.length} Questions
              </span>
            </div>

            {/* Choose a Question Palette Grid */}
            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              <span className="text-[11px] font-bold text-foreground block">
                Choose a Question
              </span>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                {visibleQuestions.map((q) => {
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

                  // Status style calculation
                  let statusClass = "border border-border bg-muted/60 text-muted-foreground" // Not visited
                  let isAnsAndMarked = false

                  if (hasAns && isMrk) {
                    statusClass = "bg-purple-700 text-white rounded-full"
                    isAnsAndMarked = true
                  } else if (isMrk) {
                    statusClass = "bg-purple-700 text-white rounded-full"
                  } else if (hasAns) {
                    statusClass = "bg-emerald-600 text-white rounded-md"
                  } else if (isVis) {
                    statusClass = "bg-rose-600 text-white rounded-md"
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(actualIdx, Date.now())}
                      className={cn(
                        "relative flex size-9 items-center justify-center font-mono text-xs font-bold transition-all select-none shadow-2xs",
                        statusClass,
                        isCur && "ring-2 ring-primary ring-offset-2 scale-105 shadow-md"
                      )}
                    >
                      {actualIdx + 1}
                      {isAnsAndMarked ? (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {/* 6. FIXED BOTTOM ACTION BAR (CBT FOOTER) */}
      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-2.5 shadow-lg">
        {/* Left Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleMarkForReviewAndNext(Date.now())}
            disabled={submitting || abandoning}
            className="border-purple-600/40 text-purple-700 dark:text-purple-400 hover:bg-purple-600/10 font-semibold text-xs"
          >
            MARK FOR REVIEW &amp; NEXT
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClearResponse(Date.now())}
            disabled={submitting || abandoning}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <EraserIcon className="size-3.5" />
            CLEAR RESPONSE
          </Button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePrevious(Date.now())}
            disabled={current === 0 || submitting || abandoning}
            className="text-xs font-semibold"
          >
            PREVIOUS
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveAndNext(Date.now())}
            disabled={submitting || abandoning}
            className="bg-primary text-primary-foreground font-bold text-xs shadow-xs"
          >
            SAVE &amp; NEXT
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit(Date.now())}
            disabled={submitting || abandoning}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs ml-2"
          >
            {submitting ? <Loader2Icon className="animate-spin size-3.5" /> : <SendIcon className="size-3.5" />}
            SUBMIT
          </Button>
        </div>
      </footer>

      {/* CBT VIRTUAL CALCULATOR */}
      <VirtualCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

      {/* CBT INSTRUCTIONS DIALOG */}
      <InstructionsDialog
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        durationMinutes={attempt.durationMinutes}
        totalQuestions={attempt.questions.length}
        instructionsText={attempt.instructions}
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
        <DialogContent className="max-w-md border-border bg-card p-6 sm:rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <SendIcon className="size-5 text-primary" /> Confirm Exam Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you ready to submit your test? Once submitted, your answers will be evaluated immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Standard Evaluation Rule Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-foreground flex items-start gap-2">
            <InfoIcon className="size-4 shrink-0 text-primary mt-0.5" />
            <span>
              <strong>Evaluation Rule Notice:</strong> Questions marked for review with a selected answer <strong>will be evaluated</strong> towards your score (Standard GATE / CBT Rule).
            </span>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-muted-foreground">Total Questions:</span>
              <span className="font-mono font-bold text-foreground">{attempt.questions.length}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-emerald-600 font-semibold">Answered:</span>
              <span className="font-mono font-bold text-emerald-600">
                {paletteStats.answered + paletteStats.answeredAndMarked}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-rose-600 font-semibold">Not Answered:</span>
              <span className="font-mono font-bold text-rose-600">{paletteStats.notAnswered}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-purple-600 font-semibold">Marked for Review:</span>
              <span className="font-mono font-bold text-purple-600">{paletteStats.markedForReview}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Not Visited:</span>
              <span className="font-mono font-bold text-muted-foreground">{paletteStats.notVisited}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowSubmitModal(false)}>
              Continue Test
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="bg-primary text-primary-foreground font-bold"
            >
              {submitting ? <Loader2Icon className="animate-spin size-4" /> : null}
              Yes, Submit Test
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
        <AlertDialogContent size="sm" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <XIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Abandon this attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              This attempt will be marked abandoned. Your answers will not be graded and no score will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={abandoning}>Keep Testing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmAbandon}
              disabled={abandoning}
            >
              {abandoning ? <Loader2Icon className="animate-spin size-4" /> : <XIcon className="size-4" />}
              Abandon Attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

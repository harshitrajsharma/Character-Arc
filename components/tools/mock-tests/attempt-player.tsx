"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  BookmarkIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EraserIcon,
  ListFilterIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Maximize2Icon,
  Minimize2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  KeyboardIcon,
  InfoIcon,
  Loader2Icon,
  SendIcon,
  UserIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { now } from "@/lib/tools/mock-tests/clock"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { PlayerAttempt } from "@/lib/tools/definitions/mock-tests/repository"

type AnswerState = {
  selectedKeys: string[]
  answerText: string | null
  isMarkedForReview: boolean
  visited: boolean
}

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

export function AttemptPlayer({
  workspaceSlug,
  attempt,
}: {
  workspaceSlug: string
  attempt: PlayerAttempt
}) {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
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
  const [activeSection, setActiveSection] = useState<string>("ALL")
  const submitStarted = useRef(false)
  const questionStartedAt = useRef<Record<string, number>>({})
  const questionTimeSpent = useRef<Record<string, number>>({})

  const currentQuestion = attempt.questions[current]

  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [paletteFilter, setPaletteFilter] = useState<"ALL" | "ANSWERED" | "UNANSWERED" | "REVIEW">("ALL")
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false)

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Keyboard Shortcuts for Authentic CBT Exam Room (1-4, Enter, M, C)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (showSubmitModal) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }

      if (e.key === "1" || e.key === "a" || e.key === "A") {
        e.preventDefault()
        if (currentQuestion && (currentQuestion.kind === "SINGLE_CHOICE" || currentQuestion.kind === "MULTIPLE_CHOICE" || currentQuestion.kind === "TRUE_FALSE")) {
          if (currentQuestion.options[0]) toggleOption(currentQuestion.options[0].key, Date.now())
        }
      } else if (e.key === "2" || e.key === "b" || e.key === "B") {
        e.preventDefault()
        if (currentQuestion && (currentQuestion.kind === "SINGLE_CHOICE" || currentQuestion.kind === "MULTIPLE_CHOICE" || currentQuestion.kind === "TRUE_FALSE")) {
          if (currentQuestion.options[1]) toggleOption(currentQuestion.options[1].key, Date.now())
        }
      } else if (e.key === "3" || e.key === "c" || e.key === "C") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (currentQuestion && (currentQuestion.kind === "SINGLE_CHOICE" || currentQuestion.kind === "MULTIPLE_CHOICE" || currentQuestion.kind === "TRUE_FALSE")) {
            if (currentQuestion.options[2]) toggleOption(currentQuestion.options[2].key, Date.now())
          }
        }
      } else if (e.key === "4" || e.key === "d" || e.key === "D") {
        e.preventDefault()
        if (currentQuestion && (currentQuestion.kind === "SINGLE_CHOICE" || currentQuestion.kind === "MULTIPLE_CHOICE" || currentQuestion.kind === "TRUE_FALSE")) {
          if (currentQuestion.options[3]) toggleOption(currentQuestion.options[3].key, Date.now())
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleSaveAndNext(Date.now())
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        handleMarkForReviewAndNext(Date.now())
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [currentQuestion, current, answers, showSubmitModal])


  // Distinct Sections list
  const sections = useMemo(() => {
    const set = new Set<string>()
    attempt.questions.forEach((q) => {
      if (q.section) set.add(q.section)
    })
    return Array.from(set)
  }, [attempt.questions])

  // Remaining time for timed tests
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!attempt.durationMinutes) return null
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    return Math.max(0, Math.floor((end - Date.now()) / 1000))
  })

  // NTA / GATE Standard Palette Status counts
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
    void recordAnswerAction({
      workspaceSlug,
      attemptId: attempt.attemptId,
      questionId,
      selectedOptionKeys: merged.selectedKeys,
      answerText: merged.answerText,
      timeSpentSeconds: questionTimeSpent.current[questionId] ?? 0,
      idempotencyKey: createIdempotencyKey(),
    }).catch(() => {
      // Best-effort persistence
    })
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

  function navigateTo(index: number, now: number) {
    if (index < 0 || index >= attempt.questions.length || index === current) return
    spendTime(currentQuestion.id, now)
    const targetQ = attempt.questions[index]
    if (targetQ) {
      setAnswers((prev) => ({
        ...prev,
        [targetQ.id]: {
          ...(prev[targetQ.id] ?? { selectedKeys: [], answerText: null, isMarkedForReview: false }),
          visited: true,
        },
      }))
    }
    setCurrent(index)
  }

  function handleSaveAndNext(now: number) {
    if (current < attempt.questions.length - 1) {
      navigateTo(current + 1, now)
    }
  }

  function handleMarkForReviewAndNext(now: number) {
    const question = currentQuestion
    if (!question) return
    const currentMarked = answers[question.id]?.isMarkedForReview ?? false
    persistAnswer(question.id, { isMarkedForReview: !currentMarked }, now)
    if (current < attempt.questions.length - 1) {
      navigateTo(current + 1, now)
    }
  }

  function handleClearResponse(now: number) {
    const question = currentQuestion
    if (!question) return
    persistAnswer(question.id, { selectedKeys: [], answerText: null, isMarkedForReview: false }, now)
    toast.info("Response cleared")
  }

  function handleSubmit(now: number) {
    if (submitStarted.current) return
    if (currentQuestion) spendTime(currentQuestion.id, now)
    setShowSubmitModal(true)
  }

  function handleConfirmSubmit() {
    if (submitStarted.current) return
    setShowSubmitModal(false)
    submitStarted.current = true
    setSubmitting(true)
    startSubmit()
  }

  function handleTextAnswerChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    persistAnswer(
      currentQuestion.id,
      { answerText: event.target.value },
      now()
    )
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
        error instanceof Error ? error.message : "Failed to submit the test."
      toast.error("Error", { description: message })
    }
  }

  async function handleAbandon() {
    if (submitStarted.current) return
    const confirmed = window.confirm(
      "Are you sure you want to abandon this test? This action cannot be undone and your test will not be graded."
    )
    if (!confirmed) return

    submitStarted.current = true
    setAbandoning(true)
    try {
      await abandonAttemptAction({
        workspaceSlug,
        attemptId: attempt.attemptId,
        idempotencyKey: createIdempotencyKey(),
      })
      router.push(workspaceRoutes.mockTests.detail(workspaceSlug, attempt.assessmentId))
    } catch (error) {
      submitStarted.current = false
      setAbandoning(false)
      const message =
        error instanceof Error ? error.message : "Failed to abandon the test."
      toast.error("Error", { description: message })
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitStarted.current && remainingSeconds !== 0) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [remainingSeconds])

  useEffect(() => {
    if (!attempt.durationMinutes) return
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
        if (!submitStarted.current) {
          submitStarted.current = true
          setSubmitting(true)
          void startSubmit()
        }
      }
    }, 1000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.durationMinutes, attempt.startedAt])

  if (!currentQuestion) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
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
    <div className="space-y-3 font-sans antialiased text-foreground">
      {/* Official CBT Exam Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">
            CBT
          </div>
          <div>
            <h1 className="font-heading text-base font-bold tracking-tight text-foreground leading-snug">
              {attempt.assessmentTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Standard Computer-Based Test Engine
            </p>
          </div>
        </div>

        {/* Timer Badge */}
        {remainingSeconds !== null ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-sm font-bold tabular-nums shadow-2xs transition-colors",
              remainingSeconds < 300
                ? "border-destructive/60 bg-destructive/10 text-destructive animate-pulse"
                : remainingSeconds < 900
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-border bg-muted/40 text-foreground"
            )}
          >
            <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>Time Left: {mounted ? formatTimer(remainingSeconds) : "--:--:--"}</span>
          </div>
        ) : (
          <Badge variant="outline" className="font-mono text-xs px-3 py-1">
            Untimed Practice Mode
          </Badge>
        )}

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleAbandon}
            disabled={submitting || abandoning}
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            {abandoning ? <Loader2Icon className="animate-spin size-3.5" /> : <XIcon className="size-3.5" />}
            Abandon
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(Date.now())}
            disabled={submitting || abandoning}
            size="sm"
            className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow-xs"
          >
            {submitting ? <Loader2Icon className="animate-spin size-3.5" /> : <SendIcon className="size-3.5" />}
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Section Tabs Bar (NTA / GATE Style) */}
      {sections.length > 0 ? (
        <nav className="shrink-0 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 text-xs shadow-2xs">
          <span className="px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
            Sections:
          </span>
          <button
            type="button"
            onClick={() => setActiveSection("ALL")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeSection === "ALL"
                ? "bg-slate-800 text-slate-200 font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            All Questions ({attempt.questions.length})
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSection(sec)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                activeSection === sec
                  ? "bg-slate-800 text-slate-200 font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {sec}
            </button>
          ))}
        </nav>
      ) : null}

      {/* CBT Layout: Left Panel (75%) + Right Question Palette (25%) */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Left Column: Question Area */}
        <div className="space-y-3">
          <article className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            {/* Question Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Question No. {current + 1}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <Badge variant="outline" className="text-xs font-medium">
                  {questionKindLabel(currentQuestion.kind)}
                </Badge>
                {currentQuestion.section ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {currentQuestion.section}
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{currentQuestion.marks} Marks
                </span>
                {currentQuestion.negativeMarks < 0 ? (
                  <span className="font-bold text-destructive">
                    {currentQuestion.negativeMarks} Negative
                  </span>
                ) : null}
              </div>
            </div>

            {/* Question Prompt with LaTeX KaTeX Rendering */}
            <RichContent
              html={currentQuestion.stem}
              className="text-base leading-relaxed text-foreground min-h-[80px]"
            />

            {/* Answer Response Area */}
            <div className="pt-2">
              {currentQuestion.kind === "NUMERIC" ||
              currentQuestion.kind === "SHORT_ANSWER" ? (
                <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                  <label htmlFor="cbt-text-input" className="text-xs font-semibold text-foreground block">
                    {currentQuestion.kind === "NUMERIC"
                      ? "Enter your numerical answer:"
                      : "Type your model answer:"}
                  </label>
                  <input
                    id="cbt-text-input"
                    type={currentQuestion.kind === "NUMERIC" ? "number" : "text"}
                    inputMode={currentQuestion.kind === "NUMERIC" ? "decimal" : "text"}
                    step="any"
                    value={answer.answerText ?? ""}
                    onChange={handleTextAnswerChange}
                    placeholder={
                      currentQuestion.kind === "NUMERIC"
                        ? "e.g., 42.5"
                        : "Type answer..."
                    }
                    className="w-full max-w-sm rounded-lg border border-input bg-background px-3.5 py-2 text-sm font-mono outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your response is auto-saved as you type.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {currentQuestion.options.map((option) => {
                    const selected = answer.selectedKeys.includes(option.key)
                    return (
                      <li key={option.key}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleOption(option.key, Date.now())}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              toggleOption(option.key, Date.now())
                            }
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition-all outline-none shadow-2xs select-none",
                            selected
                              ? "border-emerald-500/80 bg-emerald-500/10 ring-2 ring-emerald-500/30 text-foreground"
                              : "border-border/80 bg-background hover:border-border hover:bg-muted/30 text-foreground"
                          )}
                          aria-pressed={selected}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors",
                              selected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {selected ? (
                              <CheckCircle2Icon className="size-3.5 stroke-[3]" />
                            ) : (
                              option.key
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <RichContent html={option.content} className="leading-relaxed" />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </article>

          {/* Standard CBT Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMarkForReviewAndNext(Date.now())}
                className={cn(
                  "h-9 text-xs gap-1.5 font-medium border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10",
                  answer.isMarkedForReview && "bg-purple-600 text-white hover:bg-purple-600/90"
                )}
              >
                <BookmarkIcon className="size-3.5" />
                {answer.isMarkedForReview ? "Marked for Review" : "Mark for Review & Next"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleClearResponse(Date.now())}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <EraserIcon className="size-3.5" />
                Clear Response
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => navigateTo(current - 1, Date.now())}
                className="h-9 text-xs gap-1"
              >
                <ChevronLeftIcon className="size-3.5" />
                Previous
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveAndNext(Date.now())}
                disabled={current === attempt.questions.length - 1}
                className="h-9 text-xs gap-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Save & Next
                <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: CBT Question Palette & Candidate Panel */}
        <aside className={cn("space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs self-start overflow-y-auto max-h-full transition-all", isPaletteCollapsed && "hidden")}>
          {/* Candidate Badge */}
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground border">
              <UserIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">Student Candidate</p>
              <p className="text-[11px] text-muted-foreground truncate">Attempt #{attempt.attemptId.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ListFilterIcon className="size-3.5 text-slate-200" /> Question Palette
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                {attempt.questions.length} Qs
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsPaletteCollapsed(true)}
                title="Hide Palette (Expand Question Width)"
                aria-label="Hide Palette"
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <PanelRightCloseIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Official NTA / GATE Color Code Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] border-y border-border py-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {paletteStats.answered}
              </span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-4 rounded bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {paletteStats.notAnswered}
              </span>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-4 rounded bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {paletteStats.markedForReview}
              </span>
              <span>Marked Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-4 rounded border border-border bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                {paletteStats.notVisited}
              </span>
              <span>Not Visited</span>
            </div>
          </div>


          {/* Palette Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => setPaletteFilter("ALL")}
              className={cn("px-2 py-0.5 rounded transition-colors", paletteFilter === "ALL" ? "bg-slate-800 text-white font-bold" : "text-muted-foreground hover:text-foreground")}
            >
              All ({attempt.questions.length})
            </button>
            <button
              type="button"
              onClick={() => setPaletteFilter("ANSWERED")}
              className={cn("px-2 py-0.5 rounded transition-colors", paletteFilter === "ANSWERED" ? "bg-emerald-600 text-white font-bold" : "text-muted-foreground hover:text-emerald-600")}
            >
              Answered ({paletteStats.answered + paletteStats.answeredAndMarked})
            </button>
            <button
              type="button"
              onClick={() => setPaletteFilter("REVIEW")}
              className={cn("px-2 py-0.5 rounded transition-colors", paletteFilter === "REVIEW" ? "bg-purple-600 text-white font-bold" : "text-muted-foreground hover:text-purple-600")}
            >
              Review ({paletteStats.markedForReview})
            </button>
            <button
              type="button"
              onClick={() => setPaletteFilter("UNANSWERED")}
              className={cn("px-2 py-0.5 rounded transition-colors", paletteFilter === "UNANSWERED" ? "bg-rose-500 text-white font-bold" : "text-muted-foreground hover:text-rose-500")}
            >
              Unanswered ({paletteStats.notAnswered})
            </button>
          </div>

          {/* 5-Column Question Grid Matrix */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {visibleQuestions.filter((q) => {
    const st = answers[q.id]
    const hasAns = st && (q.kind === "SHORT_ANSWER" || q.kind === "NUMERIC" ? Boolean(st.answerText && st.answerText.trim() !== "") : st.selectedKeys.length > 0)
    const isMrk = st?.isMarkedForReview ?? false
    if (paletteFilter === "ANSWERED") return hasAns
    if (paletteFilter === "REVIEW") return isMrk
    if (paletteFilter === "UNANSWERED") return !hasAns && (st?.visited ?? false)
    return true
  }).map((q) => {
              const actualIndex = attempt.questions.findIndex((item) => item.id === q.id)
              const st = answers[q.id]
              const isCurrent = actualIndex === current
              const hasAnswer =
                st &&
                (q.kind === "SHORT_ANSWER" || q.kind === "NUMERIC"
                  ? Boolean(st.answerText && st.answerText.trim() !== "")
                  : st.selectedKeys.length > 0)
              const isMarked = st?.isMarkedForReview ?? false
              const isVisited = st?.visited ?? false

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => navigateTo(actualIndex, Date.now())}
                  aria-label={`Go to question ${actualIndex + 1}`}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all shadow-2xs select-none",
                    isCurrent && "ring-2 ring-slate-400 ring-offset-2 ring-offset-background",
                    hasAnswer && isMarked
                      ? "bg-purple-700 text-white border border-purple-800 after:content-[''] after:absolute after:bottom-0.5 after:right-0.5 after:size-1.5 after:rounded-full after:bg-emerald-400"
                      : isMarked
                        ? "bg-purple-600 text-white border border-purple-700"
                        : hasAnswer
                          ? "bg-emerald-600 text-white border border-emerald-700"
                          : isVisited
                            ? "bg-rose-500 text-white border border-rose-600"
                            : "bg-background text-muted-foreground border border-border hover:border-foreground/40"
                  )}
                >
                  {actualIndex + 1}
                </button>
              )
            })}
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Answered: {paletteStats.answered + paletteStats.answeredAndMarked}/{attempt.questions.length}</span>
            </div>
            <Button
              type="button"
              onClick={() => handleSubmit(Date.now())}
              className="w-full h-9 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-xs"
            >
              <SendIcon className="size-3.5 mr-1" />
              Submit Exam
            </Button>
          </div>
        </aside>
      </div>

      {/* CBT Submit Confirmation Dialog */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-md border-border bg-card p-6 sm:rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <SendIcon className="size-5 text-slate-200" /> Confirm Exam Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you ready to submit your test? Once submitted, your answers will be evaluated immediately.
            </DialogDescription>
          </DialogHeader>


          {/* NTA / GATE Evaluation Rule Notice */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-[11px] text-foreground flex items-start gap-2">
            <InfoIcon className="size-4 shrink-0 text-indigo-500 mt-0.5" />
            <span>
              <strong>Evaluation Rule Notice:</strong> Questions marked for review with a selected answer <strong>will be evaluated</strong> towards your final score (Standard NTA/GATE CBT Rule).
            </span>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-muted-foreground">Total Questions:</span>
              <span className="font-mono font-bold text-foreground">{attempt.questions.length}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Answered:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {paletteStats.answered + paletteStats.answeredAndMarked}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/70">
              <span className="text-rose-500 font-semibold">Not Answered:</span>
              <span className="font-mono font-bold text-rose-500">{paletteStats.notAnswered}</span>
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
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold"
            >
              {submitting ? <Loader2Icon className="animate-spin size-4" /> : null}
              Yes, Submit Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


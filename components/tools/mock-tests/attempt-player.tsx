"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  recordAnswerAction,
  submitAttemptAction,
} from "@/lib/tools/mock-tests/actions/attempt-actions"
import { now } from "@/lib/tools/mock-tests/clock"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { PlayerAttempt } from "@/lib/tools/definitions/mock-tests/repository"

type Answer = {
  selectedKeys: string[]
  answerText: string | null
}

function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function AttemptPlayer({
  workspaceSlug,
  attempt,
}: {
  workspaceSlug: string
  attempt: PlayerAttempt
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const initial: Record<string, Answer> = {}
    for (const question of attempt.questions) {
      initial[question.id] = {
        selectedKeys: question.selectedKeys,
        answerText: question.answerText,
      }
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const submitStarted = useRef(false)
  const questionStartedAt = useRef<Record<string, number>>({})
  const questionTimeSpent = useRef<Record<string, number>>({})

  const currentQuestion = attempt.questions[current]

  // Remaining time for timed tests
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!attempt.durationMinutes) return null
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    return Math.max(0, Math.floor((end - Date.now()) / 1000))
  })

  const answeredCount = useMemo(
    () =>
      attempt.questions.filter((question) => {
        const answer = answers[question.id]
        if (!answer) return false
        if (question.kind === "SHORT_ANSWER" || question.kind === "NUMERIC") {
          return answer.answerText !== null && answer.answerText.trim() !== ""
        }
        return answer.selectedKeys.length > 0
      }).length,
    [answers, attempt.questions]
  )

  function spendTime(questionId: string, now: number) {
    const started = questionStartedAt.current[questionId] ?? now
    const elapsed = Math.max(0, Math.floor((now - started) / 1000))
    questionTimeSpent.current[questionId] =
      (questionTimeSpent.current[questionId] ?? 0) + elapsed
    questionStartedAt.current[questionId] = now
  }

  function persistAnswer(
    questionId: string,
    patch: { selectedKeys?: string[]; answerText?: string | null },
    now: number
  ) {
    spendTime(questionId, now)
    const merged: Answer = {
      ...answers[questionId],
      ...patch,
      selectedKeys: patch.selectedKeys ?? answers[questionId]?.selectedKeys ?? [],
      answerText: patch.answerText !== undefined ? patch.answerText : answers[questionId]?.answerText ?? null,
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
      // Best-effort persistence; the answer stays in local state.
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
    setCurrent(index)
  }

  function handleSubmit(now: number) {
    if (submitStarted.current) return
    submitStarted.current = true
    setSubmitting(true)

    // Record time spent on the current question before submitting.
    if (currentQuestion) spendTime(currentQuestion.id, now)

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

  useEffect(() => {
    if (!attempt.durationMinutes) return
    const end = new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60_000
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
        void handleSubmit(Date.now())
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
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-semibold">
            {attempt.assessmentTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            Question {current + 1} of {attempt.questions.length}
          </p>
        </div>
        {remainingSeconds !== null ? (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums",
              remainingSeconds < 60
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-muted/50 text-foreground"
            )}
          >
            <ClockIcon className="size-4" aria-hidden="true" />
            {formatTimer(remainingSeconds)}
          </div>
        ) : (
          <Badge variant="outline">Untimed</Badge>
        )}
        <Button onClick={() => handleSubmit(Date.now())} disabled={submitting} variant="outline">
          {submitting ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <SendIcon data-icon="inline-start" aria-hidden="true" />
          )}
          Submit
        </Button>
      </div>

      {/* Question card */}
      <article className="rounded-lg border bg-card p-5 sm:p-6">
        {currentQuestion.section ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {currentQuestion.section}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {questionKindLabel(currentQuestion.kind)}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {currentQuestion.marks} marks
            {currentQuestion.negativeMarks < 0
              ? ` · -${Math.abs(currentQuestion.negativeMarks)} negative`
              : ""}
          </span>
        </div>
        <RichContent
          html={currentQuestion.stem}
          className="mt-3 text-base leading-7"
        />

        <div className="mt-6">
          {currentQuestion.kind === "NUMERIC" ||
          currentQuestion.kind === "SHORT_ANSWER" ? (
            <input
              type={currentQuestion.kind === "NUMERIC" ? "number" : "text"}
              inputMode={currentQuestion.kind === "NUMERIC" ? "decimal" : "text"}
              step="any"
              value={answer.answerText ?? ""}
              onChange={handleTextAnswerChange}
              placeholder={
                currentQuestion.kind === "NUMERIC"
                  ? "Type your numeric answer…"
                  : "Type your answer…"
              }
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
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
                        "flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-card px-4 py-3 text-left text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40 shadow-xs",
                        selected
                          ? "border-brand-violet-line/80 bg-brand-violet-soft/40 ring-2 ring-brand-violet-line/30 text-foreground"
                          : "border-border/80 hover:border-border hover:bg-muted/40 text-foreground"
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors",
                          selected
                            ? "border-brand-violet-ink bg-brand-violet-ink text-white"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {selected ? (
                          <CheckCircle2Icon
                            className="size-4"
                            aria-hidden="true"
                          />
                        ) : (
                          option.key
                        )}
                      </span>
                      <RichContent
                        html={option.content}
                        className="min-w-0 flex-1 leading-6"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </article>

      {/* Navigator + prev/next */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={current === 0}
          onClick={() => navigateTo(current - 1, Date.now())}
        >
          <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
          Previous
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {attempt.questions.map((question, index) => {
            const questionAnswer = answers[question.id]
            const isAnswered =
              questionAnswer !== undefined &&
              (question.kind === "NUMERIC" || question.kind === "SHORT_ANSWER"
                ? Boolean(
                    questionAnswer.answerText &&
                      questionAnswer.answerText.trim() !== ""
                  )
                : questionAnswer.selectedKeys.length > 0)
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => navigateTo(index, Date.now())}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors",
                  index === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : isAnswered
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={current === attempt.questions.length - 1}
          onClick={() => navigateTo(current + 1, Date.now())}
        >
          Next
          <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <AlertTriangleIcon className="size-4" aria-hidden="true" />
          You&apos;ve answered {answeredCount} of {attempt.questions.length}.
          Unanswered questions are marked incorrect on submit.
        </span>
        <Button onClick={() => handleSubmit(Date.now())} disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <SendIcon data-icon="inline-start" aria-hidden="true" />
          )}
          Submit test
        </Button>
      </div>
    </div>
  )
}

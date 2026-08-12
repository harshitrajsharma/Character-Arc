import Link from "next/link"
import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  SettingsIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ExamCountdownProps = {
  workspaceSlug: string
  examId: string
  expectedStartDate: string | null
  officialStartAt: string | null
  scheduleStatus:
    | "expected"
    | "announced"
    | "confirmed"
    | "postponed"
    | "cancelled"
  settingsHref?: string
}

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

type CountdownView = "clock" | "weeks"

const DAY_MS = 24 * 60 * 60 * 1_000
const COUNTDOWN_VIEW_STORAGE_KEY = "character-arc:exam-prep:countdown-view"
const COUNTDOWN_VIEW_CHANGE_EVENT = "character-arc:exam-prep:countdown-view"

function getExamStart(examDate: string): Date | null {
  const parts = examDate.split("-").map(Number)

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part)) ||
    parts[0] < 1 ||
    parts[1] < 1 ||
    parts[1] > 12 ||
    parts[2] < 1 ||
    parts[2] > 31
  ) {
    return null
  }

  const [year, month, day] = parts
  const target = new Date(year, month - 1, day)

  return target.getFullYear() === year &&
    target.getMonth() === month - 1 &&
    target.getDate() === day
    ? target
    : null
}

function getOfficialStart(officialStartAt: string | null): Date | null {
  if (!officialStartAt) return null
  const date = new Date(officialStartAt)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTimeLeft(target: Date): TimeLeft {
  const difference = target.getTime() - Date.now()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  return {
    days: Math.floor(difference / DAY_MS),
    hours: Math.floor((difference % DAY_MS) / (60 * 60 * 1_000)),
    minutes: Math.floor((difference % (60 * 60 * 1_000)) / (60 * 1_000)),
    seconds: Math.floor((difference % (60 * 1_000)) / 1_000),
    expired: false,
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function getStoredCountdownView(): CountdownView {
  if (typeof window === "undefined") return "clock"

  return window.localStorage.getItem(COUNTDOWN_VIEW_STORAGE_KEY) === "weeks"
    ? "weeks"
    : "clock"
}

function subscribeToCountdownView(onStoreChange: () => void) {
  window.addEventListener(COUNTDOWN_VIEW_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(COUNTDOWN_VIEW_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function getServerCountdownView(): CountdownView {
  return "clock"
}

function saveCountdownView(view: CountdownView) {
  window.localStorage.setItem(COUNTDOWN_VIEW_STORAGE_KEY, view)
  window.dispatchEvent(new Event(COUNTDOWN_VIEW_CHANGE_EVENT))
}

function CountdownPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-xs text-center font-mono text-2xl font-bold tracking-tight text-muted-foreground/30 sm:max-w-sm sm:text-3xl lg:mx-0 lg:w-auto lg:max-w-none lg:text-right lg:text-4xl"
    >
      --d : --h : --m
    </div>
  )
}

function CountdownSettingsButton({
  settingsHref,
  className,
}: {
  settingsHref: string
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            render={<Link href={settingsHref} />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Open exam settings"
            className={className}
          />
        }
      >
        <SettingsIcon aria-hidden="true" className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">Open exam settings</TooltipContent>
    </Tooltip>
  )
}

function CountdownToolbar({
  view,
  settingsHref,
}: {
  view: CountdownView
  settingsHref?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Segmented Pill Toggle Switch */}
      <div className="inline-flex items-center rounded-xl border border-border/50 bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => saveCountdownView("clock")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-1.5",
            view === "clock"
              ? "bg-background font-semibold text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TimerIcon className="size-3.5" aria-hidden="true" />
          <span>Clock</span>
        </button>
        <button
          type="button"
          onClick={() => saveCountdownView("weeks")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-1.5",
            view === "weeks"
              ? "bg-background font-semibold text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
          <span>Weeks</span>
        </button>
      </div>

      {settingsHref ? (
        <>
          <CountdownSettingsButton
            settingsHref={settingsHref}
            className="size-8 rounded-xl border border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground sm:size-9"
          />
        </>
      ) : null}
    </div>
  )
}

function CountdownDisplay({
  value,
  view,
  settingsHref,
}: {
  value: ReactNode
  view: CountdownView
  settingsHref?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      {/* 1. Time Remaining Header */}
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Time Remaining
      </span>

      {/* 2. Hero Countdown Digits */}
      <div aria-hidden="true" className="w-full lg:w-auto">
        {value}
      </div>

      {/* 3. Horizontal Pill Toggle & Settings Row */}
      <div className="pt-0.5">
        <CountdownToolbar view={view} settingsHref={settingsHref} />
      </div>
    </div>
  )
}

function CountdownValue({
  timeLeft,
  view,
}: {
  timeLeft: TimeLeft
  view: CountdownView
}) {
  if (view === "weeks") {
    const weeks = Math.floor(timeLeft.days / 7)
    const remainingDays = timeLeft.days % 7

    return (
      <div className="mx-auto flex w-full items-baseline justify-between gap-1 font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums max-w-xs sm:max-w-sm sm:text-3xl lg:mx-0 lg:w-auto lg:max-w-none lg:justify-end lg:gap-0 lg:text-4xl">
        <span className="inline-flex items-baseline">
          <span>{weeks}</span>
          <span className="ml-0.5 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:text-sm lg:text-base">
            w
          </span>
        </span>
        <span className="font-sans font-normal text-muted-foreground/40 lg:mx-2">
          {"·"}
        </span>
        <span className="inline-flex items-baseline">
          <span>{remainingDays}</span>
          <span className="ml-0.5 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:text-sm lg:text-base">
            d
          </span>
        </span>
      </div>
    )
  }

  const isFinalDay = timeLeft.days === 0
  const clockParts = isFinalDay
    ? [
        {
          unit: "h",
          value: pad(timeLeft.days * 24 + timeLeft.hours),
        },
        { unit: "m", value: pad(timeLeft.minutes) },
        { unit: "s", value: pad(timeLeft.seconds) },
      ]
    : [
        { unit: "d", value: String(timeLeft.days) },
        { unit: "h", value: pad(timeLeft.hours) },
        { unit: "m", value: pad(timeLeft.minutes) },
      ]

  return (
    <div className="mx-auto flex w-full items-baseline justify-between gap-1 font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums max-w-xs sm:max-w-sm sm:text-3xl lg:mx-0 lg:w-auto lg:max-w-none lg:justify-end lg:gap-0 lg:text-4xl">
      {clockParts.map((part, index) => (
        <Fragment key={part.unit}>
          <span className="inline-flex items-baseline">
            <span>{part.value}</span>
            <span className="ml-0.5 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:text-sm lg:text-base">
              {part.unit}
            </span>
          </span>
          {index < clockParts.length - 1 ? (
            <span className="font-sans font-normal text-muted-foreground/40 lg:mx-2">
              :
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

export function ExamCountdown({
  workspaceSlug,
  examId,
  expectedStartDate,
  officialStartAt,
  scheduleStatus,
  settingsHref,
}: ExamCountdownProps) {
  const target = useMemo(() => {
    const officialTarget = getOfficialStart(officialStartAt)

    return {
      date:
        officialTarget ??
        (expectedStartDate ? getExamStart(expectedStartDate) : null),
      hasActualDate: scheduleStatus === "confirmed" || Boolean(officialTarget),
      dateTime: officialTarget ? officialStartAt : expectedStartDate,
    }
  }, [expectedStartDate, officialStartAt, scheduleStatus])
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const view = useSyncExternalStore(
    subscribeToCountdownView,
    getStoredCountdownView,
    getServerCountdownView
  )

  useEffect(() => {
    const targetDate = target.date
    if (!targetDate) return

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      setTimeLeft(getTimeLeft(targetDate))
      const delay = view === "clock" ? 1_000 - (Date.now() % 1_000) : 60_000
      timeoutId = setTimeout(tick, delay)
    }

    tick()
    return () => clearTimeout(timeoutId)
  }, [target, view])

  if (scheduleStatus === "cancelled") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarPlusIcon
            className="size-4 shrink-0 text-brand-violet-ink"
            aria-hidden="true"
          />
          <span>Exam schedule cancelled</span>
        </div>
        {settingsHref ? (
          <CountdownSettingsButton
            settingsHref={settingsHref}
            className="size-8 border border-border/60 bg-background hover:bg-muted"
          />
        ) : null}
      </div>
    )
  }

  const targetDate = target.date

  if (!targetDate) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarPlusIcon
            className="size-4 shrink-0 text-brand-violet-ink"
            aria-hidden="true"
          />
          <span>No exam date set</span>
        </div>
        {settingsHref ? (
          <CountdownSettingsButton
            settingsHref={settingsHref}
            className="size-8 border border-border/60 bg-background hover:bg-muted"
          />
        ) : null}
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className="w-full">
        <CountdownDisplay
          value={<CountdownPlaceholder />}
          view={view}
          settingsHref={settingsHref}
        />
      </div>
    )
  }

  if (timeLeft.expired) {
    return (
      <div className="space-y-1.5 lg:text-right">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
          <TrophyIcon className="size-4 text-emerald-500" aria-hidden="true" />
          <span className="font-semibold text-foreground">
            Exam day reached
          </span>
        </div>
      </div>
    )
  }

  return (
    <section
      className="w-full min-w-0"
      aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, and ${timeLeft.seconds} seconds until the exam`}
    >
      <CountdownDisplay
        value={<CountdownValue timeLeft={timeLeft} view={view} />}
        view={view}
        settingsHref={settingsHref}
      />
    </section>
  )
}

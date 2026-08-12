"use client"

import React from "react"
import Link from "next/link"
import {
  CalendarDaysIcon,
  Clock3Icon,
  ExternalLinkIcon,
  FileTextIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MinusCircleIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ExamDetailHeaderData } from "./exam-detail-types"
import { cn } from "@/lib/utils"

type ExamDetailsDialogContentProps = {
  exam: ExamDetailHeaderData
  settingsHref: string
}

function parseDateOnly(value: string | null) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatExamDate(value: string | null) {
  const date = parseDateOnly(value)
  if (!date) return null

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatExamDateTime(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder} min`
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function formatMark(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatScoringMark(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))

  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

function formatScoringRules(rules: ExamDetailHeaderData["scoringRules"]) {
  const correct = toOptionalNumber(rules?.correctMarks)
  const incorrect = toOptionalNumber(rules?.incorrectMarks)
  const unanswered = toOptionalNumber(rules?.unansweredMarks)
  const details = [
    correct !== null ? `${formatScoringMark(correct)} correct` : null,
    incorrect !== null ? `${formatScoringMark(incorrect)} incorrect` : null,
    unanswered !== null ? `${formatScoringMark(unanswered)} unanswered` : null,
  ].filter(Boolean)

  return details.length ? details : null
}

function DetailItem({
  icon: Icon,
  label,
  value,
  span,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  span?: boolean
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3 bg-card p-3.5", span && "sm:col-span-2")}>
      <Icon
        className="mt-0.5 size-4 shrink-0 text-brand-violet-ink"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm font-semibold break-words text-foreground">
          {value}
        </dd>
      </div>
    </div>
  )
}

export function ExamDetailsDialogContent({
  exam,
  settingsHref,
}: ExamDetailsDialogContentProps) {
  const expectedStartDate = formatExamDate(exam.expectedStartDate)
  const officialStartAt = formatExamDateTime(exam.officialStartAt)
  const duration = formatDuration(exam.durationMinutes)
  const totalMarks = formatMark(exam.totalMarks)
  const targetMarks = formatMark(exam.targetMarks)
  const scoringRules = formatScoringRules(exam.scoringRules)
  const details: Array<{
    icon: LucideIcon
    label: string
    value: React.ReactNode
    span?: boolean
  }> = [
    officialStartAt
      ? {
          icon: CalendarDaysIcon,
          label: "Confirmed start",
          value: officialStartAt,
        }
      : null,
    expectedStartDate
      ? {
          icon: CalendarDaysIcon,
          label: "Expected date",
          value: expectedStartDate,
        }
      : null,
    exam.examCode
      ? { icon: FileTextIcon, label: "Exam code", value: exam.examCode }
      : null,
    exam.conductingBody
      ? {
          icon: LandmarkIcon,
          label: "Conducting body",
          value: exam.conductingBody,
        }
      : null,
    duration ? { icon: Clock3Icon, label: "Duration", value: duration } : null,
    totalMarks
      ? { icon: TargetIcon, label: "Total marks", value: totalMarks }
      : null,
    targetMarks
      ? { icon: TargetIcon, label: "Target marks", value: targetMarks }
      : null,
    {
      icon: MinusCircleIcon,
      label: "Scoring rules",
      span: true,
      value: scoringRules ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {scoringRules.map((rule) => (
            <span key={rule}>{rule}</span>
          ))}
        </div>
      ) : (
        "Not recorded"
      ),
    },
  ].filter(
    (detail): detail is NonNullable<typeof detail> => Boolean(detail)
  )

  return (
    <DialogContent className="flex max-h-[min(90dvh,46rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
      <DialogHeader className="m-0 shrink-0 border-b border-border px-5 py-4 pr-14 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-brand-violet-ink">
          <GraduationCapIcon className="size-3.5" aria-hidden="true" />
          Exam prep
        </div>
        <DialogTitle className="mt-1 text-xl leading-tight font-semibold break-words sm:text-2xl">
          {exam.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full description and configuration for {exam.title}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        {exam.summary ? (
          <section>
            <h3 className="text-sm font-semibold text-foreground">
              Description
            </h3>
            <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
              {exam.summary}
            </p>
          </section>
        ) : null}

        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Exam details
          </h3>
          <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {details.map((detail) => (
              <DetailItem key={detail.label} {...detail} />
            ))}
          </dl>
        </section>

        {exam.officialUrl ? (
          <section>
            <h3 className="text-sm font-semibold text-foreground">
              Official source
            </h3>
            <Button
              className="mt-3 max-w-full sm:w-auto"
              variant="outline"
              size="sm"
              render={
                <a href={exam.officialUrl} target="_blank" rel="noreferrer" />
              }
            >
              <ExternalLinkIcon aria-hidden="true" />
              <span className="truncate">Open official website</span>
            </Button>
          </section>
        ) : null}
      </div>

      <DialogFooter className="m-0 shrink-0 border-t border-border bg-popover/60 px-5 py-3 sm:px-6">
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          render={<Link href={settingsHref} />}
        >
          Exam settings
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

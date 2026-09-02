"use client"

import { useMemo, useState } from "react"
import { GraduationCapIcon, InfoIcon } from "lucide-react"

import { ExamCountdown } from "@/components/tools/exam-prep/exam-countdown"
import { ExamDetailsDialogContent } from "@/components/tools/exam-prep/exam-details-dialog"
import { UpdateExamDateDialog } from "./update-exam-date-dialog"
import { ExamSettingsDialog } from "./exam-settings-dialog"
import type { ExamDetailHeaderData } from "./exam-detail-types"
import { Dialog } from "@/components/ui/dialog"

export type { ExamDetailHeaderData } from "./exam-detail-types"

type ExamDetailHeaderProps = {
  workspaceSlug: string
  exam: ExamDetailHeaderData
  settingsHref?: string
}

const targetDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

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

function formatTargetDate(target: Date) {
  return targetDateFormatter.format(target)
}

export function ExamDetailHeader({
  workspaceSlug,
  exam,
  settingsHref: _settingsHref,
}: ExamDetailHeaderProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const target = useMemo(() => {
    const officialTarget = getOfficialStart(exam.officialStartAt)

    return {
      date:
        officialTarget ??
        (exam.expectedStartDate ? getExamStart(exam.expectedStartDate) : null),
      hasActualDate:
        exam.scheduleStatus === "confirmed" || Boolean(officialTarget),
      dateTime: officialTarget ? exam.officialStartAt : exam.expectedStartDate,
    }
  }, [exam.expectedStartDate, exam.officialStartAt, exam.scheduleStatus])

  return (
    <>
      <header className="mb-6 grid gap-6 border-b border-border/80 pb-6 sm:mb-8 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
        {/* Left Column: Context, Title & Target Date / View Details Meta Row */}
        <div className="min-w-0 space-y-2">
          {/* Eyebrow Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-violet-ink">
              <GraduationCapIcon
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              Exam prep
            </span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {exam.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground">Target Date:</span>
            <span>
              {target.date ? formatTargetDate(target.date) : "Not scheduled"}
            </span>

            <UpdateExamDateDialog
              workspaceSlug={workspaceSlug}
              examId={exam.id}
              expectedStartDate={exam.expectedStartDate}
              triggerClassName="h-6 w-6"
            />

            {!target.hasActualDate && (
              <span className="inline-flex items-center rounded-full border border-brand-amber-line bg-brand-amber-soft px-2 py-0.5 text-[11px] font-medium text-brand-amber-ink">
                Estimated
              </span>
            )}

            <span aria-hidden className="text-muted-foreground/40">
              /
            </span>

            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-brand-violet-ink underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <InfoIcon className="size-3.5" aria-hidden="true" />
              View details
            </button>
          </div>
        </div>

        {/* Right Column: Clean Hero Monospace Timer & View Switcher Toolbar */}
        <div className="min-w-0 border-t border-border/50 pt-5 sm:pt-6 lg:border-t-0 lg:pt-0">
          <ExamCountdown
            expectedStartDate={exam.expectedStartDate}
            officialStartAt={exam.officialStartAt}
            scheduleStatus={exam.scheduleStatus}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </header>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <ExamDetailsDialogContent
          exam={exam}
          onOpenSettings={() => {
            setIsDetailsOpen(false)
            setIsSettingsOpen(true)
          }}
        />
      </Dialog>

      {/* Settings Dialog */}
      <ExamSettingsDialog
        key={`${exam.id}-${isSettingsOpen ? "open" : "closed"}`}
        workspaceSlug={workspaceSlug}
        exam={exam}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  )
}

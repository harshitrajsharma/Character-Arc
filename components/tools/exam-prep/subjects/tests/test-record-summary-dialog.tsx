"use client"

import { BookOpenTextIcon, CalendarDaysIcon, TargetIcon } from "lucide-react"

import { MarkdownContent } from "@/components/editor/markdown-content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TestRecordSummaryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: {
    title: string
    marksObtained: number
    totalMarks: number
    attemptedAt?: Date | string | null
    summary?: string | null
    createdAt: Date | string
  }
}

const recordedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function formatRecordedDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"

  return recordedDateFormatter.format(date)
}

export function TestRecordSummaryDialog({
  open,
  onOpenChange,
  record,
}: TestRecordSummaryDialogProps) {
  if (!record) return null

  const percentage = Math.round(
    (record.marksObtained / record.totalMarks) * 100
  )
  const hasSummary = Boolean(record.summary?.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="m-0 shrink-0 px-5 py-4 pr-14 sm:px-6">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
            <BookOpenTextIcon aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">{record.title}</DialogTitle>
          <DialogDescription>
            Review the saved result and test summary.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Test result details"
          >
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
              <TargetIcon aria-hidden="true" />
              {record.marksObtained}/{record.totalMarks} marks · {percentage}%
            </Badge>
            <Badge
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-muted-foreground"
              suppressHydrationWarning
            >
              <CalendarDaysIcon aria-hidden="true" />
              {formatRecordedDate(record.attemptedAt ?? record.createdAt)}
            </Badge>
          </div>

          <section
            className="min-h-32 rounded-lg border bg-muted/40 p-4"
            aria-labelledby="test-summary-heading"
          >
            <h3
              id="test-summary-heading"
              className="mb-3 text-sm font-semibold"
            >
              Test summary
            </h3>
            {hasSummary ? (
              <MarkdownContent markdown={record.summary ?? ""} />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No summary was saved for this test.
              </p>
            )}
          </section>
        </div>
        <DialogFooter className="m-0 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import {
  CalendarDaysIcon,
  EyeIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"
import { getScoreStatus } from "./test-record-helpers"

type TestRecordCardProps = {
  record: BaseTestRecord
  onView: (record: BaseTestRecord) => void
  onEdit?: (record: BaseTestRecord) => void
  onDelete?: (record: BaseTestRecord) => void
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

export function TestRecordCard({
  record,
  onView,
  onEdit,
  onDelete,
}: TestRecordCardProps) {
  const percentage = Math.round(
    (Number(record.marksObtained) / Number(record.totalMarks)) * 100
  )
  const { label: scoreLabel, variant: scoreVariant } =
    getScoreStatus(percentage)

  return (
    <article className="rounded-lg border bg-card p-4 transition-colors hover:border-brand-violet-line sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
            <FileTextIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold break-words text-foreground">
              {record.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                {Number(record.marksObtained)}/{Number(record.totalMarks)} marks
              </span>
              <span
                className="inline-flex items-center gap-1"
                suppressHydrationWarning
              >
                <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
                {formatRecordedDate(record.attemptedAt ?? record.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <Badge
            variant="outline"
            className={cn(
              "h-7 self-start px-2.5 sm:self-auto",
              scoreVariant === "success" &&
                "border-success-line bg-success-soft text-success-ink",
              scoreVariant === "warning" &&
                "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
              scoreVariant === "destructive" &&
                "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            {scoreLabel} · {percentage}%
          </Badge>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={`Actions for ${record.title}`}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-11 sm:h-9"
              onClick={() => onView(record)}
            >
              <EyeIcon aria-hidden="true" />
              View
            </Button>
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 sm:h-9"
                onClick={() => onEdit(record)}
              >
                <PencilIcon aria-hidden="true" />
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
                onClick={() => onDelete(record)}
              >
                <Trash2Icon aria-hidden="true" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

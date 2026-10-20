"use client"

import {
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  RotateCcwIcon,
  BanIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseIsoLocalDate } from "@/lib/dates/local-date"
import type {
  ScheduledTest,
  ChapterWithRelations,
} from "@/types/progressapp/domain"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"

const labels: Record<string, string> = {
  planned: "Planned",
  upcoming: "Upcoming",
  "due-today": "Due today",
  overdue: "Overdue",
  completed: "Completed",
  cancelled: "Cancelled",
}
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function UnifiedTestRow({
  plan,
  chapters,
  record,
  status,
  pending,
  onView,
  onRecord,
  onEdit,
  onCancel,
  onRestore,
  onReopen,
  onDelete,
}: {
  chapters?: ChapterWithRelations[]
  plan?: ScheduledTest
  record?: BaseTestRecord
  status: string
  pending?: boolean
  onView?: () => void
  onRecord?: () => void
  onEdit?: () => void
  onCancel?: () => void
  onRestore?: () => void
  onReopen?: () => void
  onDelete?: () => void
}) {
  const coverage =
    plan?.scope === "subject"
      ? "Full subject"
      : plan?.scope === "multi-chapter"
        ? plan.targetChapterIds
            .map(
              (id) =>
                chapters?.find((chapter) => chapter.id === id)?.name ??
                "Chapter"
            )
            .join(" + ")
        : null
  const title = record?.title ?? plan?.title
  const active = plan?.status === "planned" || plan?.status === "scheduled"
  const date = record
    ? new Date(record.attemptedAt ?? record.createdAt)
    : parseIsoLocalDate(plan?.scheduledFor ?? null)
  const dateLabel =
    date && !Number.isNaN(date.getTime())
      ? dateFormatter.format(date)
      : "Date not set"
  const editable = onEdit && (!plan || active)
  const deletable = onDelete && plan?.status !== "completed"
  const hasMenu =
    editable ||
    deletable ||
    (active && onCancel) ||
    (plan?.status === "completed" && onReopen)
  return (
    <article className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium break-words">{title}</h3>
          <Badge variant="outline">{labels[status] ?? status}</Badge>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{record ? "Recorded manually" : "Scheduled test"}</span>
          <span aria-hidden="true">&middot;</span>
          <span suppressHydrationWarning>{dateLabel}</span>
          {record ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>
                {Number(record.marksObtained)}/{Number(record.totalMarks)} marks
              </span>
            </>
          ) : plan?.durationMinutes ? (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{plan.durationMinutes} min</span>
            </>
          ) : null}
        </p>
        {coverage ? (
          <p className="mt-1 text-xs break-words text-muted-foreground">
            {coverage}
          </p>
        ) : null}
        {plan?.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {plan.notes}
          </p>
        ) : null}
        {plan?.status === "cancelled" && plan.cancellationReason ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.cancellationReason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        {onView ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={onView}
          >
            View result
          </Button>
        ) : active && onRecord ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={onRecord}
          >
            Record result
          </Button>
        ) : null}
        {plan?.status === "cancelled" && onRestore ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={onRestore}
          >
            Restore
          </Button>
        ) : null}
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 sm:size-9"
                  aria-label={`More actions for ${title}`}
                  disabled={pending}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable ? (
                <DropdownMenuItem className="min-h-11" onClick={onEdit}>
                  <PencilIcon />
                  {plan ? "Edit plan" : "Edit result"}
                </DropdownMenuItem>
              ) : null}
              {active && onCancel ? (
                <DropdownMenuItem className="min-h-11" onClick={onCancel}>
                  <BanIcon />
                  Cancel test
                </DropdownMenuItem>
              ) : null}
              {plan?.status === "completed" && onReopen ? (
                <DropdownMenuItem className="min-h-11" onClick={onReopen}>
                  <RotateCcwIcon />
                  Reopen test
                </DropdownMenuItem>
              ) : null}
              {deletable ? (
                <DropdownMenuItem
                  className="min-h-11"
                  variant="destructive"
                  onClick={onDelete}
                >
                  <Trash2Icon />
                  {plan ? "Delete plan" : "Delete result"}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </article>
  )
}

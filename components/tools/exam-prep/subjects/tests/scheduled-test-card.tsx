"use client"

import {
  BanIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Clock3Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
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
import { cn } from "@/lib/utils"
import type {
  ChapterWithRelations,
  ScheduledTest,
} from "@/types/progressapp/domain"

export type ScheduledTestDisplayStatus =
  "planned" | "upcoming" | "due-today" | "overdue" | "completed" | "cancelled"

type ScheduledTestCardProps = {
  scheduledTest: ScheduledTest
  chapters: ChapterWithRelations[]
  displayStatus: ScheduledTestDisplayStatus
  pending?: boolean
  onComplete: (scheduledTest: ScheduledTest) => void
  onEdit: (scheduledTest: ScheduledTest) => void
  onCancel: (scheduledTest: ScheduledTest) => void
  onRestore: (scheduledTest: ScheduledTest) => void
  onReopen: (scheduledTest: ScheduledTest) => void
  onDelete: (scheduledTest: ScheduledTest) => void
}

const statusPresentation: Record<
  ScheduledTestDisplayStatus,
  { label: string; className: string }
> = {
  planned: { label: "Planned", className: "" },
  upcoming: {
    label: "Upcoming",
    className: "border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink",
  },
  "due-today": {
    label: "Due today",
    className:
      "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
  },
  overdue: {
    label: "Overdue",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  completed: {
    label: "Completed",
    className: "border-success-line bg-success-soft text-success-ink",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-border bg-muted text-muted-foreground",
  },
}

function formatDate(value: string | null) {
  const date = parseIsoLocalDate(value)
  if (!date) return "Date not set"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  )
}

function coverageLabel(
  scheduledTest: ScheduledTest,
  chapters: ChapterWithRelations[]
) {
  if (scheduledTest.scope === "subject") return "Full subject"

  const names = scheduledTest.targetChapterIds
    .map(
      (chapterId) => chapters.find((chapter) => chapter.id === chapterId)?.name
    )
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) return "Chapter coverage unavailable"
  if (scheduledTest.scope === "chapter") return names[0]
  if (names.length <= 2) return names.join(" + ")
  return `${names.slice(0, 2).join(" + ")} +${names.length - 2}`
}

export function ScheduledTestCard({
  scheduledTest,
  chapters,
  displayStatus,
  pending = false,
  onComplete,
  onEdit,
  onCancel,
  onRestore,
  onReopen,
  onDelete,
}: ScheduledTestCardProps) {
  const presentation = statusPresentation[displayStatus]
  const active =
    scheduledTest.status === "planned" || scheduledTest.status === "scheduled"

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm",
        displayStatus === "overdue" && "border-destructive/30",
        displayStatus === "due-today" && "border-brand-amber-line"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-heading text-base font-medium">
            {scheduledTest.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {coverageLabel(scheduledTest, chapters)}
          </p>
        </div>
        <Badge variant="outline" className={presentation.className}>
          {presentation.label}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDaysIcon aria-hidden="true" className="size-4" />
          {formatDate(scheduledTest.scheduledFor)}
        </span>
        {scheduledTest.durationMinutes ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3Icon aria-hidden="true" className="size-4" />
            {scheduledTest.durationMinutes} min
          </span>
        ) : null}
        {scheduledTest.totalMarks ? (
          <span>{scheduledTest.totalMarks} marks</span>
        ) : null}
      </div>

      {scheduledTest.notes ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {scheduledTest.notes}
        </p>
      ) : null}

      {scheduledTest.status === "cancelled" &&
      scheduledTest.cancellationReason ? (
        <p className="text-sm text-muted-foreground">
          Reason: {scheduledTest.cancellationReason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {active ? (
          <Button
            type="button"
            size="sm"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onComplete(scheduledTest)}
            disabled={pending}
          >
            <CheckCircle2Icon data-icon="inline-start" />
            Record result
          </Button>
        ) : null}

        {active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onEdit(scheduledTest)}
            disabled={pending}
          >
            <PencilIcon data-icon="inline-start" />
            Edit plan
          </Button>
        ) : null}

        {scheduledTest.status === "cancelled" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onRestore(scheduledTest)}
            disabled={pending}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Restore
          </Button>
        ) : null}

        {scheduledTest.status === "completed" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onReopen(scheduledTest)}
            disabled={pending}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reopen
          </Button>
        ) : null}

        {scheduledTest.status !== "completed" ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-auto size-11 sm:size-9"
                  aria-label={`More actions for ${scheduledTest.title}`}
                  disabled={pending}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {active ? (
                <DropdownMenuItem onClick={() => onCancel(scheduledTest)}>
                  <BanIcon /> Cancel test
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(scheduledTest)}
              >
                <Trash2Icon /> Delete plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </article>
  )
}

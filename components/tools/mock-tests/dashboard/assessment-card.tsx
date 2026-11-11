"use client"

import { useId } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CopyIcon,
  Loader2Icon,
  FilePenLineIcon,
  GlobeIcon,
  LinkIcon,
  LockKeyholeIcon,
  PlayIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  CommunityMockTestItem,
  MockTestListItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import { StartAttemptButton } from "../start-attempt-button"
import { AssessmentManagementActions } from "./assessment-management-actions"
import type { AssessmentCardProps } from "./types"

const PAPER_TYPES: Record<string, string> = {
  full_length: "Full-length",
  multi_subject: "Multi-subject",
  subject_wise: "Subject test",
  topic_wise: "Topic drill",
  pyq: "PYQ",
}

function formatUpdated(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date)
}

export function AssessmentCard({
  workspaceSlug,
  mode,
  item,
  canWrite = false,
  isCloning = false,
  onClone,
  activeAttemptId,
  layout = "grid",
}: AssessmentCardProps) {
  const titleId = useId()
  const workspaceItem = mode === "workspace" ? (item as MockTestListItem) : null
  const communityItem =
    mode === "community" ? (item as CommunityMockTestItem) : null
  const draft = workspaceItem?.status === "draft"
  const archived = workspaceItem?.status === "archived"
  const published = !draft && !archived
  const canManage = !!workspaceItem && canWrite && !archived
  const canEditDraft = draft && canManage
  const canTake =
    !!workspaceItem && canWrite && published && item.questionCount > 0
  const canResume =
    !!workspaceItem && canWrite && published && !!activeAttemptId
  const canClone = !!communityItem?.allowCloning && canWrite && !!onClone
  const detailHref = workspaceItem
    ? canEditDraft
      ? workspaceRoutes.mockTests.edit(workspaceSlug, item.id)
      : workspaceRoutes.mockTests.detail(workspaceSlug, item.id)
    : `/assessments/share/${item.id}`
  const StatusIcon = archived
    ? ArchiveIcon
    : draft
      ? FilePenLineIcon
      : CheckCircle2Icon
  const visibility =
    workspaceItem?.visibility ?? (communityItem ? "public" : "private")
  const VisibilityIcon =
    visibility === "public"
      ? GlobeIcon
      : visibility === "unlisted"
        ? LinkIcon
        : LockKeyholeIcon
  const visibilityLabel =
    visibility === "public"
      ? "Public"
      : visibility === "unlisted"
        ? "Link only"
        : "Private"
  const subjects = item.taxonomy?.subjects ?? []
  const context = [
    item.taxonomy?.examTag,
    subjects.length ? subjects.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" / ")
  const updated = workspaceItem ? formatUpdated(workspaceItem.updatedAt) : null
  const publishedDate = communityItem?.publishedAt
    ? formatUpdated(communityItem.publishedAt)
    : null
  const publisher = communityItem
    ? `By ${communityItem.authorName}${communityItem.workspaceName !== communityItem.authorName ? ` · ${communityItem.workspaceName}` : ""}`
    : null
  const description =
    context ||
    (communityItem ? communityItem.summary : "Exam and subjects not specified")
  const footerNote = archived
    ? "Archived assessment"
    : draft && item.questionCount === 0
      ? "Add questions to build your paper"
      : updated
        ? `Updated ${updated}`
        : communityItem
          ? `By ${communityItem.authorName}`
          : "Assessment overview"

  const metadata = communityItem ? (
    <div
      aria-label="Community paper activity"
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs"
    >
      {PAPER_TYPES[item.taxonomy?.paperType ?? ""] ? (
        <span className="font-medium text-brand-violet-ink">
          {PAPER_TYPES[item.taxonomy?.paperType ?? ""]}
        </span>
      ) : null}
      <span className="text-muted-foreground tabular-nums">
        {communityItem.attemptsCount === 0
          ? "No attempts yet"
          : `${communityItem.attemptsCount.toLocaleString("en-IN")} ${communityItem.attemptsCount === 1 ? "attempt" : "attempts"}`}
      </span>
    </div>
  ) : (
    <div
      role="group"
      aria-label="Assessment type, status, and visibility"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2",
        layout === "list" ? "justify-start" : "justify-between"
      )}
    >
      <span
        className="min-w-0 truncate text-xs font-medium text-brand-violet-ink"
        title={PAPER_TYPES[item.taxonomy?.paperType ?? ""] ?? "Assessment"}
      >
        {PAPER_TYPES[item.taxonomy?.paperType ?? ""] ?? "Assessment"}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge
          variant="secondary"
          className={cn(
            published && workspaceItem && "bg-success-soft text-success-ink"
          )}
        >
          <StatusIcon aria-hidden="true" />
          {archived
            ? "Archived"
            : draft
              ? "Draft"
              : communityItem
                ? "Community"
                : "Published"}
        </Badge>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <VisibilityIcon className="size-3" aria-hidden="true" />
          {visibilityLabel}
        </span>
      </div>
    </div>
  )

  return (
    <Card
      role="group"
      aria-labelledby={titleId}
      data-assessment-card
      data-assessment-mode={mode}
      className={cn(
        "group/assessment relative h-full min-w-0 gap-0 overflow-visible rounded-lg border border-border py-0 shadow-none ring-0 transition-colors hover:border-foreground/25",
        layout === "list" &&
          "md:grid md:grid-cols-[minmax(0,1fr)_256px] md:items-center lg:grid-cols-[minmax(0,1fr)_256px_180px]"
      )}
    >
      <CardHeader
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2 rounded-none px-4 py-4",
          canManage && "pr-16 md:pr-4"
        )}
      >
        <div className="flex w-full min-w-0 flex-col gap-2">
          <CardTitle>
            <h3 id={titleId}>
              <Link
                href={detailHref}
                title={item.title}
                data-card-link
                className="block leading-6 after:absolute after:inset-0 after:z-10 after:rounded-lg hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
              >
                <span className="line-clamp-2 break-words">{item.title}</span>
              </Link>
            </h3>
          </CardTitle>
          {description ? (
            <CardDescription
              className="line-clamp-2 text-xs break-words"
              title={description}
            >
              {description}
            </CardDescription>
          ) : null}
        </div>
        {layout === "list" ? metadata : null}
      </CardHeader>
      {workspaceItem && canManage ? (
        <AssessmentManagementActions
          workspaceSlug={workspaceSlug}
          item={workspaceItem}
        />
      ) : null}

      <Separator className={cn(layout === "list" && "md:hidden")} />
      <CardContent
        className={cn(
          "flex items-center bg-muted/20 px-4 py-3",
          layout === "list" && "md:bg-transparent md:px-0 md:pr-4"
        )}
      >
        <dl className="grid w-full grid-cols-3 gap-2">
          {[
            { label: "Questions", value: item.questionCount },
            {
              label: "Duration",
              value: item.durationMinutes
                ? `${item.durationMinutes} min`
                : "Untimed",
            },
            { label: "Marks", value: item.totalMarks ?? "Not set" },
          ].map(({ label, value }) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-semibold whitespace-nowrap tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <Separator className={cn(layout === "list" && "md:hidden")} />

      <CardFooter
        className={cn(
          "flex flex-col items-stretch justify-end gap-3 rounded-b-lg p-4",
          layout === "list" &&
            "md:col-span-2 md:border-t md:border-border md:py-2 lg:col-span-1 lg:border-t-0 lg:py-4",
          layout === "list" && canManage && "lg:pt-8"
        )}
      >
        {layout === "grid" ? metadata : null}

        <div
          className={cn(
            "flex min-h-11 items-center justify-between gap-2",
            communityItem && layout === "grid" && "flex-wrap",
            layout === "list" && "lg:flex-col lg:items-end lg:gap-2"
          )}
        >
          {communityItem ? (
            <div
              className={cn(
                "flex min-w-0 flex-col gap-1",
                layout === "grid" && "flex-1 basis-36",
                layout === "list" && "lg:text-right"
              )}
            >
              <p
                className="truncate text-xs font-medium text-foreground"
                title={publisher ?? undefined}
              >
                {publisher}
              </p>
              {publishedDate ? (
                <p className="text-xs whitespace-nowrap text-muted-foreground">
                  Published {publishedDate}
                </p>
              ) : null}
            </div>
          ) : (
            <p
              className="min-w-0 truncate text-xs text-muted-foreground"
              title={footerNote}
            >
              {footerNote}
            </p>
          )}
          {canEditDraft ? (
            <Link
              href={workspaceRoutes.mockTests.edit(workspaceSlug, item.id)}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "relative z-20 h-11"
              )}
            >
              <FilePenLineIcon data-icon="inline-start" aria-hidden="true" />
              Edit test
            </Link>
          ) : canResume ? (
            <Link
              href={workspaceRoutes.mockTests.attempt(
                workspaceSlug,
                activeAttemptId!
              )}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "relative z-20 h-11"
              )}
            >
              <PlayIcon data-icon="inline-start" aria-hidden="true" />
              Resume
            </Link>
          ) : canTake ? (
            <StartAttemptButton
              workspaceSlug={workspaceSlug}
              assessmentId={item.id}
              variant="default"
              size="sm"
              label="Take test"
              className="relative z-20 h-11"
            />
          ) : null}
          {communityItem && canClone && onClone ? (
            <Button
              variant="outline"
              size="sm"
              className="relative z-20 ml-auto h-11 shrink-0"
              disabled={isCloning}
              aria-label={`Copy ${item.title} to workspace`}
              title={isCloning ? "Copying to workspace…" : "Copy to workspace"}
              onClick={() => onClone(communityItem.id, communityItem.title)}
            >
              {isCloning ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <CopyIcon aria-hidden="true" />
              )}
              {isCloning ? "Copying…" : "Copy paper"}
            </Button>
          ) : null}
          {communityItem && !communityItem.allowCloning ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              Copying disabled
            </span>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  )
}

"use client"

import Link from "next/link"
import {
  CalculatorIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  FileTextIcon,
  GlobeIcon,
  LinkIcon,
  PlayIcon,
  Share2Icon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  CommunityMockTestItem,
  MockTestListItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import { StartAttemptButton } from "../start-attempt-button"
import type { AssessmentCardProps } from "./types"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted/60 text-muted-foreground font-medium",
  },
  published: {
    label: "Published",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
}

const PAPER_TYPE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  full_length: {
    label: "Full-Length Mock",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  multi_subject: {
    label: "Multi-Subject",
    className: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  subject_wise: {
    label: "Subject Test",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  topic_wise: {
    label: "Topic Drill",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pyq: {
    label: "PYQ",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
}

export function AssessmentCard({
  workspaceSlug,
  mode,
  item,
  canWrite = false,
  isCloning = false,
  onShare,
  onClone,
}: AssessmentCardProps) {
  const isWorkspace = mode === "workspace"
  const workspaceItem = isWorkspace ? (item as MockTestListItem) : null
  const communityItem = !isWorkspace ? (item as CommunityMockTestItem) : null

  const paperTypeCfg = item.taxonomy?.paperType
    ? PAPER_TYPE_CONFIG[item.taxonomy.paperType]
    : null

  const statusCfg = workspaceItem
    ? STATUS_CONFIG[workspaceItem.status] ?? STATUS_CONFIG.draft
    : null

  const visibility = workspaceItem?.visibility ?? "public"

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-border bg-card shadow-2xs hover:border-foreground/30 hover:shadow-xs transition-all overflow-hidden divide-y divide-border/60">
      {/* ── Segment 1: Classification & Status Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-muted/25 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {paperTypeCfg ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold rounded-full px-2.5 py-0.5",
                paperTypeCfg.className
              )}
            >
              {paperTypeCfg.label}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] rounded-full px-2.5 py-0.5 border-border bg-muted/50 text-muted-foreground"
            >
              Mock Test
            </Badge>
          )}

          {item.taxonomy?.examTag ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50 truncate max-w-[130px]">
              {item.taxonomy.examTag}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {statusCfg && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold rounded-full px-2 py-0.5",
                statusCfg.className
              )}
            >
              {statusCfg.label}
            </Badge>
          )}

          {visibility === "public" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 bg-emerald-500/10">
              <GlobeIcon className="size-2.5" />
              Public
            </span>
          ) : visibility === "unlisted" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 dark:text-sky-400 border border-sky-500/30 rounded-full px-2 py-0.5 bg-sky-500/10">
              <LinkIcon className="size-2.5" />
              Shared
            </span>
          ) : null}

          {item.calculatorAllowed !== false ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-0.5 bg-cyan-500/10"
              title="Scientific Calculator Allowed"
            >
              <CalculatorIcon className="size-2.5" />
              Calc
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-border/80 rounded-full px-2 py-0.5 bg-muted/30"
              title="Calculator Not Allowed"
            >
              No Calc
            </span>
          )}
        </div>
      </div>

      {/* ── Segment 2: Paper Identity & Subject Chips ── */}
      <div className="p-4 sm:p-5 space-y-2 bg-card flex-1">
        <Link
          href={
            isWorkspace
              ? workspaceRoutes.mockTests.detail(workspaceSlug, item.id)
              : `/assessments/share/${item.id}`
          }
          className="text-base font-bold text-foreground hover:underline line-clamp-2 leading-snug group-hover:text-foreground block font-heading"
        >
          {item.title}
        </Link>

        {communityItem?.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {communityItem.summary}
          </p>
        )}

        {item.taxonomy?.subjects && item.taxonomy.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.taxonomy.subjects.slice(0, 3).map((sub, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50"
              >
                {sub}
              </span>
            ))}
            {item.taxonomy.subjects.length > 3 && (
              <span className="text-[10px] text-muted-foreground/70 px-1 py-0.5 font-mono">
                +{item.taxonomy.subjects.length - 3} more
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Segment 3: Telemetry & Performance Progression ── */}
      <div className="px-4 sm:px-5 py-3 bg-muted/10 space-y-2.5 text-xs">
        {/* Monospace Quick Metrics */}
        <div className="flex items-center justify-between font-mono text-muted-foreground text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <FileTextIcon className="size-3.5 text-muted-foreground/70" />
            <strong className="font-bold text-foreground">{item.questionCount}</strong>{" "}
            {item.questionCount === 1 ? "Question" : "Questions"}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3.5 text-muted-foreground/70" />
            {item.durationMinutes ? `${item.durationMinutes} mins` : "Untimed"}
          </span>
          {item.totalMarks ? (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <TargetIcon className="size-3.5 text-muted-foreground/70" />
                <strong className="font-bold text-foreground">{item.totalMarks}</strong> Marks
              </span>
            </>
          ) : null}
        </div>

        {/* Workspace: Personal Best Progress / Community: Author & Benchmarks */}
        {isWorkspace && workspaceItem ? (
          workspaceItem.myBestPercentage !== null ? (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrophyIcon className="size-3 text-amber-500" />
                  Personal Best
                </span>
                <span className="font-mono font-bold text-foreground">
                  {Math.round(workspaceItem.myBestPercentage)}%
                </span>
              </div>
              <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-foreground h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, workspaceItem.myBestPercentage))}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium py-0.5">
              <span>Attempt record</span>
              <span className="font-mono text-[10px] text-muted-foreground/80">
                {workspaceItem.attemptsCount > 0
                  ? `${workspaceItem.attemptsCount} attempt${workspaceItem.attemptsCount === 1 ? "" : "s"}`
                  : "Not attempted yet"}
              </span>
            </div>
          )
        ) : communityItem ? (
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden text-[9px] font-bold border border-border/50 font-mono">
                {communityItem.authorAvatarUrl ? (
                  <img
                    src={communityItem.authorAvatarUrl}
                    alt={communityItem.authorName}
                    className="size-full object-cover"
                  />
                ) : (
                  communityItem.authorName.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="truncate font-medium text-foreground">
                {communityItem.authorName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
              <span>{communityItem.attemptsCount} attempts</span>
              {communityItem.avgScorePercentage !== null && (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {communityItem.avgScorePercentage}% avg
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Segment 4: Action Ribbon ── */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-muted/25 text-xs">
        {isWorkspace && workspaceItem ? (
          <>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-full"
                render={<Link href={workspaceRoutes.mockTests.detail(workspaceSlug, workspaceItem.id)} />}
              >
                Details
              </Button>

              {canWrite && onShare && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onShare(workspaceItem)}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-full gap-1 cursor-pointer"
                >
                  <Share2Icon className="size-3" />
                  Share
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {workspaceItem.status === "published" ? (
                <StartAttemptButton
                  workspaceSlug={workspaceSlug}
                  assessmentId={workspaceItem.id}
                  size="sm"
                  label="Start Test"
                  className="h-8 rounded-full px-3.5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
                />
              ) : canWrite ? (
                <Button
                  variant="outline"
                  size="xs"
                  className="h-8 rounded-full px-3 text-xs font-semibold gap-1 border-border hover:bg-muted/50 text-foreground cursor-pointer"
                  render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, workspaceItem.id)} />}
                >
                  <FilePenLineIcon className="size-3" />
                  Edit Paper
                </Button>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground rounded-full">
                  Draft Only
                </Badge>
              )}
            </div>
          </>
        ) : communityItem ? (
          <>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-full gap-1"
              render={<Link href={`/assessments/share/${communityItem.id}`} />}
            >
              Cohort &amp; Details
              <ExternalLinkIcon className="size-3" />
            </Button>

            <div className="flex items-center gap-1.5">
              {communityItem.allowCloning && onClone && (
                <Button
                  variant="outline"
                  size="xs"
                  disabled={isCloning}
                  onClick={() => onClone(communityItem.id, communityItem.title)}
                  className="h-8 rounded-full px-3 text-xs font-semibold gap-1 border-border hover:bg-muted/50 text-foreground cursor-pointer"
                >
                  <CopyIcon className="size-3" />
                  {isCloning ? "Cloning..." : "Clone"}
                </Button>
              )}

              <Button
                size="xs"
                className="h-8 rounded-full px-3.5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
                render={<Link href={`/assessments/share/${communityItem.id}`} />}
              >
                <PlayIcon className="size-3 fill-current" />
                Take Test
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

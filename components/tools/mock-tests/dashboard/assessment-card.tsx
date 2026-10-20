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
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  CommunityMockTestItem,
  MockTestListItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import { StartAttemptButton } from "../start-attempt-button"
import type { AssessmentCardProps } from "./types"

const PAPER_TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  full_length: {
    label: "Full-Length",
    badgeClass: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  multi_subject: {
    label: "Multi-Subject",
    badgeClass: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  subject_wise: {
    label: "Subject Test",
    badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  topic_wise: {
    label: "Topic Drill",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pyq: {
    label: "PYQ",
    badgeClass: "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
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

  const visibility = workspaceItem?.visibility ?? "public"

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs hover:shadow-xs hover:border-foreground/30 transition-all divide-y divide-border/50">
      {/* ── Segment 1: Classification & Consolidated Status Header ── */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-muted/20 text-xs">
        {/* Left: Paper Type pill (subtle accent tint) + Exam tag (mono uppercase) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-[10px] font-semibold rounded-full px-2.5 py-0.5 border inline-flex items-center shrink-0",
              paperTypeCfg?.badgeClass ??
                "border-border/60 bg-muted/60 text-muted-foreground"
            )}
          >
            {paperTypeCfg?.label ?? "Mock Test"}
          </span>

          {item.taxonomy?.examTag ? (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 shrink-0 whitespace-nowrap">
              {item.taxonomy.examTag}
            </span>
          ) : null}
        </div>

        {/* Right: Consolidated Status Beacon + Calculator micro-pill (Only when allowed) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isWorkspace && workspaceItem ? (
            workspaceItem.status === "published" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Published
                {visibility === "public" ? (
                  <GlobeIcon className="size-2.5 opacity-80" />
                ) : visibility === "unlisted" ? (
                  <LinkIcon className="size-2.5 opacity-80" />
                ) : null}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-muted/60 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                Draft
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <GlobeIcon className="size-2.5" />
              Public
            </span>
          )}

          {/* Calculator micro-pill ONLY when allowed (zero negative clutter) */}
          {item.calculatorAllowed !== false && (
            <span
              className="inline-flex items-center justify-center size-5 rounded-full text-cyan-700 dark:text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 shrink-0"
              title="Scientific Calculator Allowed"
            >
              <CalculatorIcon className="size-2.5" />
            </span>
          )}
        </div>
      </div>

      {/* ── Segment 2: Paper Identity & Clean Subject Micro-Chips ── */}
      <div className="p-4 sm:p-5 space-y-2.5 bg-card flex-1">
        <Link
          href={
            isWorkspace
              ? workspaceRoutes.mockTests.detail(workspaceSlug, item.id)
              : `/assessments/share/${item.id}`
          }
          className="font-heading text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug block"
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
                className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 hover:bg-muted transition-colors"
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

      {/* ── Segment 3: Structured Telemetry Matrix & Personal Best ── */}
      <div className="px-4 sm:px-5 py-3 bg-muted/10 space-y-3 text-xs">
        {/* 3-Column Structured Telemetry Matrix */}
        <div className="grid grid-cols-3 divide-x divide-border/50 rounded-xl border border-border/60 bg-muted/30 py-2 px-1 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5 px-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
              <FileTextIcon className="size-3 text-muted-foreground/70" />
              Items
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {item.questionCount}{" "}
              <span className="text-[10px] font-normal text-muted-foreground">Qs</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-0.5 px-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
              <ClockIcon className="size-3 text-muted-foreground/70" />
              Time
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {item.durationMinutes ? `${item.durationMinutes}m` : "Untimed"}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-0.5 px-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
              <TargetIcon className="size-3 text-muted-foreground/70" />
              Marks
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {item.totalMarks ?? "—"}
            </span>
          </div>
        </div>

        {/* Workspace: Personal Best Progress / Unattempted Indicator */}
        {isWorkspace && workspaceItem ? (
          workspaceItem.myBestPercentage !== null ? (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <TrophyIcon className="size-3.5 text-amber-500" />
                  Personal Best
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(workspaceItem.myBestPercentage)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, workspaceItem.myBestPercentage))}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <SparklesIcon className="size-3.5 text-sky-500" />
                <span className="font-medium text-foreground/80">Ready to attempt</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                {workspaceItem.attemptsCount > 0
                  ? `${workspaceItem.attemptsCount} attempt${workspaceItem.attemptsCount === 1 ? "" : "s"}`
                  : "0 attempts"}
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

            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
              <span className="bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground">
                {communityItem.attemptsCount} {communityItem.attemptsCount === 1 ? "attempt" : "attempts"}
              </span>
              {communityItem.avgScorePercentage !== null && (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                  ★ {communityItem.avgScorePercentage}% avg
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Segment 4: Balanced Action Ribbon ── */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-muted/20 text-xs">
        {isWorkspace && workspaceItem ? (
          <>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-lg"
                render={
                  <Link
                    href={workspaceRoutes.mockTests.detail(
                      workspaceSlug,
                      workspaceItem.id
                    )}
                  />
                }
              >
                Details
              </Button>

              {canWrite && onShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare(workspaceItem)}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-lg gap-1.5 cursor-pointer"
                >
                  <Share2Icon className="size-3.5" />
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
                  className="h-8 rounded-lg px-3.5 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-2xs transition-all cursor-pointer"
                />
              ) : canWrite ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs font-medium gap-1.5 border-border hover:bg-muted text-foreground shadow-2xs cursor-pointer"
                  render={
                    <Link
                      href={workspaceRoutes.mockTests.edit(
                        workspaceSlug,
                        workspaceItem.id
                      )}
                    />
                  }
                >
                  <FilePenLineIcon className="size-3.5" />
                  Edit Paper
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md border border-border/50 bg-muted/40">
                  Draft Only
                </span>
              )}
            </div>
          </>
        ) : communityItem ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-lg gap-1 shrink-0"
              render={<Link href={`/assessments/share/${communityItem.id}`} />}
            >
              Details
              <ExternalLinkIcon className="size-3 text-muted-foreground/80" />
            </Button>

            <div className="flex items-center gap-1.5 shrink-0">
              {communityItem.allowCloning && onClone && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCloning}
                  onClick={() => onClone(communityItem.id, communityItem.title)}
                  className="h-8 rounded-lg px-2.5 text-xs font-medium gap-1.5 border-border hover:bg-muted text-foreground shadow-2xs cursor-pointer"
                >
                  <CopyIcon className="size-3.5" />
                  {isCloning ? "Cloning..." : "Clone"}
                </Button>
              )}

              <Button
                size="sm"
                className="h-8 rounded-lg px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-2xs gap-1.5 cursor-pointer"
                render={<Link href={`/assessments/share/${communityItem.id}`} />}
              >
                <PlayIcon className="size-3.5 fill-current" />
                Take Test
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

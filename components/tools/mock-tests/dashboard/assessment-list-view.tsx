"use client"

import Link from "next/link"
import {
  CalculatorIcon,
  CopyIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  GlobeIcon,
  LinkIcon,
  PlayIcon,
  Share2Icon,
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
import type { AssessmentListViewProps } from "./types"

export function AssessmentListView({
  workspaceSlug,
  mode,
  items,
  canWrite = false,
  cloningId,
  onShare,
  onClone,
}: AssessmentListViewProps) {
  const isWorkspace = mode === "workspace"

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      {/* Header Row */}
      <div className="hidden border-b border-border bg-muted/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[2fr_130px_160px_140px_160px_160px] lg:items-center lg:gap-4 font-mono">
        <span>Test Paper &amp; Exam</span>
        <span>Type</span>
        <span>Structure &amp; Pacing</span>
        <span>Status &amp; Visibility</span>
        <span>{isWorkspace ? "Personal Best" : "Cohort Avg"}</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Row Items */}
      <div className="divide-y divide-border/60">
        {items.map((item) => {
          const workspaceItem = isWorkspace ? (item as MockTestListItem) : null
          const communityItem = !isWorkspace ? (item as CommunityMockTestItem) : null
          const isCloning = cloningId === item.id

          return (
            <div
              key={item.id}
              className="grid gap-2 p-3 sm:p-4 text-xs lg:grid-cols-[2fr_130px_160px_140px_160px_160px] lg:items-center lg:gap-4 hover:bg-muted/20 transition-colors"
            >
              {/* Col 1: Paper & Exam Tag */}
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={
                    isWorkspace
                      ? workspaceRoutes.mockTests.detail(workspaceSlug, item.id)
                      : `/assessments/share/${item.id}`
                  }
                  className="font-bold text-foreground hover:underline truncate block font-heading text-sm"
                >
                  {item.title}
                </Link>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.taxonomy?.examTag ? (
                    <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/50">
                      {item.taxonomy.examTag}
                    </span>
                  ) : null}
                  {item.calculatorAllowed !== false ? (
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 inline-flex items-center gap-0.5">
                      <CalculatorIcon className="size-2.5" /> Calc
                    </span>
                  ) : null}
                  {item.taxonomy?.subjects && item.taxonomy.subjects.length > 0 ? (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {item.taxonomy.subjects.join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Col 2: Type */}
              <div>
                <span className="inline-block text-[11px] font-medium text-muted-foreground capitalize">
                  {item.taxonomy?.paperType ? item.taxonomy.paperType.replace(/_/g, " ") : "Mock Test"}
                </span>
              </div>

              {/* Col 3: Structure & Pacing */}
              <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                <div>
                  <strong className="text-foreground">{item.questionCount}</strong> Qs
                  {item.totalMarks ? ` • ${item.totalMarks} M` : ""}
                </div>
                <div>{item.durationMinutes ? `${item.durationMinutes} mins` : "Untimed"}</div>
              </div>

              {/* Col 4: Status & Visibility */}
              <div className="flex items-center gap-1 flex-wrap">
                {isWorkspace && workspaceItem ? (
                  <>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-2 py-0.5",
                        workspaceItem.status === "published"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {workspaceItem.status === "published" ? "Published" : "Draft"}
                    </Badge>
                    {workspaceItem.visibility === "public" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        <GlobeIcon className="size-2.5" /> Public
                      </span>
                    ) : workspaceItem.visibility === "unlisted" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400">
                        <LinkIcon className="size-2.5" /> Shared
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 bg-emerald-500/10">
                    <GlobeIcon className="size-2.5" />
                    Public
                  </span>
                )}
              </div>

              {/* Col 5: Personal Best or Cohort Info */}
              <div>
                {isWorkspace && workspaceItem ? (
                  workspaceItem.myBestPercentage !== null ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrophyIcon className="size-2.5 text-amber-500" />
                          Best
                        </span>
                        <span className="font-bold text-foreground">
                          {Math.round(workspaceItem.myBestPercentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-foreground h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, workspaceItem.myBestPercentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Not attempted</span>
                  )
                ) : communityItem ? (
                  <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                    <div>{communityItem.attemptsCount} attempts</div>
                    {communityItem.avgScorePercentage !== null && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {communityItem.avgScorePercentage}% avg
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Col 6: Actions */}
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                {isWorkspace && workspaceItem ? (
                  <>
                    {canWrite && onShare && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onShare(workspaceItem)}
                        className="h-8 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Share paper"
                      >
                        <Share2Icon className="size-3" />
                      </Button>
                    )}

                    {workspaceItem.status === "published" ? (
                      <StartAttemptButton
                        workspaceSlug={workspaceSlug}
                        assessmentId={workspaceItem.id}
                        size="sm"
                        label="Start"
                        className="h-8 rounded-full px-3 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
                      />
                    ) : canWrite ? (
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-8 rounded-full px-2.5 text-xs font-semibold gap-1 border-border hover:bg-muted/50 text-foreground cursor-pointer"
                        render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, workspaceItem.id)} />}
                      >
                        <FilePenLineIcon className="size-3" />
                        Edit
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground rounded-full">
                        Draft
                      </Badge>
                    )}
                  </>
                ) : communityItem ? (
                  <>
                    {communityItem.allowCloning && onClone && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={isCloning}
                        onClick={() => onClone(communityItem.id, communityItem.title)}
                        className="h-8 rounded-full px-2.5 text-xs font-semibold gap-1 border-border hover:bg-muted/50 text-foreground cursor-pointer"
                      >
                        <CopyIcon className="size-3" />
                        {isCloning ? "Cloning..." : "Clone"}
                      </Button>
                    )}

                    <Button
                      size="xs"
                      className="h-8 rounded-full px-3 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
                      render={<Link href={`/assessments/share/${communityItem.id}`} />}
                    >
                      <PlayIcon className="size-3 fill-current" />
                      Take
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

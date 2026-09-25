"use client"

import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  FileTextIcon,
  GlobeIcon,
  LayersIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react"
import type { DashboardMetricsStripProps } from "./types"

export function DashboardMetricsStrip({
  activeTab,
  workspaceStats,
  communityStats,
  communityCount,
  workspaceCount,
  onTabChange,
}: DashboardMetricsStripProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
      {activeTab === "workspace" ? (
        <>
          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">My Test Papers</span>
              <FileTextIcon className="size-4 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {workspaceStats.total}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {workspaceStats.published} published • {workspaceStats.drafts} drafts
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tests Attempted</span>
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {workspaceStats.attemptsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Across all your test papers
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Average Accuracy</span>
              <TargetIcon className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {workspaceStats.avgAccuracy !== null ? `${workspaceStats.avgAccuracy}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Evaluated CBT questions
            </p>
          </div>

          <button
            type="button"
            onClick={() => onTabChange("community")}
            className="p-4 sm:p-5 space-y-1 text-left hover:bg-muted/20 transition-all group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium group-hover:text-foreground transition-colors">
                Community Hub
              </span>
              <GlobeIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center justify-between">
              <span>{communityCount}</span>
              <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Switch to public mocks →
            </p>
          </button>
        </>
      ) : (
        <>
          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Public Mock Papers</span>
              <GlobeIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {communityStats.total}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Available to all learners
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Subjects Covered</span>
              <LayersIcon className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {communityStats.subjectsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Indexed discipline topics
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Cohort Attempts</span>
              <UsersIcon className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {communityStats.totalAttempts}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Recorded across platform
            </p>
          </div>

          <button
            type="button"
            onClick={() => onTabChange("workspace")}
            className="p-4 sm:p-5 space-y-1 text-left hover:bg-muted/20 transition-all group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium group-hover:text-foreground transition-colors">
                My Workspace Tests
              </span>
              <BookOpenIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center justify-between">
              <span>{workspaceCount}</span>
              <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">
              Return to private papers →
            </p>
          </button>
        </>
      )}
    </div>
  )
}

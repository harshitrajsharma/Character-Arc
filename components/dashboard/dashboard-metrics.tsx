"use client"

import * as React from "react"
import Link from "next/link"
import {
  TargetIcon,
  GraduationCapIcon,
  FileCheckIcon,
  CpuIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { useSettings } from "@/components/settings/settings-provider"
import type { DashboardMomentumMetrics } from "@/lib/dashboard/current-arcs"
import { cn } from "@/lib/utils"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDeterministicDate(dateString: string | null | undefined): string {
  if (!dateString) return ""
  const parts = dateString.split("-").map(Number)
  if (parts.length === 3 && parts.every((p) => Number.isInteger(p) && !isNaN(p))) {
    const monthName = MONTHS[parts[1] - 1] || ""
    return `${monthName} ${parts[2]}, ${parts[0]}`
  }
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
}

export function DashboardMetrics({
  metrics,
  workspaceSlug,
  mcpConnected = false,
}: {
  metrics: DashboardMomentumMetrics
  workspaceSlug: string
  mcpConnected?: boolean
}) {
  const { openSettings } = useSettings()

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Goals & Paths Momentum */}
      <Link
        href={`/workspace/${encodeURIComponent(workspaceSlug)}/goals-paths`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <TargetIcon className="size-4.5" />
          </span>
          <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {metrics.activeGoalsCount > 0 ? metrics.activeGoalsCount : "0"}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium text-muted-foreground">Active Arcs</span>
            {metrics.activeGoalsCount > 0 && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {metrics.avgGoalsProgress}% avg
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 2. Upcoming Exam Countdown */}
      {metrics.nearestExam ? (
        <Link
          href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep/${encodeURIComponent(metrics.nearestExam.id)}`}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <GraduationCapIcon className="size-4.5" />
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              {metrics.nearestExam.daysLeft === 0 ? "Today!" : `${metrics.nearestExam.daysLeft}d left`}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-foreground line-clamp-1 truncate">
              {metrics.nearestExam.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              Target: {formatDeterministicDate(metrics.nearestExam.targetDate)}
            </p>
          </div>
        </Link>
      ) : (
        <Link
          href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep/new`}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4 transition-all hover:bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <GraduationCapIcon className="size-4.5" />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">+ Add Target</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground">No Upcoming Exams</p>
            <p className="text-xs text-muted-foreground mt-0.5">Set an exam date & syllabus</p>
          </div>
        </Link>
      )}

      {/* 3. Practice & Assessments */}
      <Link
        href={`/workspace/${encodeURIComponent(workspaceSlug)}/mock-tests`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <FileCheckIcon className="size-4.5" />
          </span>
          {metrics.bestAccuracyPercent !== null && (
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
              {metrics.bestAccuracyPercent}% Best
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {metrics.totalAssessmentsCount}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium text-muted-foreground">Assessments Available</span>
          </div>
        </div>
      </Link>

      {/* 4. MCP & AI Agent Gateway */}
      <button
        type="button"
        onClick={() => openSettings("mcp", workspaceSlug)}
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:shadow-xs text-left",
          mcpConnected ? "hover:border-emerald-500/40" : "hover:border-primary/40"
        )}
        aria-label={
          mcpConnected
            ? "MCP Agent Gateways connected. Open gateway settings."
            : "MCP Agent Gateways not connected. Open settings to connect."
        }
      >
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CpuIcon className="size-4.5" />
          </span>
          {mcpConnected ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2Icon className="size-3" />
              Live
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Not connected
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-foreground">MCP Agent Gateways</p>
          <p className="text-xs text-muted-foreground mt-0.5">Claude, Cursor & local agents</p>
        </div>
      </button>
    </div>
  )
}

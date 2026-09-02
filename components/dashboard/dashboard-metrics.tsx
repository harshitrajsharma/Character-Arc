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
import { Card } from "@/components/ui/card"
import type { DashboardMomentumMetrics } from "@/lib/dashboard/current-arcs"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDeterministicDate(dateString: string | null | undefined): string {
  if (!dateString) return ""
  const parts = dateString.split("-").map(Number)
  if (parts.length === 3 && parts.every((p) => Number.isInteger(p) && !isNaN(p))) {
    const monthName = MONTHS[parts[1] - 1] || ""
    return monthName + " " + parts[2] + ", " + parts[0]
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
    <Card className="overflow-hidden p-0 border-border/80 bg-card shadow-xs">
      <div className="grid grid-cols-1 divide-y divide-border/80 sm:grid-cols-2 sm:divide-y-0 sm:divide-x sm:[&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(n+3)]:border-border/80 lg:grid-cols-4 lg:[&>*:nth-child(n+3)]:border-t-0 lg:divide-x">
        {/* 1. Goals & Paths Momentum */}
        <Link
          href={"/workspace/" + encodeURIComponent(workspaceSlug) + "/goals-paths"}
          className="group relative flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-muted/30 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TargetIcon className="size-4" />
            </span>
            <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
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
            href={"/workspace/" + encodeURIComponent(workspaceSlug) + "/exam-prep/" + encodeURIComponent(metrics.nearestExam.id)}
            className="group relative flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-muted/30 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <GraduationCapIcon className="size-4" />
              </span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {metrics.nearestExam.daysLeft === 0 ? "Today!" : metrics.nearestExam.daysLeft + "d left"}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm font-bold text-foreground line-clamp-1 truncate font-heading">
                {metrics.nearestExam.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
                Target: {formatDeterministicDate(metrics.nearestExam.targetDate)}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href={"/workspace/" + encodeURIComponent(workspaceSlug) + "/exam-prep/new"}
            className="group relative flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-muted/30 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <GraduationCapIcon className="size-4" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">+ Add Target</span>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold text-foreground font-heading">No Upcoming Exams</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set an exam date & syllabus</p>
            </div>
          </Link>
        )}

        {/* 3. Practice & Assessments */}
        <Link
          href={"/workspace/" + encodeURIComponent(workspaceSlug) + "/mock-tests"}
          className="group relative flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-muted/30 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileCheckIcon className="size-4" />
            </span>
            {metrics.bestAccuracyPercent !== null && (
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                {metrics.bestAccuracyPercent}% Best
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
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
          className="group relative flex flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-muted/30 text-left cursor-pointer"
          aria-label={
            mcpConnected
              ? "MCP Agent Gateways connected. Open gateway settings."
              : "MCP Agent Gateways not connected. Open settings to connect."
          }
        >
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CpuIcon className="size-4" />
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
          <div className="mt-3">
            <p className="text-sm font-bold text-foreground font-heading">MCP Agent Gateways</p>
            <p className="text-xs text-muted-foreground mt-0.5">Claude, Cursor & local agents</p>
          </div>
        </button>
      </div>
    </Card>
  )
}

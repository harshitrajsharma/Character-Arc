"use client"

import * as React from "react"
import Link from "next/link"
import {
  TargetIcon,
  GraduationCapIcon,
  FileCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  CompassIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CurrentArcItem } from "@/lib/dashboard/current-arcs"
import { cn } from "@/lib/utils"

const toolBadgeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  "core.exam-prep": {
    icon: GraduationCapIcon,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "Exam Prep",
  },
  "core.goals-paths": {
    icon: TargetIcon,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    label: "Goals & Paths",
  },
  "core.mock-tests": {
    icon: FileCheckIcon,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    label: "Mock Tests",
  },
}

function getToolBadge(key: string) {
  return (
    toolBadgeConfig[key] ?? {
      icon: SparklesIcon,
      color: "bg-primary/10 text-primary border-primary/20",
      label: "Tool",
    }
  )
}

function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return "Recent"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function CurrentArcGrid({
  items,
  workspaceSlug,
}: {
  items: CurrentArcItem[]
  workspaceSlug: string
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 bg-muted/10 p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CompassIcon className="size-7" />
        </div>
        <h3 className="mt-4 font-heading text-lg font-bold text-foreground sm:text-xl">
          Choose your first focus arc
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
          Set up a target exam, create a structured outcome arc, or take a practice mock test to establish your baseline.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="sm"
            className="rounded-full"
            render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/goals-paths/new`} />}
          >
            <TargetIcon className="mr-1.5 size-4" />
            Create Goal Arc
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep/new`} />}
          >
            <GraduationCapIcon className="mr-1.5 size-4" />
            Add Exam Syllabus
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/assessments/new`} />}
          >
            <FileCheckIcon className="mr-1.5 size-4" />
            Practice Mock Test
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const badgeInfo = getToolBadge(item.toolKey)
        const Icon = badgeInfo.icon
        const progress = Math.min(100, Math.max(0, Math.round(item.progressPercent)))

        return (
          <Link
            key={`${item.toolKey}-${item.id}`}
            href={item.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-muted/20 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md"
          >
            <div>
              {/* Card Header: Tool Pill + Meta */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    badgeInfo.color
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{badgeInfo.label}</span>
                </span>

                {item.metaLabel ? (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {item.metaLabel}
                  </span>
                ) : null}
              </div>

              {/* Title & Summary */}
              <h4 className="mt-3.5 font-heading text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {item.title}
              </h4>
              {item.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
              ) : null}
            </div>

            {/* Card Footer: Progress Bar + Jump Action */}
            <div className="mt-5 space-y-3 pt-3 border-t border-border/30">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Progress</span>
                  <span className="font-bold tabular-nums text-foreground">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span suppressHydrationWarning>Updated {formatActivityDate(item.lastActivityAt ?? item.updatedAt)}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

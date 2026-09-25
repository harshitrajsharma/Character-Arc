"use client"

import * as React from "react"
import Link from "next/link"
import {
  TargetIcon,
  GraduationCapIcon,
  FileCheckIcon,
  ZapIcon,
  PlusIcon,
} from "lucide-react"
import { useSettings } from "@/components/settings/settings-provider"
import { Button } from "@/components/ui/button"

export function DashboardQuickActions({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const { openSettings } = useSettings()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ZapIcon className="size-3.5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Action Bar</p>
          <p className="text-sm font-semibold text-foreground">Make your next move</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full border-border/60 text-xs"
          render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/goals-paths/new`} />}
        >
          <TargetIcon className="size-3.5 text-blue-500" />
          <span>New Goal</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full border-border/60 text-xs"
          render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/exam-prep/new`} />}
        >
          <GraduationCapIcon className="size-3.5 text-amber-500" />
          <span>Add Exam</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-full border-border/60 text-xs"
          render={<Link href={`/workspace/${encodeURIComponent(workspaceSlug)}/assessments/new`} />}
        >
          <FileCheckIcon className="size-3.5 text-sky-500" />
          <span>Assessment</span>
        </Button>

        <Button
          size="sm"
          className="gap-1.5 rounded-full text-xs"
          onClick={() => openSettings("mcp", workspaceSlug)}
        >
          <PlusIcon className="size-3.5" />
          <span>Connect AI</span>
        </Button>
      </div>
    </div>
  )
}

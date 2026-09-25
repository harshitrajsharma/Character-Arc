"use client"

import Link from "next/link"
import { LayersIcon, PlusIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { DashboardHeaderProps } from "./types"

export function DashboardHeader({ workspaceSlug, canWrite }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            <ShieldCheckIcon className="size-3.5 text-foreground" />
            CBT Assessment Engine
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Mock Tests &amp; Assessments
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl font-sans">
          Simulate realistic examination conditions, track cohort performance, and discover community-published practice tests.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full px-3.5 text-xs font-semibold gap-1.5 border-border hover:bg-muted/40 text-foreground"
          render={<Link href={workspaceRoutes.mockTests.questions(workspaceSlug)} />}
        >
          <LayersIcon className="size-3.5 text-muted-foreground" />
          Question Bank
        </Button>

        {canWrite ? (
          <Button
            size="sm"
            className="h-9 rounded-full px-4 text-xs font-bold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shadow-xs transition-opacity"
            render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
          >
            <PlusIcon className="size-3.5" />
            Create Paper
          </Button>
        ) : null}
      </div>
    </div>
  )
}

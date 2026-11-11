"use client"

import Link from "next/link"
import { LayersIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { DashboardHeaderProps } from "./types"

export function DashboardHeader({
  workspaceSlug,
  canWrite,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
          Mock tests
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a paper, continue a test, or review a result.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
        <Button
          variant="outline"
          className="h-11"
          render={
            <Link href={workspaceRoutes.mockTests.questions(workspaceSlug)} />
          }
        >
          <LayersIcon data-icon="inline-start" aria-hidden="true" />
          Question Bank
        </Button>
        {canWrite ? (
          <Button
            className="h-11"
            render={
              <Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />
            }
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Create Paper
          </Button>
        ) : null}
      </div>
    </header>
  )
}

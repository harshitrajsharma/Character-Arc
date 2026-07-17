"use client"

import { ActivityIcon, ArrowUpRightIcon } from "lucide-react"

import { ArcCheckInForm } from "@/components/tools/goals-paths/arc-check-in-form"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

type ArcMobileCheckInProps = {
  arcId: string
  workspaceId: string
  installationId: string
  currentStatus: string
  progressPercent: number
  checkInCount: number
}

export function ArcMobileCheckIn({
  arcId,
  workspaceId,
  installationId,
  currentStatus,
  progressPercent,
  checkInCount,
}: ArcMobileCheckInProps) {
  const progress = Math.min(100, Math.max(0, progressPercent))

  return (
    <section className="mt-5 py-4 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ActivityIcon className="size-3.5" aria-hidden="true" />
            Arc signal
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {Math.round(progress)}%
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {checkInCount} check-in{checkInCount === 1 ? "" : "s"}
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-neon-soft"
        role="progressbar"
        aria-label="Arc progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span
          className="block h-full rounded-full bg-brand-neon"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Drawer showSwipeHandle>
        <DrawerTrigger
          render={<Button type="button" className="mt-4 h-11 w-full" />}
        >
          Record check-in
          <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="border-b border-border p-5 text-left">
            <DrawerTitle>Record an honest signal</DrawerTitle>
            <DrawerDescription>
              {"Update progress, note what changed, or adjust this Arc's status."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <ArcCheckInForm
              arcId={arcId}
              workspaceId={workspaceId}
              installationId={installationId}
              currentStatus={currentStatus}
              progressPercent={progress}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  )
}

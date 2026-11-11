"use client"

import Link from "next/link"
import { ArrowRightIcon, ClockIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ActiveAttemptBannerProps } from "./types"

export function ActiveAttemptBanner({
  activeAttempt,
}: ActiveAttemptBannerProps) {
  if (!activeAttempt) return null

  return (
    <Alert
      role="status"
      className="rounded-lg border-brand-violet-line bg-brand-violet-soft p-4"
    >
      <ClockIcon aria-hidden="true" className="text-brand-violet-ink" />
      <AlertTitle>Continue your test</AlertTitle>
      <AlertDescription className="flex min-w-0 flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium break-words text-foreground">
            {activeAttempt.assessmentTitle}
          </p>
          <p className="text-xs">
            An unfinished attempt is saved. Open it to check its current status.
          </p>
        </div>
        <Button
          size="sm"
          className="h-11 w-full shrink-0 sm:w-auto"
          render={
            <Link
              href={`/assessments/${encodeURIComponent(activeAttempt.id)}`}
            />
          }
        >
          Resume test{" "}
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}

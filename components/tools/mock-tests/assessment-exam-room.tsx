"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MonitorIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AttemptPlayer } from "./attempt-player"
import { useAssessmentDisplay } from "./attempt-display-notice"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { cn } from "@/lib/utils"
import {
  MIN_ASSESSMENT_HEIGHT,
  MIN_ASSESSMENT_WIDTH,
} from "@/lib/tools/mock-tests/attempt-display"
import type { PlayerAttempt } from "@/lib/tools/definitions/mock-tests/repository"

export function AssessmentExamRoom({
  workspaceSlug,
  attempt,
  returnTo,
}: {
  workspaceSlug: string
  attempt: PlayerAttempt
  returnTo?: string | null
}) {
  const supported = useAssessmentDisplay()
  const gateTitle = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (supported === false) gateTitle.current?.focus()
  }, [supported])
  // Keep an already-mounted player alive when a window shrinks: answers and its
  // deadline timer must survive. Initially unsupported screens never mount it.
  const [entered, setEntered] = useState(false)
  if (supported === true && !entered) setEntered(true)
  return (
    <>
      {entered ? (
        <div
          className={cn(
            "cbt-exam-root light fixed inset-0 z-50 flex-col overflow-hidden bg-white font-sans text-slate-950 antialiased select-none",
            supported ? "flex" : "hidden"
          )}
          inert={!supported}
          aria-hidden={!supported}
          data-cbt-theme="light"
          data-theme="light"
        >
          <AttemptPlayer
            workspaceSlug={workspaceSlug}
            attempt={attempt}
            displayAllowed={supported === true}
            returnTo={returnTo}
          />
        </div>
      ) : null}
      {supported !== true ? (
        <main
          className="fixed inset-0 z-50 flex min-w-0 flex-col items-center overflow-y-auto bg-background p-6 text-foreground"
          data-attempt-display-gate
        >
          {supported === null ? (
            <div
              role="status"
              className="my-auto flex w-full max-w-sm shrink-0 flex-col gap-4"
            >
              <span>Checking screen size…</span>
              <Skeleton className="h-6 w-3/4 motion-reduce:animate-none" />
              <Skeleton className="h-16 w-full motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="my-auto flex w-full max-w-md shrink-0 flex-col items-start gap-4">
              <MonitorIcon
                className="size-10 text-muted-foreground"
                aria-hidden="true"
              />
              <h1
                ref={gateTitle}
                tabIndex={-1}
                className="font-heading text-2xl font-semibold"
              >
                Use a larger screen to continue
              </h1>
              <p className="text-sm text-muted-foreground">
                This assessment needs a tablet or computer with a window at
                least {MIN_ASSESSMENT_WIDTH} × {MIN_ASSESSMENT_HEIGHT} pixels.
                Rotate your tablet or enlarge the window to continue.
              </p>
              <p className="text-sm font-medium">
                This attempt is already in progress.
                {attempt.durationMinutes === null
                  ? " Return to a larger screen to continue."
                  : " Its time limit continues; resizing does not pause the test."}
              </p>
              <Link
                className={cn(buttonVariants(), "min-h-11")}
                href={
                  returnTo ??
                  workspaceRoutes.mockTests.detail(
                    workspaceSlug,
                    attempt.assessmentId
                  )
                }
              >
                {returnTo ? "Return to subject tests" : "Back to assessment"}
              </Link>
            </div>
          )}
        </main>
      ) : null}
    </>
  )
}

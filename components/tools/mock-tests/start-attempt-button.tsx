"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PlayIcon, MonitorIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AttemptDisplayNotice,
  useAssessmentDisplay,
} from "./attempt-display-notice"
import { canUseAssessmentDisplayNow } from "@/lib/tools/mock-tests/attempt-display"
import { Button } from "@/components/ui/button"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { createAttemptAction } from "@/lib/tools/mock-tests/actions/attempt-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  parseSubjectTestsReturn,
  subjectTestsHref,
  withSubjectReturn,
} from "@/lib/tools/exam-prep/assessment-study-context"

export function StartAttemptButton({
  workspaceSlug,
  assessmentId,
  label = "Start test",
  variant = "default",
  size = "lg",
  className,
  returnTo,
}: {
  workspaceSlug: string
  assessmentId: string
  label?: string
  variant?:
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "xs"
  className?: string
  returnTo?: string | null
}) {
  const router = useRouter()
  const supported = useAssessmentDisplay()
  const [displayNotice, setDisplayNotice] = useState(false)
  const [pending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  function handleStart() {
    if (!canUseAssessmentDisplayNow()) {
      setDisplayNotice(true)
      return
    }
    startTransition(async () => {
      try {
        const result = await createAttemptAction({
          workspaceSlug,
          assessmentId,
          idempotencyKey,
        })
        router.push(
          withSubjectReturn(
            workspaceRoutes.mockTests.attempt(workspaceSlug, result.attemptId),
            (() => {
              const scope = parseSubjectTestsReturn(workspaceSlug, returnTo)
              return scope ? subjectTestsHref(workspaceSlug, scope) : null
            })()
          )
        )
      } catch (error) {
        setIdempotencyKey(createIdempotencyKey())
        const message =
          error instanceof Error ? error.message : "Failed to start the test."
        toast.error("Error", { description: message })
      }
    })
  }

  return (
    <>
      <Button
        onClick={handleStart}
        disabled={pending || supported === null}
        variant={variant}
        size={size}
        className={className}
      >
        {pending ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : supported === false ? (
          <MonitorIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <PlayIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {supported === false ? "Larger screen" : label}
      </Button>
      <AttemptDisplayNotice
        open={displayNotice}
        onOpenChange={setDisplayNotice}
      />
    </>
  )
}

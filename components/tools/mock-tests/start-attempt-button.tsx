"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PlayIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { createAttemptAction } from "@/lib/tools/mock-tests/actions/attempt-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function StartAttemptButton({
  workspaceSlug,
  assessmentId,
}: {
  workspaceSlug: string
  assessmentId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  function handleStart() {
    startTransition(async () => {
      try {
        const result = await createAttemptAction({
          workspaceSlug,
          assessmentId,
          idempotencyKey,
        })
        router.push(
          workspaceRoutes.mockTests.attempt(workspaceSlug, result.attemptId)
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
    <Button onClick={handleStart} disabled={pending} size="lg">
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" />
      ) : (
        <PlayIcon data-icon="inline-start" aria-hidden="true" />
      )}
      Start test
    </Button>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { reportSaveError } from "@/components/tools/mock-tests/save-error"
import { publishAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"

export function PublishAssessmentButton({
  workspaceSlug,
  assessmentId,
  expectedRevision,
  onPublished,
  className,
}: {
  workspaceSlug: string
  assessmentId: string
  expectedRevision: number
  onPublished?: (revision: number) => void
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey()
  )

  function handlePublish() {
    startTransition(async () => {
      try {
        const result = await publishAssessmentAction({
          workspaceSlug,
          assessmentId,
          expectedRevision,
          idempotencyKey,
        })
        toast.success("Test published")
        router.refresh()
        onPublished?.(result.revision)
      } catch (error) {
        setIdempotencyKey(createIdempotencyKey())
        reportSaveError(error, "Failed to publish the test.")
      }
    })
  }

  return (
    <Button onClick={handlePublish} disabled={pending} className={className}>
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" />
      ) : (
        <SendIcon data-icon="inline-start" aria-hidden="true" />
      )}
      Publish
    </Button>
  )
}

"use client"

import { toast } from "sonner"

import { REVISION_CONFLICT_MESSAGE } from "@/lib/tools/mock-tests/revision-conflict"

export function isRevisionConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(REVISION_CONFLICT_MESSAGE)
  )
}

/**
 * Surfaces a save/publish failure. Revision conflicts get a dedicated toast
 * with a one-click reload so the page resyncs its expectedRevision instead of
 * leaving the user stuck on a stale view of the test.
 */
export function reportSaveError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (isRevisionConflict(error)) {
    toast.error("Test updated elsewhere", {
      description: REVISION_CONFLICT_MESSAGE,
      action: {
        label: "Reload",
        onClick: () => window.location.reload(),
      },
      duration: 15000,
    })
    return
  }
  toast.error("Error", { description: message })
}

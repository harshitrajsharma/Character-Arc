"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { CheckIcon, XIcon } from "lucide-react"

import {
  updateArcAction,
  type UpdateArcActionState,
} from "@/app/(app)/tools/goals-paths/actions"
import { ArcDirectionEditor } from "@/components/tools/create-arc/arc-direction-editor"
import type { ArcDraft } from "@/components/tools/create-arc/arc-form-types"
import { ArcOptionalContext } from "@/components/tools/create-arc/arc-optional-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const INITIAL_STATE: UpdateArcActionState = { status: "idle", message: "" }

type ArcEditFormProps = {
  arcId: string
  revision: number
  workspaceId: string
  installationId: string
  idempotencyKey: string
  initialDraft: ArcDraft
}

export function ArcEditForm({
  arcId,
  revision,
  workspaceId,
  installationId,
  idempotencyKey,
  initialDraft,
}: ArcEditFormProps) {
  const [state, formAction, pending] = useActionState(
    updateArcAction,
    INITIAL_STATE
  )
  const [draft, setDraft] = useState(initialDraft)
  const [optionalOpen, setOptionalOpen] = useState(
    Boolean(initialDraft.why || initialDraft.targetDate || initialDraft.constraints)
  )
  const detailHref = `/tools/goals-paths/${arcId}`

  function updateDraft<Key extends keyof ArcDraft>(
    key: Key,
    value: ArcDraft[Key]
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const optionalHasErrors = Boolean(
    state.fieldErrors?.why ||
      state.fieldErrors?.targetDate ||
      state.fieldErrors?.constraints
  )

  return (
    <form action={formAction} className="min-h-svh">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="installationId" value={installationId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="arcId" value={arcId} />
      <input type="hidden" name="expectedRevision" value={revision} />

      <main className="mx-auto w-full max-w-3xl px-4 pt-24 pb-32 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-4">
          <Link
            href={detailHref}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <XIcon data-icon="inline-start" aria-hidden="true" />
            Cancel
          </Link>
          <p className="text-xs text-muted-foreground">
            Revision {revision}
          </p>
        </div>

        <ArcDirectionEditor
          mode="edit"
          draft={draft}
          errors={state.fieldErrors}
          onChange={updateDraft}
        />
        <ArcOptionalContext
          draft={draft}
          errors={state.fieldErrors}
          open={optionalOpen || optionalHasErrors}
          onOpenChange={setOptionalOpen}
          onChange={updateDraft}
        />

        {state.status === "error" ? (
          <Alert variant="destructive" className="mt-6" aria-live="polite">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2">
          <Link
            href={detailHref}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-11 sm:min-h-9"
            )}
          >
            Cancel
          </Link>
          <Button type="submit" disabled={pending} className="min-h-11 sm:min-h-9">
            {pending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" aria-hidden="true" />}
            {pending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}

"use client"

import { useActionState, useRef } from "react"
import { CheckIcon, CirclePauseIcon, PlayIcon, SendIcon } from "lucide-react"

import {
  checkInArcAction,
  setArcStatusAction,
  type ArcMutationActionState,
} from "@/app/(app)/tools/goals-paths/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const INITIAL_STATE: ArcMutationActionState = { status: "idle", message: "" }

type ArcCheckInFormProps = {
  arcId: string
  workspaceId: string
  installationId: string
  currentStatus?: string | null
  progressPercent?: number | null
}

export function ArcCheckInForm({
  arcId,
  workspaceId,
  installationId,
  currentStatus = "not_started",
  progressPercent = 0,
}: ArcCheckInFormProps) {
  const [checkInState, checkInFormAction, checkInPending] = useActionState(
    checkInArcAction,
    INITIAL_STATE
  )
  const [statusState, statusFormAction, statusPending] = useActionState(
    setArcStatusAction,
    INITIAL_STATE
  )
  const checkInIdempotencyRef = useRef<HTMLInputElement>(null)
  const statusIdempotencyRef = useRef<HTMLInputElement>(null)

  function refreshCheckInKey() {
    if (checkInIdempotencyRef.current) {
      checkInIdempotencyRef.current.value = crypto.randomUUID()
    }
  }

  function refreshStatusKey() {
    if (statusIdempotencyRef.current) {
      statusIdempotencyRef.current.value = crypto.randomUUID()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={checkInFormAction} onSubmit={refreshCheckInKey}>
        <input type="hidden" name="arcId" value={arcId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="installationId" value={installationId} />
        <input
          ref={checkInIdempotencyRef}
          type="hidden"
          name="idempotencyKey"
          defaultValue={crypto.randomUUID()}
        />

        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="arc-progress">Progress</FieldLabel>
            <Input
              id="arc-progress"
              name="progressPercent"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              defaultValue={Math.round(progressPercent ?? 0)}
              aria-describedby="arc-progress-description"
              className="h-11 sm:h-9"
            />
            <FieldDescription id="arc-progress-description">
              Your best honest estimate from 0 to 100.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="arc-check-in-note">What changed?</FieldLabel>
            <Textarea
              id="arc-check-in-note"
              name="note"
              maxLength={2000}
              placeholder="A result, obstacle, decision, or useful signal..."
              aria-describedby="arc-check-in-note-description"
            />
            <FieldDescription id="arc-check-in-note-description">
              Keep it concrete enough to guide the next move.
            </FieldDescription>
          </Field>

          <Button
            type="submit"
            disabled={checkInPending}
            className="h-11 w-full sm:h-9"
          >
            {checkInPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {checkInPending ? "Saving..." : "Save check-in"}
          </Button>
        </FieldGroup>

        {checkInState.status !== "idle" ? (
          <Alert
            variant={
              checkInState.status === "error" ? "destructive" : "default"
            }
            className="mt-4"
            aria-live="polite"
          >
            {checkInState.status === "success" ? (
              <CheckIcon aria-hidden="true" />
            ) : null}
            <AlertDescription>{checkInState.message}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <form
        action={statusFormAction}
        className="border-t border-border pt-5"
        onSubmit={refreshStatusKey}
      >
        <input type="hidden" name="arcId" value={arcId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="installationId" value={installationId} />
        <input
          ref={statusIdempotencyRef}
          type="hidden"
          name="idempotencyKey"
          defaultValue={crypto.randomUUID()}
        />

        <FieldSet disabled={statusPending}>
          <FieldLegend variant="label">Arc status</FieldLegend>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pause a route without losing it, or close the loop when the outcome
            is reached.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              type="submit"
              name="status"
              value="active"
              size="sm"
              className="h-11 sm:h-8"
              variant={currentStatus === "active" ? "secondary" : "outline"}
              aria-pressed={currentStatus === "active"}
            >
              <PlayIcon data-icon="inline-start" aria-hidden="true" />
              Active
            </Button>
            <Button
              type="submit"
              name="status"
              value="paused"
              size="sm"
              className="h-11 sm:h-8"
              variant={currentStatus === "paused" ? "secondary" : "outline"}
              aria-pressed={currentStatus === "paused"}
            >
              <CirclePauseIcon data-icon="inline-start" aria-hidden="true" />
              Paused
            </Button>
            <Button
              type="submit"
              name="status"
              value="completed"
              size="sm"
              className="h-11 sm:h-8"
              variant={currentStatus === "completed" ? "secondary" : "outline"}
              aria-pressed={currentStatus === "completed"}
            >
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
              Done
            </Button>
          </div>
        </FieldSet>

        {statusPending ? (
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> Updating status...
          </p>
        ) : statusState.status !== "idle" ? (
          <p
            className={
              statusState.status === "error"
                ? "mt-3 text-xs text-destructive"
                : "mt-3 text-xs text-muted-foreground"
            }
            aria-live="polite"
          >
            {statusState.message}
          </p>
        ) : null}
      </form>
    </div>
  )
}

"use client"

import { useActionState, useEffect, useRef } from "react"
import { SendIcon } from "lucide-react"

import {
  checkInArcAction,
  setArcStatusAction,
  type ArcMutationActionState,
} from "@/lib/tools/goals-paths/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"

const INITIAL_STATE: ArcMutationActionState = { status: "idle", message: "" }

const ACTIONABLE_STATUSES = new Set(["active", "paused", "completed", "archived"])

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const

type ArcCheckInFormProps = {
  arcId: string
  workspaceId: string
  installationId: string
  workspaceSlug: string
  currentStatus?: string | null
  progressPercent?: number | null
}

export function ArcCheckInForm({
  arcId,
  workspaceId,
  installationId,
  workspaceSlug,
  currentStatus = "not_started",
  progressPercent = 0,
}: ArcCheckInFormProps) {
  const [checkInState, checkInFormAction, checkInPending] = useActionState(
    checkInArcAction.bind(null, workspaceSlug),
    INITIAL_STATE
  )
  const [statusState, statusFormAction, statusPending] = useActionState(
    setArcStatusAction.bind(null, workspaceSlug),
    INITIAL_STATE
  )
  const checkInIdempotencyRef = useRef<HTMLInputElement>(null)
  const statusIdempotencyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkInState.status === "success") {
      toast.success(checkInState.message)
    } else if (checkInState.status === "error") {
      toast.error(checkInState.message)
    }
  }, [checkInState])

  function refreshCheckInKey() {
    if (checkInIdempotencyRef.current) {
      checkInIdempotencyRef.current.value = createIdempotencyKey()
    }
  }

  function refreshStatusKey() {
    if (statusIdempotencyRef.current) {
      statusIdempotencyRef.current.value = createIdempotencyKey()
    }
  }

  const statusDefaultValue = ACTIONABLE_STATUSES.has(currentStatus ?? "")
    ? currentStatus!
    : "active"

  return (
    <div className="flex flex-col gap-6">
      <form action={statusFormAction} onSubmit={refreshStatusKey}>
        <input type="hidden" name="arcId" value={arcId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="installationId" value={installationId} />
        <input
          ref={statusIdempotencyRef}
          type="hidden"
          name="idempotencyKey"
          defaultValue={createIdempotencyKey()}
        />

        <FieldGroup className="gap-3">
          <Field>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <FieldTitle>Arc status</FieldTitle>
                <FieldDescription className="mt-1">
                  Set the route state before recording progress.
                </FieldDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                name="status"
                defaultValue={statusDefaultValue}
                disabled={statusPending}
                required
              >
                <SelectTrigger className="h-11 w-full sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                variant="secondary"
                disabled={statusPending}
                className="h-11 shrink-0 sm:h-9"
              >
                {statusPending ? <Spinner data-icon="inline-start" /> : null}
                Update status
              </Button>
            </div>
          </Field>
        </FieldGroup>

        {statusState.status !== "idle" ? (
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

      <form action={checkInFormAction} onSubmit={refreshCheckInKey}>
        <input type="hidden" name="arcId" value={arcId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="installationId" value={installationId} />
        <input
          ref={checkInIdempotencyRef}
          type="hidden"
          name="idempotencyKey"
          defaultValue={createIdempotencyKey()}
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
      </form>
    </div>
  )
}

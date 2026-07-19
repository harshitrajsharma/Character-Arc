"use client"

import { useActionState } from "react"
import { CheckIcon, PlusIcon } from "lucide-react"

import {
  installToolAction,
  type InstallToolActionState,
} from "@/app/(app)/tools/actions"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const initialState: InstallToolActionState = {
  status: "idle",
  message: "",
}

type InstallToolFormProps = {
  workspaceId: string
  workspaceSlug: string
  toolKey: string
  installationStatus: "active" | "disabled" | "removed" | "not_installed"
  installable: boolean
}

export function InstallToolForm({
  workspaceId,
  workspaceSlug,
  toolKey,
  installationStatus,
  installable,
}: InstallToolFormProps) {
  const [state, formAction, pending] = useActionState(
    installToolAction,
    initialState
  )
  const installed = installationStatus === "active"
  const actionLabel =
    installationStatus === "disabled"
      ? "Enable"
      : installationStatus === "removed"
        ? "Reinstall"
        : "Install"

  if (installed) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-11 min-w-20 sm:h-8"
      >
        <CheckIcon data-icon="inline-start" aria-hidden="true" />
        Installed
      </Button>
    )
  }

  if (!installable) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-11 min-w-20 sm:h-8"
      >
        Unavailable
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="toolKey" value={toolKey} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        className="h-11 min-w-20 sm:h-8"
      >
        {pending ? (
          <Spinner data-icon="inline-start" aria-hidden="true" />
        ) : (
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {pending ? "Installing..." : actionLabel}
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "max-w-52 text-right text-xs text-destructive"
              : "max-w-52 text-right text-xs text-muted-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

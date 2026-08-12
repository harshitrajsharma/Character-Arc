"use client"

import { useActionState } from "react"
import { ArchiveXIcon } from "lucide-react"

import {
  deleteArcAction,
  type ArcMutationActionState,
} from "@/lib/tools/goals-paths/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"

const INITIAL_STATE: ArcMutationActionState = { status: "idle", message: "" }

type ArcDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  arcId: string
  title: string
  revision: number
  checkInCount: number
  workspaceId: string
  installationId: string
  workspaceSlug: string
  idempotencyKey: string
}

export function ArcDeleteDialog({
  open,
  onOpenChange,
  arcId,
  title,
  revision,
  checkInCount,
  workspaceId,
  installationId,
  workspaceSlug,
  idempotencyKey,
}: ArcDeleteDialogProps) {
  const [state, formAction, pending] = useActionState(
    deleteArcAction.bind(null, workspaceSlug),
    INITIAL_STATE
  )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <ArchiveXIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this Arc?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="font-medium text-foreground">{title}</strong>{" "}
            will disappear from your workspace. Its {checkInCount} check-in
            {checkInCount === 1 ? "" : "s"} and audit history are retained for
            data integrity.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state.status === "error" ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {state.message}
          </p>
        ) : null}

        <form action={formAction}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="installationId" value={installationId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="arcId" value={arcId} />
          <input type="hidden" name="expectedRevision" value={revision} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep Arc</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={pending}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Deleting" : "Delete Arc"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

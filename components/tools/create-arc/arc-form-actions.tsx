import { useEffect } from "react"

import { LockKeyholeIcon, TargetIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ArcFormActionsProps = {
  pending: boolean
  errorMessage?: string
}

export function ArcFormActions({ pending, errorMessage }: ArcFormActionsProps) {
  useEffect(() => {
    if (!pending && errorMessage) {
      toast.error("Arc not created", { description: errorMessage })
    }
  }, [pending, errorMessage])

  return (
    <>
      <div className="mt-6 flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : (
            <TargetIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {pending ? "Creating arc..." : "Create arc"}
        </Button>
        <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
          <LockKeyholeIcon
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          Saved privately. Agents need explicit tool permission to access it.
        </p>
      </div>
    </>
  )
}

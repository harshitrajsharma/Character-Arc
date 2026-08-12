import Link from "next/link"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { CheckCircle2Icon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"

type ArcFormSuccessProps = {
  message: string
  rootBlockId?: string
  workspaceSlug: string
}

export function ArcFormSuccess({
  message,
  rootBlockId,
  workspaceSlug,
}: ArcFormSuccessProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <Alert className="mx-auto max-w-xl border-brand-neon-line bg-brand-neon-soft">
        <CheckCircle2Icon aria-hidden="true" />
        <AlertTitle>Your arc is live</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <div className="mt-6 flex justify-center">
        <Link
          href={
            rootBlockId
              ? workspaceRoutes.goalsPaths.arc(workspaceSlug, rootBlockId)
              : workspaceRoutes.goalsPaths.home(workspaceSlug)
          }
          className={buttonVariants({ variant: "secondary" })}
        >
          {rootBlockId ? "Open your Arc" : "View your arcs"}
        </Link>
      </div>
    </div>
  )
}

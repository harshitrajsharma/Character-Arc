import Link from "next/link"
import { ArrowLeftIcon, LockKeyholeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function ArcFormToolbar({ workspaceSlug }: { workspaceSlug?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-20 pb-5 sm:px-6 lg:px-8 xl:px-10">
      <Link
        href={
          workspaceSlug
            ? workspaceRoutes.goalsPaths.home(workspaceSlug)
            : workspaceRoutes.tools.home
        }
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-3"
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Goals & Paths
      </Link>
      <Badge variant="outline" className="bg-background/60 backdrop-blur-sm">
        <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
        Private
      </Badge>
    </div>
  )
}

import Link from "next/link"
import { RouteOffIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function ArcNotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl items-center px-4 py-24">
      <Empty className="border-y border-border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RouteOffIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Arc not found</EmptyTitle>
          <EmptyDescription>
            This arc may have been removed, archived, or created in another
            workspace.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/tools/goals-paths"
            className={buttonVariants({ variant: "secondary" })}
          >
            Return to your arcs
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  )
}

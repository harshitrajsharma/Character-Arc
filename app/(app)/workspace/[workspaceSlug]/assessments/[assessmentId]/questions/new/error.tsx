"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export default function QuestionAuthoringError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const { workspaceSlug, assessmentId } = useParams<{
    workspaceSlug: string
    assessmentId: string
  }>()
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-24 pb-28">
      <h1 className="font-heading text-2xl font-semibold">
        Could not open question creation
      </h1>
      <p className="text-sm text-muted-foreground">
        Return to the builder to check the assessment and selected section, or
        try loading again.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={unstable_retry} className="min-h-11">
          Try again
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          render={
            <Link
              href={workspaceRoutes.mockTests.edit(workspaceSlug, assessmentId)}
            />
          }
        >
          Return to builder
        </Button>
      </div>
    </main>
  )
}

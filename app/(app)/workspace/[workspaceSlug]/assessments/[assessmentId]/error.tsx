"use client"

import { Button } from "@/components/ui/button"

export default function AssessmentError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-24 pb-10 md:px-6 xl:px-10">
      <h1 className="font-heading text-2xl font-semibold">
        Could not load this assessment
      </h1>
      <p className="text-sm text-muted-foreground">
        Try again to load the assessment and your attempts.
      </p>
      <Button onClick={unstable_retry} className="h-11 self-start">
        Try again
      </Button>
    </main>
  )
}

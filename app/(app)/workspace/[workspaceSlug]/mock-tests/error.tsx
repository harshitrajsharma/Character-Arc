"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type MockTestsErrorProps = {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function MockTestsError({
  error,
  unstable_retry,
}: MockTestsErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CircleAlertIcon className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
          Mock tests could not be loaded
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          An unexpected error interrupted this section. Your tests and attempts
          are safe — try again.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button onClick={() => unstable_retry()}>
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
          <Button variant="ghost" render={<Link href="/dashboard" />}>
            Back to workspace
          </Button>
        </div>
      </div>
    </main>
  )
}

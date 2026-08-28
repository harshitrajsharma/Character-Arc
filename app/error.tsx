"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type RootErrorProps = {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function RootError({ error, unstable_retry }: RootErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CircleAlertIcon className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          An unexpected error occurred. Your work is safe — try again.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button onClick={() => unstable_retry()}>
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="ghost" render={<Link href="/" />}>
            Go home
          </Button>
        </div>
      </div>
    </main>
  )
}

"use client"

import { CircleAlertIcon, RotateCcwIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type GoalsPathsErrorProps = {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function GoalsPathsError({
  unstable_retry,
}: GoalsPathsErrorProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-24 pb-8 sm:pb-10">
      <Alert variant="destructive" className="max-w-2xl">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Goals and Paths could not be loaded</AlertTitle>
        <AlertDescription>
          Your saved arcs were not changed. Retry the request to reconnect to
          your workspace.
        </AlertDescription>
      </Alert>
      <Button className="mt-4" variant="secondary" onClick={unstable_retry}>
        <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
        Try again
      </Button>
    </main>
  )
}

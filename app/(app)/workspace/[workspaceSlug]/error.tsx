"use client"

import { Button } from "@/components/ui/button"

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-10">
      <h1 className="font-heading text-2xl font-semibold">
        Could not load this workspace
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Your saved work is safe. Try again to load your exams and assessments.
      </p>
      <Button className="mt-5 h-11" onClick={reset}>
        Try again
      </Button>
    </main>
  )
}

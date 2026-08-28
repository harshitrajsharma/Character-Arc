import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AttemptPlayer } from "@/components/tools/mock-tests/attempt-player"
import { getAttemptForExamRoom } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "Exam Room — Mock Test" }

export default async function DedicatedExamRoomPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const res = await getAttemptForExamRoom(attemptId)
  if (!res) notFound()

  const { attempt, workspaceSlug } = res

  if (attempt.attemptStatus !== "in_progress") {
    redirect(
      workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.attemptId)
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground selection:bg-brand-violet-soft font-sans antialiased flex flex-col">
      <main className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col p-2 sm:p-3 lg:p-4 overflow-hidden">
        {attempt.instructions ? (
          <p className="mb-2 shrink-0 whitespace-pre-wrap rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-2xs">
            {attempt.instructions}
          </p>
        ) : null}
        <AttemptPlayer workspaceSlug={workspaceSlug} attempt={attempt} />
      </main>
    </div>
  )
}

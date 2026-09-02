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
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground font-sans antialiased flex flex-col">
      <AttemptPlayer workspaceSlug={workspaceSlug} attempt={attempt} />
    </div>
  )
}

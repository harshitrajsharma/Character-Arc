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
    <div
      className="cbt-exam-root light fixed inset-0 z-50 overflow-hidden bg-white text-slate-950 font-sans antialiased flex flex-col select-none"
      data-cbt-theme="light"
      data-theme="light"
    >
      <AttemptPlayer workspaceSlug={workspaceSlug} attempt={attempt} />
    </div>
  )
}

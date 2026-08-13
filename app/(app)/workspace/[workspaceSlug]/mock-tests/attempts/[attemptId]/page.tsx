import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AttemptPlayer } from "@/components/tools/mock-tests/attempt-player"
import { getAttemptForPlayer } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Attempt Test" }

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; attemptId: string }>
}) {
  const { workspaceSlug, attemptId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const attempt = await getAttemptForPlayer(
    workspace.id,
    attemptId,
    workspace.userId
  )
  if (!attempt) notFound()

  if (attempt.attemptStatus !== "in_progress") {
    redirect(
      workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.attemptId)
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-20 pb-8 sm:pb-10 md:px-6 xl:px-8">
      {attempt.instructions ? (
        <p className="mb-4 whitespace-pre-wrap rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-2xs">
          {attempt.instructions}
        </p>
      ) : null}
      <AttemptPlayer workspaceSlug={workspaceSlug} attempt={attempt} />
    </main>
  )
}

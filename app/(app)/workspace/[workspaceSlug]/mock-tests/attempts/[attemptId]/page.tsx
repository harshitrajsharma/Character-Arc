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
    <main className="mx-auto w-full max-w-3xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      {attempt.instructions ? (
        <p className="mb-5 whitespace-pre-wrap rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
          {attempt.instructions}
        </p>
      ) : null}
      <AttemptPlayer workspaceSlug={workspaceSlug} attempt={attempt} />
    </main>
  )
}

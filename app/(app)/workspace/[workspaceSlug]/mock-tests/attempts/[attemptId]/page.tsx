import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

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

  if (attempt.attemptStatus === "in_progress") {
    redirect(`/mock-test/${encodeURIComponent(attempt.attemptId)}`)
  }

  redirect(
    workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.attemptId)
  )
}

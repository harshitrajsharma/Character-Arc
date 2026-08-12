import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { MockTestDetailView } from "@/components/tools/mock-tests/mock-test-detail-view"
import {
  getAssessmentAttempts,
  getAssessmentDetail,
} from "@/lib/tools/definitions/mock-tests/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Mock Test" }

export default async function MockTestDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
}) {
  const { workspaceSlug, assessmentId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const assessment = await getAssessmentDetail(workspace.id, assessmentId)
  if (!assessment) notFound()

  const attempts = await getAssessmentAttempts(workspace.id, assessmentId)
  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      <MockTestDetailView
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        attempts={attempts}
        canWrite={canWrite}
      />
    </main>
  )
}

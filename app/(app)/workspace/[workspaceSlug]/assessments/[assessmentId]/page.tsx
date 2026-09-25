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

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "Mock Test" }
export const dynamic = "force-dynamic"

export default async function MockTestDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
}) {
  const { workspaceSlug, assessmentId } = await params
  console.log("[MockTestDetailPage] called with assessmentId:", assessmentId)
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const assessment = await getAssessmentDetail(workspace.id, assessmentId)
  if (!assessment) notFound()

  const attempts = await getAssessmentAttempts(workspace.id, assessmentId)
  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:pt-24 sm:pb-10 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Mock Tests", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: assessment.title },
        ]}
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        backLabel="Back to Mock Tests"
      />

      <MockTestDetailView
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        attempts={attempts}
        canWrite={canWrite}
      />
    </main>
  )
}

import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { QuestionForm } from "@/components/tools/mock-tests/question-form"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "New Question — Assessments" }

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ fromAssessmentId?: string; section?: string }>
}) {
  const { workspaceSlug } = await params
  const { fromAssessmentId, section } = await searchParams
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")
  if (fromAssessmentId)
    redirect(
      workspaceRoutes.mockTests.assessmentQuestionNew(
        workspaceSlug,
        fromAssessmentId,
        section
      )
    )

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-20 pb-28 sm:px-6 sm:pt-24 sm:pb-12 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          {
            label: "Assessments",
            href: workspaceRoutes.mockTests.home(workspaceSlug),
          },
          {
            label: "Question Bank",
            href: workspaceRoutes.mockTests.questions(workspaceSlug),
          },
          { label: "New Question" },
        ]}
        backHref={workspaceRoutes.mockTests.questions(workspaceSlug)}
        backLabel="Back to Question Bank"
      />
      <QuestionForm
        key={`${workspace.userId}:new`}
        workspaceSlug={workspaceSlug}
        viewerId={workspace.userId}
        fromAssessmentId={fromAssessmentId}
      />
    </main>
  )
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { AssessmentBuilder } from "@/components/tools/mock-tests/assessment-builder"
import { getAssessmentDetail } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Assessment builder — Assessments" }

export default async function EditMockTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
  searchParams: Promise<{ added?: string; section?: string; returnTo?: string }>
}) {
  const { workspaceSlug, assessmentId } = await params
  const query = await searchParams
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const assessment = await getAssessmentDetail(workspace.id, assessmentId)
  if (!assessment) notFound()
  const study = await resolveSubjectTestsReturn(workspaceSlug, query.returnTo)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-44 font-sans text-foreground sm:pb-28 md:px-6 xl:px-10">
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
          { label: assessment.title || "Assessment builder" },
        ]}
        backHref={
          study?.returnHref ??
          workspaceRoutes.mockTests.detail(workspaceSlug, assessment.id)
        }
        backLabel="Back to Assessment"
      />

      <AssessmentBuilder
        key={`${workspace.userId}:${assessment.id}`}
        workspaceSlug={workspaceSlug}
        viewerId={workspace.userId}
        assessment={assessment}
        subjectReturnHref={study?.returnHref}
        addedQuestionId={
          assessment.questions.some((question) => question.id === query.added)
            ? query.added
            : undefined
        }
        initialTargetSection={
          assessment.sections.some((section) => section.key === query.section)
            ? query.section
            : null
        }
      />
    </main>
  )
}

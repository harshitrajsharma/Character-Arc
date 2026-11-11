import type { Metadata } from "next"
import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { QuestionForm } from "@/components/tools/mock-tests/question-form"
import { getAssessmentQuestionAuthoringContext } from "@/lib/tools/mock-tests/actions/question-actions"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"

export const metadata: Metadata = {
  title: "Add new question — Assessment builder",
}

export default async function NewAssessmentQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
  searchParams: Promise<{ section?: string; returnTo?: string }>
}) {
  const { workspaceSlug, assessmentId } = await params
  const { section, returnTo } = await searchParams
  const study = await resolveSubjectTestsReturn(workspaceSlug, returnTo)
  const [workspace, assessmentContext] = await Promise.all([
    getWorkspaceIdentity(workspaceSlug),
    getAssessmentQuestionAuthoringContext(
      workspaceSlug,
      assessmentId,
      section ?? null
    ),
  ])
  const builder = withSubjectReturn(
    `${workspaceRoutes.mockTests.edit(workspaceSlug, assessmentId)}${assessmentContext.section ? `?section=${encodeURIComponent(assessmentContext.section)}` : ""}`,
    study?.returnHref
  )
  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-20 pb-28 sm:px-6 sm:pt-24 sm:pb-12 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: workspaceRoutes.home(workspaceSlug) },
          {
            label: "Assessments",
            href: workspaceRoutes.mockTests.home(workspaceSlug),
          },
          { label: assessmentContext.title, href: builder },
          { label: "New question" },
        ]}
        backHref={builder}
        backLabel="Back to assessment builder"
      />
      <QuestionForm
        key={`${workspace.userId}:${assessmentId}:new`}
        workspaceSlug={workspaceSlug}
        viewerId={workspace.userId}
        assessmentContext={assessmentContext}
        subjectReturnHref={study?.returnHref}
      />
    </main>
  )
}

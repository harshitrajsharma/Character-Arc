import { notFound, redirect } from "next/navigation"

import { getExamSubjectDashboardData } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { SubjectDetailPage } from "@/components/tools/exam-prep/subjects/subject-detail-page"
import { getWorkspaceIdentity, requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string; subjectId: string }>
}) {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")
  const { exam, issue } = await getExamDetail(workspace.id, workspaceSlug, examId)

  if (issue === "not_found" || !exam) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  const subjectWithRelations = await getExamSubjectDashboardData(exam.id, subjectId, workspace.id)

  if (!subjectWithRelations) {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-16 md:pt-24 pb-8 sm:pb-10">
      <SubjectDetailPage workspaceSlug={workspaceSlug} examId={examId} subject={subjectWithRelations} />
    </main>
  )
}

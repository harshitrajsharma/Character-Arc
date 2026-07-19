import { notFound, redirect } from "next/navigation"

import { getExamSubjectDashboardData } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { SubjectHeader } from "@/components/tools/exam-prep/subjects/subject-header"
import { SubjectSettingsForm } from "@/components/tools/exam-prep/subjects/subject-settings-form"
import { getWorkspaceIdentity, requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

interface SettingsPageProps {
  params: Promise<{ workspaceSlug: string; id: string; subjectId: string }>
}

export default async function SubjectSettingsPage({ params }: SettingsPageProps) {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")
  
  // Authenticate and retrieve exam details
  const { exam, issue } = await getExamDetail(workspace.id, workspaceSlug, examId)

  if (issue === "not_found" || !exam) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  // Retrieve subject details with workspace claims verified
  const subjectWithRelations = await getExamSubjectDashboardData(exam.id, subjectId, workspace.id)

  if (!subjectWithRelations) {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-10 pt-16 md:px-6 md:pt-24 xl:px-10">
      <SubjectHeader workspaceSlug={workspaceSlug} examId={examId} subject={subjectWithRelations} settingsPresentation="none" />
      <SubjectSettingsForm workspaceSlug={workspaceSlug} examId={examId} subject={subjectWithRelations} />
    </main>
  )
}

import { notFound } from "next/navigation"
import type { Metadata } from "next"

import {
  getExamSubjectDashboardData,
  getSubjectTitle,
} from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { SubjectDetailPage } from "@/components/tools/exam-prep/subjects/subject-detail-page"
import { getWorkspaceIdentity, requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"

type SubjectPageParams = Promise<{ workspaceSlug: string; id: string; subjectId: string }>

export async function generateMetadata({
  params,
}: {
  params: SubjectPageParams
}): Promise<Metadata> {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)           // cache hit
  const installation = await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")  // cache hit
  const subjectName = await getSubjectTitle(workspace.id, installation.id, subjectId)
  const { exam } = await getExamDetail(workspace.id, workspaceSlug, examId)  // cache hit from [id]/layout.tsx
  return {
    title: subjectName
      ? `${subjectName} — ${exam?.title ?? "Exam Prep"}`
      : "Subject",
  }
}

export default async function SubjectPage({
  params,
}: {
  params: SubjectPageParams
}) {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)           // cache hit
  const installation = await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")  // cache hit
  // Note: exam ownership validated by [id]/layout.tsx — no getExamDetail call needed here.

  const subjectWithRelations = await getExamSubjectDashboardData(
    workspace.id,
    installation.id,
    examId,
    subjectId,
    workspace.userId
  )

  if (!subjectWithRelations) {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-16 md:pt-24 pb-8 sm:pb-10">
      <SubjectDetailPage workspaceSlug={workspaceSlug} examId={examId} subject={subjectWithRelations} />
    </main>
  )
}

import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { getExamDashboardData } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { SubjectsView } from "@/components/tools/exam-prep/subjects/subjects-view"
import { ExamSubjectRecommendations } from "@/components/tools/exam-prep/subjects/exam-recommendations"
import { ContextBreadcrumbs } from "@/components/navigation/context-breadcrumbs"
import { ExamDetailHeader } from "@/components/tools/exam-prep/exam-detail-header"
import { generateExamSubjectRecommendations } from "@/lib/tools/exam-prep/recommendations"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>
}): Promise<Metadata> {
  const { workspaceSlug, id } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")
  const { exam } = await getExamDetail(workspace.id, workspaceSlug, id)

  return { title: exam?.title ?? "Exam Details" }
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>
}) {
  const { workspaceSlug, id } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )
  const { exam, issue } = await getExamDetail(workspace.id, workspaceSlug, id)

  if (
    issue === "not_found" ||
    !exam ||
    exam.originToolInstallationId !== installation.id
  ) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  const subjectsWithRelations = await getExamDashboardData(
    id,
    workspace.id,
    installation.id,
    workspace.userId
  )
  const recommendationAsOf = new Date()
  const recommendations = generateExamSubjectRecommendations({
    subjects: subjectsWithRelations,
    now: recommendationAsOf,
  })

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:pt-24 sm:pb-10 md:px-6 xl:px-10">
      <ContextBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Exam Prep", href: workspaceRoutes.examPrep.home(workspaceSlug) },
          { label: exam.title },
        ]}
        backHref={workspaceRoutes.examPrep.home(workspaceSlug)}
        backLabel="Back to Exam Prep"
        className="mb-6 rounded-2xl border border-border/60 bg-background/50"
      />

      <ExamDetailHeader
        workspaceSlug={workspaceSlug}
        exam={exam}
        settingsHref={workspaceRoutes.examPrep.examSettings(
          workspaceSlug,
          exam.id
        )}
      />

      <div className="mt-6 md:px-4">
        <ExamSubjectRecommendations
          workspaceSlug={workspaceSlug}
          examId={exam.id}
          output={{
            ...recommendations,
            asOf: recommendationAsOf.toISOString(),
          }}
        />
      </div>

      {/* Subjects View */}
      <SubjectsView
        workspaceSlug={workspaceSlug}
        examId={exam.id}
        subjects={subjectsWithRelations}
      />
    </main>
  )
}

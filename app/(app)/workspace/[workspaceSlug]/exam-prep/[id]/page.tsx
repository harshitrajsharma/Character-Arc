import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, GraduationCapIcon } from "lucide-react"

import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { getExamDashboardData } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { SubjectsView } from "@/components/tools/exam-prep/subjects/subjects-view"
import { getWorkspaceIdentity, requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string, id: string }>
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
  params: Promise<{ workspaceSlug: string, id: string }>
}) {
  const { workspaceSlug, id } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")
  const { exam, issue } = await getExamDetail(workspace.id, workspaceSlug, id)

  if (issue === "not_found" || !exam || exam.originToolInstallationId !== installation.id) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  const subjectsWithRelations = await getExamDashboardData(id, workspace.id, installation.id)



  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-10 pt-24 pb-8 sm:pb-10">
      <header className="mb-8 flex items-start gap-4 border-b border-border pb-6">
        <Link
          href={workspaceRoutes.examPrep.home(workspaceSlug)}
          className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">Back to exams</span>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
            <GraduationCapIcon className="size-4" aria-hidden="true" />
            <span>Exam Prep</span>
          </div>
          <h1 className="mt-1 truncate font-heading text-3xl font-semibold tracking-normal">
            {exam.title}
          </h1>
          {exam.summary ? (
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {exam.summary}
            </p>
          ) : null}
        </div>
      </header>

      {/* Subjects View */}
      <SubjectsView workspaceSlug={workspaceSlug} examId={exam.id} subjects={subjectsWithRelations} />
    </main>
  )
}

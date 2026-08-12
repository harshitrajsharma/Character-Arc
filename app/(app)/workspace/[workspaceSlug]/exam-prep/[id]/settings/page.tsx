import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ExamSettingsForm } from "@/components/tools/exam-prep/exam-settings-form"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

type ExamSettingsPageParams = Promise<{
  workspaceSlug: string
  id: string
}>

export async function generateMetadata({
  params,
}: {
  params: ExamSettingsPageParams
}): Promise<Metadata> {
  const { workspaceSlug, id: examId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const { exam } = await getExamDetail(workspace.id, workspaceSlug, examId)
  return {
    title: exam ? `${exam.title} Settings` : "Exam Settings",
  }
}

export default async function ExamSettingsPage({
  params,
}: {
  params: ExamSettingsPageParams
}) {
  const { workspaceSlug, id: examId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )

  const { exam, issue } = await getExamDetail(
    workspace.id,
    workspaceSlug,
    examId
  )

  if (
    !exam ||
    issue === "not_found" ||
    exam.originToolInstallationId !== installation.id
  ) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  const returnHref = workspaceRoutes.examPrep.exam(workspaceSlug, exam.id)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-10 sm:pt-24 md:px-6 xl:px-10">
      <header className="mb-10 flex items-center gap-3 border-b border-border/60 pb-6 lg:mx-auto lg:max-w-5xl">
        <Button
          render={<Link href={returnHref} />}
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          aria-label="Back to exam"
        >
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
            <SettingsIcon className="size-4" aria-hidden="true" />
            Exam settings
          </div>
          <h1 className="mt-1 truncate font-heading text-2xl font-semibold text-foreground md:text-3xl">
            {exam.title}
          </h1>
        </div>
      </header>

      <ExamSettingsForm workspaceSlug={workspaceSlug} exam={exam} />
    </main>
  )
}

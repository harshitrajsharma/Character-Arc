import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, Settings2Icon } from "lucide-react"
import { z } from "zod"

import { SubjectSettingsForm } from "@/components/tools/exam-prep/subjects/settings/subject-settings-form"
import { Button } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getSubjectForSettings } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

type SettingsPageProps = {
  params: Promise<{ workspaceSlug: string; subjectId: string }>
  searchParams: Promise<{ fromExam?: string | string[] }>
}

export default async function SubjectSettingsPage({
  params,
  searchParams,
}: SettingsPageProps) {
  const { workspaceSlug, subjectId } = await params
  const query = await searchParams
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )
  const subject = await getSubjectForSettings(
    workspace.id,
    installation.id,
    subjectId
  )

  if (!subject) notFound()

  const parsedExamId = z.string().uuid().safeParse(query.fromExam)
  const returnHref = parsedExamId.success
    ? workspaceRoutes.examPrep.subject(
        workspaceSlug,
        parsedExamId.data,
        subject.id
      )
    : workspaceRoutes.examPrep.home(workspaceSlug)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-10 sm:pt-24 md:px-6 xl:px-10">
      <header className="mb-10 flex items-start gap-3 border-b border-border/60 pb-6 lg:mx-auto lg:max-w-5xl">
        <Button
          render={<Link href={returnHref} />}
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          aria-label="Back to subject"
        >
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
            <Settings2Icon className="size-4" aria-hidden="true" />
            Subject settings
          </div>
          <h1 className="mt-1 truncate font-heading text-2xl font-semibold text-foreground md:text-3xl">
            {subject.name}
          </h1>
        </div>
      </header>

      <SubjectSettingsForm
        workspaceSlug={workspaceSlug}
        subject={subject}
        returnHref={returnHref}
      />
    </main>
  )
}

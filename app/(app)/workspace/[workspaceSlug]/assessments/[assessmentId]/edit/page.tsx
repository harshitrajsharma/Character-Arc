import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ListChecksIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { Button } from "@/components/ui/button"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { AssessmentBuilder } from "@/components/tools/mock-tests/assessment-builder"
import {
  getAssessmentDetail,
  getQuestionBank,
} from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Edit Blueprint — Assessments" }

export default async function EditMockTestPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
}) {
  const { workspaceSlug, assessmentId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const assessment = await getAssessmentDetail(workspace.id, assessmentId)
  if (!assessment) notFound()

  const bank = await getQuestionBank(workspace.id)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-10 space-y-8 font-sans antialiased text-foreground">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Assessments", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: assessment.title || "Edit Blueprint" },
        ]}
        backHref={workspaceRoutes.mockTests.detail(workspaceSlug, assessment.id)}
        backLabel="Back to Assessment"
      />

      <ToolPageHeader
        eyebrow="Assessments"
        title="Edit Paper Blueprint"
        description="Configure paper details, organize sections, and assemble questions."
        icon={<ListChecksIcon aria-hidden="true" />}
        iconClassName="bg-muted text-foreground"
        primaryAction={
          <Button
            variant="outline"
            render={
              <Link
                href={workspaceRoutes.mockTests.questionNew(workspaceSlug)}
              />
            }
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            New question
          </Button>
        }
      />

      <AssessmentBuilder
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        bank={bank}
      />
    </main>
  )
}


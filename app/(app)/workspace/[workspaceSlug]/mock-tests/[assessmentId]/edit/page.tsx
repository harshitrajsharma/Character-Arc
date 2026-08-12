import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ListChecksIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

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

export const metadata: Metadata = { title: "Edit Mock Test" }

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
    <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-28 sm:pb-10 md:px-6 lg:pb-10 xl:px-8">
      <ToolPageHeader
        eyebrow="Mock tests"
        title="Edit test"
        description="Tune the metadata and build your question paper. Marks, negative marks and sections are set per question."
        backHref={workspaceRoutes.mockTests.detail(
          workspaceSlug,
          assessment.id
        )}
        icon={<ListChecksIcon aria-hidden="true" />}
        iconClassName="bg-brand-violet-soft text-brand-violet-ink"
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
      <div className="mt-6">
        <AssessmentBuilder
          workspaceSlug={workspaceSlug}
          assessment={assessment}
          bank={bank}
        />
      </div>
    </main>
  )
}

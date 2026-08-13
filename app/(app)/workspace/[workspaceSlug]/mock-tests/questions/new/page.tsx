import type { Metadata } from "next"

import { QuestionForm } from "@/components/tools/mock-tests/question-form"
import { getTargetableBlocks } from "@/lib/tools/definitions/mock-tests/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "New Question — Mock Tests" }

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ fromAssessmentId?: string }>
}) {
  const { workspaceSlug } = await params
  const { fromAssessmentId } = await searchParams
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const targetableBlocks = await getTargetableBlocks(workspace.id)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-20 xl:px-10">
      <QuestionForm
        workspaceSlug={workspaceSlug}
        fromAssessmentId={fromAssessmentId}
        targetableBlocks={targetableBlocks}
      />
    </main>
  )
}

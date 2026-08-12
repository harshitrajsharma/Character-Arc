import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QuestionForm } from "@/components/tools/mock-tests/question-form"
import {
  getQuestionDetail,
  getTargetableBlocks,
} from "@/lib/tools/definitions/mock-tests/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Edit Question — Mock Tests" }

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; questionId: string }>
}) {
  const { workspaceSlug, questionId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const [question, targetableBlocks] = await Promise.all([
    getQuestionDetail(workspace.id, questionId),
    getTargetableBlocks(workspace.id),
  ])
  if (!question) notFound()

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-20 xl:px-10">
      <QuestionForm
        workspaceSlug={workspaceSlug}
        questionId={question.id}
        initial={{
          stem: question.stem,
          kind: question.kind,
          difficulty: question.difficulty,
          options: question.options,
          answerKeys: question.answerKeys,
          numericAnswer: question.numericAnswer,
          textAnswer: question.textAnswer,
          explanation: question.explanation,
          targets: question.targets,
        }}
        targetableBlocks={targetableBlocks}
      />
    </main>
  )
}

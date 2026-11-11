import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { QuestionForm } from "@/components/tools/mock-tests/question-form"
import { getQuestionDetail } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Edit Question — Assessments" }

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; questionId: string }>
  searchParams: Promise<{ fromAssessmentId?: string; returnTo?: string }>
}) {
  const { workspaceSlug, questionId } = await params
  const { fromAssessmentId: requestedAssessmentId, returnTo } =
    await searchParams
  const fromAssessmentId =
    requestedAssessmentId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedAssessmentId
    )
      ? requestedAssessmentId
      : undefined
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const question = await getQuestionDetail(workspace.id, questionId)
  if (!question) notFound()
  const study = await resolveSubjectTestsReturn(workspaceSlug, returnTo)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-20 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          {
            label: "Assessments",
            href: workspaceRoutes.mockTests.home(workspaceSlug),
          },
          {
            label: "Question Bank",
            href: workspaceRoutes.mockTests.questions(workspaceSlug),
          },
          { label: "Edit Question" },
        ]}
        backHref={
          fromAssessmentId
            ? withSubjectReturn(
                workspaceRoutes.mockTests.edit(workspaceSlug, fromAssessmentId),
                study?.returnHref
              )
            : workspaceRoutes.mockTests.questions(workspaceSlug)
        }
        backLabel={
          fromAssessmentId ? "Back to Assessment" : "Back to Question Bank"
        }
      />
      <QuestionForm
        key={`${workspace.userId}:${question.id}`}
        workspaceSlug={workspaceSlug}
        viewerId={workspace.userId}
        questionId={question.id}
        fromAssessmentId={fromAssessmentId}
        subjectReturnHref={study?.returnHref}
        initial={{
          stem: question.stem,
          kind: question.kind,
          difficulty: question.difficulty,
          options: question.options,
          answerKeys: question.answerKeys,
          numericAnswer: question.numericAnswer,
          textAnswer: question.textAnswer,
          explanation: question.explanation,
          targets: question.targets.map((target) => ({
            ...target,
            title: target.title?.trim() || "Untitled syllabus item",
          })),
        }}
      />
    </main>
  )
}

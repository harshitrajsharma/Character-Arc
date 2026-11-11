import type { Metadata } from "next"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { NewAssessmentForm } from "@/components/tools/mock-tests/new-assessment-form"
import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { notFound, unstable_rethrow } from "next/navigation"
import { getSubjectAssessmentContext } from "@/lib/tools/exam-prep/assessment-context"
import { subjectAssessmentScopeSchema } from "@/lib/tools/exam-prep/assessment-study-context"

export const metadata: Metadata = { title: "Create assessment — Assessments" }

export default async function NewMockTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{
    fromExam?: string
    fromSubject?: string
    fromChapter?: string
  }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")
  const query = await searchParams
  const hasContext =
    query.fromExam !== undefined ||
    query.fromSubject !== undefined ||
    query.fromChapter !== undefined
  const scope = hasContext
    ? subjectAssessmentScopeSchema.safeParse({
        examId: query.fromExam,
        subjectId: query.fromSubject,
        chapterId: query.fromChapter,
      })
    : null
  if (scope && !scope.success) notFound()
  const studyContext = scope?.success
    ? await getSubjectAssessmentContext(workspaceSlug, scope.data).catch(
        (error) => {
          unstable_rethrow(error)
          return null
        }
      )
    : null
  if (hasContext && !studyContext) notFound()

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-20 pb-28 font-sans text-foreground antialiased sm:pb-16 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          ...(studyContext
            ? [
                {
                  label: "Exam Prep",
                  href: workspaceRoutes.examPrep.home(workspaceSlug),
                },
                {
                  label: studyContext.examTitle,
                  href: workspaceRoutes.examPrep.exam(
                    workspaceSlug,
                    studyContext.examId
                  ),
                },
                {
                  label: studyContext.subjectTitle,
                  href: studyContext.returnHref,
                },
              ]
            : [
                {
                  label: "Assessments",
                  href: workspaceRoutes.mockTests.home(workspaceSlug),
                },
              ]),
          { label: "New assessment" },
        ]}
        backHref={
          studyContext?.returnHref ??
          workspaceRoutes.mockTests.home(workspaceSlug)
        }
        backLabel="Back to Assessments"
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Create assessment
        </h1>
        <p className="text-sm wrap-anywhere text-muted-foreground">
          {studyContext
            ? `Create a draft for ${studyContext.chapterTitle ?? studyContext.subjectTitle}. It will appear in this subject's tests.`
            : "Create a draft, then add questions. Publish when you're ready."}
        </p>
      </header>

      <NewAssessmentForm
        workspaceSlug={workspaceSlug}
        studyContext={studyContext}
      />
    </main>
  )
}

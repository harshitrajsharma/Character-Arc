import type { Metadata } from "next"
import { notFound, unstable_rethrow } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import { MockTestDetailView } from "@/components/tools/mock-tests/mock-test-detail-view"
import { getAssessmentOverviewAction } from "@/lib/tools/mock-tests/actions/assessment-overview-actions"
import { getAttemptHistoryAction } from "@/lib/tools/mock-tests/actions/attempt-history-actions"
import { AssessmentDetailSkeleton } from "@/components/tools/mock-tests/detail/assessment-detail-skeleton"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"

export const metadata: Metadata = { title: "Assessment" }
export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ workspaceSlug: string; assessmentId: string }>
  searchParams: Promise<{
    attemptPage?: string
    coveragePage?: string
    returnTo?: string
  }>
}

async function AssessmentContent({ params, searchParams }: PageProps) {
  const [{ workspaceSlug, assessmentId }, query] = await Promise.all([
    params,
    searchParams,
  ])
  if (!z.uuid().safeParse(assessmentId).success) notFound()
  const [overview, history] = await Promise.all([
    getAssessmentOverviewAction({
      workspaceSlug,
      assessmentId,
      coveragePage: query.coveragePage,
    }),
    getAttemptHistoryAction({
      workspaceSlug,
      assessmentId,
      page: query.attemptPage,
    }).catch((error) => {
      unstable_rethrow(error)
      return null
    }),
  ])
  if (!overview) notFound()
  const { assessment, activity, canWrite } = overview
  const study = await resolveSubjectTestsReturn(workspaceSlug, query.returnTo)
  return (
    <>
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
          { label: assessment.title },
        ]}
        backHref={
          study?.returnHref ?? workspaceRoutes.mockTests.home(workspaceSlug)
        }
        backLabel="Back to Assessments"
      />
      <MockTestDetailView
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        activity={activity}
        history={history}
        canWrite={canWrite}
        subjectReturnHref={study?.returnHref}
      />
    </>
  )
}

export default function MockTestDetailPage(props: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:pt-24 sm:pb-10 md:px-6 xl:px-10">
      <Suspense fallback={<AssessmentDetailSkeleton />}>
        <AssessmentContent {...props} />
      </Suspense>
    </main>
  )
}

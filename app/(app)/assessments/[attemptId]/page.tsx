import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AssessmentExamRoom } from "@/components/tools/mock-tests/assessment-exam-room"
import { getAttemptForExamRoom } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { resolveSubjectTestsReturn } from "@/lib/tools/exam-prep/assessment-context"
import { withSubjectReturn } from "@/lib/tools/exam-prep/assessment-study-context"

export const metadata: Metadata = { title: "Exam Room — Mock Test" }

export default async function DedicatedExamRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { attemptId } = await params
  const res = await getAttemptForExamRoom(attemptId)
  if (!res) notFound()

  const { attempt, workspaceSlug } = res
  const study = await resolveSubjectTestsReturn(
    workspaceSlug,
    (await searchParams).returnTo
  )

  if (attempt.attemptStatus !== "in_progress") {
    redirect(
      withSubjectReturn(
        workspaceRoutes.mockTests.analysis(workspaceSlug, attempt.attemptId),
        study?.returnHref
      )
    )
  }

  return (
    <AssessmentExamRoom
      key={attempt.attemptId}
      workspaceSlug={workspaceSlug}
      attempt={attempt}
      returnTo={study?.returnHref}
    />
  )
}

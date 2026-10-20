import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import {
  getExamSubjectDashboardData,
  getSubjectTitle,
} from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { SubjectDetailPage } from "@/components/tools/exam-prep/subjects/subject-detail-page"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import type { NavigationTarget } from "@/components/tools/exam-prep/subjects/recommendations"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { formatDateInTimeZone } from "@/lib/dates/local-date"
import { getSubjectLinkedAssessments } from "@/lib/tools/exam-prep/linked-assessments"

type SubjectPageParams = Promise<{
  workspaceSlug: string
  id: string
  subjectId: string
}>

type SubjectPageSearchParams = Promise<{
  stage?: string | string[]
  chapterId?: string | string[]
  topicId?: string | string[]
  type?: string | string[]
}>

const validStages = new Set(["learning", "revision", "practice", "test"])
const validStepTypes = new Set([
  "learn",
  "revise",
  "practice",
  "chapter-test",
  "subject-test",
  "remediation",
])

function singleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function getInitialNavigationTarget(
  searchParams: Awaited<SubjectPageSearchParams>,
  subject: SubjectWithRelations
): NavigationTarget | null {
  const stage = singleSearchParam(searchParams.stage)
  const chapterId = singleSearchParam(searchParams.chapterId)
  const topicId = singleSearchParam(searchParams.topicId)
  const type = singleSearchParam(searchParams.type)

  if (!stage || !validStages.has(stage)) return null
  if (topicId && !chapterId) return null

  const chapter = chapterId
    ? subject.chapters.find((candidate) => candidate.id === chapterId)
    : null
  if (chapterId && !chapter) return null
  if (topicId && !chapter?.topics.some((topic) => topic.id === topicId)) {
    return null
  }

  const fallbackType =
    stage === "learning"
      ? "learn"
      : stage === "revision"
        ? "revise"
        : stage === "practice"
          ? "practice"
          : chapterId
            ? "chapter-test"
            : "subject-test"

  return {
    stage: stage as NavigationTarget["stage"],
    chapterId: chapterId || undefined,
    topicId: topicId || undefined,
    type: (type && validStepTypes.has(type)
      ? type
      : fallbackType) as NavigationTarget["type"],
    timestamp: 0,
  }
}

export async function generateMetadata({
  params,
}: {
  params: SubjectPageParams
}): Promise<Metadata> {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug) // cache hit
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  ) // cache hit
  const subjectName = await getSubjectTitle(
    workspace.id,
    installation.id,
    subjectId
  )
  const { exam } = await getExamDetail(workspace.id, workspaceSlug, examId) // cache hit from [id]/layout.tsx
  return {
    title: subjectName
      ? `${subjectName} — ${exam?.title ?? "Exam Prep"}`
      : "Subject",
  }
}

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: SubjectPageParams
  searchParams: SubjectPageSearchParams
}) {
  const { workspaceSlug, id: examId, subjectId } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug) // cache hit
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  ) // cache hit
  const { exam } = await getExamDetail(workspace.id, workspaceSlug, examId)
  // Note: exam ownership validated by [id]/layout.tsx — no getExamDetail call needed here.

  const subjectWithRelations = await getExamSubjectDashboardData(
    workspace.id,
    installation.id,
    examId,
    subjectId,
    workspace.userId
  )

  if (!subjectWithRelations) {
    notFound()
  }

  try {
    subjectWithRelations.linkedAssessments = await getSubjectLinkedAssessments(
      workspaceSlug,
      examId,
      subjectWithRelations
    )
  } catch (error) {
    console.error("Could not load linked subject assessments", error)
    subjectWithRelations.linkedAssessmentsIssue =
      "Mock tests could not be loaded. Refresh to try again."
  }

  const initialNavigationTarget = getInitialNavigationTarget(
    await searchParams,
    subjectWithRelations
  )
  const localDate = formatDateInTimeZone(
    new Date(),
    exam?.timezone || workspace.timezone
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-16 pb-8 sm:pb-10 md:px-6 md:pt-24 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Exam Prep", href: workspaceRoutes.examPrep.home(workspaceSlug) },
          { label: exam?.title || "Exam", href: workspaceRoutes.examPrep.exam(workspaceSlug, examId) },
          { label: subjectWithRelations.name },
        ]}
        backHref={workspaceRoutes.examPrep.exam(workspaceSlug, examId)}
        backLabel="Back to Exam"
      />
      <SubjectDetailPage
        workspaceSlug={workspaceSlug}
        examId={examId}
        subject={subjectWithRelations}
        localDate={localDate}
        initialNavigationTarget={initialNavigationTarget}
      />
    </main>
  )
}

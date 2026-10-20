import "server-only"

import { prisma } from "@/lib/prisma"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"
import type { SubjectLinkedAssessment, SubjectWithRelations } from "@/types/progressapp/domain"

/** Called only after the subject dashboard has validated its exam and syllabus graph. */
export async function getSubjectLinkedAssessments(
  workspaceSlug: string,
  examId: string,
  subject: SubjectWithRelations
): Promise<SubjectLinkedAssessment[]> {
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  // Reading a subject must not install or reactivate the Mock Tests tool.
  const installation = await prisma.toolInstallation.findFirst({
    where: {
      workspaceId: workspace.id,
      status: "ACTIVE",
      toolDefinition: { key: "core.mock-tests" },
    },
    select: { id: true },
  })
  if (!installation) return []

  const chapterByTarget = new Map<string, string>()
  for (const chapter of subject.chapters) {
    chapterByTarget.set(chapter.id, chapter.id)
    for (const topic of chapter.topics) chapterByTarget.set(topic.id, chapter.id)
  }
  const targetIds = [subject.id, ...chapterByTarget.keys()]
  const targetWhere = {
    workspaceId: workspace.id,
    blockId: { in: targetIds },
    block: { status: "ACTIVE" as const, archivedAt: null },
  }
  const assessments = await prisma.assessment.findMany({
    where: {
      workspaceId: workspace.id,
      status: { not: "ARCHIVED" },
      block: { status: "ACTIVE", archivedAt: null, originToolInstallationId: installation.id },
      OR: [{ examBlockId: examId }, { examBlockId: null }],
      questions: { some: { question: { status: { not: "ARCHIVED" }, targets: { some: targetWhere } } } },
    },
    orderBy: [{ publishedAt: "desc" }, { blockId: "asc" }],
    take: 100,
    select: {
      blockId: true,
      examBlockId: true,
      status: true,
      durationMinutes: true,
      block: { select: { title: true } },
      questions: {
        where: { question: { status: { not: "ARCHIVED" } } },
        select: {
          question: {
            select: { targets: { where: targetWhere, select: { blockId: true } } },
          },
        },
      },
      attempts: {
        where: { workspaceId: workspace.id, userId: workspace.userId },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true, status: true, score: true, maxScore: true,
          startedAt: true, submittedAt: true,
        },
      },
    },
  })

  return assessments.map((assessment) => {
    const targets = assessment.questions.flatMap(({ question }) => question.targets)
    return {
      assessmentId: assessment.blockId,
      title: assessment.block.title,
      status: assessment.status,
      durationMinutes: assessment.durationMinutes,
      linkage: assessment.examBlockId ? "exam" : "syllabus",
      targetsWholeSubject: targets.some((target) => target.blockId === subject.id),
      targetChapterIds: [...new Set(targets.flatMap((target) => {
        const chapterId = chapterByTarget.get(target.blockId)
        return chapterId ? [chapterId] : []
      }))],
      attempts: assessment.attempts.map((attempt) => ({
        ...attempt,
        score: attempt.score === null ? null : Number(attempt.score),
        maxScore: attempt.maxScore === null ? null : Number(attempt.maxScore),
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      })),
    }
  })
}

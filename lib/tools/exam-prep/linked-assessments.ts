import "server-only"

import { prisma } from "@/lib/prisma"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"
import type {
  SubjectLinkedAssessment,
  SubjectWithRelations,
} from "@/types/progressapp/domain"

/** Called only after the subject dashboard has validated its exam and syllabus graph. */
export async function getSubjectAssessmentData(
  workspaceSlug: string,
  examId: string,
  subject: SubjectWithRelations
): Promise<{
  assessments: SubjectLinkedAssessment[]
  available: boolean
  hasMore: boolean
}> {
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
  if (!installation)
    return { assessments: [], available: false, hasMore: false }

  const chapterByTarget = new Map<string, string>()
  for (const chapter of subject.chapters) {
    chapterByTarget.set(chapter.id, chapter.id)
    for (const topic of chapter.topics)
      chapterByTarget.set(topic.id, chapter.id)
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
      block: {
        status: "ACTIVE",
        archivedAt: null,
        originToolInstallationId: installation.id,
      },
      OR: [
        { examBlockId: { in: targetIds } },
        {
          AND: [
            { OR: [{ examBlockId: examId }, { examBlockId: null }] },
            {
              questions: {
                some: {
                  question: {
                    status: { not: "ARCHIVED" },
                    targets: { some: targetWhere },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    orderBy: [{ block: { updatedAt: "desc" } }, { blockId: "asc" }],
    take: 101,
    select: {
      blockId: true,
      examBlockId: true,
      status: true,
      durationMinutes: true,
      totalMarks: true,
      block: { select: { title: true, revision: true } },
      _count: { select: { attempts: { where: { userId: workspace.userId } } } },
      questions: {
        where: { question: { status: { not: "ARCHIVED" } } },
        select: {
          marks: true,
          question: {
            select: {
              targets: { where: targetWhere, select: { blockId: true } },
            },
          },
        },
      },
      attempts: {
        where: { workspaceId: workspace.id, userId: workspace.userId },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
        },
      },
    },
  })

  const linked = assessments.slice(0, 100).map((assessment) => {
    const targets = assessment.questions.flatMap(
      ({ question }) => question.targets
    )
    const explicit =
      assessment.examBlockId !== null &&
      targetIds.includes(assessment.examBlockId)
    const contextChapter = assessment.examBlockId
      ? chapterByTarget.get(assessment.examBlockId)
      : null
    return {
      assessmentId: assessment.blockId,
      title: assessment.block.title,
      status: assessment.status,
      durationMinutes: assessment.durationMinutes,
      linkage: explicit
        ? ("context" as const)
        : assessment.examBlockId
          ? ("exam" as const)
          : ("syllabus" as const),
      studyContextId: assessment.examBlockId,
      revision: Number(assessment.block.revision),
      questionCount: assessment.questions.length,
      totalMarks: assessment.questions.length
        ? assessment.questions.reduce(
            (sum, entry) => sum + Number(entry.marks),
            0
          )
        : assessment.totalMarks === null
          ? null
          : Number(assessment.totalMarks),
      attemptCount: assessment._count.attempts,
      targetsWholeSubject:
        assessment.examBlockId === subject.id ||
        targets.some((target) => target.blockId === subject.id),
      targetChapterIds: [
        ...new Set([
          ...(contextChapter ? [contextChapter] : []),
          ...targets.flatMap((target) => {
            const chapterId = chapterByTarget.get(target.blockId)
            return chapterId ? [chapterId] : []
          }),
        ]),
      ],
      attempts: assessment.attempts.map((attempt) => ({
        ...attempt,
        score: attempt.score === null ? null : Number(attempt.score),
        maxScore: attempt.maxScore === null ? null : Number(attempt.maxScore),
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      })),
    }
  })
  return {
    assessments: linked,
    available: true,
    hasMore: assessments.length > 100,
  }
}

export async function getSubjectLinkedAssessments(
  workspaceSlug: string,
  examId: string,
  subject: SubjectWithRelations
) {
  return (await getSubjectAssessmentData(workspaceSlug, examId, subject))
    .assessments
}

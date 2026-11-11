import "server-only"

import { prisma } from "@/lib/prisma"
import {
  getAuthorizedActiveToolInstallations,
  getWorkspaceIdentity,
} from "@/lib/workspaces/workspace-access"

/** Bounded, membership-scoped launchpad data; no question/answer payloads. */
export async function getWorkspaceHome(workspaceSlug: string) {
  const [workspace, installations] = await Promise.all([
    getWorkspaceIdentity(workspaceSlug),
    getAuthorizedActiveToolInstallations(workspaceSlug),
  ])
  const examPrep = installations.find(
    (i) => i.toolDefinition.key === "core.exam-prep"
  )
  const assessments = installations.find(
    (i) => i.toolDefinition.key === "core.mock-tests"
  )
  const [exams, papers, attempts, activeAttempt] = await Promise.all([
    examPrep
      ? prisma.block.findMany({
          where: {
            workspaceId: workspace.id,
            originToolInstallationId: examPrep.id,
            blockType: { key: "exam-prep.exam" },
            status: "ACTIVE",
            archivedAt: null,
            userStates: {
              none: { userId: workspace.userId, status: "ARCHIVED" },
            },
          },
          select: {
            id: true,
            title: true,
            examDetails: { select: { examCode: true } },
            outgoingRelations: {
              where: {
                workspaceId: workspace.id,
                relationType: { key: "exam-prep.exam-has-subject" },
                toBlock: {
                  workspaceId: workspace.id,
                  blockType: { key: "exam-prep.subject" },
                  status: "ACTIVE",
                  archivedAt: null,
                },
              },
              select: { toBlock: { select: { id: true, title: true } } },
              orderBy: [{ position: "asc" }, { id: "asc" }],
              take: 3,
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 3,
        })
      : [],
    assessments
      ? prisma.assessment.findMany({
          where: {
            workspaceId: workspace.id,
            status: { in: ["DRAFT", "PUBLISHED"] },
            block: {
              workspaceId: workspace.id,
              originToolInstallationId: assessments.id,
              archivedAt: null,
              status: "ACTIVE",
            },
          },
          select: {
            blockId: true,
            status: true,
            durationMinutes: true,
            block: { select: { title: true } },
            _count: { select: { questions: true } },
          },
          orderBy: [{ block: { updatedAt: "desc" } }, { blockId: "desc" }],
          take: 4,
        })
      : [],
    assessments
      ? prisma.attempt.findMany({
          where: {
            workspaceId: workspace.id,
            userId: workspace.userId,
            assessment: {
              workspaceId: workspace.id,
              block: {
                workspaceId: workspace.id,
                archivedAt: null,
                status: "ACTIVE",
              },
            },
          },
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            assessment: { select: { block: { select: { title: true } } } },
          },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          take: 4,
        })
      : [],
    assessments
      ? prisma.attempt.findFirst({
          where: {
            workspaceId: workspace.id,
            userId: workspace.userId,
            status: "IN_PROGRESS",
            assessment: {
              workspaceId: workspace.id,
              block: {
                workspaceId: workspace.id,
                status: "ACTIVE",
                archivedAt: null,
              },
            },
          },
          select: {
            id: true,
            assessment: { select: { block: { select: { title: true } } } },
          },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        })
      : null,
  ])
  return {
    workspace,
    installations,
    hasExamPrep: Boolean(examPrep),
    hasAssessments: Boolean(assessments),
    activeAttempt: activeAttempt
      ? { id: activeAttempt.id, title: activeAttempt.assessment.block.title }
      : null,
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      code: exam.examDetails?.examCode ?? null,
      subjects: exam.outgoingRelations.map((relation) => relation.toBlock),
    })),
    papers: papers.map((paper) => ({
      id: paper.blockId,
      title: paper.block.title,
      status: paper.status,
      questionCount: paper._count.questions,
      durationMinutes: paper.durationMinutes,
    })),
    attempts: attempts
      .filter((attempt) => attempt.id !== activeAttempt?.id)
      .map((attempt) => ({
        id: attempt.id,
        title: attempt.assessment.block.title,
        status: attempt.status.toLowerCase() as
          "in_progress" | "submitted" | "evaluated" | "abandoned",
        score: attempt.score === null ? null : Number(attempt.score),
        maxScore: attempt.maxScore === null ? null : Number(attempt.maxScore),
        startedAt: attempt.startedAt.toISOString(),
      })),
  }
}

export type WorkspaceHomeData = Awaited<ReturnType<typeof getWorkspaceHome>>

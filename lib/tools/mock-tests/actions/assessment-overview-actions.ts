"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { getMockTestsActionContext } from "@/lib/tools/definitions/mock-tests/action-context"
import {
  parseAssessmentSections,
  type AssessmentTaxonomy,
  type AssessmentVisibility,
  type RecentAttemptItem,
} from "@/lib/tools/definitions/mock-tests/repository"
import {
  attemptPercentage,
  scoringPenaltyRange,
  type AssessmentOverview,
  type AssessmentActivity,
} from "../assessment-overview-model"
import { workspaceSlugSchema } from "./common"
import { personalAttemptWhere } from "../attempt-history-query"
import { SCORE_TREND_LIMIT } from "../score-trend"

const schema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.uuid(),
  coveragePage: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .catch(1),
})

/** Lean paper overview: no question stems, options, responses or answer keys. */
export async function getAssessmentOverviewAction(input: {
  workspaceSlug: string
  assessmentId: string
  coveragePage?: unknown
}): Promise<{
  assessment: AssessmentOverview
  activity: AssessmentActivity
  canWrite: boolean
} | null> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return null
  const { workspaceSlug, assessmentId } = parsed.data
  const [context, claims] = await Promise.all([
    getMockTestsActionContext(workspaceSlug),
    requireVerifiedClaims(
      `/workspace/${encodeURIComponent(workspaceSlug)}/assessments`
    ),
  ])
  const { workspaceId } = context
  return prisma.$transaction(
    async (tx) => {
      const paper = await tx.assessment.findFirst({
        where: { blockId: assessmentId, workspaceId, block: { workspaceId } },
        select: {
          status: true,
          durationMinutes: true,
          totalMarks: true,
          instructions: true,
          blueprint: true,
          publishedAt: true,
          block: {
            select: {
              title: true,
              summary: true,
              revision: true,
              properties: true,
              createdAt: true,
              updatedAt: true,
              status: true,
              archivedAt: true,
              createdBy: { select: { displayName: true } },
            },
          },
        },
      })
      if (!paper) return null
      const allocations = {
        workspaceId,
        assessmentId,
        question: { workspaceId },
      }
      const targetQuestion = {
        workspaceId,
        assessments: { some: { workspaceId, assessmentId } },
      }
      const targetWhere = {
        workspaceId,
        status: "ACTIVE" as const,
        archivedAt: null,
        questionTargets: { some: { workspaceId, question: targetQuestion } },
      }
      const personalWhere = personalAttemptWhere(
        workspaceId,
        claims.sub,
        assessmentId
      )
      const attemptSelect = {
        id: true,
        assessmentId: true,
        status: true,
        score: true,
        maxScore: true,
        startedAt: true,
        submittedAt: true,
      } as const
      const [
        groups,
        unmapped,
        coverageTotal,
        active,
        latest,
        trend,
        evaluatedCount,
      ] = await Promise.all([
        tx.assessmentQuestion.groupBy({
          by: ["section"],
          where: allocations,
          _count: { _all: true },
          _sum: { marks: true },
          _min: { negativeMarks: true },
          _max: { negativeMarks: true },
        }),
        tx.assessmentQuestion.count({
          where: {
            ...allocations,
            question: {
              workspaceId,
              targets: {
                none: {
                  workspaceId,
                  block: { workspaceId, status: "ACTIVE", archivedAt: null },
                },
              },
            },
          },
        }),
        tx.block.count({ where: targetWhere }),
        tx.attempt.findFirst({
          where: { ...personalWhere, status: "IN_PROGRESS" },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          select: attemptSelect,
        }),
        tx.attempt.findFirst({
          where: { ...personalWhere, status: "EVALUATED" },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          select: attemptSelect,
        }),
        tx.attempt.findMany({
          where: {
            ...personalWhere,
            status: "EVALUATED",
            score: { not: null },
            maxScore: { gt: 0 },
          },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          take: SCORE_TREND_LIMIT,
          select: attemptSelect,
        }),
        tx.attempt.count({
          where: {
            ...personalWhere,
            status: "EVALUATED",
            score: { not: null },
            maxScore: { gt: 0 },
          },
        }),
      ])
      const pageSize = 10
      const totalPages = Math.max(1, Math.ceil(coverageTotal / pageSize))
      const page = Math.min(parsed.data.coveragePage, totalPages)
      // One stable, authorized context path per visible area; never expand the syllabus tree.
      const parentEdge = {
        where: {
          workspaceId,
          relationType: {
            key: {
              in: [
                "exam-prep.chapter-has-topic",
                "exam-prep.subject-has-chapter",
                "exam-prep.exam-has-subject",
              ],
            },
          },
          fromBlock: {
            workspaceId,
            status: "ACTIVE" as const,
            archivedAt: null,
          },
        },
        orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
        take: 1,
      }
      const parentLeaf = {
        id: true,
        title: true,
        blockType: { select: { key: true } },
      } as const
      const parentNext = {
        ...parentLeaf,
        incomingRelations: {
          ...parentEdge,
          select: { fromBlock: { select: parentLeaf } },
        },
      }
      const parentRoot = {
        ...parentLeaf,
        incomingRelations: {
          ...parentEdge,
          select: { fromBlock: { select: parentNext } },
        },
      }
      const targets = await tx.block.findMany({
        where: targetWhere,
        orderBy: [{ title: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          blockType: { select: { key: true } },
          incomingRelations: {
            ...parentEdge,
            select: { fromBlock: { select: parentRoot } },
          },
          _count: {
            select: {
              questionTargets: {
                where: { workspaceId, question: targetQuestion },
              },
            },
          },
        },
      })
      const blueprint =
        paper.blueprint &&
        typeof paper.blueprint === "object" &&
        !Array.isArray(paper.blueprint)
          ? (paper.blueprint as Record<string, unknown>)
          : {}
      const properties =
        paper.block.properties &&
        typeof paper.block.properties === "object" &&
        !Array.isArray(paper.block.properties)
          ? (paper.block.properties as Record<string, unknown>)
          : {}
      const totals = groups.map((group) => ({
        section: group.section,
        questionCount: group._count._all,
        marks: Number(group._sum.marks ?? 0),
      }))
      const sections = parseAssessmentSections(
        paper.blueprint,
        groups.map((group) => group.section)
      ).map((section) => ({
        ...section,
        questionCount:
          totals.find((group) => group.section === section.key)
            ?.questionCount ?? 0,
        marks:
          totals.find((group) => group.section === section.key)?.marks ?? 0,
      }))
      const unsectioned = totals
        .filter(
          (group) => !sections.some((section) => section.key === group.section)
        )
        .reduce(
          (sum, group) => ({
            questionCount: sum.questionCount + group.questionCount,
            marks: sum.marks + group.marks,
          }),
          { questionCount: 0, marks: 0 }
        )
      const assessmentTitle = paper.block.title
      function serialize(row: NonNullable<typeof active>): RecentAttemptItem {
        const score = row.score === null ? null : Number(row.score)
        const maxScore = row.maxScore === null ? null : Number(row.maxScore)
        return {
          id: row.id,
          assessmentId: row.assessmentId,
          assessmentTitle,
          status: row.status.toLowerCase() as RecentAttemptItem["status"],
          score,
          maxScore,
          percentage: attemptPercentage(score, maxScore),
          startedAt: row.startedAt.toISOString(),
          submittedAt: row.submittedAt?.toISOString() ?? null,
        }
      }
      return {
        canWrite: context.role !== "VIEWER",
        assessment: {
          id: assessmentId,
          title: paper.block.title,
          summary: paper.block.summary,
          status:
            paper.status === "ARCHIVED" ||
            paper.block.archivedAt ||
            paper.block.status !== "ACTIVE"
              ? "archived"
              : paper.status === "PUBLISHED"
                ? "published"
                : "draft",
          revision: Number(paper.block.revision),
          durationMinutes: paper.durationMinutes,
          totalMarks:
            paper.totalMarks === null ? null : Number(paper.totalMarks),
          questionCount: totals.reduce(
            (sum, group) => sum + group.questionCount,
            0
          ),
          questionMarks:
            Math.round(
              totals.reduce((sum, group) => sum + group.marks, 0) * 100
            ) / 100,
          penalty: scoringPenaltyRange(
            Math.min(
              0,
              ...groups.map((group) => Number(group._min.negativeMarks ?? 0))
            ),
            groups.length
              ? Math.max(
                  ...groups.map((group) =>
                    Number(group._max.negativeMarks ?? 0)
                  )
                )
              : 0
          ),
          instructions: paper.instructions,
          passingBenchmark:
            typeof properties.passingBenchmark === "number"
              ? properties.passingBenchmark
              : 33,
          distinctionBenchmark:
            typeof properties.distinctionBenchmark === "number"
              ? properties.distinctionBenchmark
              : 70,
          publishedAt: paper.publishedAt?.toISOString() ?? null,
          createdAt: paper.block.createdAt.toISOString(),
          updatedAt: paper.block.updatedAt.toISOString(),
          sections,
          unsectioned,
          calculatorAllowed: Boolean(blueprint.calculatorAllowed),
          taxonomy: blueprint.taxonomy as AssessmentTaxonomy | undefined,
          visibility: ["private", "unlisted", "public"].includes(
            String(blueprint.visibility)
          )
            ? (blueprint.visibility as AssessmentVisibility)
            : "private",
          allowCloning: blueprint.allowCloning !== false,
          authorName: paper.block.createdBy?.displayName ?? null,
          coverage: {
            items: targets.map((target) => {
              const first = target.incomingRelations[0]?.fromBlock
              const second = first?.incomingRelations[0]?.fromBlock
              const third = second?.incomingRelations[0]?.fromBlock
              const nodes = [target, first, second, third].filter(
                (node) => node !== undefined
              )
              const subject = nodes.find(
                (node) => node.blockType.key === "exam-prep.subject"
              )
              const exam = nodes.find(
                (node) => node.blockType.key === "exam-prep.exam"
              )
              return {
                id: target.id,
                title: target.title,
                type: target.blockType.key,
                questionCount: target._count.questionTargets,
                context: nodes
                  .slice(1)
                  .reverse()
                  .map((node) => node.title)
                  .join(" / "),
                ...(subject && exam
                  ? { subject: { id: subject.id, examId: exam.id } }
                  : {}),
              }
            }),
            total: coverageTotal,
            page,
            pageSize,
            totalPages,
            unmapped,
          },
        },
        activity: {
          active: active ? serialize(active) : null,
          latest: latest ? serialize(latest) : null,
          trend: trend.map(serialize),
          evaluatedCount,
        },
      }
    },
    { isolationLevel: "RepeatableRead", timeout: 15000 }
  )
}

"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { getMockTestsActionContext } from "@/lib/tools/definitions/mock-tests/action-context"
import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceSlugSchema } from "./common"
import { attemptPercentage } from "../assessment-overview-model"
import {
  personalAttemptWhere,
  attemptPageBounds,
} from "../attempt-history-query"

export type AttemptHistoryItem = RecentAttemptItem & {
  attemptNumber: number
  durationSeconds: number | null
}

export type AttemptHistoryPage = {
  items: AttemptHistoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const inputSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.uuid().optional(),
  page: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .catch(1),
})

/** Full personal history, including retained attempts on archived papers. */
export async function getAttemptHistoryAction(input: {
  workspaceSlug: string
  assessmentId?: string
  page?: unknown
}): Promise<AttemptHistoryPage> {
  const parsed = inputSchema.parse(input)
  const [context, claims] = await Promise.all([
    getMockTestsActionContext(parsed.workspaceSlug),
    requireVerifiedClaims(
      `/workspace/${encodeURIComponent(parsed.workspaceSlug)}/assessments`
    ),
  ])
  const where = personalAttemptWhere(
    context.workspaceId,
    claims.sub,
    parsed.assessmentId
  )
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.attempt.count({ where })
      const { page, pageSize, totalPages, skip } = attemptPageBounds(
        parsed.page,
        total
      )
      const rows = await tx.attempt.findMany({
        where,
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          assessmentId: true,
          status: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
          assessment: { select: { block: { select: { title: true } } } },
        },
      })
      return {
        total,
        totalPages,
        page,
        pageSize,
        items: rows.map((row, index) => {
          const score = row.score === null ? null : Number(row.score)
          const maxScore = row.maxScore === null ? null : Number(row.maxScore)
          return {
            id: row.id,
            attemptNumber: total - (page - 1) * pageSize - index,
            durationSeconds: row.submittedAt
              ? Math.max(
                  0,
                  Math.round(
                    (row.submittedAt.getTime() - row.startedAt.getTime()) / 1000
                  )
                )
              : null,
            assessmentId: row.assessmentId,
            assessmentTitle: row.assessment.block.title,
            status: row.status.toLowerCase() as RecentAttemptItem["status"],
            score,
            maxScore,
            percentage: attemptPercentage(score, maxScore),
            startedAt: row.startedAt.toISOString(),
            submittedAt: row.submittedAt?.toISOString() ?? null,
          }
        }),
      }
    },
    { isolationLevel: "RepeatableRead" }
  )
}

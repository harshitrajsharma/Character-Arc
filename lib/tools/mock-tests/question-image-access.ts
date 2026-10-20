import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

/** Only the original workspace's question references may grant access to a file.
 * Otherwise an attacker could paste another workspace's asset URL into their
 * own public paper to bypass the file's access controls.
 */
export async function canReadQuestionImage(
  file: { id: string; workspaceId: string },
  userId: string | null
) {
  if (userId) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: file.workspaceId,
        userId,
        workspace: { archivedAt: null },
      },
      select: { userId: true },
    })
    if (member) return true
  }
  const src = `/api/question-images/${file.id}`
  const publicAssessment: Prisma.AssessmentWhereInput = {
    workspaceId: file.workspaceId,
    status: "PUBLISHED",
    block: { status: "ACTIVE", archivedAt: null },
    workspace: { archivedAt: null },
    OR: [
      { blueprint: { path: ["visibility"], equals: "public" } },
      { blueprint: { path: ["visibility"], equals: "unlisted" } },
    ],
  }
  const question = await prisma.question.findFirst({
    where: {
      workspaceId: file.workspaceId,
      status: { in: ["DRAFT", "PUBLISHED"] },
      OR: [
        // Question/option illustrations are visible with the shared paper.
        {
          OR: [
            { stem: { contains: src } },
            { options: { some: { content: { contains: src } } } },
          ],
          assessments: { some: { assessment: publicAssessment } },
        },
        // Solution images never become anonymously available merely because a
        // question appears in a shared paper. Require the reader's own result.
        ...(userId
          ? [
              {
                solution: {
                  is: {
                    OR: [
                      { explanation: { contains: src } },
                      { textAnswer: { contains: src } },
                    ],
                  },
                },
                assessments: {
                  some: {
                    assessment: {
                      ...publicAssessment,
                      attempts: {
                        some: {
                          userId,
                          status: {
                            in: ["SUBMITTED", "EVALUATED"] as (
                              "SUBMITTED" | "EVALUATED"
                            )[],
                          },
                        },
                      },
                    },
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true },
  })
  return Boolean(question)
}

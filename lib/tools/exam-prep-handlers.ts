/* eslint-disable @typescript-eslint/no-explicit-any -- Legacy handlers predate strict action input types. */
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import type { ExecuteToolActionInput } from "@/lib/tools/execute-tool-action"
import type {
  JsonValue,
  ToolActionResult,
  ToolExecutionPrincipal,
} from "@/lib/tools/contracts"
import {
  BlockStatus,
  BlockVisibility,
  FoundationLevel,
  Prisma,
  ScheduledTestScope,
  ToolRunStatus,
} from "../../generated/prisma/client"
import { validateTestRecordMarks } from "./exam-prep/calculations/test-records"
import {
  completeToolRun,
  failToolRunAndThrow,
  reserveToolRun,
} from "./exam-prep-scheduled-test-handlers"
import { getExamDashboardData } from "@/lib/tools/definitions/exam-prep/dashboard-queries"
import { generateExamSubjectRecommendations } from "@/lib/tools/exam-prep/recommendations"

// Shared helper to generate hashes
function hashInput(input: unknown): string {
  return crypto.createHash("md5").update(JSON.stringify(input)).digest("hex")
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3

async function withExamPrepSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let lastError: unknown

  for (
    let attempt = 0;
    attempt < SERIALIZABLE_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      lastError = error
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : null
      if (
        code !== "P2034" ||
        attempt === SERIALIZABLE_TRANSACTION_ATTEMPTS - 1
      ) {
        throw error
      }
    }
  }

  throw lastError
}

export async function executeExamPrepCreateExam(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId

  if (!actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }

  const actionInput = input.input as any

  if (!actionInput.title || typeof actionInput.title !== "string") {
    throw new ToolActionExecutionError(
      "Exam name is required.",
      "INVALID_INPUT"
    )
  }

  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "exam.create",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const blockId = crypto.randomUUID()
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })

      const blockType = await tx.blockType.findUniqueOrThrow({
        where: {
          key: "exam-prep.exam",
          toolDefinitionId: installation.toolDefinitionId,
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          originToolRunId: reservation.runId,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `exam-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary?.trim() || null,
          properties: {},
          schemaVersion: 1,
          revision: 1,
        },
      })

      await tx.examBlock.create({
        data: {
          blockId,
          workspaceId: input.workspaceId,
          expectedStartDate: toDate(actionInput.expectedStartDate),
          targetMarks:
            actionInput.targetMarks === null ||
            typeof actionInput.targetMarks === "undefined"
              ? null
              : actionInput.targetMarks,
        },
      })

      const data = {
        exam: {
          id: blockId,
          title: actionInput.title,
          summary: actionInput.summary?.trim() || null,
          expectedStartDate:
            toDate(actionInput.expectedStartDate)?.toISOString().slice(0, 10) ??
            null,
          targetMarks:
            actionInput.targetMarks === null ||
            typeof actionInput.targetMarks === "undefined"
              ? null
              : actionInput.targetMarks,
        },
      }
      const output = {
        rootBlockId: blockId,
        createdBlockIds: [blockId],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        rootBlockId: blockId,
        createdBlockIds: [blockId],
        evidenceIds: [],
        data,
      }
    })

    return {
      runId: result.runId,
      status: "succeeded",
      rootBlockId: result.rootBlockId,
      createdBlockIds: result.createdBlockIds,
      evidenceIds: [],
      data: result.data,
    }
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to create exam."
    )
  }
}

/**
 * Permanently deletes an exam. Subjects stay intact when another active exam
 * still uses them; only the exclusively-owned syllabus trees are removed.
 */
export async function executeExamPrepDeleteExam(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }

  const actionInput = input.input as { examId: string }
  const runId = crypto.randomUUID()

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
          },
          include: { toolRelease: true },
        })
        const [examSubjectType, subjectChapterType, chapterTopicType] =
          await Promise.all([
            tx.blockRelationType.findUniqueOrThrow({
              where: { key: "exam-prep.exam-has-subject" },
            }),
            tx.blockRelationType.findUniqueOrThrow({
              where: { key: "exam-prep.subject-has-chapter" },
            }),
            tx.blockRelationType.findUniqueOrThrow({
              where: { key: "exam-prep.chapter-has-topic" },
            }),
          ])

        const exam = await tx.block.findFirst({
          where: {
            id: actionInput.examId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            status: BlockStatus.ACTIVE,
            archivedAt: null,
            blockType: { key: "exam-prep.exam" },
          },
          select: { id: true },
        })
        if (!exam) {
          throw new ToolActionExecutionError(
            "The selected exam is unavailable.",
            "NOT_AVAILABLE"
          )
        }

        const run = await tx.toolRun.create({
          data: {
            id: runId,
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId,
            actionKey: "exam.delete",
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: ToolRunStatus.RUNNING,
            idempotencyKey: input.idempotencyKey,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
            payload: { create: { input: actionInput } },
          },
        })

        const subjectRelations = await tx.blockRelation.findMany({
          where: {
            workspaceId: input.workspaceId,
            relationTypeId: examSubjectType.id,
            fromBlockId: exam.id,
          },
          select: { toBlockId: true },
        })
        const subjectIds = subjectRelations.map(
          (relation) => relation.toBlockId
        )

        const sharedSubjectRelations = subjectIds.length
          ? await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                relationTypeId: examSubjectType.id,
                toBlockId: { in: subjectIds },
                fromBlockId: { not: exam.id },
                fromBlock: {
                  workspaceId: input.workspaceId,
                  originToolInstallationId: input.installationId,
                  status: BlockStatus.ACTIVE,
                  archivedAt: null,
                  blockType: { key: "exam-prep.exam" },
                },
              },
              select: { toBlockId: true },
            })
          : []
        const sharedSubjectIds = new Set(
          sharedSubjectRelations.map((relation) => relation.toBlockId)
        )
        const deletableSubjectIds = subjectIds.filter(
          (subjectId) => !sharedSubjectIds.has(subjectId)
        )

        const chapterRelations = deletableSubjectIds.length
          ? await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                relationTypeId: subjectChapterType.id,
                fromBlockId: { in: deletableSubjectIds },
              },
              select: { toBlockId: true },
            })
          : []
        const candidateChapterIds = chapterRelations.map(
          (relation) => relation.toBlockId
        )
        const sharedChapterRelations = candidateChapterIds.length
          ? await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                relationTypeId: subjectChapterType.id,
                toBlockId: { in: candidateChapterIds },
                fromBlockId: { notIn: deletableSubjectIds },
                fromBlock: {
                  incomingRelations: {
                    some: {
                      relationTypeId: examSubjectType.id,
                      fromBlockId: { not: exam.id },
                      fromBlock: {
                        workspaceId: input.workspaceId,
                        originToolInstallationId: input.installationId,
                        status: BlockStatus.ACTIVE,
                        archivedAt: null,
                        blockType: { key: "exam-prep.exam" },
                      },
                    },
                  },
                },
              },
              select: { toBlockId: true },
            })
          : []
        const sharedChapterIds = new Set(
          sharedChapterRelations.map((relation) => relation.toBlockId)
        )
        const deletableChapterIds = candidateChapterIds.filter(
          (chapterId) => !sharedChapterIds.has(chapterId)
        )

        const topicRelations = deletableChapterIds.length
          ? await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                relationTypeId: chapterTopicType.id,
                fromBlockId: { in: deletableChapterIds },
              },
              select: { toBlockId: true },
            })
          : []
        const candidateTopicIds = topicRelations.map(
          (relation) => relation.toBlockId
        )
        const sharedTopicRelations = candidateTopicIds.length
          ? await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                relationTypeId: chapterTopicType.id,
                toBlockId: { in: candidateTopicIds },
                fromBlockId: { notIn: deletableChapterIds },
                fromBlock: {
                  incomingRelations: {
                    some: {
                      relationTypeId: subjectChapterType.id,
                      fromBlock: {
                        incomingRelations: {
                          some: {
                            relationTypeId: examSubjectType.id,
                            fromBlockId: { not: exam.id },
                            fromBlock: {
                              workspaceId: input.workspaceId,
                              originToolInstallationId: input.installationId,
                              status: BlockStatus.ACTIVE,
                              archivedAt: null,
                              blockType: { key: "exam-prep.exam" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              select: { toBlockId: true },
            })
          : []
        const sharedTopicIds = new Set(
          sharedTopicRelations.map((relation) => relation.toBlockId)
        )
        const deletableTopicIds = candidateTopicIds.filter(
          (topicId) => !sharedTopicIds.has(topicId)
        )

        // Delete from the leaves upward. The relation FKs then clean up only
        // edges belonging to the permanently deleted blocks.
        if (deletableTopicIds.length) {
          await tx.block.deleteMany({
            where: { id: { in: deletableTopicIds } },
          })
        }
        if (deletableChapterIds.length) {
          await tx.block.deleteMany({
            where: { id: { in: deletableChapterIds } },
          })
        }
        if (deletableSubjectIds.length) {
          await tx.block.deleteMany({
            where: { id: { in: deletableSubjectIds } },
          })
        }
        await tx.block.delete({ where: { id: exam.id } })

        const deletedBlockIds = [
          exam.id,
          ...deletableSubjectIds,
          ...deletableChapterIds,
          ...deletableTopicIds,
        ]
        const output = {
          rootBlockId: exam.id,
          createdBlockIds: [],
          evidenceIds: [],
          data: { deletedBlockIds },
        }
        return tx.toolRun.update({
          where: { id: run.id },
          data: {
            status: ToolRunStatus.SUCCEEDED,
            completedAt: new Date(),
            payload: { update: { output } },
          },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: actionInput.examId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(
      error instanceof Error ? error.message : "Failed to delete the exam.",
      "RUN_FAILED"
    )
  }
}

export async function executeExamPrepCreateSubject(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentExamId = actionInput.examId

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({
        where: {
          key: "exam-prep.subject",
          toolDefinitionId: installation.toolDefinitionId,
        },
      })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({
        where: { key: "exam-prep.exam-has-subject" },
      })

      const parent = await tx.block.findFirstOrThrow({
        where: {
          id: parentExamId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.exam" },
        },
        select: { id: true },
      })
      const lastRelation = await tx.blockRelation.findFirst({
        where: {
          workspaceId: input.workspaceId,
          fromBlockId: parent.id,
          relationTypeId: relationType.id,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "subject.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          originToolRunId: run.id,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `subject-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary,
          properties: {},
          schemaVersion: 1,
          revision: 1,
        },
      })

      await tx.subjectBlock.create({
        data: {
          blockId,
          workspaceId: input.workspaceId,
          foundationLevel: FoundationLevel.BEGINNER,
        },
      })

      const relation = await tx.blockRelation.create({
        data: {
          workspaceId: input.workspaceId,
          fromBlockId: parent.id,
          toBlockId: blockId,
          relationTypeId: relationType.id,
          position: (lastRelation?.position ?? -1) + 1,
        },
      })

      await tx.examSubjectConfig.create({
        data: {
          relationId: relation.id,
          workspaceId: input.workspaceId,
          weightage: actionInput.weightage,
        },
      })

      const output = {
        rootBlockId: blockId,
        createdBlockIds: [blockId],
        evidenceIds: [],
      }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: blockId,
      createdBlockIds: [blockId],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepUpdateExam(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }
  const actionInput = input.input as any
  const runId = crypto.randomUUID()

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const exam = await tx.block.findFirstOrThrow({
        where: {
          id: actionInput.examId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.exam" },
        },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "exam.update",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: { create: { input: actionInput as Prisma.InputJsonValue } },
        },
      })

      await tx.block.update({
        where: { id: exam.id },
        data: {
          title: actionInput.title.trim(),
          summary: actionInput.summary?.trim() || null,
          revision: { increment: 1 },
        },
      })

      await tx.examBlock.update({
        where: { blockId: exam.id },
        data: {
          expectedStartDate: toDate(actionInput.expectedStartDate),
          targetMarks: actionInput.targetMarks,
        },
      })

      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output: {
                rootBlockId: exam.id,
                createdBlockIds: [],
                evidenceIds: [],
              },
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: actionInput.examId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepExamUpdateSettings(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }
  const actionInput = input.input as any
  const runId = crypto.randomUUID()

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const exam = await tx.block.findFirstOrThrow({
        where: {
          id: actionInput.examId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.exam" },
        },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "exam.update-settings",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: { create: { input: actionInput as Prisma.InputJsonValue } },
        },
      })

      await tx.examBlock.update({
        where: { blockId: exam.id },
        data: {
          examCode: actionInput.examCode,
          conductingBody: actionInput.conductingBody,
          targetMarks: actionInput.targetMarks,
          targetRank: actionInput.targetRank,
          scheduleStatus: actionInput.scheduleStatus,
          expectedStartDate: toDate(actionInput.expectedStartDate),
          expectedEndDate: toDate(actionInput.expectedEndDate),
          patternVersion: actionInput.patternVersion,
          durationMinutes: actionInput.durationMinutes,
          totalMarks: actionInput.totalMarks,
          officialUrl: actionInput.officialUrl,
          scoringRules: actionInput.scoringRules,
        },
      })

      await tx.block.update({
        where: { id: exam.id },
        data: { revision: { increment: 1 } },
      })

      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output: {
                rootBlockId: exam.id,
                createdBlockIds: [],
                evidenceIds: [],
              },
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: actionInput.examId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export function createExamPrepExamSubjectExecutor(
  operation: "attach" | "detach"
) {
  return async function executeExamPrepExamSubject(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId) {
      throw new ToolActionExecutionError(
        "Workspace write access is required.",
        "FORBIDDEN"
      )
    }

    const actionInput = input.input as {
      examId: string
      subjectId: string
      weightage?: number
    }
    const runId = crypto.randomUUID()
    const actionKey = `exam.${operation}-subject`

    try {
      const result = await withExamPrepSerializableTransaction(async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
          },
          include: { toolRelease: true },
        })
        const relationType = await tx.blockRelationType.findUniqueOrThrow({
          where: { key: "exam-prep.exam-has-subject" },
        })
        const [exam, subject] = await Promise.all([
          tx.block.findFirst({
            where: {
              id: actionInput.examId,
              workspaceId: input.workspaceId,
              originToolInstallationId: input.installationId,
              archivedAt: null,
              blockType: { key: "exam-prep.exam" },
            },
            select: { id: true },
          }),
          tx.block.findFirst({
            where: {
              id: actionInput.subjectId,
              workspaceId: input.workspaceId,
              originToolInstallationId: input.installationId,
              archivedAt: null,
              blockType: { key: "exam-prep.subject" },
            },
            select: { id: true },
          }),
        ])
        if (!exam || !subject) {
          throw new ToolActionExecutionError(
            "The selected exam or subject is unavailable.",
            "NOT_AVAILABLE"
          )
        }

        const run = await tx.toolRun.create({
          data: {
            id: runId,
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: ToolRunStatus.RUNNING,
            idempotencyKey: input.idempotencyKey,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
            payload: {
              create: { input: actionInput as Prisma.InputJsonValue },
            },
          },
        })

        if (operation === "attach") {
          const existingRelation = await tx.blockRelation.findFirst({
            where: {
              workspaceId: input.workspaceId,
              relationTypeId: relationType.id,
              fromBlockId: exam.id,
              toBlockId: subject.id,
            },
            select: { id: true },
          })
          if (existingRelation) {
            throw new ToolActionExecutionError(
              "This subject is already attached to the exam.",
              "INVALID_INPUT"
            )
          }

          const lastRelation = await tx.blockRelation.findFirst({
            where: {
              workspaceId: input.workspaceId,
              relationTypeId: relationType.id,
              fromBlockId: exam.id,
            },
            orderBy: { position: "desc" },
            select: { position: true },
          })

          const relation = await tx.blockRelation.create({
            data: {
              workspaceId: input.workspaceId,
              relationTypeId: relationType.id,
              fromBlockId: exam.id,
              toBlockId: subject.id,
              position: (lastRelation?.position ?? -1) + 1,
            },
          })
          await tx.examSubjectConfig.create({
            data: {
              relationId: relation.id,
              workspaceId: input.workspaceId,
              weightage: actionInput.weightage ?? 0,
            },
          })
        } else {
          const relation = await tx.blockRelation.findFirst({
            where: {
              workspaceId: input.workspaceId,
              relationTypeId: relationType.id,
              fromBlockId: exam.id,
              toBlockId: subject.id,
            },
            select: { id: true },
          })
          if (!relation)
            throw new ToolActionExecutionError(
              "This subject is not attached to the exam.",
              "NOT_AVAILABLE"
            )
          await tx.scheduledTest.updateMany({
            where: {
              workspaceId: input.workspaceId,
              installationId: input.installationId,
              status: { in: ["PLANNED", "SCHEDULED"] },
              OR: [
                { examSubjectRelationId: relation.id },
                {
                  examSubjectRelationId: null,
                  examId: exam.id,
                  subjectId: subject.id,
                },
              ],
            },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancellationReason: "Subject detached from exam",
              revision: { increment: 1 },
            },
          })
          // The detached subject has no page anymore, so any cancelled plan
          // left behind would be an unreachable dead-end row. Delete the
          // incomplete plans; completed ones keep their audit row and the
          // TestRecord evidence survives via SetNull.
          await tx.scheduledTest.deleteMany({
            where: {
              workspaceId: input.workspaceId,
              installationId: input.installationId,
              examId: exam.id,
              subjectId: subject.id,
              status: { in: ["PLANNED", "SCHEDULED", "CANCELLED"] },
            },
          })
          await tx.blockRelation.delete({ where: { id: relation.id } })
        }

        return tx.toolRun.update({
          where: { id: run.id },
          data: {
            status: ToolRunStatus.SUCCEEDED,
            completedAt: new Date(),
            payload: {
              update: {
                output: {
                  rootBlockId: subject.id,
                  createdBlockIds: [],
                  evidenceIds: [],
                },
              },
            },
          },
        })
      })
      return {
        runId: result.id,
        status: "succeeded",
        rootBlockId: actionInput.subjectId,
        createdBlockIds: [],
        evidenceIds: [],
      }
    } catch (error) {
      if (error instanceof ToolActionExecutionError) throw error
      throw new ToolActionExecutionError(
        error instanceof Error
          ? error.message
          : "Failed to update the exam subject.",
        "RUN_FAILED"
      )
    }
  }
}

export async function executeExamPrepCreateChapter(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentSubjectId = actionInput.subjectId

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({
        where: {
          key: "exam-prep.chapter",
          toolDefinitionId: installation.toolDefinitionId,
        },
      })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({
        where: { key: "exam-prep.subject-has-chapter" },
      })

      const parent = await tx.block.findFirstOrThrow({
        where: {
          id: parentSubjectId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.subject" },
        },
        select: { id: true },
      })
      const lastRelation = await tx.blockRelation.findFirst({
        where: {
          workspaceId: input.workspaceId,
          fromBlockId: parent.id,
          relationTypeId: relationType.id,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "chapter.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          originToolRunId: run.id,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `chapter-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary,
          properties: {},
          schemaVersion: 1,
          revision: 1,
        },
      })

      await tx.chapterBlock.create({
        data: {
          blockId,
          workspaceId: input.workspaceId,
          isImportant: Boolean(actionInput.important),
        },
      })

      await tx.blockRelation.create({
        data: {
          workspaceId: input.workspaceId,
          fromBlockId: parentSubjectId,
          toBlockId: blockId,
          relationTypeId: relationType.id,
          position: (lastRelation?.position ?? -1) + 1,
        },
      })

      const output = {
        rootBlockId: blockId,
        createdBlockIds: [blockId],
        evidenceIds: [],
      }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: blockId,
      createdBlockIds: [blockId],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepCreateTopic(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentChapterId = actionInput.chapterId

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({
        where: {
          key: "exam-prep.topic",
          toolDefinitionId: installation.toolDefinitionId,
        },
      })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({
        where: { key: "exam-prep.chapter-has-topic" },
      })

      const parent = await tx.block.findFirstOrThrow({
        where: {
          id: parentChapterId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.chapter" },
        },
        select: { id: true },
      })
      const lastRelation = await tx.blockRelation.findFirst({
        where: {
          workspaceId: input.workspaceId,
          fromBlockId: parent.id,
          relationTypeId: relationType.id,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "topic.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          originToolRunId: run.id,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `topic-${blockId.replace(/-/g, "")}`,
          properties: {
            learningStatus: false,
            revisionCount: 0,
            practiceCount: 0,
            testCount: 0,
          },
          schemaVersion: 1,
          revision: 1,
        },
      })

      await tx.topicBlock.create({
        data: {
          blockId,
          workspaceId: input.workspaceId,
          isImportant: Boolean(actionInput.important),
        },
      })

      await tx.blockRelation.create({
        data: {
          workspaceId: input.workspaceId,
          fromBlockId: parentChapterId,
          toBlockId: blockId,
          relationTypeId: relationType.id,
          position: (lastRelation?.position ?? -1) + 1,
        },
      })

      const output = {
        rootBlockId: blockId,
        createdBlockIds: [blockId],
        evidenceIds: [],
      }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: blockId,
      createdBlockIds: [blockId],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepTopicSetLearning(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const topicId = actionInput.topicId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "topic.set-learning",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      const block = await tx.block.findFirst({
        where: {
          id: topicId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.topic" },
        },
      })
      if (!block) throw new Error("Topic not found")

      const props = (block.properties as any) || {}
      const learned = Boolean(actionInput.learned)
      const wasLearned = props.learningStatus === true
      props.learningStatus = learned
      props.learningCompletedAt = learned
        ? wasLearned && typeof props.learningCompletedAt === "string"
          ? props.learningCompletedAt
          : new Date().toISOString()
        : null

      await tx.block.update({
        where: { id: topicId },
        data: { properties: props, revision: { increment: 1 } },
      })

      const output = {
        rootBlockId: topicId,
        createdBlockIds: [],
        evidenceIds: [],
      }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: topicId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepTopicSetProgress(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const runId = crypto.randomUUID()
  const actionInput = input.input as {
    topicId: string
    stage: "revision" | "practice" | "test"
    count: number
  }
  const progressField = `${actionInput.stage}Count` as
    "revisionCount" | "practiceCount" | "testCount"

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findFirstOrThrow({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
          status: "ACTIVE",
        },
        include: { toolRelease: true },
      })
      const block = await tx.block.findFirst({
        where: {
          id: actionInput.topicId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          status: BlockStatus.ACTIVE,
          archivedAt: null,
          blockType: { key: "exam-prep.topic" },
        },
      })
      if (!block) throw new Error("Topic not found.")

      const properties = (block.properties as Record<string, unknown>) ?? {}
      if (actionInput.count > 100) {
        throw new Error("Topic progress supports at most 100 completed steps.")
      }
      if (actionInput.count > 0 && properties.learningStatus !== true) {
        throw new Error(
          "Mark this topic as learned before recording further progress."
        )
      }

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "topic.set-progress",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      const now = new Date()
      const nextProperties = {
        ...properties,
        [progressField]: actionInput.count,
        ...(actionInput.stage === "revision" &&
        actionInput.count > Number(properties.revisionCount ?? 0)
          ? {
              lastRevised: now.toISOString(),
              nextRevision: new Date(
                now.getTime() + actionInput.count * 2 * 86_400_000
              ).toISOString(),
            }
          : {}),
        ...(actionInput.stage === "practice" &&
        actionInput.count > Number(properties.practiceCount ?? 0)
          ? { lastPracticed: now.toISOString() }
          : {}),
      }
      const updateResult = await tx.block.updateMany({
        where: {
          id: block.id,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          status: BlockStatus.ACTIVE,
          archivedAt: null,
          blockType: { key: "exam-prep.topic" },
        },
        data: { properties: nextProperties, revision: { increment: 1 } },
      })
      if (updateResult.count !== 1) throw new Error("Topic not found.")

      const output = {
        rootBlockId: block.id,
        createdBlockIds: [],
        evidenceIds: [],
      }
      return tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: actionInput.topicId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error) {
    throw new ToolActionExecutionError(
      error instanceof Error
        ? error.message
        : "Failed to update topic progress.",
      "RUN_FAILED"
    )
  }
}

export function createExamPrepTopicRecordEventExecutor(
  eventField: string,
  actionKey: string
) {
  return async function executeExamPrepTopicRecordEvent(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId)
      throw new ToolActionExecutionError(
        "Workspace write access is required.",
        "FORBIDDEN"
      )

    const runId = crypto.randomUUID()
    const actionInput = input.input as any
    const topicId = actionInput.topicId

    try {
      const result = await prisma.$transaction(async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
          },
          include: { toolRelease: true },
        })

        const run = await tx.toolRun.create({
          data: {
            id: runId,
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: ToolRunStatus.RUNNING,
            idempotencyKey: input.idempotencyKey,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
            payload: {
              create: {
                input: actionInput as Prisma.InputJsonValue,
              },
            },
          },
        })

        const block = await tx.block.findFirst({
          where: {
            id: topicId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            status: BlockStatus.ACTIVE,
            archivedAt: null,
            blockType: { key: "exam-prep.topic" },
          },
        })
        if (!block) throw new Error("Topic not found")

        const props = (block.properties as any) || {}
        if (props.learningStatus !== true) {
          throw new Error(
            "Mark this topic as learned before recording further progress."
          )
        }
        const recordedAt = new Date().toISOString()
        props[eventField] = Math.min((props[eventField] || 0) + 1, 5)
        if (eventField === "revisionCount") props.lastRevised = recordedAt
        if (eventField === "practiceCount") props.lastPracticed = recordedAt

        const updateResult = await tx.block.updateMany({
          where: {
            id: topicId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            status: BlockStatus.ACTIVE,
            archivedAt: null,
            blockType: { key: "exam-prep.topic" },
          },
          data: { properties: props, revision: { increment: 1 } },
        })
        if (updateResult.count !== 1) throw new Error("Topic not found")

        const output = {
          rootBlockId: topicId,
          createdBlockIds: [],
          evidenceIds: [],
        }
        return await tx.toolRun.update({
          where: { id: run.id },
          data: {
            status: ToolRunStatus.SUCCEEDED,
            completedAt: new Date(),
            payload: {
              update: {
                output,
              },
            },
          },
        })
      })

      return {
        runId: result.id,
        status: "succeeded",
        rootBlockId: topicId,
        createdBlockIds: [],
        evidenceIds: [],
      }
    } catch (error: any) {
      throw new ToolActionExecutionError(
        error.message || "Failed",
        "RUN_FAILED"
      )
    }
  }
}

export const executeExamPrepTopicRecordRevision =
  createExamPrepTopicRecordEventExecutor(
    "revisionCount",
    "topic.record-revision"
  )
export const executeExamPrepTopicRecordPractice =
  createExamPrepTopicRecordEventExecutor(
    "practiceCount",
    "topic.record-practice"
  )
export const executeExamPrepTopicRecordTest =
  createExamPrepTopicRecordEventExecutor("testCount", "topic.record-test")

export function createExamPrepSyllabusItemExecutor(
  kind: "chapter" | "topic",
  operation: "update" | "delete"
) {
  const actionKey = `${kind}.${operation}`
  const blockTypeKey = `exam-prep.${kind}`
  const idKey = `${kind}Id`

  return async function executeExamPrepSyllabusItem(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId) {
      throw new ToolActionExecutionError(
        "Workspace write access is required.",
        "FORBIDDEN"
      )
    }

    const actionInput = input.input as Record<string, unknown>
    const blockId = String(actionInput[idKey])
    const runId = crypto.randomUUID()

    try {
      const result = await prisma.$transaction(async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: { id: input.installationId, workspaceId: input.workspaceId },
          include: { toolRelease: true },
        })
        const block = await tx.block.findFirst({
          where: {
            id: blockId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            archivedAt: null,
            blockType: { key: blockTypeKey },
          },
        })
        if (!block)
          throw new Error(
            `${kind === "chapter" ? "Chapter" : "Topic"} not found.`
          )

        const run = await tx.toolRun.create({
          data: {
            id: runId,
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: ToolRunStatus.RUNNING,
            idempotencyKey: input.idempotencyKey,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
            payload: {
              create: {
                input: actionInput as Prisma.InputJsonValue,
              },
            },
          },
        })

        if (operation === "update") {
          const properties = (block.properties as Record<string, unknown>) ?? {}
          const important = actionInput.important === true
          const nextProperties =
            kind === "topic" && !important
              ? {
                  ...properties,
                  important,
                  revisionCount: Math.min(
                    Number(properties.revisionCount ?? 0),
                    3
                  ),
                  practiceCount: Math.min(
                    Number(properties.practiceCount ?? 0),
                    3
                  ),
                  testCount: Math.min(Number(properties.testCount ?? 0), 3),
                }
              : { ...properties, important }
          await tx.block.update({
            where: { id: block.id },
            data: {
              title: String(actionInput.title).trim(),
              properties: nextProperties,
              revision: { increment: 1 },
            },
          })
          if (kind === "chapter") {
            await tx.chapterBlock.update({
              where: { blockId: block.id },
              data: { isImportant: important },
            })
          } else {
            await tx.topicBlock.update({
              where: { blockId: block.id },
              data: { isImportant: important },
            })
          }
        } else {
          const archivedAt = new Date()
          if (kind === "chapter") {
            await tx.scheduledTest.updateMany({
              where: {
                workspaceId: input.workspaceId,
                installationId: input.installationId,
                status: { in: ["PLANNED", "SCHEDULED"] },
                chapters: { some: { chapterId: block.id } },
              },
              data: {
                status: "CANCELLED",
                cancelledAt: archivedAt,
                cancellationReason: "Target chapter archived",
                revision: { increment: 1 },
              },
            })
            // Remove plans whose every target chapter is now archived; they
            // would otherwise be invisible to every test section forever.
            // Completed plans stay as audit rows (their TestRecord link is
            // SetNull on delete, so evidence is preserved).
            const affectedChapterLinks =
              await tx.scheduledTestChapter.findMany({
                where: {
                  workspaceId: input.workspaceId,
                  chapterId: block.id,
                },
                select: { scheduledTestId: true },
              })
            const candidatePlanIds = affectedChapterLinks.map(
              (link) => link.scheduledTestId
            )
            if (candidatePlanIds.length > 0) {
              const stillVisibleLinks =
                await tx.scheduledTestChapter.findMany({
                  where: {
                    workspaceId: input.workspaceId,
                    scheduledTestId: { in: candidatePlanIds },
                    chapter: { status: BlockStatus.ACTIVE, archivedAt: null },
                  },
                  select: { scheduledTestId: true },
                  distinct: ["scheduledTestId"],
                })
              const visibleIds = new Set(
                stillVisibleLinks.map((link) => link.scheduledTestId)
              )
              const orphanedPlanIds = candidatePlanIds.filter(
                (scheduledTestId) => !visibleIds.has(scheduledTestId)
              )
              if (orphanedPlanIds.length > 0) {
                await tx.scheduledTest.deleteMany({
                  where: {
                    id: { in: orphanedPlanIds },
                    workspaceId: input.workspaceId,
                    installationId: input.installationId,
                    status: { in: ["PLANNED", "SCHEDULED", "CANCELLED"] },
                  },
                })
              }
            }
          }
          await tx.block.update({
            where: { id: block.id },
            data: {
              status: BlockStatus.ARCHIVED,
              archivedAt,
              revision: { increment: 1 },
            },
          })

          if (kind === "chapter") {
            const relationType = await tx.blockRelationType.findUniqueOrThrow({
              where: { key: "exam-prep.chapter-has-topic" },
            })
            const topicRelations = await tx.blockRelation.findMany({
              where: {
                workspaceId: input.workspaceId,
                fromBlockId: block.id,
                relationTypeId: relationType.id,
              },
              select: { toBlockId: true },
            })
            await tx.block.updateMany({
              where: {
                id: {
                  in: topicRelations.map((relation) => relation.toBlockId),
                },
                workspaceId: input.workspaceId,
                originToolInstallationId: input.installationId,
                archivedAt: null,
              },
              data: { status: BlockStatus.ARCHIVED, archivedAt },
            })
          }
        }

        const output = {
          rootBlockId: block.id,
          createdBlockIds: [],
          evidenceIds: [],
        }
        return tx.toolRun.update({
          where: { id: run.id },
          data: {
            status: ToolRunStatus.SUCCEEDED,
            completedAt: new Date(),
            payload: {
              update: {
                output,
              },
            },
          },
        })
      })

      return {
        runId: result.id,
        status: "succeeded",
        rootBlockId: blockId,
        createdBlockIds: [],
        evidenceIds: [],
      }
    } catch (error) {
      throw new ToolActionExecutionError(
        error instanceof Error
          ? error.message
          : `Failed to ${operation} ${kind}.`,
        "RUN_FAILED"
      )
    }
  }
}

function createExamPrepReorderExecutor(
  actionKey: "exam.reorder-subjects" | "chapter.reorder" | "topic.reorder",
  relationTypeKey:
    | "exam-prep.exam-has-subject"
    | "exam-prep.subject-has-chapter"
    | "exam-prep.chapter-has-topic",
  parentKey: "examId" | "subjectId" | "chapterId",
  itemIdsKey: "subjectIds" | "chapterIds" | "topicIds"
) {
  return async function executeExamPrepReorder(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId) {
      throw new ToolActionExecutionError(
        "Workspace write access is required.",
        "FORBIDDEN"
      )
    }

    const actionInput = input.input as Record<string, unknown>
    const parentId = String(actionInput[parentKey])
    const orderedIds = actionInput[itemIdsKey] as string[]
    const runId = crypto.randomUUID()
    const parentBlockTypeKey =
      parentKey === "examId"
        ? "exam-prep.exam"
        : parentKey === "subjectId"
          ? "exam-prep.subject"
          : "exam-prep.chapter"
    const childBlockTypeKey =
      itemIdsKey === "subjectIds"
        ? "exam-prep.subject"
        : itemIdsKey === "chapterIds"
          ? "exam-prep.chapter"
          : "exam-prep.topic"

    try {
      const result = await withExamPrepSerializableTransaction(async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
            toolDefinition: { key: "core.exam-prep" },
          },
          include: { toolRelease: true },
        })
        await tx.block.findFirstOrThrow({
          where: {
            id: parentId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            status: BlockStatus.ACTIVE,
            archivedAt: null,
            blockType: { key: parentBlockTypeKey },
          },
          select: { id: true },
        })
        const relationType = await tx.blockRelationType.findUniqueOrThrow({
          where: { key: relationTypeKey },
          select: { id: true },
        })
        const relations = await tx.blockRelation.findMany({
          where: {
            workspaceId: input.workspaceId,
            fromBlockId: parentId,
            relationTypeId: relationType.id,
            toBlock: {
              workspaceId: input.workspaceId,
              originToolInstallationId: input.installationId,
              status: BlockStatus.ACTIVE,
              archivedAt: null,
              blockType: { key: childBlockTypeKey },
            },
          },
          select: { id: true, toBlockId: true },
        })
        const currentIds = new Set(
          relations.map((relation) => relation.toBlockId)
        )
        if (
          new Set(orderedIds).size !== orderedIds.length ||
          currentIds.size !== orderedIds.length ||
          orderedIds.some((id) => !currentIds.has(id))
        ) {
          throw new Error(
            "The submitted order does not match the current items."
          )
        }

        const run = await tx.toolRun.create({
          data: {
            id: runId,
            workspaceId: input.workspaceId,
            installationId: input.installationId,
            toolReleaseId: installation.toolReleaseId,
            actorId,
            actionKey,
            handlerVersion,
            invocationSource: principal.invocationSource,
            status: ToolRunStatus.RUNNING,
            idempotencyKey: input.idempotencyKey,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
            payload: {
              create: {
                input: actionInput as Prisma.InputJsonValue,
              },
            },
          },
        })

        await Promise.all(
          orderedIds.map((itemId, position) => {
            const relation = relations.find(
              (candidate) => candidate.toBlockId === itemId
            )
            return tx.blockRelation.update({
              where: { id: relation!.id },
              data: { position },
            })
          })
        )

        const output = {
          rootBlockId: parentId,
          createdBlockIds: [],
          evidenceIds: [],
        }
        return tx.toolRun.update({
          where: { id: run.id },
          data: {
            status: ToolRunStatus.SUCCEEDED,
            completedAt: new Date(),
            payload: {
              update: {
                output,
              },
            },
          },
        })
      })

      return {
        runId: result.id,
        status: "succeeded",
        rootBlockId: parentId,
        createdBlockIds: [],
        evidenceIds: [],
      }
    } catch (error) {
      throw new ToolActionExecutionError(
        error instanceof Error
          ? error.message
          : "Failed to save the new order.",
        "RUN_FAILED"
      )
    }
  }
}

export const executeExamPrepReorderSubjects = createExamPrepReorderExecutor(
  "exam.reorder-subjects",
  "exam-prep.exam-has-subject",
  "examId",
  "subjectIds"
)

export const executeExamPrepReorderChapters = createExamPrepReorderExecutor(
  "chapter.reorder",
  "exam-prep.subject-has-chapter",
  "subjectId",
  "chapterIds"
)

export const executeExamPrepReorderTopics = createExamPrepReorderExecutor(
  "topic.reorder",
  "exam-prep.chapter-has-topic",
  "chapterId",
  "topicIds"
)

export async function executeExamPrepSubjectUpdateSettings(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const runId = crypto.randomUUID()
  const actionInput = input.input as {
    subjectId: string
    revisionTarget: number
    practiceTarget: number
    highYieldRevisionTarget: number
    highYieldPracticeTarget: number
    chapterTestTarget: number
    subjectTestTarget: number
  }
  const subjectId = actionInput.subjectId

  if (actionInput.highYieldRevisionTarget < actionInput.revisionTarget) {
    throw new ToolActionExecutionError(
      "High-yield revisions must be at least the standard revision target.",
      "INVALID_INPUT"
    )
  }

  if (actionInput.highYieldPracticeTarget < actionInput.practiceTarget) {
    throw new ToolActionExecutionError(
      "High-yield practice must be at least the standard practice target.",
      "INVALID_INPUT"
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findFirst({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
          status: "ACTIVE",
          toolDefinition: { key: "core.exam-prep" },
        },
        include: { toolRelease: true },
      })
      if (!installation) {
        throw new ToolActionExecutionError(
          "The active Exam Prep installation is unavailable.",
          "NOT_AVAILABLE"
        )
      }

      const block = await tx.block.findFirst({
        where: {
          id: subjectId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
          blockType: { key: "exam-prep.subject" },
        },
      })
      if (!block) throw new Error("Subject not found")

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "subject.update-settings",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
          payload: {
            create: {
              input: actionInput as Prisma.InputJsonValue,
            },
          },
        },
      })

      const props = (block.properties as Prisma.InputJsonObject | null) ?? {}

      await tx.block.update({
        where: { id: subjectId },
        data: {
          properties: {
            ...props,
            revisionTarget: actionInput.revisionTarget,
            practiceTarget: actionInput.practiceTarget,
            highYieldRevisionTarget: actionInput.highYieldRevisionTarget,
            highYieldPracticeTarget: actionInput.highYieldPracticeTarget,
            chapterTestTarget: actionInput.chapterTestTarget,
            subjectTestTarget: actionInput.subjectTestTarget,
          },
          revision: { increment: 1 },
        },
      })

      const output = {
        rootBlockId: subjectId,
        createdBlockIds: [],
        evidenceIds: [],
      }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output,
            },
          },
        },
      })
    })

    return {
      runId: result.id,
      status: "succeeded",
      rootBlockId: subjectId,
      createdBlockIds: [],
      evidenceIds: [],
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(
      error instanceof Error
        ? error.message
        : "Failed to update subject settings",
      "RUN_FAILED"
    )
  }
}

// ─── Canonical TestRecord mutation handlers ─────────────────────────────────

/* eslint-enable @typescript-eslint/no-explicit-any */

type CreateTestRecordInput = {
  workspaceId: string
  examId: string
  subjectId: string
  chapterId?: string | null
  title: string
  marksObtained: number
  totalMarks: number
  summary?: string | null
}

type UpdateTestRecordInput = {
  workspaceId: string
  testRecordId: string
  title: string
  marksObtained: number
  totalMarks: number
  summary?: string | null
}

type DeleteTestRecordInput = {
  workspaceId: string
  testRecordId: string
}

function serializeTestRecord(record: {
  id: string
  examId: string
  subjectId: string | null
  chapterId: string | null
  scheduledTestId?: string | null
  scope?: ScheduledTestScope | null
  attemptedAt?: Date | null
  title: string
  marksObtained: Prisma.Decimal
  totalMarks: Prisma.Decimal
  summary: string | null
  createdAt: Date
  updatedAt: Date
  targetChapters?: Array<{ chapterId: string }>
}): Record<string, JsonValue> {
  return {
    id: record.id,
    examId: record.examId,
    subjectId: record.subjectId,
    chapterId: record.chapterId,
    scheduledTestId: record.scheduledTestId ?? null,
    scope:
      record.scope?.toLowerCase().replace("_", "-") ??
      (record.chapterId ? "chapter" : "subject"),
    attemptedAt:
      (record.attemptedAt ?? record.createdAt)?.toISOString() ?? null,
    targetChapterIds:
      record.targetChapters?.map((target) => target.chapterId) ??
      (record.chapterId ? [record.chapterId] : []),
    title: record.title,
    marksObtained: Number(record.marksObtained),
    totalMarks: Number(record.totalMarks),
    summary: record.summary,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function executeExamPrepTestRecordCreate(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const actionInput = input.input as CreateTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError(
      "The principal workspace does not match the action workspace.",
      "FORBIDDEN"
    )
  }

  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "test-record.create",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const { marksObtained, totalMarks } = validateTestRecordMarks(
        actionInput.marksObtained,
        actionInput.totalMarks
      )

      await tx.block.findFirstOrThrow({
        where: {
          id: actionInput.examId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          status: "ACTIVE",
          blockType: { key: "exam-prep.exam" },
        },
        select: { id: true },
      })
      await tx.block.findFirstOrThrow({
        where: {
          id: actionInput.subjectId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          status: "ACTIVE",
          blockType: { key: "exam-prep.subject" },
        },
        select: { id: true },
      })

      const subjectRelation = await tx.blockRelation.findFirst({
        where: {
          workspaceId: input.workspaceId,
          fromBlockId: actionInput.examId,
          toBlockId: actionInput.subjectId,
          relationType: { key: "exam-prep.exam-has-subject" },
        },
        select: { id: true },
      })
      if (!subjectRelation) {
        throw new ToolActionExecutionError(
          "Subject does not belong to this exam.",
          "INVALID_INPUT"
        )
      }

      if (actionInput.chapterId) {
        await tx.block.findFirstOrThrow({
          where: {
            id: actionInput.chapterId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            status: "ACTIVE",
            blockType: { key: "exam-prep.chapter" },
          },
          select: { id: true },
        })
        const chapterRelation = await tx.blockRelation.findFirst({
          where: {
            workspaceId: input.workspaceId,
            toBlockId: actionInput.chapterId,
            relationType: { key: "exam-prep.subject-has-chapter" },
          },
          select: { fromBlockId: true },
        })
        if (
          !chapterRelation ||
          chapterRelation.fromBlockId !== actionInput.subjectId
        ) {
          throw new ToolActionExecutionError(
            "Chapter does not belong to this subject.",
            "INVALID_INPUT"
          )
        }
      }

      const record = await tx.testRecord.create({
        data: {
          workspaceId: input.workspaceId,
          userId: actorId,
          examId: actionInput.examId,
          subjectId: actionInput.subjectId,
          chapterId: actionInput.chapterId ?? null,
          scope: actionInput.chapterId
            ? ScheduledTestScope.CHAPTER
            : ScheduledTestScope.SUBJECT,
          attemptedAt: new Date(),
          title: actionInput.title.trim(),
          marksObtained,
          totalMarks,
          summary: actionInput.summary ?? null,
          ...(actionInput.chapterId
            ? {
                targetChapters: {
                  create: {
                    workspaceId: input.workspaceId,
                    chapterId: actionInput.chapterId,
                    position: 0,
                  },
                },
              }
            : {}),
        },
        include: {
          targetChapters: { orderBy: { position: "asc" } },
        },
      })

      const data = { testRecord: serializeTestRecord(record) }
      const output = {
        rootBlockId: actionInput.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)

      return { data, runId: reservation.runId }
    })

    return {
      status: "succeeded",
      runId: result.runId,
      rootBlockId: actionInput.examId,
      createdBlockIds: [],
      evidenceIds: [],
      data: result.data,
    }
  } catch (error: unknown) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to create test record"
    )
  }
}

export async function executeExamPrepTestRecordUpdate(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const actionInput = input.input as UpdateTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError(
      "The principal workspace does not match the action workspace.",
      "FORBIDDEN"
    )
  }

  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "test-record.update",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const validMarks = validateTestRecordMarks(
        actionInput.marksObtained,
        actionInput.totalMarks
      )

      const existing = await tx.testRecord.findFirst({
        where: {
          id: actionInput.testRecordId,
          workspaceId: input.workspaceId,
          userId: actorId,
        },
      })
      if (!existing) {
        throw new ToolActionExecutionError(
          "Test record not found or not owned by this actor.",
          "FORBIDDEN"
        )
      }

      const record = await tx.testRecord.update({
        where: { id: existing.id },
        data: {
          title: actionInput.title.trim(),
          marksObtained: validMarks.marksObtained,
          totalMarks: validMarks.totalMarks,
          summary: actionInput.summary ?? null,
        },
        include: {
          targetChapters: { orderBy: { position: "asc" } },
        },
      })

      const data = { testRecord: serializeTestRecord(record) }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)

      return { data, examId: existing.examId, runId: reservation.runId }
    })

    return {
      status: "succeeded",
      runId: result.runId,
      rootBlockId: result.examId,
      createdBlockIds: [],
      evidenceIds: [],
      data: result.data,
    }
  } catch (error: unknown) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to update test record"
    )
  }
}

export async function executeExamPrepTestRecordDelete(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId)
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )

  const actionInput = input.input as DeleteTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError(
      "The principal workspace does not match the action workspace.",
      "FORBIDDEN"
    )
  }

  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "test-record.delete",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withExamPrepSerializableTransaction(async (tx) => {
      const existing = await tx.testRecord.findFirst({
        where: {
          id: actionInput.testRecordId,
          workspaceId: input.workspaceId,
          userId: actorId,
        },
      })
      if (!existing) {
        throw new ToolActionExecutionError(
          "Test record not found or not owned by this actor.",
          "FORBIDDEN"
        )
      }
      if (existing.scheduledTestId) {
        throw new ToolActionExecutionError(
          "Reopen the scheduled test to remove its linked result.",
          "INVALID_INPUT"
        )
      }

      await tx.testRecord.delete({ where: { id: existing.id } })

      const data = {
        deletedTestRecord: {
          id: existing.id,
          examId: existing.examId,
          subjectId: existing.subjectId,
          chapterId: existing.chapterId,
        },
      }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)

      return { data, examId: existing.examId, runId: reservation.runId }
    })

    return {
      status: "succeeded",
      runId: result.runId,
      rootBlockId: result.examId,
      createdBlockIds: [],
      evidenceIds: [],
      data: result.data,
    }
  } catch (error: unknown) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to delete test record"
    )
  }
}

export async function executeExamPrepGetSubjectRecommendations(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  const actionInput = input.input as { examId?: unknown }

  if (!actorId) {
    throw new ToolActionExecutionError(
      "Workspace read access is required.",
      "FORBIDDEN"
    )
  }
  if (typeof actionInput.examId !== "string") {
    throw new ToolActionExecutionError(
      "A valid exam ID is required.",
      "INVALID_INPUT"
    )
  }

  const exam = await prisma.block.findFirst({
    where: {
      id: actionInput.examId,
      workspaceId: input.workspaceId,
      originToolInstallationId: input.installationId,
      status: BlockStatus.ACTIVE,
      archivedAt: null,
      blockType: { key: "exam-prep.exam" },
    },
    select: { id: true, allowAgentAccess: true },
  })

  if (!exam) {
    throw new ToolActionExecutionError(
      "The exam is not available in this Exam Prep installation.",
      "NOT_AVAILABLE"
    )
  }
  if (principal.invocationSource !== "web" && !exam.allowAgentAccess) {
    throw new ToolActionExecutionError(
      "Agent access is not enabled for this exam.",
      "FORBIDDEN"
    )
  }

  const generatedAt = new Date()
  const subjects = await getExamDashboardData(
    exam.id,
    input.workspaceId,
    input.installationId,
    actorId
  )
  const recommendationOutput = generateExamSubjectRecommendations({
    subjects,
    now: generatedAt,
  })
  const data = {
    examId: exam.id,
    generatedAt: generatedAt.toISOString(),
    recommendations: recommendationOutput,
  } as unknown as Record<string, JsonValue>
  const runId = crypto.randomUUID()

  try {
    await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findFirstOrThrow({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
          status: "ACTIVE",
        },
        include: { toolRelease: true },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "exam.get-subject-recommendations",
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: input.idempotencyKey,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          status: ToolRunStatus.RUNNING,
          startedAt: generatedAt,
          payload: { create: { input: { examId: exam.id } } },
        },
      })

      await tx.toolRun.update({
        where: { id: run.id },
        data: {
          status: ToolRunStatus.SUCCEEDED,
          completedAt: new Date(),
          payload: {
            update: {
              output: {
                rootBlockId: exam.id,
                createdBlockIds: [],
                evidenceIds: [],
                data,
              },
            },
          },
        },
      })
    })

    return {
      status: "succeeded",
      runId,
      rootBlockId: exam.id,
      createdBlockIds: [],
      evidenceIds: [],
      data,
    }
  } catch (error: unknown) {
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(
      getErrorMessage(error, "Failed to generate exam recommendations"),
      "RUN_FAILED"
    )
  }
}

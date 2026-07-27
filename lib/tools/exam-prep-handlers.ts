/* eslint-disable @typescript-eslint/no-explicit-any -- Legacy handlers predate strict action input types. */
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { ToolActionExecutionError, type ExecuteToolActionInput } from "@/lib/tools/execute-tool-action"
import type { JsonValue, ToolActionResult, ToolExecutionPrincipal } from "@/lib/tools/contracts"
import { BlockStatus, BlockVisibility, Prisma, ToolRunStatus } from "../../generated/prisma/client"
import { validateTestRecordMarks } from "./exam-prep/calculations/test-records"

// Shared helper to generate hashes
function hashInput(input: unknown): string {
  return crypto.createHash("md5").update(JSON.stringify(input)).digest("hex")
}

export async function executeExamPrepCreateExam(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId

  if (!actorId) {
    throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")
  }

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId },
        include: { toolRelease: true },
      })

      const blockType = await tx.blockType.findUniqueOrThrow({
        where: { key: "exam-prep.exam", toolDefinitionId: installation.toolDefinitionId },
      })

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "exam.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          status: ToolRunStatus.RUNNING,
          idempotencyKey: input.idempotencyKey,
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `exam-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary,
          properties: {
            examDate: actionInput.examDate,
            targetMarks: actionInput.targetMarks ? Number(actionInput.targetMarks) : null,
          },
          schemaVersion: 1,
          revision: 1
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
          output,
          completedAt: new Date(),
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

export async function executeExamPrepCreateSubject(
  input: ExecuteToolActionInput, principal: ToolExecutionPrincipal, handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentExamId = actionInput.examId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({ where: { key: "exam-prep.subject", toolDefinitionId: installation.toolDefinitionId } })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.exam-has-subject" } })

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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `subject-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary,
          properties: {
            weightage: Number(actionInput.weightage),
            foundationLevel: actionInput.foundationLevel,
            expectedMarks: actionInput.expectedMarks ? Number(actionInput.expectedMarks) : null,
          },
          schemaVersion: 1,
          revision: 1
        },
      })

      await tx.blockRelation.create({
        data: {
          workspaceId: input.workspaceId,
          fromBlockId: parent.id,
          toBlockId: blockId,
          relationTypeId: relationType.id,
          position: (lastRelation?.position ?? -1) + 1,
        },
      })

      const output = { rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })
    })

    return { runId: result.id, status: "succeeded", rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepCreateChapter(
  input: ExecuteToolActionInput, principal: ToolExecutionPrincipal, handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentSubjectId = actionInput.subjectId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({ where: { key: "exam-prep.chapter", toolDefinitionId: installation.toolDefinitionId } })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.subject-has-chapter" } })

      const parent = await tx.block.findFirstOrThrow({
        where: { id: parentSubjectId, workspaceId: input.workspaceId, archivedAt: null },
        select: { id: true },
      })
      const lastRelation = await tx.blockRelation.findFirst({
        where: { workspaceId: input.workspaceId, fromBlockId: parent.id, relationTypeId: relationType.id },
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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `chapter-${blockId.replace(/-/g, "")}`,
          summary: actionInput.summary,
          properties: {
            important: Boolean(actionInput.important),
          },
          schemaVersion: 1,
          revision: 1
        },
      })

      await tx.chapterBlock.create({
        data: { blockId, workspaceId: input.workspaceId },
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

      const output = { rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })
    })

    return { runId: result.id, status: "succeeded", rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepCreateTopic(
  input: ExecuteToolActionInput, principal: ToolExecutionPrincipal, handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const blockId = crypto.randomUUID()
  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const parentChapterId = actionInput.chapterId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId },
        include: { toolRelease: true },
      })
      const blockType = await tx.blockType.findUniqueOrThrow({ where: { key: "exam-prep.topic", toolDefinitionId: installation.toolDefinitionId } })
      const relationType = await tx.blockRelationType.findUniqueOrThrow({ where: { key: "exam-prep.chapter-has-topic" } })

      const parent = await tx.block.findFirstOrThrow({
        where: { id: parentChapterId, workspaceId: input.workspaceId, archivedAt: null },
        select: { id: true },
      })
      const lastRelation = await tx.blockRelation.findFirst({
        where: { workspaceId: input.workspaceId, fromBlockId: parent.id, relationTypeId: relationType.id },
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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
        },
      })

      await tx.block.create({
        data: {
          id: blockId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          createdById: actorId,
          blockTypeId: blockType.id,
          status: BlockStatus.ACTIVE,
          visibility: BlockVisibility.WORKSPACE,
          allowAgentAccess: true,
          title: actionInput.title,
          slug: `topic-${blockId.replace(/-/g, "")}`,
          properties: {
            important: Boolean(actionInput.important),
            learningStatus: false,
            revisionCount: 0,
            practiceCount: 0,
            testCount: 0,
          },
          schemaVersion: 1,
          revision: 1
        },
      })

      await tx.topicBlock.create({
        data: { blockId, workspaceId: input.workspaceId },
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

      const output = { rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })
    })

    return { runId: result.id, status: "succeeded", rootBlockId: blockId, createdBlockIds: [blockId], evidenceIds: [] }
  } catch (error: any) {
    throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
  }
}

export async function executeExamPrepTopicSetLearning(
  input: ExecuteToolActionInput, principal: ToolExecutionPrincipal, handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const runId = crypto.randomUUID()
  const actionInput = input.input as any
  const topicId = actionInput.topicId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findUniqueOrThrow({
        where: { id: input.installationId },
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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
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

      const output = { rootBlockId: topicId, createdBlockIds: [], evidenceIds: [] }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })
    })

    return { runId: result.id, status: "succeeded", rootBlockId: topicId, createdBlockIds: [], evidenceIds: [] }
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
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const runId = crypto.randomUUID()
  const actionInput = input.input as {
    topicId: string
    stage: "revision" | "practice" | "test"
    count: number
  }
  const progressField = `${actionInput.stage}Count` as
    | "revisionCount"
    | "practiceCount"
    | "testCount"

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installation = await tx.toolInstallation.findFirstOrThrow({
        where: { id: input.installationId, workspaceId: input.workspaceId },
        include: { toolRelease: true },
      })
      const block = await tx.block.findFirst({
        where: {
          id: actionInput.topicId,
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          archivedAt: null,
        },
      })
      if (!block) throw new Error("Topic not found.")

      const properties = (block.properties as Record<string, unknown>) ?? {}
      if (actionInput.count > 100) {
        throw new Error("Topic progress supports at most 100 completed steps.")
      }
      if (actionInput.count > 0 && properties.learningStatus !== true) {
        throw new Error("Mark this topic as learned before recording further progress.")
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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
        },
      })

      const now = new Date()
      const nextProperties = {
        ...properties,
        [progressField]: actionInput.count,
        ...(actionInput.stage === "revision" && actionInput.count > Number(properties.revisionCount ?? 0)
          ? {
              lastRevised: now.toISOString(),
              nextRevision: new Date(now.getTime() + actionInput.count * 2 * 86_400_000).toISOString(),
            }
          : {}),
        ...(actionInput.stage === "practice" && actionInput.count > Number(properties.practiceCount ?? 0)
          ? { lastPracticed: now.toISOString() }
          : {}),
      }
      await tx.block.update({
        where: { id: block.id },
        data: { properties: nextProperties, revision: { increment: 1 } },
      })

      const output = { rootBlockId: block.id, createdBlockIds: [], evidenceIds: [] }
      return tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
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
      error instanceof Error ? error.message : "Failed to update topic progress.",
      "RUN_FAILED"
    )
  }
}

export function createExamPrepTopicRecordEventExecutor(eventField: string, actionKey: string) {
  return async function executeExamPrepTopicRecordEvent(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

    const runId = crypto.randomUUID()
    const actionInput = input.input as any
    const topicId = actionInput.topicId

    try {
      const result = await prisma.$transaction(async (tx) => {
        const installation = await tx.toolInstallation.findUniqueOrThrow({
          where: { id: input.installationId },
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
            input: actionInput,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
          },
        })

        const block = await tx.block.findFirst({
          where: { id: topicId, workspaceId: input.workspaceId },
        })
        if (!block) throw new Error("Topic not found")

        const props = (block.properties as any) || {}
        const recordedAt = new Date().toISOString()
        props[eventField] = (props[eventField] || 0) + 1
        if (eventField === "revisionCount") props.lastRevised = recordedAt
        if (eventField === "practiceCount") props.lastPracticed = recordedAt

        await tx.block.update({
          where: { id: topicId },
          data: { properties: props },
        })

        const output = { rootBlockId: topicId, createdBlockIds: [], evidenceIds: [] }
        return await tx.toolRun.update({
          where: { id: run.id },
          data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
        })
      })

      return { runId: result.id, status: "succeeded", rootBlockId: topicId, createdBlockIds: [], evidenceIds: [] }
    } catch (error: any) {
      throw new ToolActionExecutionError(error.message || "Failed", "RUN_FAILED")
    }
  }
}

export const executeExamPrepTopicRecordRevision = createExamPrepTopicRecordEventExecutor("revisionCount", "topic.record-revision")
export const executeExamPrepTopicRecordPractice = createExamPrepTopicRecordEventExecutor("practiceCount", "topic.record-practice")
export const executeExamPrepTopicRecordTest = createExamPrepTopicRecordEventExecutor("testCount", "topic.record-test")

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
      throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")
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
        if (!block) throw new Error(`${kind === "chapter" ? "Chapter" : "Topic"} not found.`)

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
            input: actionInput as Prisma.InputJsonValue,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
          },
        })

        if (operation === "update") {
          const properties = (block.properties as Record<string, unknown>) ?? {}
          const important = actionInput.important === true
          const nextProperties = kind === "topic" && !important
            ? {
                ...properties,
                important,
                revisionCount: Math.min(Number(properties.revisionCount ?? 0), 3),
                practiceCount: Math.min(Number(properties.practiceCount ?? 0), 3),
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
        } else {
          const archivedAt = new Date()
          await tx.block.update({
            where: { id: block.id },
            data: { status: BlockStatus.ARCHIVED, archivedAt, revision: { increment: 1 } },
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
                id: { in: topicRelations.map((relation) => relation.toBlockId) },
                workspaceId: input.workspaceId,
                originToolInstallationId: input.installationId,
                archivedAt: null,
              },
              data: { status: BlockStatus.ARCHIVED, archivedAt },
            })
          }
        }

        const output = { rootBlockId: block.id, createdBlockIds: [], evidenceIds: [] }
        return tx.toolRun.update({
          where: { id: run.id },
          data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
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
        error instanceof Error ? error.message : `Failed to ${operation} ${kind}.`,
        "RUN_FAILED"
      )
    }
  }
}

function createExamPrepReorderExecutor(
  actionKey: "chapter.reorder" | "topic.reorder",
  relationTypeKey: "exam-prep.subject-has-chapter" | "exam-prep.chapter-has-topic",
  parentKey: "subjectId" | "chapterId",
  itemIdsKey: "chapterIds" | "topicIds"
) {
  return async function executeExamPrepReorder(
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> {
    const actorId = principal.actorId
    if (!actorId) {
      throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")
    }

    const actionInput = input.input as Record<string, unknown>
    const parentId = String(actionInput[parentKey])
    const orderedIds = actionInput[itemIdsKey] as string[]
    const runId = crypto.randomUUID()

    try {
      const result = await prisma.$transaction(async (tx) => {
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: { id: input.installationId, workspaceId: input.workspaceId },
          include: { toolRelease: true },
        })
        await tx.block.findFirstOrThrow({
          where: { id: parentId, workspaceId: input.workspaceId, archivedAt: null },
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
          },
          select: { id: true, toBlockId: true },
        })
        const currentIds = new Set(relations.map((relation) => relation.toBlockId))
        if (currentIds.size !== orderedIds.length || orderedIds.some((id) => !currentIds.has(id))) {
          throw new Error("The submitted order does not match the current syllabus.")
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
            input: actionInput as Prisma.InputJsonObject,
            inputHash: hashInput(actionInput),
            manifestHash: hashInput(installation.toolRelease.manifest),
            startedAt: new Date(),
          },
        })

        await Promise.all(
          orderedIds.map((itemId, position) => {
            const relation = relations.find((candidate) => candidate.toBlockId === itemId)
            return tx.blockRelation.update({
              where: { id: relation!.id },
              data: { position },
            })
          })
        )

        const output = { rootBlockId: parentId, createdBlockIds: [], evidenceIds: [] }
        return tx.toolRun.update({
          where: { id: run.id },
          data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
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
        error instanceof Error ? error.message : "Failed to save the new order.",
        "RUN_FAILED"
      )
    }
  }
}

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
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

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
        throw new ToolActionExecutionError("The active Exam Prep installation is unavailable.", "NOT_AVAILABLE")
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
          input: actionInput,
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          startedAt: new Date(),
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

      const output = { rootBlockId: subjectId, createdBlockIds: [], evidenceIds: [] }
      return await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
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
    throw new ToolActionExecutionError(error instanceof Error ? error.message : "Failed to update subject settings", "RUN_FAILED")
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
  title: string
  marksObtained: Prisma.Decimal
  totalMarks: Prisma.Decimal
  summary: string | null
  createdAt: Date
  updatedAt: Date
}): Record<string, JsonValue> {
  return {
    id: record.id,
    examId: record.examId,
    subjectId: record.subjectId,
    chapterId: record.chapterId,
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
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const actionInput = input.input as CreateTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError("The principal workspace does not match the action workspace.", "FORBIDDEN")
  }

  const runId = crypto.randomUUID()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { marksObtained, totalMarks } = validateTestRecordMarks(
        actionInput.marksObtained,
        actionInput.totalMarks
      )

      const installation = await tx.toolInstallation.findFirstOrThrow({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
          status: "ACTIVE",
        },
        include: { toolRelease: true },
      })

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
        throw new ToolActionExecutionError("Subject does not belong to this exam.", "INVALID_INPUT")
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
        if (!chapterRelation || chapterRelation.fromBlockId !== actionInput.subjectId) {
          throw new ToolActionExecutionError("Chapter does not belong to this subject.", "INVALID_INPUT")
        }
      }

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "test-record.create",
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: input.idempotencyKey,
          input: { ...actionInput },
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          status: ToolRunStatus.RUNNING,
          startedAt: new Date(),
        },
      })

      const record = await tx.testRecord.create({
        data: {
          workspaceId: input.workspaceId,
          userId: actorId,
          examId: actionInput.examId,
          subjectId: actionInput.subjectId,
          chapterId: actionInput.chapterId ?? null,
          title: actionInput.title.trim(),
          marksObtained,
          totalMarks,
          summary: actionInput.summary ?? null,
        },
      })

      const data = { testRecord: serializeTestRecord(record) }
      const output = {
        rootBlockId: actionInput.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })

      return { data, runId: run.id }
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
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(getErrorMessage(error, "Failed to create test record"), "RUN_FAILED")
  }
}

export async function executeExamPrepTestRecordUpdate(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const actionInput = input.input as UpdateTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError("The principal workspace does not match the action workspace.", "FORBIDDEN")
  }

  const runId = crypto.randomUUID()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const validMarks = validateTestRecordMarks(actionInput.marksObtained, actionInput.totalMarks)

      const installation = await tx.toolInstallation.findFirstOrThrow({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
          status: "ACTIVE",
        },
        include: { toolRelease: true },
      })

      const existing = await tx.testRecord.findFirst({
        where: {
          id: actionInput.testRecordId,
          workspaceId: input.workspaceId,
          userId: actorId,
        },
      })
      if (!existing) {
        throw new ToolActionExecutionError("Test record not found or not owned by this actor.", "FORBIDDEN")
      }

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "test-record.update",
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: input.idempotencyKey,
          input: { ...actionInput },
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          status: ToolRunStatus.RUNNING,
          startedAt: new Date(),
        },
      })

      const record = await tx.testRecord.update({
        where: { id: existing.id },
        data: {
          title: actionInput.title.trim(),
          marksObtained: validMarks.marksObtained,
          totalMarks: validMarks.totalMarks,
          summary: actionInput.summary ?? null,
        },
      })

      const data = { testRecord: serializeTestRecord(record) }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })

      return { data, examId: existing.examId, runId: run.id }
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
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(getErrorMessage(error, "Failed to update test record"), "RUN_FAILED")
  }
}

export async function executeExamPrepTestRecordDelete(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = principal.actorId
  if (!actorId) throw new ToolActionExecutionError("Workspace write access is required.", "FORBIDDEN")

  const actionInput = input.input as DeleteTestRecordInput
  if (actionInput.workspaceId !== principal.workspaceId) {
    throw new ToolActionExecutionError("The principal workspace does not match the action workspace.", "FORBIDDEN")
  }

  const runId = crypto.randomUUID()

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

      const existing = await tx.testRecord.findFirst({
        where: {
          id: actionInput.testRecordId,
          workspaceId: input.workspaceId,
          userId: actorId,
        },
      })
      if (!existing) {
        throw new ToolActionExecutionError("Test record not found or not owned by this actor.", "FORBIDDEN")
      }

      const run = await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey: "test-record.delete",
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: input.idempotencyKey,
          input: { ...actionInput },
          inputHash: hashInput(actionInput),
          manifestHash: hashInput(installation.toolRelease.manifest),
          status: ToolRunStatus.RUNNING,
          startedAt: new Date(),
        },
      })

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
      await tx.toolRun.update({
        where: { id: run.id },
        data: { status: ToolRunStatus.SUCCEEDED, output, completedAt: new Date() },
      })

      return { data, examId: existing.examId, runId: run.id }
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
    if (error instanceof ToolActionExecutionError) throw error
    throw new ToolActionExecutionError(getErrorMessage(error, "Failed to delete test record"), "RUN_FAILED")
  }
}

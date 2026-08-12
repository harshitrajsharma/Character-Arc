import crypto from "node:crypto"

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
  Prisma,
  ScheduledTestScope,
  ScheduledTestStatus,
  ToolRunStatus,
} from "../../generated/prisma/client"
import { validateTestRecordMarks } from "./exam-prep/calculations/test-records"

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3
const MAX_DECIMAL_8_2 = 999_999.99

type ScopeInput = "subject" | "chapter" | "multi-chapter"

type ScheduledTestPlanInput = {
  title: string
  scope: ScopeInput
  targetChapterIds: string[]
  scheduledFor?: string | null
  durationMinutes?: number | null
  totalMarks?: number | null
  notes?: string | null
}

type CreateScheduledTestInput = ScheduledTestPlanInput & {
  examId: string
  subjectId: string
}

type UpdateScheduledTestInput = ScheduledTestPlanInput & {
  scheduledTestId: string
  expectedRevision: number
}

type ScheduledTestRevisionInput = {
  scheduledTestId: string
  expectedRevision: number
}

type CancelScheduledTestInput = ScheduledTestRevisionInput & {
  reason?: string | null
}

type CompleteScheduledTestInput = ScheduledTestRevisionInput & {
  marksObtained: number
  totalMarks: number
  summary?: string | null
}

const scopeByInput: Record<ScopeInput, ScheduledTestScope> = {
  subject: ScheduledTestScope.SUBJECT,
  chapter: ScheduledTestScope.CHAPTER,
  "multi-chapter": ScheduledTestScope.MULTI_CHAPTER,
}

function hashInput(input: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(input)).digest("hex")
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`
}

function parseDateOnly(value: string | null | undefined) {
  if (value === null || value === undefined) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ToolActionExecutionError(
      "Scheduled date must use YYYY-MM-DD format.",
      "INVALID_INPUT"
    )
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new ToolActionExecutionError(
      "Scheduled date is not a valid calendar date.",
      "INVALID_INPUT"
    )
  }
  return date
}

function dateOnlyKey(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null
}

function reportUnexpectedError(error: unknown, fallback: string) {
  console.error(`[exam-prep scheduled tests] ${fallback}`, error)
  return fallback
}

function hasAtMostTwoDecimalPlaces(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
}

function requireValidPlanInput(actionInput: ScheduledTestPlanInput) {
  const title = actionInput.title.trim()
  if (!title) {
    throw new ToolActionExecutionError(
      "Test title cannot be blank.",
      "INVALID_INPUT"
    )
  }
  if (
    actionInput.totalMarks !== null &&
    actionInput.totalMarks !== undefined &&
    (!Number.isFinite(actionInput.totalMarks) ||
      actionInput.totalMarks <= 0 ||
      actionInput.totalMarks > MAX_DECIMAL_8_2 ||
      !hasAtMostTwoDecimalPlaces(actionInput.totalMarks))
  ) {
    throw new ToolActionExecutionError(
      "Total marks must be between 0.01 and 999999.99 with at most two decimal places.",
      "INVALID_INPUT"
    )
  }
  return title
}

function requireValidMarks(
  marksObtainedInput: number,
  totalMarksInput: number
) {
  try {
    const marks = validateTestRecordMarks(marksObtainedInput, totalMarksInput)
    if (
      marks.marksObtained > MAX_DECIMAL_8_2 ||
      marks.totalMarks > MAX_DECIMAL_8_2 ||
      !hasAtMostTwoDecimalPlaces(marks.marksObtained) ||
      !hasAtMostTwoDecimalPlaces(marks.totalMarks)
    ) {
      throw new Error("Marks exceed supported precision.")
    }
    return marks
  } catch {
    throw new ToolActionExecutionError(
      "Marks must be valid values up to 999999.99 with at most two decimal places, and obtained marks cannot exceed total marks.",
      "INVALID_INPUT"
    )
  }
}

export async function withSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
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

async function requireInstallation(
  tx: Prisma.TransactionClient,
  input: ExecuteToolActionInput
) {
  return tx.toolInstallation.findFirstOrThrow({
    where: {
      id: input.installationId,
      workspaceId: input.workspaceId,
      status: "ACTIVE",
      toolDefinition: { key: "core.exam-prep" },
    },
    include: { toolRelease: true },
  })
}

async function requireRuntimeAuthorization(
  tx: Prisma.TransactionClient,
  input: ExecuteToolActionInput,
  actorId: string
) {
  const membership = await tx.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: actorId,
      },
    },
    select: { userId: true },
  })
  if (!membership) {
    throw new ToolActionExecutionError(
      "Workspace membership is required.",
      "FORBIDDEN"
    )
  }
  return requireInstallation(tx, input)
}

async function requireExamSubjectContext(
  tx: Prisma.TransactionClient,
  input: ExecuteToolActionInput,
  examId: string,
  subjectId: string,
  scope: ScheduledTestScope,
  targetChapterIds: string[]
) {
  if (new Set(targetChapterIds).size !== targetChapterIds.length) {
    throw new ToolActionExecutionError(
      "Chapter targets must be unique.",
      "INVALID_INPUT"
    )
  }
  if (scope === ScheduledTestScope.SUBJECT && targetChapterIds.length !== 0) {
    throw new ToolActionExecutionError(
      "A subject test cannot target individual chapters.",
      "INVALID_INPUT"
    )
  }
  if (scope === ScheduledTestScope.CHAPTER && targetChapterIds.length !== 1) {
    throw new ToolActionExecutionError(
      "A chapter test must target exactly one chapter.",
      "INVALID_INPUT"
    )
  }
  if (
    scope === ScheduledTestScope.MULTI_CHAPTER &&
    targetChapterIds.length < 2
  ) {
    throw new ToolActionExecutionError(
      "A multi-chapter test must target at least two chapters.",
      "INVALID_INPUT"
    )
  }

  const examSubjectRelation = await tx.blockRelation.findFirst({
    where: {
      workspaceId: input.workspaceId,
      fromBlockId: examId,
      toBlockId: subjectId,
      relationType: { key: "exam-prep.exam-has-subject" },
      fromBlock: {
        workspaceId: input.workspaceId,
        originToolInstallationId: input.installationId,
        status: BlockStatus.ACTIVE,
        archivedAt: null,
        blockType: { key: "exam-prep.exam" },
      },
      toBlock: {
        workspaceId: input.workspaceId,
        originToolInstallationId: input.installationId,
        status: BlockStatus.ACTIVE,
        archivedAt: null,
        blockType: { key: "exam-prep.subject" },
      },
    },
    select: { id: true },
  })
  if (!examSubjectRelation) {
    throw new ToolActionExecutionError(
      "The subject does not belong to this active exam.",
      "INVALID_INPUT"
    )
  }

  if (targetChapterIds.length > 0) {
    const chapterRelations = await tx.blockRelation.findMany({
      where: {
        workspaceId: input.workspaceId,
        fromBlockId: subjectId,
        toBlockId: { in: targetChapterIds },
        relationType: { key: "exam-prep.subject-has-chapter" },
        toBlock: {
          workspaceId: input.workspaceId,
          originToolInstallationId: input.installationId,
          status: BlockStatus.ACTIVE,
          archivedAt: null,
          blockType: { key: "exam-prep.chapter" },
        },
      },
      select: { toBlockId: true },
    })
    const validChapterIds = new Set(
      chapterRelations.map((relation) => relation.toBlockId)
    )
    if (
      validChapterIds.size !== targetChapterIds.length ||
      targetChapterIds.some((chapterId) => !validChapterIds.has(chapterId))
    ) {
      throw new ToolActionExecutionError(
        "One or more target chapters do not belong to this subject.",
        "INVALID_INPUT"
      )
    }
  }

  return examSubjectRelation.id
}

async function requireOwnedScheduledTest(
  tx: Prisma.TransactionClient,
  input: ExecuteToolActionInput,
  actorId: string,
  scheduledTestId: string
) {
  const scheduledTest = await tx.scheduledTest.findFirst({
    where: {
      id: scheduledTestId,
      workspaceId: input.workspaceId,
      installationId: input.installationId,
      userId: actorId,
    },
    include: {
      chapters: { orderBy: { position: "asc" } },
      testRecord: { select: { id: true } },
    },
  })
  if (!scheduledTest) {
    throw new ToolActionExecutionError(
      "Scheduled test not found or not owned by this actor.",
      "FORBIDDEN"
    )
  }
  return scheduledTest
}

function requireExpectedRevision(
  actualRevision: number,
  expectedRevision: number
) {
  if (actualRevision !== expectedRevision) {
    throw new ToolActionExecutionError(
      "This test plan changed in another session. Refresh and try again.",
      "RUN_FAILED"
    )
  }
}

type ReservedToolRun = {
  runId: string
  replay: ToolActionResult | null
}

function readSucceededRun(record: {
  id: string
  payload: { output: Prisma.JsonValue | null } | null
}): ToolActionResult {
  const output = record.payload?.output
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ToolActionExecutionError(
      "The previous action result is unavailable.",
      "RUN_FAILED"
    )
  }
  const stored = output as Record<string, unknown>
  const createdBlockIds = Array.isArray(stored.createdBlockIds)
    ? stored.createdBlockIds.filter(
        (value): value is string => typeof value === "string"
      )
    : []
  const evidenceIds = Array.isArray(stored.evidenceIds)
    ? stored.evidenceIds.filter(
        (value): value is string => typeof value === "string"
      )
    : []
  const data =
    stored.data &&
    typeof stored.data === "object" &&
    !Array.isArray(stored.data)
      ? (stored.data as Record<string, JsonValue>)
      : undefined

  return {
    runId: record.id,
    status: "succeeded",
    rootBlockId:
      typeof stored.rootBlockId === "string" ? stored.rootBlockId : undefined,
    createdBlockIds,
    evidenceIds,
    data,
  }
}

function resolveExistingRun(
  existing: {
    id: string
    actorId: string | null
    actionKey: string
    handlerVersion: string
    inputHash: string
    status: ToolRunStatus
    errorMessage: string | null
    payload: { output: Prisma.JsonValue | null } | null
  },
  actorId: string,
  actionKey: string,
  handlerVersion: string,
  inputHash: string
): ReservedToolRun {
  if (
    existing.actorId !== actorId ||
    existing.actionKey !== actionKey ||
    existing.handlerVersion !== handlerVersion ||
    existing.inputHash !== inputHash
  ) {
    throw new ToolActionExecutionError(
      "This idempotency key was already used for a different action or input.",
      "INVALID_INPUT"
    )
  }
  if (existing.status === ToolRunStatus.SUCCEEDED) {
    return { runId: existing.id, replay: readSucceededRun(existing) }
  }
  if (existing.status === ToolRunStatus.FAILED) {
    throw new ToolActionExecutionError(
      existing.errorMessage || "The previous action attempt failed.",
      "RUN_FAILED"
    )
  }
  throw new ToolActionExecutionError(
    "This action is already being processed. Try again shortly.",
    "RUN_FAILED"
  )
}

export async function reserveToolRun(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string,
  actionKey: string,
  actionInput: object
): Promise<ReservedToolRun> {
  const actorId = requireActor(principal)
  const inputHash = hashInput(actionInput)
  const scopedIdempotencyKey = `st1_${hashInput({
    actorId,
    actionKey,
    key: input.idempotencyKey,
  })}`

  try {
    return await withSerializableTransaction(async (tx) => {
      const installation = await requireRuntimeAuthorization(
        tx,
        input,
        actorId
      )
      const existing = await tx.toolRun.findFirst({
        where: {
          installationId: input.installationId,
          actorId,
          actionKey,
          idempotencyKey: scopedIdempotencyKey,
        },
        include: { payload: { select: { output: true } } },
      })
      if (existing) {
        if (existing.status === ToolRunStatus.FAILED) {
          // A failed attempt never committed its domain changes, so a retry
          // with the same idempotency key is a fresh attempt instead of a
          // permanently poisoned key.
          await tx.toolRunPayload.deleteMany({
            where: { toolRunId: existing.id },
          })
          await tx.toolRun.delete({ where: { id: existing.id } })
        } else {
          return resolveExistingRun(
            existing,
            actorId,
            actionKey,
            handlerVersion,
            inputHash
          )
        }
      }

      const run = await tx.toolRun.create({
        data: {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId,
          actionKey,
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: scopedIdempotencyKey,
          inputHash,
          manifestHash: hashInput(installation.toolRelease.manifest),
          status: ToolRunStatus.RUNNING,
          startedAt: new Date(),
          payload: {
            create: { input: actionInput as Prisma.InputJsonValue },
          },
        },
      })
      return { runId: run.id, replay: null }
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.toolRun.findFirst({
        where: {
          installationId: input.installationId,
          idempotencyKey: scopedIdempotencyKey,
        },
        include: { payload: { select: { output: true } } },
      })
      if (existing) {
        if (existing.status === ToolRunStatus.FAILED) {
          await prisma.toolRunPayload.deleteMany({
            where: { toolRunId: existing.id },
          })
          await prisma.toolRun.delete({ where: { id: existing.id } })
          return reserveToolRun(
            input,
            principal,
            handlerVersion,
            actionKey,
            actionInput
          )
        }
        return resolveExistingRun(
          existing,
          actorId,
          actionKey,
          handlerVersion,
          inputHash
        )
      }
    }
    throw error
  }
}

export async function completeToolRun(
  tx: Prisma.TransactionClient,
  runId: string,
  output: Record<string, JsonValue>
) {
  await tx.toolRun.update({
    where: { id: runId },
    data: {
      status: ToolRunStatus.SUCCEEDED,
      completedAt: new Date(),
      payload: { update: { output: output as Prisma.InputJsonValue } },
    },
  })
}

export async function failToolRunAndThrow(
  runId: string,
  error: unknown,
  fallback: string
): Promise<never> {
  const isPublicError = error instanceof ToolActionExecutionError
  const code = isPublicError ? error.code : "RUN_FAILED"
  const message = isPublicError
    ? error.message
    : reportUnexpectedError(error, fallback)

  try {
    await prisma.$transaction(async (tx) => {
      const failed = await tx.toolRun.updateMany({
        where: { id: runId, status: ToolRunStatus.RUNNING },
        data: {
          status: ToolRunStatus.FAILED,
          errorCode: code,
          errorMessage: message,
          completedAt: new Date(),
        },
      })
      if (failed.count === 1) {
        await tx.toolRunPayload.update({
          where: { toolRunId: runId },
          data: {
            error: { code, message } as Prisma.InputJsonValue,
          },
        })
      }
    })
  } catch (auditError) {
    console.error(
      "[exam-prep scheduled tests] Failed to persist ToolRun failure",
      {
        runId,
        auditError,
      }
    )
  }

  if (isPublicError) throw error
  throw new ToolActionExecutionError(message, "RUN_FAILED")
}

function serializeScheduledTest(record: {
  id: string
  examId: string
  subjectId: string
  title: string
  scope: ScheduledTestScope
  status: ScheduledTestStatus
  scheduledFor: Date | null
  durationMinutes: number | null
  totalMarks: Prisma.Decimal | null
  notes: string | null
  revision: number
  rescheduleCount: number
  completedAt: Date | null
  cancelledAt: Date | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
  chapters: Array<{ chapterId: string }>
  testRecord: { id: string } | null
}): Record<string, JsonValue> {
  return {
    id: record.id,
    examId: record.examId,
    subjectId: record.subjectId,
    title: record.title,
    scope: record.scope.toLowerCase().replace("_", "-"),
    status: record.status.toLowerCase(),
    scheduledFor: dateOnlyKey(record.scheduledFor),
    durationMinutes: record.durationMinutes,
    totalMarks: record.totalMarks === null ? null : Number(record.totalMarks),
    notes: record.notes,
    revision: record.revision,
    rescheduleCount: record.rescheduleCount,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    cancellationReason: record.cancellationReason,
    targetChapterIds: record.chapters.map((target) => target.chapterId),
    testRecordId: record.testRecord?.id ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function serializeTestRecord(record: {
  id: string
  examId: string
  subjectId: string | null
  chapterId: string | null
  scheduledTestId: string | null
  scope: ScheduledTestScope | null
  attemptedAt: Date | null
  title: string
  marksObtained: Prisma.Decimal
  totalMarks: Prisma.Decimal
  summary: string | null
  createdAt: Date
  updatedAt: Date
  targetChapters: Array<{ chapterId: string }>
}): Record<string, JsonValue> {
  return {
    id: record.id,
    examId: record.examId,
    subjectId: record.subjectId,
    chapterId: record.chapterId,
    scheduledTestId: record.scheduledTestId,
    scope: record.scope?.toLowerCase().replace("_", "-") ?? null,
    attemptedAt: record.attemptedAt?.toISOString() ?? null,
    title: record.title,
    marksObtained: Number(record.marksObtained),
    totalMarks: Number(record.totalMarks),
    summary: record.summary,
    targetChapterIds: record.targetChapters.map((target) => target.chapterId),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toToolResult(
  runId: string,
  rootBlockId: string,
  data: Record<string, JsonValue>
): ToolActionResult {
  return {
    status: "succeeded",
    runId,
    rootBlockId,
    createdBlockIds: [],
    evidenceIds: [],
    data,
  }
}

function requireActor(principal: ToolExecutionPrincipal) {
  if (!principal.actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }
  return principal.actorId
}

export async function executeExamPrepScheduledTestCreate(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as CreateScheduledTestInput
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "scheduled-test.create",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const title = requireValidPlanInput(actionInput)
      const scope = scopeByInput[actionInput.scope]
      const scheduledFor = parseDateOnly(actionInput.scheduledFor)
      const examSubjectRelationId = await requireExamSubjectContext(
        tx,
        input,
        actionInput.examId,
        actionInput.subjectId,
        scope,
        actionInput.targetChapterIds
      )
      const scheduledTest = await tx.scheduledTest.create({
        data: {
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          examId: actionInput.examId,
          subjectId: actionInput.subjectId,
          examSubjectRelationId,
          title,
          scope,
          status: scheduledFor
            ? ScheduledTestStatus.SCHEDULED
            : ScheduledTestStatus.PLANNED,
          scheduledFor,
          durationMinutes: actionInput.durationMinutes ?? null,
          totalMarks: actionInput.totalMarks ?? null,
          notes: actionInput.notes?.trim() || null,
          chapters: {
            create: actionInput.targetChapterIds.map((chapterId, position) => ({
              workspaceId: input.workspaceId,
              chapterId,
              position,
            })),
          },
        },
        include: {
          chapters: { orderBy: { position: "asc" } },
          testRecord: { select: { id: true } },
        },
      })
      const data = { scheduledTest: serializeScheduledTest(scheduledTest) }
      const output = {
        rootBlockId: actionInput.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return { runId: reservation.runId, data }
    })

    return toToolResult(result.runId, actionInput.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to create scheduled test."
    )
  }
}

export async function executeExamPrepScheduledTestUpdate(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as UpdateScheduledTestInput
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "scheduled-test.update",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const title = requireValidPlanInput(actionInput)
      const existing = await requireOwnedScheduledTest(
        tx,
        input,
        actorId,
        actionInput.scheduledTestId
      )
      requireExpectedRevision(existing.revision, actionInput.expectedRevision)
      if (
        existing.status === ScheduledTestStatus.COMPLETED ||
        existing.status === ScheduledTestStatus.CANCELLED
      ) {
        throw new ToolActionExecutionError(
          existing.status === ScheduledTestStatus.COMPLETED
            ? "Reopen the completed test before editing its plan."
            : "Restore the cancelled test before editing its plan.",
          "INVALID_INPUT"
        )
      }

      const scope = scopeByInput[actionInput.scope]
      const scheduledFor = parseDateOnly(actionInput.scheduledFor)
      const examSubjectRelationId = await requireExamSubjectContext(
        tx,
        input,
        existing.examId,
        existing.subjectId,
        scope,
        actionInput.targetChapterIds
      )
      const wasRescheduled =
        dateOnlyKey(existing.scheduledFor) !== dateOnlyKey(scheduledFor)

      const update = await tx.scheduledTest.updateMany({
        where: {
          id: existing.id,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          revision: actionInput.expectedRevision,
          status: {
            in: [ScheduledTestStatus.PLANNED, ScheduledTestStatus.SCHEDULED],
          },
        },
        data: {
          examSubjectRelationId,
          title,
          scope,
          status: scheduledFor
            ? ScheduledTestStatus.SCHEDULED
            : ScheduledTestStatus.PLANNED,
          scheduledFor,
          durationMinutes: actionInput.durationMinutes ?? null,
          totalMarks: actionInput.totalMarks ?? null,
          notes: actionInput.notes?.trim() || null,
          revision: { increment: 1 },
          ...(wasRescheduled
            ? {
                rescheduleCount: { increment: 1 },
                lastRescheduledAt: new Date(),
              }
            : {}),
        },
      })
      if (update.count !== 1) {
        throw new ToolActionExecutionError(
          "This test plan changed in another session. Refresh and try again.",
          "RUN_FAILED"
        )
      }

      await tx.scheduledTestChapter.deleteMany({
        where: { scheduledTestId: existing.id },
      })
      if (actionInput.targetChapterIds.length > 0) {
        await tx.scheduledTestChapter.createMany({
          data: actionInput.targetChapterIds.map((chapterId, position) => ({
            scheduledTestId: existing.id,
            workspaceId: input.workspaceId,
            chapterId,
            position,
          })),
        })
      }

      const scheduledTest = await tx.scheduledTest.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          chapters: { orderBy: { position: "asc" } },
          testRecord: { select: { id: true } },
        },
      })
      const data = { scheduledTest: serializeScheduledTest(scheduledTest) }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        examId: existing.examId,
        data,
      }
    })

    return toToolResult(result.runId, result.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to update scheduled test."
    )
  }
}

async function executeScheduledTestStatusTransition(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string,
  transition: "cancel" | "restore"
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as CancelScheduledTestInput
  const actionKey = `scheduled-test.${transition}`
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    actionKey,
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const existing = await requireOwnedScheduledTest(
        tx,
        input,
        actorId,
        actionInput.scheduledTestId
      )
      requireExpectedRevision(existing.revision, actionInput.expectedRevision)
      const validStatus =
        transition === "cancel"
          ? existing.status === ScheduledTestStatus.PLANNED ||
            existing.status === ScheduledTestStatus.SCHEDULED
          : existing.status === ScheduledTestStatus.CANCELLED
      if (!validStatus) {
        throw new ToolActionExecutionError(
          transition === "cancel"
            ? "Only an incomplete test can be cancelled."
            : "Only a cancelled test can be restored.",
          "INVALID_INPUT"
        )
      }

      if (transition === "restore") {
        await requireExamSubjectContext(
          tx,
          input,
          existing.examId,
          existing.subjectId,
          existing.scope,
          existing.chapters.map((target) => target.chapterId)
        )
      }

      const nextStatus =
        transition === "cancel"
          ? ScheduledTestStatus.CANCELLED
          : existing.scheduledFor
            ? ScheduledTestStatus.SCHEDULED
            : ScheduledTestStatus.PLANNED
      const update = await tx.scheduledTest.updateMany({
        where: {
          id: existing.id,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          revision: actionInput.expectedRevision,
          status: existing.status,
        },
        data: {
          status: nextStatus,
          revision: { increment: 1 },
          cancelledAt: transition === "cancel" ? new Date() : null,
          cancellationReason:
            transition === "cancel" ? actionInput.reason?.trim() || null : null,
        },
      })
      if (update.count !== 1) {
        throw new ToolActionExecutionError(
          "This test plan changed in another session. Refresh and try again.",
          "RUN_FAILED"
        )
      }

      const scheduledTest = await tx.scheduledTest.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          chapters: { orderBy: { position: "asc" } },
          testRecord: { select: { id: true } },
        },
      })
      const data = { scheduledTest: serializeScheduledTest(scheduledTest) }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        examId: existing.examId,
        data,
      }
    })

    return toToolResult(result.runId, result.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      `Failed to ${transition} scheduled test.`
    )
  }
}

export function executeExamPrepScheduledTestCancel(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
) {
  return executeScheduledTestStatusTransition(
    input,
    principal,
    handlerVersion,
    "cancel"
  )
}

export function executeExamPrepScheduledTestRestore(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
) {
  return executeScheduledTestStatusTransition(
    input,
    principal,
    handlerVersion,
    "restore"
  )
}

export async function executeExamPrepScheduledTestComplete(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as CompleteScheduledTestInput
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "scheduled-test.complete",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const existing = await requireOwnedScheduledTest(
        tx,
        input,
        actorId,
        actionInput.scheduledTestId
      )
      requireExpectedRevision(existing.revision, actionInput.expectedRevision)
      if (
        existing.status !== ScheduledTestStatus.PLANNED &&
        existing.status !== ScheduledTestStatus.SCHEDULED
      ) {
        throw new ToolActionExecutionError(
          "Only an incomplete scheduled test can be completed.",
          "INVALID_INPUT"
        )
      }
      const { marksObtained, totalMarks } = requireValidMarks(
        actionInput.marksObtained,
        actionInput.totalMarks
      )

      await requireExamSubjectContext(
        tx,
        input,
        existing.examId,
        existing.subjectId,
        existing.scope,
        existing.chapters.map((target) => target.chapterId)
      )
      const attemptedAt = new Date()
      const testRecord = await tx.testRecord.create({
        data: {
          workspaceId: input.workspaceId,
          userId: actorId,
          examId: existing.examId,
          subjectId: existing.subjectId,
          chapterId:
            existing.scope === ScheduledTestScope.CHAPTER
              ? (existing.chapters[0]?.chapterId ?? null)
              : null,
          scheduledTestId: existing.id,
          scope: existing.scope,
          attemptedAt,
          title: existing.title,
          marksObtained,
          totalMarks,
          summary: actionInput.summary?.trim() || null,
          targetChapters: {
            create: existing.chapters.map((target, position) => ({
              workspaceId: input.workspaceId,
              chapterId: target.chapterId,
              position,
            })),
          },
        },
        include: {
          targetChapters: { orderBy: { position: "asc" } },
        },
      })
      const update = await tx.scheduledTest.updateMany({
        where: {
          id: existing.id,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          revision: actionInput.expectedRevision,
          status: existing.status,
        },
        data: {
          status: ScheduledTestStatus.COMPLETED,
          completedAt: attemptedAt,
          revision: { increment: 1 },
        },
      })
      if (update.count !== 1) {
        throw new ToolActionExecutionError(
          "This test plan changed in another session. Refresh and try again.",
          "RUN_FAILED"
        )
      }

      const scheduledTest = await tx.scheduledTest.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          chapters: { orderBy: { position: "asc" } },
          testRecord: { select: { id: true } },
        },
      })
      const data = {
        scheduledTest: serializeScheduledTest(scheduledTest),
        testRecord: serializeTestRecord(testRecord),
      }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        examId: existing.examId,
        data,
      }
    })

    return toToolResult(result.runId, result.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to complete scheduled test."
    )
  }
}

export async function executeExamPrepScheduledTestReopen(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as ScheduledTestRevisionInput
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "scheduled-test.reopen",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const existing = await requireOwnedScheduledTest(
        tx,
        input,
        actorId,
        actionInput.scheduledTestId
      )
      requireExpectedRevision(existing.revision, actionInput.expectedRevision)
      if (existing.status !== ScheduledTestStatus.COMPLETED) {
        throw new ToolActionExecutionError(
          "Only a completed scheduled test can be reopened.",
          "INVALID_INPUT"
        )
      }

      await requireExamSubjectContext(
        tx,
        input,
        existing.examId,
        existing.subjectId,
        existing.scope,
        existing.chapters.map((target) => target.chapterId)
      )

      if (existing.testRecord) {
        await tx.testRecord.delete({ where: { id: existing.testRecord.id } })
      }
      const update = await tx.scheduledTest.updateMany({
        where: {
          id: existing.id,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          revision: actionInput.expectedRevision,
          status: ScheduledTestStatus.COMPLETED,
        },
        data: {
          status: existing.scheduledFor
            ? ScheduledTestStatus.SCHEDULED
            : ScheduledTestStatus.PLANNED,
          completedAt: null,
          revision: { increment: 1 },
        },
      })
      if (update.count !== 1) {
        throw new ToolActionExecutionError(
          "This test plan changed in another session. Refresh and try again.",
          "RUN_FAILED"
        )
      }

      const scheduledTest = await tx.scheduledTest.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          chapters: { orderBy: { position: "asc" } },
          testRecord: { select: { id: true } },
        },
      })
      const data = { scheduledTest: serializeScheduledTest(scheduledTest) }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        examId: existing.examId,
        data,
      }
    })

    return toToolResult(result.runId, result.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to reopen scheduled test."
    )
  }
}

export async function executeExamPrepScheduledTestDelete(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string
): Promise<ToolActionResult> {
  const actorId = requireActor(principal)
  const actionInput = input.input as ScheduledTestRevisionInput
  const reservation = await reserveToolRun(
    input,
    principal,
    handlerVersion,
    "scheduled-test.delete",
    actionInput
  )
  if (reservation.replay) return reservation.replay

  try {
    const result = await withSerializableTransaction(async (tx) => {
      await requireRuntimeAuthorization(tx, input, actorId)
      const existing = await requireOwnedScheduledTest(
        tx,
        input,
        actorId,
        actionInput.scheduledTestId
      )
      requireExpectedRevision(existing.revision, actionInput.expectedRevision)
      if (existing.status === ScheduledTestStatus.COMPLETED) {
        throw new ToolActionExecutionError(
          "Reopen this completed test before deleting its plan.",
          "INVALID_INPUT"
        )
      }

      const deleted = await tx.scheduledTest.deleteMany({
        where: {
          id: existing.id,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          userId: actorId,
          revision: actionInput.expectedRevision,
          status: {
            in: [
              ScheduledTestStatus.PLANNED,
              ScheduledTestStatus.SCHEDULED,
              ScheduledTestStatus.CANCELLED,
            ],
          },
        },
      })
      if (deleted.count !== 1) {
        throw new ToolActionExecutionError(
          "This test plan changed in another session. Refresh and try again.",
          "RUN_FAILED"
        )
      }
      const data = {
        deletedScheduledTest: {
          id: existing.id,
          examId: existing.examId,
          subjectId: existing.subjectId,
        },
      }
      const output = {
        rootBlockId: existing.examId,
        createdBlockIds: [],
        evidenceIds: [],
        data,
      }
      await completeToolRun(tx, reservation.runId, output)
      return {
        runId: reservation.runId,
        examId: existing.examId,
        data,
      }
    })

    return toToolResult(result.runId, result.examId, result.data)
  } catch (error) {
    return failToolRunAndThrow(
      reservation.runId,
      error,
      "Failed to delete scheduled test."
    )
  }
}

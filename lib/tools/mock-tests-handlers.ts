/**
 * Action executors for the `core.mock-tests` tool.
 *
 * Sixteen handlers wiring the (never-wired) assessment engine in
 * `prisma/schema.prisma` to the tool pipeline. Question/Attempt rows are
 * standalone; only an Assessment creates a real Block row. Write handlers
 * follow the reserve → serializable-transaction → complete/fail pattern from
 * exam-prep (scoped `mt1_` idempotency namespace); read handlers create a
 * fresh, non-replayed ToolRun and return the queried data.
 *
 * The tool is free-only: no AI call anywhere. External agents reach these via
 * `executeToolAction` through the future MCP server.
 */
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
  BlockVisibility,
  Prisma,
  ToolRunStatus,
} from "../../generated/prisma/client"

import { markResponse } from "./definitions/mock-tests/calculations/scoring"
import { writeAttemptEvidence } from "./definitions/mock-tests/calculations/evidence"
import { getWeakTopics } from "./definitions/mock-tests/repository"
import { REVISION_CONFLICT_MESSAGE } from "./mock-tests/revision-conflict"
import {
  completeMockTestsRun,
  failMockTestsRunAndThrow,
  hashInput,
  reserveMockTestsRun,
  withMockTestsSerializableTransaction,
  type ReservedToolRun,
} from "./mock-tests-runtime"

const QUESTION_KIND = {
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  NUMERIC: "NUMERIC",
  SHORT_ANSWER: "SHORT_ANSWER",
} as const
type QuestionKind = keyof typeof QUESTION_KIND

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Prisma Decimal → number without crashing on undefined. */
function num(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function toISO(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.round(value * 100) / 100 === value
}

function requireDecimal(value: number, field: string): number {
  if (!Number.isFinite(value) || !hasAtMostTwoDecimalPlaces(value)) {
    throw new ToolActionExecutionError(
      `${field} must be a number with at most two decimal places.`,
      "INVALID_INPUT"
    )
  }
  return value
}

function requireNonNegative(value: number, field: string): number {
  if (value < 0) {
    throw new ToolActionExecutionError(
      `${field} must be zero or greater.`,
      "INVALID_INPUT"
    )
  }
  return value
}

/** negativeMarks is stored as the penalty (≤ 0); 0 = no penalty. */
function requireNonPositive(value: number, field: string): number {
  if (value > 0) {
    throw new ToolActionExecutionError(
      `${field} must be zero or a negative penalty.`,
      "INVALID_INPUT"
    )
  }
  return value
}

function assertUniqueKeys(values: string[], field: string): void {
  const seen = new Set<string>()
  for (const key of values) {
    if (seen.has(key)) {
      throw new ToolActionExecutionError(
        `${field} contains a duplicate key "${key}".`,
        "INVALID_INPUT"
      )
    }
    seen.add(key)
  }
}

function requireOptionalPositiveInt(
  value: number | null | undefined,
  field: string
): void {
  if (value !== null && value !== undefined && (!Number.isInteger(value) || value < 1)) {
    throw new ToolActionExecutionError(
      `${field} must be a positive integer.`,
      "INVALID_INPUT"
    )
  }
}

// ---------------------------------------------------------------------------
// Question payload validation
// ---------------------------------------------------------------------------

type QuestionPayload = {
  stem: string
  kind: string
  difficulty?: number | null
  options?: Array<{ key: string; content: string; position?: number }>
  answerKeys?: string[]
  numericAnswer?: number | null
  textAnswer?: string | null
  explanation?: string | null
  targets?: Array<{ blockId: string; weight?: number; isPrimary?: boolean }>
}

function validateQuestionPayload(payload: QuestionPayload): void {
  const { stem, kind, options = [], answerKeys = [], targets = [] } = payload
  if (!stem.trim()) {
    throw new ToolActionExecutionError(
      "Question stem is required.",
      "INVALID_INPUT"
    )
  }
  if (!(kind in QUESTION_KIND)) {
    throw new ToolActionExecutionError(
      `Unsupported question kind "${kind}".`,
      "INVALID_INPUT"
    )
  }
  if (options.length > 26) {
    throw new ToolActionExecutionError(
      "A question can have at most 26 options.",
      "INVALID_INPUT"
    )
  }
  assertUniqueKeys(
    options.map((option) => option.key),
    "options"
  )
  assertUniqueKeys(answerKeys, "answerKeys")
  assertUniqueKeys(
    targets.map((target) => target.blockId),
    "targets"
  )

  for (const target of targets) {
    if (
      target.weight !== undefined &&
      (target.weight < 0 || target.weight > 100)
    ) {
      throw new ToolActionExecutionError(
        `Target weight for block "${target.blockId}" must be between 0 and 100.`,
        "INVALID_INPUT"
      )
    }
  }

  const optionKeys = new Set(options.map((option) => option.key))
  for (const key of answerKeys) {
    if (!optionKeys.has(key)) {
      throw new ToolActionExecutionError(
        `Answer key "${key}" does not match any option.`,
        "INVALID_INPUT"
      )
    }
  }

  if (kind === QUESTION_KIND.SINGLE_CHOICE) {
    if (answerKeys.length !== 1) {
      throw new ToolActionExecutionError(
        "SINGLE_CHOICE questions require exactly one answer key.",
        "INVALID_INPUT"
      )
    }
  } else if (kind === QUESTION_KIND.MULTIPLE_CHOICE) {
    if (answerKeys.length < 1) {
      throw new ToolActionExecutionError(
        "MULTIPLE_CHOICE questions require at least one answer key.",
        "INVALID_INPUT"
      )
    }
  } else if (kind === QUESTION_KIND.TRUE_FALSE) {
    if (options.length !== 2 || answerKeys.length !== 1) {
      throw new ToolActionExecutionError(
        "TRUE_FALSE questions require exactly two options and one answer key.",
        "INVALID_INPUT"
      )
    }
  } else if (kind === QUESTION_KIND.NUMERIC) {
    if (options.length > 0 || answerKeys.length > 0) {
      throw new ToolActionExecutionError(
        "NUMERIC questions cannot have options or answer keys.",
        "INVALID_INPUT"
      )
    }
    if (payload.numericAnswer === null || payload.numericAnswer === undefined) {
      throw new ToolActionExecutionError(
        "NUMERIC questions require a numericAnswer.",
        "INVALID_INPUT"
      )
    }
    if (!Number.isFinite(payload.numericAnswer)) {
      throw new ToolActionExecutionError(
        "numericAnswer must be a finite number.",
        "INVALID_INPUT"
      )
    }
  } else if (kind === QUESTION_KIND.SHORT_ANSWER) {
    throw new ToolActionExecutionError(
      "Short answer questions are not supported because they cannot be evaluated automatically in CBT mock tests.",
      "INVALID_INPUT"
    )
  }
}

/**
 * Replaces the content rows (options, solution, targets) of a question. Safe
 * to call for a fresh create — the deleteMany calls are no-ops.
 */
async function replaceQuestionContent(
  tx: Prisma.TransactionClient,
  args: {
    workspaceId: string
    questionId: string
    payload: QuestionPayload
  }
): Promise<void> {
  const { workspaceId, questionId, payload } = args
  const options = payload.options ?? []
  const answerKeys = payload.answerKeys ?? []
  const targets = payload.targets ?? []

  await tx.questionSolutionOption.deleteMany({ where: { questionId } })
  await tx.questionSolution.deleteMany({ where: { questionId } })
  await tx.questionOption.deleteMany({ where: { questionId } })
  await tx.questionTarget.deleteMany({ where: { questionId } })

  const optionIdsByKey = new Map<string, string>()
  for (const option of options) {
    const optionId = crypto.randomUUID()
    await tx.questionOption.create({
      data: {
        id: optionId,
        workspaceId,
        questionId,
        key: option.key,
        content: option.content,
        position: option.position ?? options.indexOf(option),
        metadata: {},
      },
    })
    optionIdsByKey.set(option.key, optionId)
  }

  await tx.questionSolution.create({
    data: {
      workspaceId,
      questionId,
      explanation: payload.explanation ?? null,
      numericAnswer: payload.numericAnswer ?? null,
      textAnswer: payload.textAnswer ?? null,
      gradingConfig: {},
    },
  })
  for (const key of answerKeys) {
    const optionId = optionIdsByKey.get(key)
    if (!optionId) {
      throw new ToolActionExecutionError(
        `Answer key "${key}" does not match an option.`,
        "INVALID_INPUT"
      )
    }
    await tx.questionSolutionOption.create({
      data: { workspaceId, questionId, questionOptionId: optionId },
    })
  }

  if (targets.length > 0) {
    const blockIds = targets.map((target) => target.blockId)
    const blocks = await tx.block.findMany({
      where: { id: { in: blockIds }, workspaceId, status: "ACTIVE" },
      select: { id: true },
    })
    const found = new Set(blocks.map((block) => block.id))
    for (const target of targets) {
      if (!found.has(target.blockId)) {
        throw new ToolActionExecutionError(
          `Target block "${target.blockId}" is not available in this workspace.`,
          "INVALID_INPUT"
        )
      }
      await tx.questionTarget.create({
        data: {
          workspaceId,
          questionId,
          blockId: target.blockId,
          weight: target.weight ?? 100,
          isPrimary: target.isPrimary ?? false,
        },
      })
    }
  }
}

/** Loads the assessment block + verifies expectedRevision (optimistic lock). */
async function requireAssessmentRevision(
  tx: Prisma.TransactionClient,
  args: {
    workspaceId: string
    assessmentId: string
    expectedRevision: number
  }
): Promise<number> {
  const { workspaceId, assessmentId, expectedRevision } = args
  const assessment = await tx.assessment.findFirst({
    where: { blockId: assessmentId, workspaceId },
    select: {
      blockId: true,
      status: true,
      block: { select: { revision: true } },
    },
  })
  if (!assessment) {
    throw new ToolActionExecutionError(
      "The mock test is not available in this workspace.",
      "NOT_AVAILABLE"
    )
  }
  const actualRevision = Number(assessment.block.revision)
  if (actualRevision !== expectedRevision) {
    throw new ToolActionExecutionError(
      REVISION_CONFLICT_MESSAGE,
      "REVISION_CONFLICT"
    )
  }
  return actualRevision
}

async function bumpAssessmentRevision(
  tx: Prisma.TransactionClient,
  assessmentId: string,
  actualRevision: number
): Promise<void> {
  await tx.block.update({
    where: { id: assessmentId },
    data: { revision: BigInt(actualRevision + 1) },
  })
}

/**
 * Shared wrapper for mutating handlers: validate → reserve (idempotent,
 * replayable) → serializable transaction → complete/fail. Hoists the
 * reservation so a domain error inside the transaction is audited as a FAILED
 * run. Mirrors the exam-prep write-handler skeleton.
 */
async function runWriteAction(args: {
  input: ExecuteToolActionInput
  principal: ToolExecutionPrincipal
  handlerVersion: string
  actionKey: string
  actionInput: object
  fallback: string
  validate?: () => void
  execute: (
    tx: Prisma.TransactionClient,
    reservation: ReservedToolRun,
    actorId: string
  ) => Promise<ToolActionResult>
}): Promise<ToolActionResult> {
  let reservation: ReservedToolRun | undefined
  try {
    args.validate?.()
    reservation = await reserveMockTestsRun(
      args.input,
      args.principal,
      args.handlerVersion,
      args.actionKey,
      args.actionInput
    )
    if (reservation.replay) return reservation.replay
    return await withMockTestsSerializableTransaction((tx) =>
      args.execute(tx, reservation!, args.principal.actorId as string)
    )
  } catch (error) {
    return failMockTestsRunAndThrow(
      reservation?.runId ?? "no-run",
      error,
      args.fallback
    )
  }
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export const executeMockTestsQuestionCreate = {
  handlerVersion: "mock-tests.question.create.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "question.create",
      actionInput: input.input as object,
      fallback: "Failed to create the question.",
      validate: () => validateQuestionPayload(input.input as QuestionPayload),
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as QuestionPayload
        const questionId = crypto.randomUUID()
        await tx.question.create({
          data: {
            id: questionId,
            workspaceId: input.workspaceId,
            authoredById: actorId,
            kind: actionInput.kind as QuestionKind,
            status: "PUBLISHED",
            stem: actionInput.stem,
            difficulty: actionInput.difficulty ?? null,
            metadata: {},
            publishedAt: new Date(),
          },
        })
        await replaceQuestionContent(tx, {
          workspaceId: input.workspaceId,
          questionId,
          payload: actionInput,
        })

        const data = {
          question: {
            id: questionId,
            kind: actionInput.kind,
            stem: actionInput.stem,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsQuestionUpdate = {
  handlerVersion: "mock-tests.question.update.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "question.update",
      actionInput: input.input as object,
      fallback: "Failed to update the question.",
      validate: () => validateQuestionPayload(input.input as QuestionPayload),
      execute: async (tx, reservation) => {
        const actionInput = input.input as QuestionPayload & {
          questionId: string
        }
        const existing = await tx.question.findFirst({
          where: {
            id: actionInput.questionId,
            workspaceId: input.workspaceId,
          },
          select: { id: true },
        })
        if (!existing) {
          throw new ToolActionExecutionError(
            "The question is not available in this workspace.",
            "NOT_AVAILABLE"
          )
        }
        await tx.question.update({
          where: { id: actionInput.questionId },
          data: {
            kind: actionInput.kind as QuestionKind,
            stem: actionInput.stem,
            difficulty: actionInput.difficulty ?? null,
          },
        })
        await replaceQuestionContent(tx, {
          workspaceId: input.workspaceId,
          questionId: actionInput.questionId,
          payload: actionInput,
        })

        const data = {
          question: {
            id: actionInput.questionId,
            kind: actionInput.kind,
            stem: actionInput.stem,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsQuestionDelete = {
  handlerVersion: "mock-tests.question.delete.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "question.delete",
      actionInput: input.input as object,
      fallback: "Failed to delete the question.",
      execute: async (tx, reservation) => {
        const actionInput = input.input as { questionId: string }
        const existing = await tx.question.findFirst({
          where: {
            id: actionInput.questionId,
            workspaceId: input.workspaceId,
          },
          select: { id: true },
        })
        if (!existing) {
          throw new ToolActionExecutionError(
            "The question is not available in this workspace.",
            "NOT_AVAILABLE"
          )
        }
        await tx.question.update({
          where: { id: actionInput.questionId },
          data: { status: "ARCHIVED" },
        })

        const data = { question: { id: actionInput.questionId, deleted: true } }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.questionId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentGetQuestions = {
  handlerVersion: "mock-tests.assessment.get-questions.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> => {
    const actionInput = input.input as { assessmentId: string }
    requireActorFor(principal)

    try {
      const result = await prisma.$transaction(async (tx) => {
        const assessment = await tx.assessment.findFirst({
          where: {
            blockId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
          select: {
            blockId: true,
            block: { select: { title: true, allowAgentAccess: true } },
          },
        })
        if (!assessment) {
          throw new ToolActionExecutionError(
            "The mock test is not available in this workspace.",
            "NOT_AVAILABLE"
          )
        }
        if (
          principal.invocationSource !== "web" &&
          !assessment.block.allowAgentAccess
        ) {
          throw new ToolActionExecutionError(
            "This test is not exposed to external agents.",
            "FORBIDDEN"
          )
        }

        const configs = await tx.assessmentQuestion.findMany({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
          orderBy: { position: "asc" },
          select: {
            questionId: true,
            section: true,
            position: true,
            marks: true,
            negativeMarks: true,
            question: {
              select: {
                id: true,
                kind: true,
                stem: true,
                difficulty: true,
                options: {
                  orderBy: { position: "asc" },
                  select: { key: true, content: true },
                },
              },
            },
          },
        })

        return {
          rootBlockId: assessment.blockId,
          data: {
            assessmentId: actionInput.assessmentId,
            title: assessment.block.title,
            questions: configs.map((config) => ({
              questionId: config.questionId,
              kind: config.question.kind,
              stem: config.question.stem,
              difficulty: config.question.difficulty,
              section: config.section,
              position: config.position,
              marks: num(config.marks),
              negativeMarks: num(config.negativeMarks),
              options: config.question.options.map((option) => ({
                key: option.key,
                content: option.content,
              })),
            })),
          },
        }
      })
      const runId = await recordReadRun(input, principal, handlerVersion, result)
      return {
        status: "succeeded",
        runId,
        rootBlockId: result.rootBlockId,
        createdBlockIds: [],
        evidenceIds: [],
        data: result.data,
      }
    } catch (error) {
      throw rethrowReadError(error, "Failed to load the test questions.")
    }
  },
}

// ---------------------------------------------------------------------------
// Test builder
// ---------------------------------------------------------------------------

export const executeMockTestsAssessmentCreate = {
  handlerVersion: "mock-tests.assessment.create.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.create",
      actionInput: input.input as object,
      fallback: "Failed to create the mock test.",
      validate: () => {
        const actionInput = input.input as {
          title?: string
          durationMinutes?: number | null
          totalMarks?: number | null
        }
        if (!actionInput.title?.trim()) {
          throw new ToolActionExecutionError(
            "A test title is required.",
            "INVALID_INPUT"
          )
        }
        requireOptionalPositiveInt(actionInput.durationMinutes, "durationMinutes")
        if (actionInput.totalMarks !== null && actionInput.totalMarks !== undefined) {
          requireDecimal(actionInput.totalMarks, "totalMarks")
        }
      },
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as {
          title: string
          instructions?: string | null
          durationMinutes?: number | null
          totalMarks?: number | null
          examBlockId?: string | null
          blueprint?: Record<string, unknown>
          passingBenchmark?: number | null
          distinctionBenchmark?: number | null
        }
        if (actionInput.examBlockId) {
          const examBlock = await tx.block.findFirst({
            where: { id: actionInput.examBlockId, workspaceId: input.workspaceId },
            select: { id: true },
          })
          if (!examBlock) {
            throw new ToolActionExecutionError(
              "The linked exam block is not available in this workspace.",
              "INVALID_INPUT"
            )
          }
        }

        const blockId = crypto.randomUUID()
        const installation = await tx.toolInstallation.findFirstOrThrow({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
          },
          include: { toolRelease: true },
        })
        const blockType = await tx.blockType.findFirstOrThrow({
          where: {
            key: "mock-tests.assessment",
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
            title: actionInput.title.trim(),
            slug: `test-${blockId.replace(/-/g, "")}`,
            summary: null,
            properties: {
              passingBenchmark: actionInput.passingBenchmark ?? 33,
              distinctionBenchmark: actionInput.distinctionBenchmark ?? 70,
            },
            schemaVersion: 1,
            revision: 1,
          },
        })
        await tx.assessment.create({
          data: {
            blockId,
            workspaceId: input.workspaceId,
            examBlockId: actionInput.examBlockId ?? null,
            status: "DRAFT",
            durationMinutes: actionInput.durationMinutes ?? null,
            totalMarks: actionInput.totalMarks ?? null,
            instructions: actionInput.instructions ?? null,
            blueprint: (actionInput.blueprint ?? {}) as Prisma.InputJsonValue,
            publishedAt: null,
          },
        })

        const data = {
          assessment: {
            id: blockId,
            title: actionInput.title.trim(),
            status: "draft",
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: blockId,
          createdBlockIds: [blockId],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: blockId,
          createdBlockIds: [blockId],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentUpdate = {
  handlerVersion: "mock-tests.assessment.update.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.update",
      actionInput: input.input as object,
      fallback: "Failed to update the mock test.",
      validate: () => {
        const actionInput = input.input as {
          title?: string
          durationMinutes?: number | null
          totalMarks?: number | null
        }
        if (!actionInput.title?.trim()) {
          throw new ToolActionExecutionError(
            "A test title is required.",
            "INVALID_INPUT"
          )
        }
        requireOptionalPositiveInt(actionInput.durationMinutes, "durationMinutes")
        if (actionInput.totalMarks !== null && actionInput.totalMarks !== undefined) {
          requireDecimal(actionInput.totalMarks, "totalMarks")
        }
      },
      execute: async (tx, reservation) => {
        const actionInput = input.input as {
          assessmentId: string
          expectedRevision: number
          title: string
          instructions?: string | null
          durationMinutes?: number | null
          totalMarks?: number | null
          examBlockId?: string | null
          blueprint?: Record<string, unknown>
          passingBenchmark?: number | null
          distinctionBenchmark?: number | null
        }
        const actualRevision = await requireAssessmentRevision(tx, {
          workspaceId: input.workspaceId,
          assessmentId: actionInput.assessmentId,
          expectedRevision: actionInput.expectedRevision,
        })
        if (actionInput.examBlockId) {
          const examBlock = await tx.block.findFirst({
            where: { id: actionInput.examBlockId, workspaceId: input.workspaceId },
            select: { id: true },
          })
          if (!examBlock) {
            throw new ToolActionExecutionError(
              "The linked exam block is not available in this workspace.",
              "INVALID_INPUT"
            )
          }
        }

        const existingBlock = await tx.block.findUnique({
          where: { id: actionInput.assessmentId },
          select: { properties: true },
        })
        const currentProps = (existingBlock?.properties as Record<string, unknown>) ?? {}
        const updatedProps = {
          ...currentProps,
          ...(actionInput.passingBenchmark !== undefined
            ? { passingBenchmark: actionInput.passingBenchmark ?? 33 }
            : {}),
          ...(actionInput.distinctionBenchmark !== undefined
            ? { distinctionBenchmark: actionInput.distinctionBenchmark ?? 70 }
            : {}),
        }

        await tx.block.update({
          where: { id: actionInput.assessmentId },
          data: {
            title: actionInput.title.trim(),
            properties: updatedProps,
          },
        })
        const existingAssessment = await tx.assessment.findUnique({
          where: { blockId: actionInput.assessmentId },
          select: { blueprint: true },
        })
        const currentBlueprint =
          existingAssessment?.blueprint &&
          typeof existingAssessment.blueprint === "object" &&
          !Array.isArray(existingAssessment.blueprint)
            ? (existingAssessment.blueprint as Record<string, unknown>)
            : {}
        const mergedBlueprint = {
          ...currentBlueprint,
          ...((actionInput.blueprint ?? {}) as Record<string, unknown>),
        }

        await tx.assessment.update({
          where: { blockId: actionInput.assessmentId },
          data: {
            examBlockId: actionInput.examBlockId ?? null,
            durationMinutes: actionInput.durationMinutes ?? null,
            totalMarks: actionInput.totalMarks ?? null,
            instructions: actionInput.instructions ?? null,
            blueprint: mergedBlueprint as Prisma.InputJsonValue,
          },
        })
        await bumpAssessmentRevision(
          tx,
          actionInput.assessmentId,
          actualRevision
        )

        const data = {
          assessment: {
            id: actionInput.assessmentId,
            title: actionInput.title.trim(),
            revision: actualRevision + 1,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentClone = {
  handlerVersion: "mock-tests.assessment.clone.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.clone",
      actionInput: input.input as object,
      fallback: "Failed to clone the mock test.",
      validate: () => {
        const actionInput = input.input as {
          sourceAssessmentId?: string
          targetTitle?: string | null
        }
        if (!actionInput.sourceAssessmentId) {
          throw new ToolActionExecutionError(
            "Source assessment ID is required.",
            "INVALID_INPUT"
          )
        }
        if (actionInput.targetTitle && actionInput.targetTitle.trim().length > 120) {
          throw new ToolActionExecutionError(
            "Target title must be 120 characters or fewer.",
            "INVALID_INPUT"
          )
        }
      },
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as {
          sourceAssessmentId: string
          targetTitle?: string | null
        }

        const source = await tx.assessment.findUnique({
          where: { blockId: actionInput.sourceAssessmentId },
          include: {
            block: true,
            questions: {
              orderBy: { position: "asc" },
              include: {
                question: {
                  include: {
                    options: { orderBy: { position: "asc" } },
                    solution: {
                      include: {
                        correctOptions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        if (
          !source ||
          source.block.status !== BlockStatus.ACTIVE ||
          source.block.archivedAt
        ) {
          throw new ToolActionExecutionError(
            "The source test paper is not available.",
            "NOT_AVAILABLE"
          )
        }

        const sourceBlueprint =
          source.blueprint &&
          typeof source.blueprint === "object" &&
          !Array.isArray(source.blueprint)
            ? (source.blueprint as Record<string, unknown>)
            : {}
        const isSameWorkspace = source.workspaceId === input.workspaceId
        const isPublicOrUnlisted =
          sourceBlueprint.visibility === "public" ||
          sourceBlueprint.visibility === "unlisted"
        const isCloningAllowed = sourceBlueprint.allowCloning !== false

        if (!isSameWorkspace && (!isPublicOrUnlisted || !isCloningAllowed)) {
          throw new ToolActionExecutionError(
            "This test paper does not permit cloning.",
            "FORBIDDEN"
          )
        }

        const blockType = await tx.blockType.findUnique({
          where: { key: "mock-tests.assessment" },
          select: { id: true },
        })
        if (!blockType) {
          throw new ToolActionExecutionError(
            "Mock test block type is not registered.",
            "NOT_AVAILABLE"
          )
        }

        const newBlockId = crypto.randomUUID()
        const newTitle =
          actionInput.targetTitle?.trim() || `${source.block.title} (Clone)`

        const clonedBlueprint = {
          ...sourceBlueprint,
          visibility: "private",
        }

        await tx.block.create({
          data: {
            id: newBlockId,
            workspaceId: input.workspaceId,
            originToolInstallationId: input.installationId,
            originToolRunId: reservation.runId,
            createdById: actorId,
            blockTypeId: blockType.id,
            status: BlockStatus.ACTIVE,
            visibility: BlockVisibility.WORKSPACE,
            allowAgentAccess: true,
            title: newTitle,
            slug: `test-${newBlockId.replace(/-/g, "")}`,
            summary: source.block.summary,
            properties:
              (source.block.properties as Prisma.InputJsonValue) ?? {
                passingBenchmark: 33,
                distinctionBenchmark: 70,
              },
            schemaVersion: 1,
            revision: 1,
          },
        })

        await tx.assessment.create({
          data: {
            blockId: newBlockId,
            workspaceId: input.workspaceId,
            examBlockId: isSameWorkspace ? source.examBlockId : null,
            status: "DRAFT",
            durationMinutes: source.durationMinutes,
            totalMarks: source.totalMarks,
            instructions: source.instructions,
            blueprint: clonedBlueprint as Prisma.InputJsonValue,
            publishedAt: null,
          },
        })

        for (const aq of source.questions) {
          const originalQ = aq.question
          const newQuestionId = crypto.randomUUID()

          await tx.question.create({
            data: {
              id: newQuestionId,
              workspaceId: input.workspaceId,
              authoredById: actorId,
              kind: originalQ.kind,
              status: "PUBLISHED",
              stem: originalQ.stem,
              difficulty: originalQ.difficulty,
              metadata: (originalQ.metadata as Prisma.InputJsonValue) ?? {},
              publishedAt: new Date(),
            },
          })

          const correctOptionIds = new Set(
            originalQ.solution?.correctOptions.map((co) => co.questionOptionId) ?? []
          )
          const answerKeys = originalQ.options
            .filter((opt) => correctOptionIds.has(opt.id))
            .map((opt) => opt.key)

          await replaceQuestionContent(tx, {
            workspaceId: input.workspaceId,
            questionId: newQuestionId,
            payload: {
              kind: originalQ.kind,
              stem: originalQ.stem,
              difficulty: originalQ.difficulty,
              options: originalQ.options.map((opt) => ({
                key: opt.key,
                content: opt.content,
                position: opt.position,
              })),
              answerKeys,
              explanation: originalQ.solution?.explanation ?? null,
              numericAnswer: num(originalQ.solution?.numericAnswer),
              textAnswer: originalQ.solution?.textAnswer ?? null,
            },
          })

          await tx.assessmentQuestion.create({
            data: {
              id: crypto.randomUUID(),
              workspaceId: input.workspaceId,
              assessmentId: newBlockId,
              questionId: newQuestionId,
              section: aq.section,
              position: aq.position,
              marks: aq.marks,
              negativeMarks: aq.negativeMarks,
              isRequired: aq.isRequired,
            },
          })
        }

        const data = {
          assessment: {
            id: newBlockId,
            title: newTitle,
            status: "draft",
            questionCount: source.questions.length,
          },
        }

        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: newBlockId,
          createdBlockIds: [newBlockId],
          evidenceIds: [],
          data,
        })

        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: newBlockId,
          createdBlockIds: [newBlockId],
          evidenceIds: [],
          data,
        }
      },
    }),
}

type AssessmentQuestionInput = {
  questionId: string
  section?: string | null
  position: number
  marks: number
  negativeMarks: number
}

/**
 * Sets the full question list for an assessment. The caller sends the complete
 * assembled list (existing + new) with positions, so the builder is a simple
 * upsert and position conflicts are impossible. Mirrors the exam-prep reorder
 * flow, but per-question marks/negative-marks/section are preserved.
 */
export const executeMockTestsAssessmentAddQuestions = {
  handlerVersion: "mock-tests.assessment.add-questions.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.add-questions",
      actionInput: input.input as object,
      fallback: "Failed to update the test questions.",
      validate: () => {
        const actionInput = input.input as {
          questions?: AssessmentQuestionInput[]
        }
        const questions = actionInput.questions ?? []
        if (questions.length > 200) {
          throw new ToolActionExecutionError(
            "A test can hold at most 200 questions.",
            "INVALID_INPUT"
          )
        }
        const seenQuestions = new Set<string>()
        const seenPositions = new Set<number>()
        for (const entry of questions) {
          if (seenQuestions.has(entry.questionId)) {
            throw new ToolActionExecutionError(
              `Question "${entry.questionId}" appears more than once.`,
              "INVALID_INPUT"
            )
          }
          if (seenPositions.has(entry.position)) {
            throw new ToolActionExecutionError(
              `Position "${entry.position}" is used more than once.`,
              "INVALID_INPUT"
            )
          }
          seenQuestions.add(entry.questionId)
          seenPositions.add(entry.position)
          requireDecimal(entry.marks, "marks")
          requireNonNegative(entry.marks, "marks")
          requireDecimal(entry.negativeMarks, "negativeMarks")
          requireNonPositive(entry.negativeMarks, "negativeMarks")
        }
      },
      execute: async (tx, reservation) => {
        const actionInput = input.input as {
          assessmentId: string
          expectedRevision: number
          questions: AssessmentQuestionInput[]
        }
        const actualRevision = await requireAssessmentRevision(tx, {
          workspaceId: input.workspaceId,
          assessmentId: actionInput.assessmentId,
          expectedRevision: actionInput.expectedRevision,
        })

        // Validate every referenced question belongs to the workspace and is
        // not archived.
        const questionIds = actionInput.questions.map((entry) => entry.questionId)
        const questions = await tx.question.findMany({
          where: { id: { in: questionIds }, workspaceId: input.workspaceId },
          select: { id: true, status: true },
        })
        for (const entry of actionInput.questions) {
          const question = questions.find((q) => q.id === entry.questionId)
          if (!question || question.status === "ARCHIVED") {
            throw new ToolActionExecutionError(
              `Question "${entry.questionId}" is not available in this workspace.`,
              "INVALID_INPUT"
            )
          }
        }

        // Replace the paper wholesale so position swaps can never collide with
        // the unique [assessmentId, position] index. Nothing else references
        // AssessmentQuestion rows, so recreate is safe and idempotent.
        await tx.assessmentQuestion.deleteMany({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
        })
        if (actionInput.questions.length > 0) {
          await tx.assessmentQuestion.createMany({
            data: actionInput.questions.map((entry) => ({
              id: crypto.randomUUID(),
              workspaceId: input.workspaceId,
              assessmentId: actionInput.assessmentId,
              questionId: entry.questionId,
              section: entry.section ?? null,
              position: entry.position,
              marks: entry.marks,
              negativeMarks: entry.negativeMarks,
              isRequired: true,
            })),
          })
        }
        await bumpAssessmentRevision(tx, actionInput.assessmentId, actualRevision)

        const data = {
          assessment: {
            id: actionInput.assessmentId,
            questionCount: actionInput.questions.length,
            revision: actualRevision + 1,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentRemoveQuestion = {
  handlerVersion: "mock-tests.assessment.remove-question.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.remove-question",
      actionInput: input.input as object,
      fallback: "Failed to remove the question.",
      execute: async (tx, reservation) => {
        const actionInput = input.input as {
          assessmentId: string
          expectedRevision: number
          questionId: string
        }
        const actualRevision = await requireAssessmentRevision(tx, {
          workspaceId: input.workspaceId,
          assessmentId: actionInput.assessmentId,
          expectedRevision: actionInput.expectedRevision,
        })
        await tx.assessmentQuestion.deleteMany({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
            questionId: actionInput.questionId,
          },
        })
        await bumpAssessmentRevision(tx, actionInput.assessmentId, actualRevision)

        const data = {
          assessment: {
            id: actionInput.assessmentId,
            removedQuestionId: actionInput.questionId,
            revision: actualRevision + 1,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentReorderQuestions = {
  handlerVersion: "mock-tests.assessment.reorder-questions.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.reorder-questions",
      actionInput: input.input as object,
      fallback: "Failed to reorder the test questions.",
      validate: () => {
        const actionInput = input.input as { questionIds?: string[] }
        const questionIds = actionInput.questionIds ?? []
        if (new Set(questionIds).size !== questionIds.length) {
          throw new ToolActionExecutionError(
            "questionIds must not contain duplicates.",
            "INVALID_INPUT"
          )
        }
      },
      execute: async (tx, reservation) => {
        const actionInput = input.input as {
          assessmentId: string
          expectedRevision: number
          questionIds: string[]
        }
        const actualRevision = await requireAssessmentRevision(tx, {
          workspaceId: input.workspaceId,
          assessmentId: actionInput.assessmentId,
          expectedRevision: actionInput.expectedRevision,
        })

        const current = await tx.assessmentQuestion.findMany({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
          select: { questionId: true },
        })
        const currentIds = new Set(current.map((row) => row.questionId))
        if (
          actionInput.questionIds.length !== currentIds.size ||
          actionInput.questionIds.some((id) => !currentIds.has(id))
        ) {
          throw new ToolActionExecutionError(
            "questionIds must match the test's current question set.",
            "INVALID_INPUT"
          )
        }

        // Two-phase reorder so a swap can never collide with the unique
        // [assessmentId, position] index: first shift every question out of the
        // 0..n-1 band, then assign the final positions. Positions are ≤ 9999 and
        // n ≤ 200, so the +10000 offset is collision-safe for both passes.
        await tx.assessmentQuestion.updateMany({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
          data: { position: { increment: 10000 } },
        })
        for (let index = 0; index < actionInput.questionIds.length; index += 1) {
          await tx.assessmentQuestion.update({
            where: {
              assessmentId_questionId: {
                assessmentId: actionInput.assessmentId,
                questionId: actionInput.questionIds[index],
              },
            },
            data: { position: index },
          })
        }
        await bumpAssessmentRevision(tx, actionInput.assessmentId, actualRevision)

        const data = {
          assessment: {
            id: actionInput.assessmentId,
            questionOrder: actionInput.questionIds,
            revision: actualRevision + 1,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAssessmentPublish = {
  handlerVersion: "mock-tests.assessment.publish.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "assessment.publish",
      actionInput: input.input as object,
      fallback: "Failed to publish the mock test.",
      execute: async (tx, reservation) => {
        const actionInput = input.input as {
          assessmentId: string
          expectedRevision: number
        }
        const actualRevision = await requireAssessmentRevision(tx, {
          workspaceId: input.workspaceId,
          assessmentId: actionInput.assessmentId,
          expectedRevision: actionInput.expectedRevision,
        })

        const assessment = await tx.assessment.findFirstOrThrow({
          where: {
            blockId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
          select: { status: true },
        })
        const questionCount = await tx.assessmentQuestion.count({
          where: {
            assessmentId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
          },
        })
        if (questionCount < 1) {
          throw new ToolActionExecutionError(
            "Add at least one question before publishing.",
            "INVALID_INPUT"
          )
        }
        if (assessment.status === "PUBLISHED") {
          throw new ToolActionExecutionError(
            "This test is already published.",
            "INVALID_INPUT"
          )
        }

        await tx.assessment.update({
          where: { blockId: actionInput.assessmentId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        })
        await bumpAssessmentRevision(tx, actionInput.assessmentId, actualRevision)

        const data = {
          assessment: {
            id: actionInput.assessmentId,
            status: "published",
            questionCount,
            revision: actualRevision + 1,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          rootBlockId: actionInput.assessmentId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

// ---------------------------------------------------------------------------
// Attempt player
// ---------------------------------------------------------------------------

export const executeMockTestsAttemptCreate = {
  handlerVersion: "mock-tests.attempt.create.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "attempt.create",
      actionInput: input.input as object,
      fallback: "Failed to start the attempt.",
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as { assessmentId: string }
        const assessment = await tx.assessment.findFirst({
          where: {
            blockId: actionInput.assessmentId,
            workspaceId: input.workspaceId,
            status: "PUBLISHED",
          },
          select: { blockId: true },
        })
        if (!assessment) {
          throw new ToolActionExecutionError(
            "This test is not published in your workspace.",
            "NOT_AVAILABLE"
          )
        }

        const attemptId = crypto.randomUUID()
        await tx.attempt.create({
          data: {
            id: attemptId,
            workspaceId: input.workspaceId,
            assessmentId: actionInput.assessmentId,
            userId: actorId,
            status: "IN_PROGRESS",
            metadata: {},
            startedAt: new Date(),
          },
        })

        const data = {
          attempt: {
            id: attemptId,
            assessmentId: actionInput.assessmentId,
            status: "in_progress",
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAttemptRecordAnswer = {
  handlerVersion: "mock-tests.attempt.record-answer.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "attempt.record-answer",
      actionInput: input.input as object,
      fallback: "Failed to save the answer.",
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as {
          attemptId: string
          questionId: string
          selectedOptionKeys?: string[]
          answerText?: string | null
          timeSpentSeconds?: number | null
        }
        const attempt = await tx.attempt.findFirst({
          where: {
            id: actionInput.attemptId,
            workspaceId: input.workspaceId,
            userId: actorId,
          },
          select: { id: true, assessmentId: true, status: true },
        })
        if (!attempt) {
          throw new ToolActionExecutionError(
            "The attempt is not available.",
            "NOT_AVAILABLE"
          )
        }
        if (attempt.status !== "IN_PROGRESS") {
          throw new ToolActionExecutionError(
            "This attempt is no longer in progress.",
            "RUN_FAILED"
          )
        }
        const inAssessment = await tx.assessmentQuestion.findFirst({
          where: {
            assessmentId: attempt.assessmentId,
            questionId: actionInput.questionId,
            workspaceId: input.workspaceId,
          },
          select: { id: true },
        })
        if (!inAssessment) {
          throw new ToolActionExecutionError(
            "This question is not part of the test.",
            "INVALID_INPUT"
          )
        }

        const question = await tx.question.findFirst({
          where: { id: actionInput.questionId, workspaceId: input.workspaceId },
          select: { kind: true },
        })
        if (!question) {
          throw new ToolActionExecutionError(
            "The question is not available in this workspace.",
            "NOT_AVAILABLE"
          )
        }

        const isChoice = (
          [
            QUESTION_KIND.SINGLE_CHOICE,
            QUESTION_KIND.MULTIPLE_CHOICE,
            QUESTION_KIND.TRUE_FALSE,
          ] as QuestionKind[]
        ).includes(question.kind as QuestionKind)

        let response = await tx.attemptResponse.findUnique({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: actionInput.questionId,
            },
          },
        })
        if (!response) {
          response = await tx.attemptResponse.create({
            data: {
              id: crypto.randomUUID(),
              workspaceId: input.workspaceId,
              attemptId: attempt.id,
              questionId: actionInput.questionId,
              metadata: {},
            },
          })
        }

        if (isChoice) {
          const selectedKeys = actionInput.selectedOptionKeys ?? []
          await tx.attemptResponseOption.deleteMany({
            where: { responseId: response.id },
          })
          for (const key of selectedKeys) {
            const option = await tx.questionOption.findFirst({
              where: {
                questionId: actionInput.questionId,
                workspaceId: input.workspaceId,
                key,
              },
              select: { id: true },
            })
            if (!option) {
              throw new ToolActionExecutionError(
                `Option "${key}" is not part of this question.`,
                "INVALID_INPUT"
              )
            }
            await tx.attemptResponseOption.create({
              data: {
                workspaceId: input.workspaceId,
                responseId: response.id,
                questionOptionId: option.id,
              },
            })
          }
          await tx.attemptResponse.update({
            where: { id: response.id },
            data: {
              answerText: null,
              timeSpentSeconds: actionInput.timeSpentSeconds ?? null,
              answeredAt: selectedKeys.length > 0 ? new Date() : null,
            },
          })
        } else {
          const answered = Boolean(actionInput.answerText?.trim())
          await tx.attemptResponse.update({
            where: { id: response.id },
            data: {
              answerText: actionInput.answerText ?? null,
              timeSpentSeconds: actionInput.timeSpentSeconds ?? null,
              answeredAt: answered ? new Date() : null,
            },
          })
        }

        const data = {
          response: {
            attemptId: attempt.id,
            questionId: actionInput.questionId,
            saved: true,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

export const executeMockTestsAttemptSubmit = {
  handlerVersion: "mock-tests.attempt.submit.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "attempt.submit",
      actionInput: input.input as object,
      fallback: "Failed to submit the attempt.",
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as { attemptId: string }
        const attempt = await tx.attempt.findFirst({
          where: {
            id: actionInput.attemptId,
            workspaceId: input.workspaceId,
            userId: actorId,
          },
          select: {
            id: true,
            assessmentId: true,
            status: true,
            startedAt: true,
            score: true,
            maxScore: true,
          },
        })
        if (!attempt) {
          throw new ToolActionExecutionError(
            "The attempt is not available.",
            "NOT_AVAILABLE"
          )
        }
        // A submitted/evaluated attempt is a safe no-op replay.
        if (attempt.status === "SUBMITTED" || attempt.status === "EVALUATED") {
          const data = {
            attempt: {
              id: attempt.id,
              assessmentId: attempt.assessmentId,
              status: "evaluated",
              score: num(attempt.score),
              maxScore: num(attempt.maxScore),
            },
          }
          await completeMockTestsRun(tx, reservation.runId, {
            createdBlockIds: [],
            evidenceIds: [],
            data,
          })
          return {
            status: "succeeded",
            runId: reservation.runId,
            createdBlockIds: [],
            evidenceIds: [],
            data,
          }
        }
        if (attempt.status !== "IN_PROGRESS") {
          throw new ToolActionExecutionError(
            "This attempt can no longer be submitted.",
            "RUN_FAILED"
          )
        }

        const configs = await tx.assessmentQuestion.findMany({
          where: {
            assessmentId: attempt.assessmentId,
            workspaceId: input.workspaceId,
          },
          orderBy: { position: "asc" },
          select: { questionId: true, marks: true, negativeMarks: true },
        })
        const questionIds = configs.map((config) => config.questionId)
        const questions = await tx.question.findMany({
          where: { id: { in: questionIds }, workspaceId: input.workspaceId },
          select: {
            id: true,
            kind: true,
            options: { select: { id: true, key: true } },
            solution: {
              select: {
                numericAnswer: true,
                textAnswer: true,
                correctOptions: { select: { questionOptionId: true } },
              },
            },
            targets: { select: { blockId: true, weight: true } },
          },
        })
        const responses = await tx.attemptResponse.findMany({
          where: { attemptId: attempt.id, workspaceId: input.workspaceId },
          select: {
            id: true,
            questionId: true,
            answerText: true,
            timeSpentSeconds: true,
            selectedOptions: {
              select: { questionOption: { select: { key: true } } },
            },
          },
        })
        const responsesByQuestion = new Map(
          responses.map((response) => [response.questionId, response])
        )

        const submittedAt = new Date()
        const evidenceQuestions: Array<{
          questionId: string
          awardedMarks: number
          marks: number
          isCorrect: boolean | null
          targets: Array<{ blockId: string; weight: number }>
        }> = []
        let totalScore = 0
        let totalMaxScore = 0
        let correctCount = 0
        let incorrectCount = 0
        let unansweredCount = 0

        for (const config of configs) {
          const question = questions.find((q) => q.id === config.questionId)
          if (!question) continue
          const response = responsesByQuestion.get(config.questionId)
          const optionIdToKey = new Map(
            question.options.map((option) => [option.id, option.key])
          )
          const correctKeys = (question.solution?.correctOptions ?? []).map(
            (solutionOption) =>
              optionIdToKey.get(solutionOption.questionOptionId) ??
              solutionOption.questionOptionId
          )

          const marks = num(config.marks) ?? 0
          const negativeMarks = num(config.negativeMarks) ?? 0
          const verdict = markResponse({
            kind: question.kind as QuestionKind,
            selectedKeys:
              response?.selectedOptions.map(
                (selected) => selected.questionOption.key
              ) ?? [],
            answerText: response?.answerText ?? null,
            correctKeys,
            numericAnswer: question.solution
              ? num(question.solution.numericAnswer)
              : null,
            textAnswer: question.solution?.textAnswer ?? null,
            marks,
            negativeMarks,
          })
          totalScore += verdict.awardedMarks
          totalMaxScore += marks
          if (verdict.isCorrect === true) correctCount += 1
          else if (verdict.isCorrect === false) incorrectCount += 1
          else unansweredCount += 1

          // Ensure every question has a response row so the analysis can
          // render unanswered questions too.
          await tx.attemptResponse.upsert({
            where: {
              attemptId_questionId: {
                attemptId: attempt.id,
                questionId: config.questionId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              workspaceId: input.workspaceId,
              attemptId: attempt.id,
              questionId: config.questionId,
              isCorrect: verdict.isCorrect,
              awardedMarks: verdict.awardedMarks,
              timeSpentSeconds: response
                ? (num(response.timeSpentSeconds) ?? null)
                : null,
              answeredAt: verdict.unanswered ? null : submittedAt,
              metadata: {},
            },
            update: { isCorrect: verdict.isCorrect, awardedMarks: verdict.awardedMarks },
          })

          evidenceQuestions.push({
            questionId: config.questionId,
            awardedMarks: verdict.awardedMarks,
            marks,
            isCorrect: verdict.isCorrect,
            targets: question.targets.map((target) => ({
              blockId: target.blockId,
              weight: num(target.weight) ?? 100,
            })),
          })
        }

        const elapsedSeconds = Math.max(
          1,
          Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)
        )
        const evidenceIds = await writeAttemptEvidence(tx, {
          workspaceId: input.workspaceId,
          userId: actorId,
          attemptId: attempt.id,
          occurredAt: submittedAt,
          questions: evidenceQuestions,
        })

        await tx.attempt.update({
          where: { id: attempt.id },
          data: {
            status: "EVALUATED",
            score: round2(totalScore),
            maxScore: round2(totalMaxScore),
            correctCount,
            incorrectCount,
            unansweredCount,
            timeSpentSeconds: elapsedSeconds,
            submittedAt,
            evaluatedAt: submittedAt,
          },
        })

        const data = {
          attempt: {
            id: attempt.id,
            assessmentId: attempt.assessmentId,
            status: "evaluated",
            score: round2(totalScore),
            maxScore: round2(totalMaxScore),
            correctCount,
            incorrectCount,
            unansweredCount,
            percentage:
              totalMaxScore > 0 ? round2((totalScore / totalMaxScore) * 100) : 0,
            evidenceCount: evidenceIds.length,
          },
        }
        await completeMockTestsRun(tx, reservation.runId, {
          createdBlockIds: [],
          evidenceIds,
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          createdBlockIds: [],
          evidenceIds,
          data,
        }
      },
    }),
}

export const executeMockTestsAttemptAbandon = {
  handlerVersion: "mock-tests.attempt.abandon.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> =>
    runWriteAction({
      input,
      principal,
      handlerVersion,
      actionKey: "attempt.abandon",
      actionInput: input.input as object,
      fallback: "Failed to abandon the attempt.",
      execute: async (tx, reservation, actorId) => {
        const actionInput = input.input as { attemptId: string }
        const attempt = await tx.attempt.findFirst({
          where: {
            id: actionInput.attemptId,
            workspaceId: input.workspaceId,
            userId: actorId,
          },
          select: { id: true, status: true },
        })
        if (!attempt) {
          throw new ToolActionExecutionError(
            "The attempt is not available.",
            "NOT_AVAILABLE"
          )
        }
        if (attempt.status !== "IN_PROGRESS") {
          throw new ToolActionExecutionError(
            "Only an in-progress attempt can be abandoned.",
            "RUN_FAILED"
          )
        }
        await tx.attempt.update({
          where: { id: attempt.id },
          data: { status: "ABANDONED", submittedAt: new Date() },
        })

        const data = { attempt: { id: attempt.id, status: "abandoned" } }
        await completeMockTestsRun(tx, reservation.runId, {
          createdBlockIds: [],
          evidenceIds: [],
          data,
        })
        return {
          status: "succeeded",
          runId: reservation.runId,
          createdBlockIds: [],
          evidenceIds: [],
          data,
        }
      },
    }),
}

// ---------------------------------------------------------------------------
// Analysis / agent reads
// ---------------------------------------------------------------------------

export const executeMockTestsAttemptGetAnalysis = {
  handlerVersion: "mock-tests.attempt.get-analysis.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> => {
    const actionInput = input.input as { attemptId: string }
    const actorId = requireActorFor(principal)

    try {
      const result = await prisma.$transaction(async (tx) => {
        const attempt = await tx.attempt.findFirst({
          where: {
            id: actionInput.attemptId,
            workspaceId: input.workspaceId,
            userId: actorId,
          },
          select: {
            id: true,
            assessmentId: true,
            assessment: {
              select: {
                blockId: true,
                durationMinutes: true,
                block: {
                  select: { title: true, allowAgentAccess: true },
                },
              },
            },
            status: true,
            startedAt: true,
            submittedAt: true,
            timeSpentSeconds: true,
            responses: {
              orderBy: { answeredAt: "asc" },
              select: {
                questionId: true,
                answerText: true,
                isCorrect: true,
                awardedMarks: true,
                timeSpentSeconds: true,
                selectedOptions: {
                  select: { questionOption: { select: { key: true } } },
                },
                question: {
                  select: {
                    id: true,
                    kind: true,
                    stem: true,
                    difficulty: true,
                    options: {
                      orderBy: { position: "asc" },
                      select: { id: true, key: true, content: true },
                    },
                    solution: {
                      select: {
                        explanation: true,
                        numericAnswer: true,
                        textAnswer: true,
                        correctOptions: {
                          select: { questionOptionId: true },
                        },
                      },
                    },
                    targets: { select: { blockId: true } },
                  },
                },
              },
            },
          },
        })
        if (!attempt) {
          throw new ToolActionExecutionError(
            "The attempt is not available.",
            "NOT_AVAILABLE"
          )
        }
        if (
          principal.invocationSource !== "web" &&
          !attempt.assessment.block.allowAgentAccess
        ) {
          throw new ToolActionExecutionError(
            "This attempt is not exposed to external agents.",
            "FORBIDDEN"
          )
        }

        const questions = attempt.responses.map((response) => {
          const question = response.question
          const optionIdToKey = new Map(
            question.options.map((option) => [option.id, option.key])
          )
          return {
            questionId: question.id,
            position: 0,
            section: null as string | null,
            kind: question.kind,
            stem: question.stem,
            difficulty: question.difficulty,
            marks: 0,
            negativeMarks: 0,
            options: question.options.map((option) => ({
              key: option.key,
              content: option.content,
            })),
            selectedKeys: response.selectedOptions.map(
              (selected) => selected.questionOption.key
            ),
            answerText: response.answerText,
            timeSpentSeconds: response.timeSpentSeconds,
            isCorrect: response.isCorrect,
            awardedMarks: num(response.awardedMarks) ?? 0,
            correctKeys: (question.solution?.correctOptions ?? []).map(
              (solutionOption) =>
                optionIdToKey.get(solutionOption.questionOptionId) ??
                solutionOption.questionOptionId
            ),
            explanation: question.solution?.explanation ?? null,
          }
        })

        // Merge in per-question marks/negativeMarks/position/section from the
        // config, which the submit handler does not persist on the response.
        const configs = await tx.assessmentQuestion.findMany({
          where: {
            assessmentId: attempt.assessmentId,
            workspaceId: input.workspaceId,
          },
          select: {
            questionId: true,
            section: true,
            position: true,
            marks: true,
            negativeMarks: true,
          },
        })
        const configByQuestion = new Map(
          configs.map((config) => [config.questionId, config])
        )
        for (const row of questions) {
          const config = configByQuestion.get(row.questionId)
          if (config) {
            row.position = config.position
            row.section = config.section
            row.marks = num(config.marks) ?? 0
            row.negativeMarks = num(config.negativeMarks) ?? 0
          }
        }
        questions.sort((left, right) => left.position - right.position)

        const weakTopics = await getWeakTopics(input.workspaceId, actorId, 10)

        return {
          rootBlockId: attempt.assessmentId,
          data: {
            analysis: {
              attemptId: attempt.id,
              assessmentId: attempt.assessmentId,
              assessmentTitle: attempt.assessment.block.title,
              status: attempt.status,
              startedAt: toISO(attempt.startedAt),
              submittedAt: toISO(attempt.submittedAt),
              durationMinutes: attempt.assessment.durationMinutes,
              questions,
              weakTopics,
            },
          },
        }
      })

      const runId = await recordReadRun(input, principal, handlerVersion, result)
      return {
        status: "succeeded",
        runId,
        rootBlockId: result.rootBlockId,
        createdBlockIds: [],
        evidenceIds: [],
        data: result.data,
      }
    } catch (error) {
      throw rethrowReadError(error, "Failed to load the attempt analysis.")
    }
  },
}

export const executeMockTestsAssessmentGetWeakTopics = {
  handlerVersion: "mock-tests.assessment.get-weak-topics.v1",
  execute: async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> => {
    const actionInput = input.input as { limit?: number | null }
    const actorId = requireActorFor(principal)
    const limit = actionInput.limit ?? 20

    try {
      const weakTopics = await getWeakTopics(input.workspaceId, actorId, limit)
      const result = {
        rootBlockId: undefined,
        data: { weakTopics },
      }
      const runId = await recordReadRun(input, principal, handlerVersion, result)
      return {
        status: "succeeded",
        runId,
        createdBlockIds: [],
        evidenceIds: [],
        data: result.data,
      }
    } catch (error) {
      throw rethrowReadError(error, "Failed to load the weak topics.")
    }
  },
}

// ---------------------------------------------------------------------------
// Read-run helpers
// ---------------------------------------------------------------------------

/** Read actions create a fresh, non-replayed ToolRun (like exam.get-*). */
async function recordReadRun(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string,
  result: { rootBlockId?: string; data: Record<string, JsonValue> }
): Promise<string> {
  const runId = crypto.randomUUID()
  const output: Record<string, JsonValue> = { data: result.data }
  if (result.rootBlockId) output.rootBlockId = result.rootBlockId

  await prisma.$transaction(async (tx) => {
    const installation = await tx.toolInstallation.findFirstOrThrow({
      where: {
        id: input.installationId,
        workspaceId: input.workspaceId,
        status: "ACTIVE",
      },
      include: { toolRelease: true },
    })
    await tx.toolRun.create({
      data: {
        id: runId,
        workspaceId: input.workspaceId,
        installationId: input.installationId,
        toolReleaseId: installation.toolReleaseId,
        actorId: principal.actorId,
        actionKey: input.actionKey,
        handlerVersion,
        invocationSource: principal.invocationSource,
        idempotencyKey: input.idempotencyKey,
        inputHash: hashInput(input.input as object),
        manifestHash: hashInput(installation.toolRelease.manifest),
        status: ToolRunStatus.SUCCEEDED,
        startedAt: new Date(),
        completedAt: new Date(),
        payload: {
          create: {
            input: input.input as Prisma.InputJsonValue,
            output: output as Prisma.InputJsonValue,
          },
        },
      },
    })
  })
  return runId
}

function requireActorFor(principal: ToolExecutionPrincipal): string {
  if (!principal.actorId) {
    throw new ToolActionExecutionError(
      "Workspace membership is required.",
      "FORBIDDEN"
    )
  }
  return principal.actorId
}

function rethrowReadError(
  error: unknown,
  fallback: string
): ToolActionExecutionError {
  if (error instanceof ToolActionExecutionError) return error
  const message =
    error instanceof Error ? error.message : String(error ?? fallback)
  console.error(`[mock-tests] ${fallback}`, error)
  return new ToolActionExecutionError(message || fallback, "RUN_FAILED")
}

/**
 * Runtime helpers for core.mock-tests action executors: idempotent tool runs,
 * serializable transactions, and installation authorization. Modeled on the
 * exam-prep scheduled-test runtime, but scoped to the `core.mock-tests`
 * installation so handlers stay tool-safe.
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
import { Prisma, ToolRunStatus } from "../../generated/prisma/client"

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3

export function hashInput(input: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(input))
    .digest("hex")
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

function reportUnexpectedError(error: unknown, fallback: string) {
  console.error(`[mock-tests] ${fallback}`, error)
  return fallback
}

export function requireActor(principal: ToolExecutionPrincipal) {
  if (!principal.actorId) {
    throw new ToolActionExecutionError(
      "Workspace write access is required.",
      "FORBIDDEN"
    )
  }
  return principal.actorId
}

export async function withMockTestsSerializableTransaction<T>(
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

async function requireMockTestsInstallation(
  tx: Prisma.TransactionClient,
  input: ExecuteToolActionInput
) {
  return tx.toolInstallation.findFirstOrThrow({
    where: {
      id: input.installationId,
      workspaceId: input.workspaceId,
      status: "ACTIVE",
      toolDefinition: { key: "core.mock-tests" },
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
  return requireMockTestsInstallation(tx, input)
}

export type ReservedToolRun = {
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

export async function reserveMockTestsRun(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string,
  actionKey: string,
  actionInput: object
): Promise<ReservedToolRun> {
  const actorId = requireActor(principal)
  const inputHash = hashInput(actionInput)
  const scopedIdempotencyKey = `mt1_${hashInput({
    actorId,
    actionKey,
    key: input.idempotencyKey,
  })}`

  try {
    return await withMockTestsSerializableTransaction(async (tx) => {
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
          return reserveMockTestsRun(
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

export async function completeMockTestsRun(
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

export async function failMockTestsRunAndThrow(
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
    console.error("[mock-tests] Failed to persist ToolRun failure", {
      runId,
      auditError,
    })
  }

  if (isPublicError) throw error
  throw new ToolActionExecutionError(message, "RUN_FAILED")
}

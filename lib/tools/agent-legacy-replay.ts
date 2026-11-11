import type { PrismaClient } from "@/generated/prisma/client"
import type { ToolActionResult, ToolExecutionPrincipal } from "./contracts"
import type { ExecuteToolActionInput } from "./execute-tool-action"
import { ToolActionExecutionError } from "./errors"

// These legacy handlers atomically insert their raw-key ToolRun and domain
// changes in one transaction. The unique installation/key constraint protects
// concurrent writes; this adapter makes its committed result retryable. Modern
// st1_/mt1_ reservation handlers keep their own retry protocol.
const legacyActions = new Set([
  "exam.update",
  "exam.update-settings",
  "exam.delete",
  "subject.create",
  "subject.update-settings",
  "exam.attach-subject",
  "exam.detach-subject",
  "chapter.create",
  "chapter.update",
  "chapter.delete",
  "topic.create",
  "topic.update",
  "topic.delete",
  "exam.reorder-subjects",
  "chapter.reorder",
  "topic.reorder",
  "topic.set-learning",
  "topic.set-progress",
  "topic.record-revision",
  "topic.record-practice",
  "topic.record-test",
])

const receiptOnlyActions = new Set([
  "exam.delete",
  "chapter.delete",
  "topic.delete",
  "exam.detach-subject",
])

export function usesLegacyAgentReplay(
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal
) {
  return (
    principal.invocationSource !== "web" &&
    input.toolKey === "core.exam-prep" &&
    legacyActions.has(input.actionKey)
  )
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function idList(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 500 ||
    value.some((id) => typeof id !== "string")
  ) {
    throw new ToolActionExecutionError(
      "The previous action result is unavailable.",
      "RUN_FAILED"
    )
  }
  return value as string[]
}

type ReplayCallbacks = {
  releaseId: string
  /** Current input targets, not authorization remembered by the old run. */
  authorize: () => Promise<void>
  /** Current visibility for created/output blocks before returning old data. */
  authorizeResult: (result: ToolActionResult) => Promise<void>
  execute: () => Promise<ToolActionResult>
}

/** Must be called only after current membership, release and grants validation. */
export async function executeLegacyAgentWithReplay(
  db: Pick<PrismaClient, "toolRun">,
  input: ExecuteToolActionInput,
  principal: ToolExecutionPrincipal,
  handlerVersion: string,
  callbacks: ReplayCallbacks
): Promise<ToolActionResult> {
  if (!usesLegacyAgentReplay(input, principal)) {
    await callbacks.authorize()
    return callbacks.execute()
  }

  async function replay(): Promise<ToolActionResult | null> {
    const run = await db.toolRun.findFirst({
      where: {
        installationId: input.installationId,
        idempotencyKey: input.idempotencyKey,
      },
      include: { payload: { select: { input: true, output: true } } },
    })
    if (!run) return null
    if (
      run.workspaceId !== principal.workspaceId ||
      run.actorId !== principal.actorId ||
      run.actionKey !== input.actionKey ||
      run.handlerVersion !== handlerVersion ||
      run.toolReleaseId !== callbacks.releaseId ||
      run.invocationSource !== principal.invocationSource ||
      !run.payload ||
      canonicalJson(run.payload.input) !== canonicalJson(input.input)
    ) {
      throw new ToolActionExecutionError(
        "This idempotency key was already used for a different action or input.",
        "INVALID_INPUT"
      )
    }
    if (run.status !== "SUCCEEDED") {
      throw new ToolActionExecutionError(
        "The previous action has not completed successfully. Check its status before retrying.",
        "RUN_FAILED"
      )
    }

    if (receiptOnlyActions.has(input.actionKey)) {
      // Deleted/detached targets may no longer have a valid live ancestry. An
      // exact, actor-bound retry gets only an acknowledgment, never cached
      // titles, descendant IDs, properties or other former private content.
      return {
        runId: run.id,
        status: "succeeded",
        createdBlockIds: [],
        evidenceIds: [],
        data: { replayed: true, completed: true },
      }
    }

    await callbacks.authorize()
    const output = run.payload.output
    if (!record(output)) {
      throw new ToolActionExecutionError(
        "The previous action result is unavailable.",
        "RUN_FAILED"
      )
    }
    const result: ToolActionResult = {
      runId: run.id,
      status: "succeeded",
      ...(typeof output.rootBlockId === "string"
        ? { rootBlockId: output.rootBlockId }
        : {}),
      createdBlockIds: idList(output.createdBlockIds),
      evidenceIds: idList(output.evidenceIds),
    }
    await callbacks.authorizeResult(result)
    return result
  }

  const existing = await replay()
  if (existing) return existing
  await callbacks.authorize()
  try {
    return await callbacks.execute()
  } catch (error) {
    // A concurrent equal-key transaction can win after the initial read.
    // Legacy handlers wrap P2002; look up the exact committed result rather
    // than relying on the error text or running the mutation a second time.
    const winner = await replay()
    if (winner) return winner
    throw error
  }
}

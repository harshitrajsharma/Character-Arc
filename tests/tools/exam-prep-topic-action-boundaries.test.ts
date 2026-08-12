// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { beforeEach, describe, expect, mock, test } from "bun:test"

import type { ExecuteToolActionInput } from "@/lib/tools/execute-tool-action"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"

mock.module("server-only", () => ({}))

const workspaceId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
const installationId = "68a0111e-43d0-4464-83c0-a5132c6bd4f6"
const topicId = "78a0111e-43d0-4464-83c0-a5132c6bd4f7"

let topicProperties: Record<string, unknown>

const toolInstallationFindFirstOrThrow = mock(
  async (_args: Record<string, unknown>) => ({
    toolReleaseId: "release-1",
    toolRelease: { manifest: {} },
  })
)
const blockFindFirst = mock(async (_args: Record<string, unknown>) => ({
  id: topicId,
  properties: topicProperties,
}))
const blockUpdateMany = mock(async (_args: Record<string, unknown>) => ({
  count: 1,
}))
const toolRunCreate = mock(async (args: { data: { id: string } }) => ({
  id: args.data.id,
}))
const toolRunUpdate = mock(async (args: { where: { id: string } }) => ({
  id: args.where.id,
}))

const transactionClient = {
  toolInstallation: {
    findFirstOrThrow: toolInstallationFindFirstOrThrow,
  },
  block: {
    findFirst: blockFindFirst,
    updateMany: blockUpdateMany,
  },
  toolRun: {
    create: toolRunCreate,
    update: toolRunUpdate,
  },
}

const transaction = mock(
  async (
    operation: (tx: typeof transactionClient) => Promise<unknown>
  ): Promise<unknown> => operation(transactionClient)
)

mock.module("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
  },
}))

const principal: ToolExecutionPrincipal = {
  actorId: "user-1",
  workspaceId,
  invocationSource: "web",
}

function makeInput(
  actionKey: string,
  actionInput: Record<string, unknown>
): ExecuteToolActionInput {
  return {
    workspaceId,
    installationId,
    toolKey: "exam-prep",
    actionKey,
    idempotencyKey: `${actionKey}-idempotency-key`,
    input: actionInput,
  }
}

function expectActiveTopicBoundary(where: unknown) {
  expect(where).toEqual({
    id: topicId,
    workspaceId,
    originToolInstallationId: installationId,
    status: "ACTIVE",
    archivedAt: null,
    blockType: { key: "exam-prep.topic" },
  })
}

function resetTransactionMocks() {
  toolInstallationFindFirstOrThrow.mockClear()
  blockFindFirst.mockClear()
  blockUpdateMany.mockClear()
  toolRunCreate.mockClear()
  toolRunUpdate.mockClear()
  transaction.mockClear()
}

beforeEach(() => {
  topicProperties = {
    learningStatus: true,
    revisionCount: 0,
    practiceCount: 0,
    testCount: 0,
  }
  resetTransactionMocks()
})

describe("Exam Prep topic action boundaries", () => {
  test("topic.set-progress scopes its installation and both topic queries", async () => {
    const { executeExamPrepTopicSetProgress } = await import(
      "@/lib/tools/exam-prep-handlers"
    )

    await executeExamPrepTopicSetProgress(
      makeInput("topic.set-progress", {
        topicId,
        stage: "revision",
        count: 1,
      }),
      principal,
      "1.0.0"
    )

    expect(toolInstallationFindFirstOrThrow).toHaveBeenCalledWith({
      where: { id: installationId, workspaceId, status: "ACTIVE" },
      include: { toolRelease: true },
    })
    expectActiveTopicBoundary(blockFindFirst.mock.calls[0]?.[0]?.where)
    expectActiveTopicBoundary(blockUpdateMany.mock.calls[0]?.[0]?.where)
  })

  test("legacy topic.record-* actions scope every lookup and mutation", async () => {
    const {
      executeExamPrepTopicRecordPractice,
      executeExamPrepTopicRecordRevision,
      executeExamPrepTopicRecordTest,
    } = await import("@/lib/tools/exam-prep-handlers")
    const cases = [
      ["topic.record-revision", executeExamPrepTopicRecordRevision],
      ["topic.record-practice", executeExamPrepTopicRecordPractice],
      ["topic.record-test", executeExamPrepTopicRecordTest],
    ] as const

    for (const [actionKey, execute] of cases) {
      resetTransactionMocks()

      await execute(makeInput(actionKey, { topicId }), principal, "1.0.0")

      expect(toolInstallationFindFirstOrThrow).toHaveBeenCalledWith({
        where: { id: installationId, workspaceId, status: "ACTIVE" },
        include: { toolRelease: true },
      })
      expectActiveTopicBoundary(blockFindFirst.mock.calls[0]?.[0]?.where)
      expectActiveTopicBoundary(blockUpdateMany.mock.calls[0]?.[0]?.where)
    }
  })

  test("legacy revision, practice, and test increments require learning first", async () => {
    const {
      executeExamPrepTopicRecordPractice,
      executeExamPrepTopicRecordRevision,
      executeExamPrepTopicRecordTest,
    } = await import("@/lib/tools/exam-prep-handlers")
    const cases = [
      ["topic.record-revision", executeExamPrepTopicRecordRevision],
      ["topic.record-practice", executeExamPrepTopicRecordPractice],
      ["topic.record-test", executeExamPrepTopicRecordTest],
    ] as const

    for (const [actionKey, execute] of cases) {
      resetTransactionMocks()
      topicProperties = { learningStatus: false }

      await expect(
        execute(makeInput(actionKey, { topicId }), principal, "1.0.0")
      ).rejects.toMatchObject({
        code: "RUN_FAILED",
        message:
          "Mark this topic as learned before recording further progress.",
      })
      expect(blockUpdateMany).not.toHaveBeenCalled()
    }
  })
})

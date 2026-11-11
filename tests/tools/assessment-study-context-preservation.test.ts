// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"

mock.module("server-only", () => ({}))
mock.module("@/lib/prisma", () => ({ prisma: {} }))
const changes: Array<Record<string, unknown>> = []
const contextChecks: string[] = []
const tx = {
  assessment: {
    findFirst: async () => ({
      blockId: "paper",
      status: "DRAFT",
      block: { revision: BigInt(7) },
    }),
    findUnique: async () => ({ blueprint: { visibility: "private" } }),
    update: async (args: { data: Record<string, unknown> }) => {
      changes.push(args.data)
      return {}
    },
  },
  block: {
    findFirst: async (args: { where: { id: string } }) => {
      contextChecks.push(args.where.id)
      return {
        id: args.where.id,
        originToolInstallationId: "installation",
        blockType: { key: "exam-prep.subject" },
        subjectDetails: { blockId: args.where.id },
      }
    },
    findUnique: async () => ({ properties: {} }),
    update: async () => ({}),
    updateMany: async () => ({ count: 1 }),
  },
  blockRelation: { findFirst: async () => ({ fromBlockId: "exam" }) },
}
mock.module("@/lib/tools/mock-tests-runtime", () => ({
  reserveMockTestsRun: async () => ({ runId: "run" }),
  withMockTestsSerializableTransaction: async (
    operation: (client: typeof tx) => unknown
  ) => operation(tx),
  completeMockTestsRun: async () => undefined,
  failMockTestsRunAndThrow: async (_id: unknown, error: unknown) => {
    throw error
  },
  hashInput: () => "hash",
}))
const { executeMockTestsAssessmentUpdate } =
  await import("../../lib/tools/mock-tests-handlers")
const principal = {
  actorId: "actor",
  workspaceId: "workspace",
  invocationSource: "web" as const,
}
async function update(context: { examBlockId?: string | null }) {
  return executeMockTestsAssessmentUpdate.execute(
    {
      workspaceId: "workspace",
      installationId: "installation",
      toolKey: "core.mock-tests",
      actionKey: "assessment.update",
      idempotencyKey: "operation",
      input: {
        assessmentId: "paper",
        expectedRevision: 7,
        title: "Existing paper",
        ...context,
      },
    },
    principal,
    "test"
  )
}
beforeEach(() => {
  changes.length = 0
  contextChecks.length = 0
})
describe("ordinary assessment saves retain canonical study context", () => {
  test("omitting the field does not detach a subject-linked paper", async () => {
    await update({})
    expect(Object.hasOwn(changes[0], "examBlockId")).toBe(false)
    expect(contextChecks).toEqual([])
  })
  test("an explicit null unlinks while a supplied context is validated", async () => {
    await update({ examBlockId: null })
    expect(changes[0].examBlockId).toBeNull()
    await update({ examBlockId: "subject" })
    expect(changes[1].examBlockId).toBe("subject")
    expect(contextChecks).toEqual(["subject"])
  })
})

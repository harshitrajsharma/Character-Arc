// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"

const attemptId = "11111111-1111-4111-8111-111111111111"
let storedStatus = "IN_PROGRESS"
let solutionReads = 0
const question = {
  id: "question-1",
  kind: "SINGLE_CHOICE",
  stem: "Synthetic question",
  difficulty: 1,
  options: [{ id: "option-a", key: "A", content: "One" }],
  get solution() {
    solutionReads++
    return {
      explanation: "Private worked solution",
      numericAnswer: null,
      textAnswer: null,
      correctOptions: [{ questionOptionId: "option-a" }],
    }
  },
}
const findAttempt = mock(async (args: any) => {
  if (
    args.where.workspaceId !== "workspace-1" ||
    args.where.userId !== "user-1"
  )
    return null
  if (args.where.status && args.where.status !== storedStatus) return null
  return {
    id: attemptId,
    assessmentId: "assessment-1",
    status: storedStatus,
    startedAt: new Date("2026-11-10T00:00:00Z"),
    submittedAt: new Date("2026-11-10T00:01:00Z"),
    timeSpentSeconds: 60,
    assessment: {
      blockId: "assessment-1",
      durationMinutes: 10,
      block: { title: "Synthetic", allowAgentAccess: true, properties: {} },
    },
    responses: [
      {
        questionId: "question-1",
        answerText: null,
        isCorrect: true,
        awardedMarks: 1,
        timeSpentSeconds: 60,
        selectedOptions: [{ questionOption: { key: "A" } }],
        question,
      },
    ],
  }
})
const tx = {
  attempt: { findFirst: findAttempt },
  assessmentQuestion: {
    findMany: async () => [
      {
        questionId: "question-1",
        section: null,
        position: 0,
        marks: 1,
        negativeMarks: 0,
      },
    ],
  },
  topicProgress: { findMany: async () => [] },
  toolInstallation: {
    findFirstOrThrow: async () => ({
      toolReleaseId: "release-1",
      toolRelease: { manifest: {} },
    }),
  },
  toolRun: { create: async () => ({}) },
}
mock.module("server-only", () => ({}))
mock.module("@/lib/prisma", () => ({
  prisma: {
    ...tx,
    $transaction: async (operation: (db: typeof tx) => unknown) =>
      operation(tx),
  },
}))
mock.module("@/lib/auth/session", () => ({
  requireVerifiedClaims: async () => ({ sub: "user-1" }),
}))
const { getAttemptAnalysis } =
  await import("../../lib/tools/definitions/mock-tests/repository")
const { executeMockTestsAttemptGetAnalysis } =
  await import("../../lib/tools/mock-tests-handlers")

const principal: ToolExecutionPrincipal = {
  workspaceId: "workspace-1",
  actorId: "user-1",
  invocationSource: "web",
}
const actionInput = {
  toolKey: "core.mock-tests",
  actionKey: "attempt.get-analysis",
  workspaceId: "workspace-1",
  installationId: "installation-1",
  idempotencyKey: "synthetic-analysis-read",
  input: { attemptId },
}

beforeEach(() => {
  solutionReads = 0
  storedStatus = "IN_PROGRESS"
  findAttempt.mockClear()
})
describe("attempt solution release", () => {
  for (const status of ["IN_PROGRESS", "SUBMITTED", "ABANDONED"]) {
    test(`${status} cannot release answer keys through page or action`, async () => {
      storedStatus = status
      expect(
        await getAttemptAnalysis("workspace-1", attemptId, "user-1")
      ).toBeNull()
      await expect(
        executeMockTestsAttemptGetAnalysis.execute(
          actionInput,
          principal,
          "test"
        )
      ).rejects.toMatchObject({ code: "NOT_AVAILABLE" })
      expect(solutionReads).toBe(0)
    })
  }
  test("an evaluated attempt exposes its solution to its owner", async () => {
    storedStatus = "EVALUATED"
    const analysis = await getAttemptAnalysis(
      "workspace-1",
      attemptId,
      "user-1"
    )
    expect(analysis?.questions[0].correctKeys).toEqual(["A"])
    const result = await executeMockTestsAttemptGetAnalysis.execute(
      actionInput,
      principal,
      "test"
    )
    expect(result.status).toBe("succeeded")
    expect(solutionReads).toBeGreaterThan(0)
  })
  test("a foreign user or workspace does not receive even evaluated results", async () => {
    storedStatus = "EVALUATED"
    expect(
      await getAttemptAnalysis("other-workspace", attemptId, "user-1")
    ).toBeNull()
    expect(
      await getAttemptAnalysis("workspace-1", attemptId, "other-user")
    ).toBeNull()
    expect(solutionReads).toBe(0)
  })
})

// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test, mock } from "bun:test"
import type { Prisma } from "@/generated/prisma/client"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"
import {
  reserveQuestionDestination,
  createAndAttachQuestion,
} from "@/lib/tools/mock-tests/assessment-question-authoring"
import {
  allocationDefaults,
  allocationError,
} from "@/lib/tools/mock-tests/question-authoring"
import { validateToolActionInput } from "@/lib/tools/action-contract"
import { mockTestsManifest } from "@/lib/tools/definitions/mock-tests/manifest"

const principal: ToolExecutionPrincipal = {
  workspaceId: "workspace",
  actorId: "author",
  invocationSource: "web",
}
const input = {
  workspaceId: "workspace",
  installationId: "installation",
  assessmentId: "paper",
  expectedRevision: 7,
  section: "linear",
  marks: 2,
  negativeMarks: -0.67,
}
function setup(
  patch: {
    missing?: boolean
    revision?: number
    changed?: number
    attempts?: number
    count?: number
    foreign?: boolean
    archived?: boolean
  } = {}
) {
  const block = {
    findFirst: mock(async (_args: Prisma.BlockFindFirstArgs) =>
      patch.missing
        ? null
        : {
            revision: BigInt(patch.revision ?? 7),
            allowAgentAccess: false,
            assessmentDetails: {
              workspaceId: patch.foreign ? "other" : "workspace",
              status: patch.archived ? "ARCHIVED" : "DRAFT",
              blueprint: { sections: [{ key: "linear" }] },
              _count: {
                questions: patch.count ?? 30,
                attempts: patch.attempts ?? 0,
              },
              questions: [{ position: 35 }],
            },
          }
    ),
    updateMany: mock(async (_args: Prisma.BlockUpdateManyArgs) => ({
      count: patch.changed ?? 1,
    })),
  }
  return { block, tx: { block } as unknown as Prisma.TransactionClient }
}
describe("contextual question destination", () => {
  test("content and allocation use one transaction, returning saved totals", async () => {
    const db = setup()
    const allocation = {
      create: mock(async (_args: Prisma.AssessmentQuestionCreateArgs) => ({})),
      aggregate: mock(async () => ({ _sum: { marks: 62 } })),
    }
    const tx = {
      ...db.tx,
      assessmentQuestion: allocation,
    } as unknown as Prisma.TransactionClient
    const create = mock(async (transaction: Prisma.TransactionClient) => {
      expect(transaction).toBe(tx)
      expect(db.block.updateMany).toHaveBeenCalledTimes(1)
      return { id: "new-question", kind: "NUMERIC" }
    })
    expect(await createAndAttachQuestion(tx, input, principal, create)).toEqual(
      {
        question: { id: "new-question", kind: "NUMERIC" },
        assessment: {
          id: "paper",
          revision: 8,
          questionCount: 31,
          totalMarks: 62,
        },
      }
    )
    expect(allocation.create.mock.calls[0][0].data).toMatchObject({
      workspaceId: "workspace",
      assessmentId: "paper",
      questionId: "new-question",
      section: "linear",
      marks: 2,
      negativeMarks: -0.67,
      position: 36,
    })
  })
  test("a content error propagates to the transaction without an allocation", async () => {
    const db = setup()
    const allocation = { create: mock(async () => ({})) }
    const tx = {
      ...db.tx,
      assessmentQuestion: allocation,
    } as unknown as Prisma.TransactionClient
    await expect(
      createAndAttachQuestion(tx, input, principal, async () => {
        throw new Error("invalid answer key")
      })
    ).rejects.toThrow("invalid answer key")
    expect(allocation.create).not.toHaveBeenCalled()
  })
  test("reserves a revision with compare-and-swap and appends after real position", async () => {
    const db = setup()
    expect(await reserveQuestionDestination(db.tx, input, principal)).toEqual({
      revision: 8,
      position: 36,
      questionCount: 31,
    })
    expect(db.block.findFirst.mock.calls[0][0].where).toMatchObject({
      workspaceId: "workspace",
      originToolInstallationId: "installation",
      status: "ACTIVE",
      archivedAt: null,
    })
    expect(db.block.updateMany.mock.calls[0][0]).toMatchObject({
      where: { workspaceId: "workspace", revision: BigInt(7) },
      data: { revision: { increment: 1 } },
    })
  })
  test.each([
    [{ missing: true }, "NOT_AVAILABLE"],
    [{ foreign: true }, "NOT_AVAILABLE"],
    [{ archived: true }, "NOT_AVAILABLE"],
    [{ revision: 8 }, "REVISION_CONFLICT"],
    [{ attempts: 1 }, "INVALID_INPUT"],
    [{ count: 200 }, "INVALID_INPUT"],
  ])(
    "rejects an unavailable or unsafe destination before reserving: %j",
    async (patch: Parameters<typeof setup>[0], code: string) => {
      const db = setup(patch)
      await expect(
        reserveQuestionDestination(db.tx, input, principal)
      ).rejects.toMatchObject({ code })
      expect(db.block.updateMany).not.toHaveBeenCalled()
    }
  )
  test("a deleted/foreign section never becomes unassigned silently", async () => {
    const db = setup()
    await expect(
      reserveQuestionDestination(
        db.tx,
        { ...input, section: "foreign" },
        principal
      )
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
  test("concurrent revision change prevents creating content", async () => {
    const db = setup({ changed: 0 })
    await expect(
      reserveQuestionDestination(db.tx, input, principal)
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" })
  })
  test("denies cross-workspace and ungranted agent access", async () => {
    const db = setup()
    await expect(
      reserveQuestionDestination(db.tx, input, {
        ...principal,
        workspaceId: "other",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(db.block.findFirst).not.toHaveBeenCalled()
    await expect(
      reserveQuestionDestination(db.tx, input, {
        ...principal,
        invocationSource: "mcp",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
})
describe("allocation defaults and action contract", () => {
  test("keeps separate most-recent defaults for choice and numeric questions", () => {
    expect(
      allocationDefaults([
        { kind: "SINGLE_CHOICE", marks: 1, negativeMarks: 0 },
        { kind: "NUMERIC", marks: 2, negativeMarks: 0 },
        { kind: "SINGLE_CHOICE", marks: 2, negativeMarks: -0.67 },
      ])
    ).toEqual({
      SINGLE_CHOICE: { marks: 2, negativeMarks: -0.67 },
      NUMERIC: { marks: 2, negativeMarks: 0 },
    })
  })
  test("rejects blank, nonfinite, overprecision and wrongly signed allocations", () => {
    for (const [marks, penalty] of [
      ["", "0"],
      ["0", "0"],
      ["2", "0.33"],
      ["2", "-0.667"],
      ["Infinity", "0"],
      ["1000000", "0"],
    ])
      expect(allocationError(marks, penalty)).toBeTruthy()
    expect(allocationError("2", "-0.67")).toBeNull()
    expect(allocationError("2", "0")).toBeNull()
  })
  test("requires destination, revision and allocation for all supported kinds", () => {
    const payload = {
      assessmentId: "30c56bf7-bd9e-46dc-975e-c37a83ddb7ae",
      expectedRevision: 7,
      section: "linear",
      marks: 2,
      negativeMarks: 0,
      stem: "Original question",
      kind: "NUMERIC",
      numericAnswer: 4,
    }
    for (const kind of [
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "NUMERIC",
      "TRUE_FALSE",
    ])
      expect(
        validateToolActionInput(
          mockTestsManifest,
          "assessment.create-question",
          { ...payload, kind }
        ).success
      ).toBe(true)
    for (const field of [
      "assessmentId",
      "expectedRevision",
      "marks",
      "negativeMarks",
    ]) {
      const bad: Record<string, unknown> = { ...payload }
      delete bad[field]
      expect(
        validateToolActionInput(
          mockTestsManifest,
          "assessment.create-question",
          bad
        ).success
      ).toBe(false)
    }
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.create-question", {
        ...payload,
        negativeMarks: 1,
      }).success
    ).toBe(false)
  })
})

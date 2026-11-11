// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test, mock } from "bun:test"
import type { Prisma } from "@/generated/prisma/client"
import {
  manageAssessment,
  type AssessmentManagementInput,
} from "@/lib/tools/mock-tests/assessment-management"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"

const input: AssessmentManagementInput = {
  workspaceId: "workspace",
  installationId: "installation",
  assessmentId: "paper",
  expectedRevision: 4,
  operation: "rename",
  title: "  Renamed paper  ",
}
const principal: ToolExecutionPrincipal = {
  workspaceId: "workspace",
  actorId: "actor",
  invocationSource: "web",
}
function setup(
  options: {
    missing?: boolean
    revision?: number
    agent?: boolean
    active?: number
    changed?: number
    orphan?: boolean
    detailWorkspace?: string
  } = {}
) {
  const assessment = {
    update: mock(async (_args: Prisma.AssessmentUpdateArgs) => ({})),
  }
  const block = {
    findFirst: mock(async (_args: Prisma.BlockFindFirstArgs) =>
      options.missing
        ? null
        : {
            title: "Original",
            revision: BigInt(options.revision ?? 4),
            allowAgentAccess: options.agent ?? false,
            assessmentDetails: options.orphan
              ? null
              : {
                  workspaceId: options.detailWorkspace ?? "workspace",
                  status: "DRAFT",
                },
          }
    ),
    updateMany: mock(async (_args: Prisma.BlockUpdateManyArgs) => ({
      count: options.changed ?? 1,
    })),
  }
  const attempt = { count: mock(async () => options.active ?? 0) }
  return {
    assessment,
    block,
    attempt,
    tx: { assessment, block, attempt } as unknown as Prisma.TransactionClient,
  }
}

describe("assessment management boundaries", () => {
  test("rename changes only identity and revision, retaining paper configuration", async () => {
    const db = setup()
    const result = await manageAssessment(db.tx, input, principal)
    expect(result).toEqual({
      id: "paper",
      title: "Renamed paper",
      revision: 5,
      deleted: false,
    })
    expect(db.assessment.update).not.toHaveBeenCalled()
    expect(db.attempt.count).not.toHaveBeenCalled()
    expect(db.block.updateMany.mock.calls[0][0].data).toEqual({
      title: "Renamed paper",
      revision: { increment: 1 },
    })
  })
  test("queries are scoped to workspace, active installation and assessment type", async () => {
    const db = setup({ missing: true })
    await expect(
      manageAssessment(db.tx, input, principal)
    ).rejects.toMatchObject({ code: "NOT_AVAILABLE" })
    expect(db.block.findFirst.mock.calls[0][0].where).toMatchObject({
      workspaceId: "workspace",
      id: "paper",
      originToolInstallationId: "installation",
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "mock-tests.assessment" },
    })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
  test("rejects cross-workspace principals before querying", async () => {
    const db = setup()
    await expect(
      manageAssessment(db.tx, input, { ...principal, workspaceId: "other" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(db.block.findFirst).not.toHaveBeenCalled()
  })
  test("rejects agents when access was not granted", async () => {
    const db = setup()
    await expect(
      manageAssessment(db.tx, input, { ...principal, invocationSource: "mcp" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
  test("rejects stale revision without writing", async () => {
    const db = setup({ revision: 5 })
    await expect(
      manageAssessment(db.tx, input, principal)
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
  test("compare-and-swap prevents concurrent overwrites", async () => {
    const db = setup({ changed: 0 })
    await expect(
      manageAssessment(db.tx, { ...input, operation: "delete" }, principal)
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" })
    expect(db.assessment.update).not.toHaveBeenCalled()
  })
  test("active attempts block deletion", async () => {
    const db = setup({ active: 1 })
    await expect(
      manageAssessment(db.tx, { ...input, operation: "delete" }, principal)
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
  test("delete archives the block and paper without deleting questions or attempts", async () => {
    const db = setup()
    const result = await manageAssessment(
      db.tx,
      { ...input, operation: "delete" },
      principal
    )
    expect(result.deleted).toBe(true)
    expect(db.block.updateMany.mock.calls[0][0].data).toMatchObject({
      status: "ARCHIVED",
      archivedAt: expect.any(Date),
      revision: { increment: 1 },
    })
    expect(db.assessment.update.mock.calls[0][0]).toEqual({
      where: { blockId: "paper" },
      data: { status: "ARCHIVED" },
    })
  })
  test("blank names fail before querying", async () => {
    const db = setup()
    await expect(
      manageAssessment(db.tx, { ...input, title: "  " }, principal)
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(db.block.findFirst).not.toHaveBeenCalled()
  })
  test("deletes an incomplete library block without requiring or creating assessment details", async () => {
    const db = setup({ orphan: true })
    const result = await manageAssessment(
      db.tx,
      { ...input, operation: "delete" },
      principal
    )
    expect(result.deleted).toBe(true)
    expect(db.block.updateMany).toHaveBeenCalledTimes(1)
    expect(db.assessment.update).not.toHaveBeenCalled()
  })
  test("rejects mismatched detail workspace without mutating either record", async () => {
    const db = setup({ detailWorkspace: "other" })
    await expect(
      manageAssessment(db.tx, { ...input, operation: "delete" }, principal)
    ).rejects.toMatchObject({ code: "NOT_AVAILABLE" })
    expect(db.block.updateMany).not.toHaveBeenCalled()
  })
})

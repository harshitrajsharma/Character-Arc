// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { createAgentReadExecutor } from "@/lib/tools/agent-read-handlers"
import { mockTestsManifest } from "@/lib/tools/definitions/mock-tests/manifest"
import { validateActionInput } from "@/lib/tools/action-contract"

const id = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
const actorId = id(1)
const workspaceId = id(2)
const installationId = id(3)
const assessmentId = id(4)
const principal = { actorId, workspaceId, invocationSource: "mcp" as const }
const input = (filters: object) => ({
  workspaceId,
  installationId,
  toolKey: "core.mock-tests",
  actionKey: "attempt.list",
  idempotencyKey: "inventory-read",
  input: filters,
})
const row = (index: number, status = "EVALUATED") => ({
  id: id(index + 10),
  workspaceId,
  userId: actorId,
  assessmentId,
  status,
  startedAt: new Date(`2026-11-0${4 - index}T12:00:00Z`),
  submittedAt: new Date("2026-11-04T13:00:00Z"),
  evaluatedAt: new Date("2026-11-04T13:01:00Z"),
  score: { toNumber: () => 33 },
  maxScore: { toNumber: () => 50 },
  timeSpentSeconds: 3600,
  assessment: {
    block: {
      title: "Linear Algebra",
      workspaceId,
      originToolInstallationId: installationId,
      status: "ACTIVE",
      archivedAt: null,
      allowAgentAccess: true,
    },
  },
})
function database({ member = true, active = true } = {}) {
  const queries: Prisma.AttemptFindManyArgs[] = []
  let audit = 0
  const records = [
    row(0, "IN_PROGRESS"),
    row(1),
    row(2),
    { ...row(0), id: id(80), userId: id(81) },
    { ...row(0), id: id(82), workspaceId: id(83) },
    {
      ...row(0),
      id: id(84),
      assessment: {
        block: { ...row(0).assessment.block, allowAgentAccess: false },
      },
    },
  ]
  const tx = {
    workspaceMember: {
      findFirst: async () => (member ? { role: "OWNER" } : null),
    },
    toolInstallation: {
      findFirst: async () =>
        active ? { toolReleaseId: id(5), toolRelease: { manifest: {} } } : null,
    },
    attempt: {
      findMany: async (query: Prisma.AttemptFindManyArgs) => {
        queries.push(query)
        const where = query.where!
        const criteria = where.assessment as {
          block: { allowAgentAccess: boolean }
        }
        return records
          .filter(
            (record) =>
              record.userId === where.userId &&
              record.workspaceId === where.workspaceId &&
              record.assessment.block.allowAgentAccess ===
                criteria.block.allowAgentAccess &&
              (!where.status || record.status === where.status) &&
              (!where.assessmentId ||
                record.assessmentId === where.assessmentId)
          )
          .slice(0, query.take!)
      },
    },
    toolRun: {
      create: async () => {
        audit++
        return { id: id(6) }
      },
    },
  }
  return {
    client: {
      $transaction: async (work: (db: typeof tx) => Promise<unknown>) =>
        work(tx),
    } as unknown as PrismaClient,
    queries,
    audit: () => audit,
  }
}

describe("personal bounded attempt discovery", () => {
  test("own attempts use only visible active same-installation papers and omit answer-bearing fields", async () => {
    const db = database()
    const result = await createAgentReadExecutor("attempt.list", db.client)(
      input({ limit: 2 }),
      principal,
      "test"
    )
    expect(result.data).toMatchObject({
      items: [
        { id: id(10), status: "IN_PROGRESS", score: null, maxScore: null },
        { id: id(11), status: "EVALUATED", score: 33, maxScore: 50 },
      ],
    })
    expect(JSON.stringify(result)).not.toContain(id(80))
    expect(JSON.stringify(result)).not.toContain(id(82))
    expect(JSON.stringify(result)).not.toContain(id(84))
    expect(db.queries[0]).toMatchObject({
      where: {
        workspaceId,
        userId: actorId,
        assessment: {
          workspaceId,
          status: { not: "ARCHIVED" },
          block: {
            workspaceId,
            originToolInstallationId: installationId,
            allowAgentAccess: true,
            status: "ACTIVE",
            archivedAt: null,
            blockType: { key: "mock-tests.assessment" },
          },
        },
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: 3,
    })
    expect(db.queries[0].select).not.toHaveProperty("responses")
    expect(db.queries[0].select).not.toHaveProperty("metadata")
    expect(db.queries[0].select).not.toHaveProperty("progressEvidence")
    expect(db.audit()).toBe(1)
  })

  test("cursor continuation is stable by immutable start time and ID, with status/paper/title filters", async () => {
    const db = database()
    const read = createAgentReadExecutor("attempt.list", db.client)
    const result = await read(input({ limit: 2 }), principal, "test")
    const cursor = result.data!.nextCursor
    expect(typeof cursor).toBe("string")
    await read(
      input({
        limit: 2,
        cursor,
        assessmentId,
        status: "EVALUATED",
        search: "Linear",
      }),
      principal,
      "test"
    )
    expect(db.queries[1]).toMatchObject({
      where: {
        assessmentId,
        status: "EVALUATED",
        assessment: {
          block: { title: { contains: "Linear", mode: "insensitive" } },
        },
        OR: [
          { startedAt: { lt: new Date("2026-11-03T12:00:00Z") } },
          { startedAt: new Date("2026-11-03T12:00:00Z"), id: { lt: id(11) } },
        ],
      },
    })
  })

  test("current membership/installation failure prevents attempt reads and audit writes", async () => {
    for (const options of [{ member: false }, { active: false }]) {
      const db = database(options)
      await expect(
        createAgentReadExecutor("attempt.list", db.client)(
          input({}),
          principal,
          "test"
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
      expect(db.queries).toEqual([])
      expect(db.audit()).toBe(0)
    }
  })

  test("manifest is truly read-only and unsafe limits, status and cursor shapes are rejected", async () => {
    const action = mockTestsManifest.actions.find(
      (item) => item.key === "attempt.list"
    )!
    expect(action.readOnly).toBe(true)
    expect(action.output.writesBlockTypeKeys).toEqual([])
    expect(
      validateActionInput(action, { status: "IN_PROGRESS", limit: 50 }).success
    ).toBe(true)
    for (const filters of [
      { status: "other" },
      { limit: 51 },
      { userId: id(81) },
    ]) {
      expect(validateActionInput(action, filters).success).toBe(false)
    }
    for (const cursor of [
      "invalid",
      Buffer.from(
        JSON.stringify({
          kind: "block",
          id: id(1),
          updatedAt: new Date().toISOString(),
        })
      ).toString("base64url"),
    ]) {
      const db = database()
      await expect(
        createAgentReadExecutor("attempt.list", db.client)(
          input({ cursor }),
          principal,
          "test"
        )
      ).rejects.toMatchObject({ code: "INVALID_INPUT" })
      expect(db.queries).toEqual([])
      expect(db.audit()).toBe(0)
    }
  })
})

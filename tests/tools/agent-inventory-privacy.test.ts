// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { createAgentReadExecutor } from "@/lib/tools/agent-read-handlers"

const id = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
const workspaceId = id(1)
const installationId = id(2)
const principal = {
  workspaceId,
  actorId: id(3),
  invocationSource: "mcp" as const,
}
const input = (actionKey: string) => ({
  workspaceId,
  installationId,
  toolKey: actionKey === "subject.list" ? "core.exam-prep" : "core.mock-tests",
  actionKey,
  idempotencyKey: "inventory",
  input: {},
})
function database() {
  const queries: Prisma.BlockFindManyArgs[] = []
  const tx = {
    workspaceMember: { findFirst: async () => ({ role: "OWNER" }) },
    toolInstallation: {
      findFirst: async () => ({
        toolReleaseId: id(4),
        toolRelease: { manifest: {} },
      }),
    },
    block: {
      findMany: async (query: Prisma.BlockFindManyArgs) => {
        queries.push(query)
        if (query.select && "assessmentDetails" in query.select)
          return [0, 1].map((index) => ({
            id: id(index + 10),
            title: `Paper ${index}`,
            revision: BigInt(1),
            updatedAt: new Date("2026-11-01T00:00:00Z"),
            assessmentDetails: {
              status: "PUBLISHED",
              durationMinutes: 90,
              totalMarks: null,
              examBlock: { id: id(index + 20) },
              _count: { questions: 30 },
            },
          }))
        // Only one context passes the database's full typed visibility predicate.
        if (query.where?.OR) return [{ id: id(21) }]
        return []
      },
    },
    toolRun: { create: async () => ({ id: id(99) }) },
  }
  return {
    queries,
    client: {
      $transaction: async (work: (db: typeof tx) => Promise<unknown>) =>
        work(tx),
    } as unknown as PrismaClient,
  }
}

describe("inventory ancestry privacy", () => {
  test("unscoped subject inventory requires a visible active exam ancestor", async () => {
    const db = database()
    await createAgentReadExecutor("subject.list", db.client)(
      input("subject.list"),
      principal,
      "test"
    )
    expect(db.queries[0].where).toMatchObject({
      workspaceId,
      originToolInstallationId: installationId,
      allowAgentAccess: true,
      incomingRelations: {
        some: {
          workspaceId,
          relationType: { key: "exam-prep.exam-has-subject" },
          fromBlock: {
            workspaceId,
            originToolInstallationId: installationId,
            allowAgentAccess: true,
            status: "ACTIVE",
            archivedAt: null,
            blockType: { key: "exam-prep.exam" },
          },
        },
      },
    })
  })

  test("assessment summaries batch-validate context ancestry and suppress hidden context IDs", async () => {
    const db = database()
    const result = await createAgentReadExecutor("assessment.list", db.client)(
      input("assessment.list"),
      principal,
      "test"
    )
    expect(result.data).toMatchObject({
      items: [
        { id: id(10), contextBlockId: null },
        { id: id(11), contextBlockId: id(21) },
      ],
    })
    expect(db.queries).toHaveLength(2)
    expect(db.queries[1]).toMatchObject({
      where: { id: { in: [id(20), id(21)] } },
      take: 2,
      select: { id: true },
    })
    const predicates = JSON.stringify(db.queries[1].where)
    expect(predicates).toContain("exam-prep.exam-has-subject")
    expect(predicates).toContain("exam-prep.subject-has-chapter")
    expect(predicates).toContain("exam-prep.chapter-has-topic")
    expect(predicates).toContain('"allowAgentAccess":true')
    expect(predicates).toContain('"key":"core.exam-prep"')
    expect(JSON.stringify(result)).not.toContain(id(20))
  })
})

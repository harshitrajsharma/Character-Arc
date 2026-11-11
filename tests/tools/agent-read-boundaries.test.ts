// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "@/generated/prisma/client"
import { createAgentReadExecutor } from "@/lib/tools/agent-read-handlers"
import { parseToolManifest } from "@/lib/tools/contracts"
import { mockTestsManifest } from "@/lib/tools/definitions/mock-tests/manifest"

const workspaceId = "30c56bf7-bd9e-46dc-975e-c37a83ddb7ae"
const actorId = "9625ade5-1f2f-41d4-bbe1-2d2c13a330c2"
const installationId = "ec16a1c2-2039-4513-98b5-0ae0261b2fda"
const principal = { actorId, workspaceId, invocationSource: "mcp" as const }
function input(actionKey: string, data: object) {
  return {
    workspaceId,
    installationId,
    toolKey:
      actionKey.startsWith("assessment") || actionKey.startsWith("question")
        ? "core.mock-tests"
        : "core.exam-prep",
    actionKey,
    idempotencyKey: "read-key",
    input: data,
  }
}
const id = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`
const blocks = [1, 2, 3].map((index) => ({
  id: id(index),
  title: `Study ${index}`,
  revision: BigInt(index),
  updatedAt: new Date(`2026-11-0${index}T00:00:00Z`),
}))
function database({ member = true, child = true, oversized = false } = {}) {
  const queries: { model: string; input: unknown }[] = []
  const tx = {
    workspaceMember: {
      findFirst: async (value: unknown) => {
        queries.push({ model: "membership", input: value })
        return member ? { role: "OWNER" } : null
      },
    },
    toolInstallation: {
      findFirst: async () => ({
        toolReleaseId: id(50),
        toolRelease: { manifest: {} },
      }),
    },
    block: {
      findFirst: async (value: unknown) => {
        queries.push({ model: "root", input: value })
        return blocks[0]
      },
      findMany: async (value: unknown) => {
        queries.push({ model: "blocks", input: value })
        const criteria = value as { where?: { blockType?: { key?: string } } }
        const rows = blocks.map((block) => ({
          ...block,
          properties: { learningStatus: true, revisionCount: 3 },
          topicDetails: { isImportant: false },
          incomingRelations: [],
        }))
        return oversized && criteria.where?.blockType?.key === "exam-prep.topic"
          ? Array.from({ length: 501 }, (_, index) => ({
              ...rows[0],
              id: id(index + 100),
            }))
          : rows
      },
    },
    blockRelation: {
      findFirst: async (value: unknown) => {
        queries.push({ model: "parent-link", input: value })
        return child ? { toBlock: blocks[1] } : null
      },
      findMany: async (value: unknown) => {
        queries.push({ model: "children", input: value })
        return blocks.map((block, index) => ({
          id: block.id,
          position: index,
          toBlock: block,
        }))
      },
    },
    question: {
      findMany: async (value: unknown) => {
        queries.push({ model: "bank", input: value })
        return [
          {
            id: id(10),
            stem: "x".repeat(600),
            kind: "MCQ",
            difficulty: 2,
            updatedAt: new Date(),
            _count: { options: 4 },
          },
        ]
      },
    },
    testRecord: {
      findMany: async (value: unknown) => {
        queries.push({ model: "records", input: value })
        return [
          {
            id: id(20),
            chapterId: null,
            scope: "SUBJECT",
            marksObtained: { toNumber: () => 20 },
            totalMarks: { toNumber: () => 50 },
            targetChapters: [],
          },
        ]
      },
    },
    topicProgress: {
      findMany: async (value: unknown) => {
        queries.push({ model: "personal-progress", input: value })
        return [{ blockId: id(2), proficiency: { toNumber: () => 80 } }]
      },
    },
    toolRun: {
      create: async (value: unknown) => {
        queries.push({ model: "audit", input: value })
        return { id: id(99) }
      },
    },
  }
  const client = {
    $transaction: async (operation: (db: typeof tx) => Promise<unknown>) =>
      operation(tx),
  } as unknown as PrismaClient
  return { client, queries }
}

describe("bounded agent inventory reads", () => {
  test("legacy exam context is bounded and supplies subject continuation", async () => {
    const db = database()
    const result = await createAgentReadExecutor("exam.get-context", db.client)(
      input("exam.get-context", { examId: id(1), limit: 2 }),
      principal,
      "test"
    )
    expect(result.data).toMatchObject({
      childType: "subject",
      items: [{ id: id(1) }, { id: id(2) }],
    })
    expect(result.data).toHaveProperty("nextCursor")
  })
  test("subject progress reuses canonical formulas and only current-user test records", async () => {
    const db = database()
    const result = await createAgentReadExecutor(
      "subject.get-progress",
      db.client
    )(input("subject.get-progress", { subjectId: id(1) }), principal, "test")
    expect(result.data).toMatchObject({
      complete: true,
      progress: { learning: 100, revision: 100, practice: 0, test: 25 },
    })
    expect(
      db.queries.find((query) => query.model === "records")?.input
    ).toMatchObject({
      where: {
        workspaceId,
        userId: actorId,
        exam: {
          originToolInstallationId: installationId,
          allowAgentAccess: true,
        },
      },
      take: 501,
    })
  })
  test("rollup safety caps never present a partial aggregate as complete", async () => {
    const db = database({ oversized: true })
    const result = await createAgentReadExecutor(
      "subject.get-progress",
      db.client
    )(input("subject.get-progress", { subjectId: id(1) }), principal, "test")
    expect(result.data).toMatchObject({
      complete: false,
      progress: null,
      testEvidence: null,
    })
  })
  test("weak-topic test evidence is current-user scoped and ancestry-constrained", async () => {
    const db = database()
    const result = await createAgentReadExecutor(
      "exam.get-weak-topics",
      db.client
    )(
      input("exam.get-weak-topics", { examId: id(1), stage: "test", limit: 2 }),
      principal,
      "test"
    )
    expect(
      db.queries.find((query) => query.model === "personal-progress")?.input
    ).toMatchObject({
      where: { workspaceId, userId: actorId, blockId: { in: [id(1), id(2)] } },
      take: 2,
    })
    const query = db.queries.find((item) => item.model === "blocks")?.input
    expect(JSON.stringify(query)).toContain("exam-prep.exam-has-subject")
    expect(JSON.stringify(query)).toContain("exam-prep.subject-has-chapter")
    expect(JSON.stringify(query)).toContain("exam-prep.chapter-has-topic")
    expect(result.data).toMatchObject({
      scannedCount: 2,
      items: [
        { id: id(1), progress: 0 },
        { id: id(2), progress: 80 },
      ],
    })
  })
  test("exam discovery scopes every query and uses keyset lookahead", async () => {
    const db = database()
    const read = createAgentReadExecutor("exam.list", db.client)
    const result = await read(
      input("exam.list", { limit: 2 }),
      principal,
      "test"
    )
    expect(result.status).toBe("succeeded")
    const page = result.data as { items: unknown[]; nextCursor: string }
    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toBeTruthy()
    expect(
      db.queries.find((query) => query.model === "blocks")?.input
    ).toMatchObject({
      where: {
        workspaceId,
        originToolInstallationId: installationId,
        allowAgentAccess: true,
        status: "ACTIVE",
        archivedAt: null,
        blockType: { key: "exam-prep.exam" },
      },
      take: 3,
    })
    await read(
      input("exam.list", { limit: 2, cursor: page.nextCursor }),
      principal,
      "test"
    )
    expect(
      db.queries.filter((query) => query.model === "blocks").at(-1)?.input
    ).toHaveProperty("where.OR")
    expect(db.queries.filter((query) => query.model === "audit")).toHaveLength(
      2
    )
  })
  test("missing current membership prevents data reads and audit writes", async () => {
    const db = database({ member: false })
    await expect(
      createAgentReadExecutor("exam.list", db.client)(
        input("exam.list", {}),
        principal,
        "test"
      )
    ).rejects.toThrow("active workspace")
    expect(
      db.queries.some(
        (query) => query.model === "blocks" || query.model === "audit"
      )
    ).toBe(false)
  })
  test("chapter browsing requires a typed relation to the requested visible subject", async () => {
    const db = database({ child: false })
    await expect(
      createAgentReadExecutor("subject.get-context", db.client)(
        input("subject.get-context", { subjectId: id(1), chapterId: id(2) }),
        principal,
        "test"
      )
    ).rejects.toThrow("child of this subject")
    expect(
      db.queries.find((query) => query.model === "parent-link")?.input
    ).toMatchObject({
      where: {
        workspaceId,
        fromBlockId: id(1),
        toBlockId: id(2),
        relationType: { key: "exam-prep.subject-has-chapter" },
        toBlock: {
          allowAgentAccess: true,
          originToolInstallationId: installationId,
        },
      },
    })
    expect(
      db.queries.some(
        (query) => query.model === "children" || query.model === "audit"
      )
    ).toBe(false)
  })
  test("question summaries are owner-scoped and never select solutions or correct options", async () => {
    const db = database()
    const result = await createAgentReadExecutor("question.list", db.client)(
      input("question.list", { limit: 10 }),
      principal,
      "test"
    )
    const page = result.data as { items: { stemPreview: string }[] }
    expect(page.items[0].stemPreview.length).toBe(400)
    const query = db.queries.find((item) => item.model === "bank")?.input
    expect(query).toMatchObject({
      where: { workspaceId, authoredById: actorId },
      take: 11,
    })
    expect(JSON.stringify(query)).not.toContain("solution")
    expect(JSON.stringify(query)).not.toContain("correctOptions")
  })
  test("cursor kind and page bounds are validated before traversing data", async () => {
    const db = database()
    const read = createAgentReadExecutor("exam.list", db.client)
    await expect(
      read(input("exam.list", { limit: 51 }), principal, "test")
    ).rejects.toThrow("filters")
    await expect(
      read(input("exam.list", { cursor: "arbitrary" }), principal, "test")
    ).rejects.toThrow("cursor")
    expect(db.queries.some((query) => query.model === "blocks")).toBe(false)
  })
  test("manifest read-only effects cannot disguise mutation permissions", () => {
    const read = mockTestsManifest.actions.find(
      (action) => action.key === "assessment.list"
    )!
    expect(() =>
      parseToolManifest({
        ...mockTestsManifest,
        actions: [{ ...read, requiredPermissions: ["blocks.write.owned"] }],
      })
    ).toThrow()
    expect(() =>
      parseToolManifest({
        ...mockTestsManifest,
        actions: [
          {
            ...read,
            output: {
              ...read.output,
              writesBlockTypeKeys: ["mock-tests.assessment"],
            },
          },
        ],
      })
    ).toThrow()
  })
})

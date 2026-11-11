// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { Prisma } from "@/generated/prisma/client"
import {
  assertAgentActionAccess,
  assertAgentResultBlockAccess,
  type AgentActionAccessDatabase,
} from "@/lib/tools/agent-action-access"

type Row = {
  id: string
  workspaceId: string
  type: string
  agent: boolean
  active: boolean
  installation: string
  installationActive: boolean
}
type Predicate = {
  OR?: Prisma.BlockWhereInput[]
  id?: string | { in: string[] }
  workspaceId?: string
  allowAgentAccess?: boolean
  status?: string
  archivedAt?: null
  originToolInstallationId?: string
  originToolInstallation?: object
  blockType?: { key: string }
  incomingRelations?: {
    some: { relationType: { key: string }; fromBlock: Prisma.BlockWhereInput }
  }
}
const principal = {
  actorId: "actor",
  workspaceId: "workspace",
  invocationSource: "mcp" as const,
}
const scope = {
  workspaceId: "workspace",
  installationId: "exam-installation",
  toolKey: "core.exam-prep",
  actionKey: "topic.set-learning",
  input: { topicId: "topic" },
}

function setup() {
  const row = (
    id: string,
    type: string,
    installation = "exam-installation"
  ): Row => ({
    id,
    type,
    installation,
    workspaceId: "workspace",
    agent: true,
    active: true,
    installationActive: true,
  })
  const rows = [
    row("exam", "exam-prep.exam"),
    row("subject", "exam-prep.subject"),
    row("chapter", "exam-prep.chapter"),
    row("topic", "exam-prep.topic"),
    row("paper", "mock-tests.assessment", "mock-installation"),
  ]
  const edges = [
    { from: "exam", to: "subject", key: "exam-prep.exam-has-subject" },
    { from: "subject", to: "chapter", key: "exam-prep.subject-has-chapter" },
    { from: "chapter", to: "topic", key: "exam-prep.chapter-has-topic" },
  ]
  const reads: unknown[] = []
  let recordOwner = "actor"
  let hiddenEvidence = false
  let clone: {
    workspaceId: string
    status: string
    blueprint: object
    examBlockId: string | null
  } | null = null
  function match(row: Row, where: Prisma.BlockWhereInput): boolean {
    const w = where as Predicate
    if (w.OR && !w.OR.some((item: Prisma.BlockWhereInput) => match(row, item)))
      return false
    if (
      (typeof w.id === "string" && row.id !== w.id) ||
      (typeof w.id === "object" && !w.id.in.includes(row.id))
    )
      return false
    if (
      (w.workspaceId && row.workspaceId !== w.workspaceId) ||
      (w.allowAgentAccess !== undefined && row.agent !== w.allowAgentAccess)
    )
      return false
    if (
      (w.status === "ACTIVE" && !row.active) ||
      (w.archivedAt === null && !row.active)
    )
      return false
    if (
      w.originToolInstallationId &&
      row.installation !== w.originToolInstallationId
    )
      return false
    if (w.originToolInstallation && !row.installationActive) return false
    if (w.blockType?.key && row.type !== w.blockType.key) return false
    const parent = w.incomingRelations?.some
    if (
      parent &&
      !edges.some(
        (edge) =>
          edge.to === row.id &&
          edge.key === parent.relationType.key &&
          rows.some(
            (candidate) =>
              candidate.id === edge.from && match(candidate, parent.fromBlock)
          )
      )
    )
      return false
    return true
  }
  const owns = (where: Record<string, unknown>) =>
    where.workspaceId === "workspace" && where.userId === recordOwner
  const db = {
    block: {
      findMany: async (args: Prisma.BlockFindManyArgs) => {
        reads.push(args)
        return rows
          .filter((row) => match(row, args.where!))
          .map(({ id }) => ({ id }))
      },
      findFirst: async (args: Prisma.BlockFindFirstArgs) => {
        reads.push(args)
        return rows.find((row) => match(row, args.where!)) ?? null
      },
    },
    scheduledTest: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        reads.push(where)
        return owns(where) && where.installationId === "exam-installation"
          ? {
              examId: "exam",
              subjectId: "subject",
              chapters: [{ chapterId: "chapter" }],
            }
          : null
      },
    },
    testRecord: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        reads.push(where)
        return owns(where)
          ? {
              examId: "exam",
              subjectId: "subject",
              chapterId: null,
              targetChapters: [{ chapterId: "chapter" }],
            }
          : null
      },
    },
    attempt: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        reads.push(where)
        return owns(where) ? { assessmentId: "paper" } : null
      },
    },
    assessment: {
      findFirst: async (args: unknown) => {
        reads.push(args)
        return clone
      },
    },
    questionTarget: {
      findFirst: async (args: unknown) => {
        reads.push(args)
        return hiddenEvidence ? { blockId: "hidden" } : null
      },
    },
  } as unknown as AgentActionAccessDatabase
  return {
    db,
    rows,
    edges,
    reads,
    owner: (value: string) => (recordOwner = value),
    evidence: () => (hiddenEvidence = true),
    clone: (value: typeof clone) => (clone = value),
  }
}

describe("agent action target boundaries", () => {
  test("one batched query authorizes an active typed topic and all ancestors", async () => {
    const state = setup()
    await assertAgentActionAccess(state.db, scope, principal)
    expect(state.reads).toHaveLength(1)
    expect(state.reads[0]).toMatchObject({ take: 1, select: { id: true } })
  })
  for (const target of ["topic", "chapter", "subject", "exam"]) {
    test(`a hidden ${target} blocks a known topic ID`, async () => {
      const state = setup()
      state.rows.find((row) => row.id === target)!.agent = false
      await expect(
        assertAgentActionAccess(state.db, scope, principal)
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
    })
  }
  for (const change of [
    "foreign",
    "archived",
    "disabled-installation",
    "wrong-type",
  ] as const) {
    test(`${change} targets fail closed`, async () => {
      const state = setup()
      const topic = state.rows.find((row) => row.id === "topic")!
      if (change === "foreign") topic.workspaceId = "foreign"
      if (change === "archived") topic.active = false
      if (change === "disabled-installation") topic.installationActive = false
      if (change === "wrong-type") topic.type = "exam-prep.exam"
      await expect(
        assertAgentActionAccess(state.db, scope, principal)
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
    })
  }
  test("reorder checks every child and all references share one bounded query", async () => {
    const state = setup()
    await assertAgentActionAccess(
      state.db,
      {
        ...scope,
        actionKey: "topic.reorder",
        input: { chapterId: "chapter", topicIds: ["topic"] },
      },
      principal
    )
    expect(state.reads).toHaveLength(1)
    await expect(
      assertAgentActionAccess(
        state.db,
        {
          ...scope,
          actionKey: "topic.reorder",
          input: { chapterId: "chapter", topicIds: ["topic", "missing"] },
        },
        principal
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  test("a detached visible shared subject can acquire its first visible exam", async () => {
    const state = setup()
    state.edges.shift()
    await assertAgentActionAccess(
      state.db,
      {
        ...scope,
        actionKey: "exam.attach-subject",
        input: { examId: "exam", subjectId: "subject" },
      },
      principal
    )
    await expect(
      assertAgentActionAccess(
        state.db,
        {
          ...scope,
          actionKey: "subject.update-settings",
          input: { subjectId: "subject" },
        },
        principal
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  for (const key of ["scheduledTestId", "testRecordId", "attemptId"]) {
    test(`${key} resolves only current actor records and checks their hidden study targets`, async () => {
      const state = setup()
      const currentScope = {
        ...scope,
        ...(key === "attemptId"
          ? { toolKey: "core.mock-tests", installationId: "mock-installation" }
          : {}),
        input: { [key]: "record" },
      }
      await assertAgentActionAccess(state.db, currentScope, principal)
      state.owner("another-user")
      await expect(
        assertAgentActionAccess(state.db, currentScope, principal)
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
      state.owner("actor")
      state.rows.find(
        (row) => row.id === (key === "attemptId" ? "paper" : "chapter")
      )!.agent = false
      await expect(
        assertAgentActionAccess(state.db, currentScope, principal)
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
    })
  }
  test("question targets and study-context references honor ancestor privacy", async () => {
    const state = setup()
    const mockScope = {
      ...scope,
      toolKey: "core.mock-tests",
      installationId: "mock-installation",
      actionKey: "question.create",
      input: { targets: [{ blockId: "topic" }] },
    }
    await assertAgentActionAccess(state.db, mockScope, principal)
    state.rows.find((row) => row.id === "subject")!.agent = false
    await expect(
      assertAgentActionAccess(state.db, mockScope, principal)
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  test("web and unrelated tools retain their own authorization without extra reads", async () => {
    const state = setup()
    await assertAgentActionAccess(state.db, scope, {
      ...principal,
      invocationSource: "web",
    })
    await assertAgentActionAccess(
      state.db,
      { ...scope, toolKey: "core.goals-paths" },
      principal
    )
    expect(state.reads).toHaveLength(0)
  })
  test("cascading deletion cannot remove a hidden descendant", async () => {
    const state = setup()
    state.rows.find((row) => row.id === "topic")!.agent = false
    for (const [actionKey, input] of [
      ["exam.delete", { examId: "exam" }],
      ["chapter.delete", { chapterId: "chapter" }],
    ] as const) {
      await expect(
        assertAgentActionAccess(
          state.db,
          { ...scope, actionKey, input },
          principal
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
    }
  })
  test("a public published clone can originate in another workspace; private/draft/disabled cloning cannot", async () => {
    const state = setup()
    const current = {
      ...scope,
      toolKey: "core.mock-tests",
      installationId: "mock-installation",
      actionKey: "assessment.clone",
      input: { sourceAssessmentId: "community-paper" },
    }
    state.clone({
      workspaceId: "community",
      status: "PUBLISHED",
      blueprint: { visibility: "public", allowCloning: true },
      examBlockId: null,
    })
    await assertAgentActionAccess(state.db, current, principal)
    for (const value of [
      null,
      {
        workspaceId: "community",
        status: "DRAFT",
        blueprint: { visibility: "public" },
        examBlockId: null,
      },
      {
        workspaceId: "community",
        status: "PUBLISHED",
        blueprint: { visibility: "private" },
        examBlockId: null,
      },
      {
        workspaceId: "community",
        status: "PUBLISHED",
        blueprint: { visibility: "public", allowCloning: false },
        examBlockId: null,
      },
    ]) {
      state.clone(value)
      await expect(
        assertAgentActionAccess(state.db, current, principal)
      ).rejects.toMatchObject({ code: "FORBIDDEN" })
    }
    expect(state.reads[0]).toMatchObject({
      where: {
        block: { allowAgentAccess: true, archivedAt: null, status: "ACTIVE" },
      },
    })
  })
  test("submission cannot write progress evidence into agent-hidden question targets", async () => {
    const state = setup()
    const current = {
      ...scope,
      toolKey: "core.mock-tests",
      installationId: "mock-installation",
      actionKey: "attempt.submit",
      input: { attemptId: "attempt" },
    }
    await assertAgentActionAccess(state.db, current, principal)
    state.evidence()
    await expect(
      assertAgentActionAccess(state.db, current, principal)
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(state.reads.at(-1)).toMatchObject({
      where: {
        question: {
          assessments: {
            some: { assessmentId: "paper", workspaceId: "workspace" },
          },
        },
      },
    })
  })
  test("cached output blocks must still be visible and in the current installation", async () => {
    const state = setup()
    await assertAgentResultBlockAccess(state.db, scope, ["topic"])
    state.rows.find((row) => row.id === "exam")!.agent = false
    await expect(
      assertAgentResultBlockAccess(state.db, scope, ["topic"])
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      assertAgentResultBlockAccess(state.db, scope, ["missing"])
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})

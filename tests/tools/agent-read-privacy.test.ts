// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, mock, test } from "bun:test"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { filterAgentVisibleSubjects } from "@/lib/tools/agent-visible-study"
let query: unknown
mock.module("server-only", () => ({}))
mock.module("@/lib/prisma", () => ({
  prisma: {
    topicProgress: {
      findMany: async (input: unknown) => {
        query = input
        return []
      },
    },
  },
}))
const { getWeakTopics } =
  await import("@/lib/tools/definitions/mock-tests/repository")

const topic = (id: string, learned: boolean) => ({
  id,
  name: id,
  important: false,
  learningStatus: learned,
  revisionCount: 0,
  practiceCount: 0,
  testCount: 0,
})
const subject = {
  id: "subject",
  name: "Subject",
  title: "Subject",
  weightage: 20,
  testRecords: [],
  foundationLevel: "Advanced",
  learningProgress: 99,
  revisionProgress: 99,
  practiceProgress: 99,
  testProgress: 99,
  overallProgress: 99,
  chapters: [
    {
      id: "visible-chapter",
      name: "Visible",
      testRecords: [],
      topics: [topic("visible-topic", true), topic("hidden-topic", false)],
    },
    {
      id: "hidden-chapter",
      name: "Hidden",
      testRecords: [],
      topics: [topic("another-hidden-topic", false)],
    },
  ],
} as unknown as SubjectWithRelations

describe("agent-visible study privacy", () => {
  test("private descendants and cached aggregate values cannot enter recommendations", () => {
    const result = filterAgentVisibleSubjects(
      [subject],
      new Set(["subject", "visible-chapter", "visible-topic"])
    )
    expect(result).toHaveLength(1)
    expect(result[0].chapters).toHaveLength(1)
    expect(result[0].chapters[0].topics).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain("hidden-topic")
    expect(result[0].learningProgress).toBe(100)
  })
  test("a visible subject with no visible descendants does not reveal old progress", () => {
    const result = filterAgentVisibleSubjects([subject], new Set(["subject"]))
    expect(result[0].chapters).toEqual([])
    expect(result[0].learningProgress).toBe(0)
    expect(result[0].overallProgress).toBe(0)
    expect(filterAgentVisibleSubjects([subject], new Set())).toEqual([])
  })
  test("personal weak-topic reads also require active agent-visible source blocks", async () => {
    await getWeakTopics("workspace", "actor", 20, true)
    expect(query).toMatchObject({
      where: {
        workspaceId: "workspace",
        userId: "actor",
        block: {
          workspaceId: "workspace",
          allowAgentAccess: true,
          status: "ACTIVE",
          archivedAt: null,
          originToolInstallation: {
            workspaceId: "workspace",
            status: "ACTIVE",
          },
        },
      },
      take: 20,
    })
    await getWeakTopics("workspace", "actor", 20)
    expect(query).toMatchObject({
      where: { workspaceId: "workspace", userId: "actor" },
    })
    expect(JSON.stringify(query)).not.toContain("allowAgentAccess")
  })
})

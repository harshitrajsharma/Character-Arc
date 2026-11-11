// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "@/generated/prisma/client"
import {
  executeLegacyAgentWithReplay,
  usesLegacyAgentReplay,
} from "@/lib/tools/agent-legacy-replay"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import type { ToolActionResult } from "@/lib/tools/contracts"

const principal = {
  actorId: "actor",
  workspaceId: "workspace",
  invocationSource: "mcp" as const,
}
const input = {
  workspaceId: "workspace",
  installationId: "installation",
  toolKey: "core.exam-prep",
  actionKey: "topic.record-practice",
  idempotencyKey: "same-operation",
  input: { topicId: "topic" },
}
const result: ToolActionResult = {
  runId: "run",
  status: "succeeded",
  rootBlockId: "topic",
  createdBlockIds: [],
  evidenceIds: [],
}
const stored = () => ({
  id: "run",
  workspaceId: "workspace",
  actorId: "actor",
  actionKey: input.actionKey,
  handlerVersion: "handler-v1",
  toolReleaseId: "release",
  invocationSource: "mcp",
  status: "SUCCEEDED",
  payload: { input: input.input as unknown, output: result as unknown },
})

function harness(runs: (ReturnType<typeof stored> | null)[]) {
  const events: string[] = []
  let runIndex = 0
  const db = {
    toolRun: {
      findFirst: async (query: unknown) => {
        events.push("lookup")
        expect(query).toEqual({
          where: {
            installationId: "installation",
            idempotencyKey: "same-operation",
          },
          include: { payload: { select: { input: true, output: true } } },
        })
        return runs[Math.min(runIndex++, runs.length - 1)]
      },
    },
  } as unknown as Pick<PrismaClient, "toolRun">
  const callbacks = {
    releaseId: "release",
    authorize: async () => {
      events.push("authorize")
    },
    authorizeResult: async (value: ToolActionResult) => {
      events.push("authorize-result")
      expect(value).toEqual(result)
    },
    execute: async () => {
      events.push("execute")
      return result
    },
  }
  return {
    events,
    callbacks,
    call: (
      overrides: Partial<typeof input> = {},
      source: "mcp" | "agent_api" | "web" = "mcp"
    ) =>
      executeLegacyAgentWithReplay(
        db,
        { ...input, ...overrides },
        { ...principal, invocationSource: source },
        "handler-v1",
        callbacks
      ),
  }
}

describe("non-web legacy Exam Prep retry normalization", () => {
  test("a committed increment retry returns the saved run without incrementing again", async () => {
    const h = harness([stored()])
    expect(await h.call()).toEqual(result)
    expect(h.events).toEqual(["lookup", "authorize", "authorize-result"])
  })

  test("the first call checks current access and executes once", async () => {
    const h = harness([null])
    expect(await h.call()).toEqual(result)
    expect(h.events).toEqual(["lookup", "authorize", "execute"])
  })

  test("a concurrent winner is recovered after a wrapped uniqueness error", async () => {
    const h = harness([null, stored()])
    h.callbacks.execute = async () => {
      h.events.push("execute")
      throw new ToolActionExecutionError("transaction conflict", "RUN_FAILED")
    }
    expect(await h.call()).toEqual(result)
    expect(h.events).toEqual([
      "lookup",
      "authorize",
      "execute",
      "lookup",
      "authorize",
      "authorize-result",
    ])
  })

  test("unrelated failures never trigger a second mutation", async () => {
    const h = harness([null, null])
    const failure = new Error("domain validation failed")
    h.callbacks.execute = async () => {
      h.events.push("execute")
      throw failure
    }
    await expect(h.call()).rejects.toBe(failure)
    expect(h.events.filter((event) => event === "execute")).toHaveLength(1)
  })

  test("actor, workspace, action, handler, release and source cannot reuse another run", async () => {
    for (const field of [
      "actorId",
      "workspaceId",
      "actionKey",
      "handlerVersion",
      "toolReleaseId",
      "invocationSource",
    ] as const) {
      const h = harness([{ ...stored(), [field]: "different" }])
      await expect(h.call()).rejects.toMatchObject({ code: "INVALID_INPUT" })
      expect(h.events).toEqual(["lookup"])
    }
  })

  test("canonical input comparison accepts property order but refuses changed arguments", async () => {
    const row = stored()
    row.payload.input = { count: 2, topicId: "topic" }
    const h = harness([row])
    expect(
      await h.call({ input: { topicId: "topic", count: 2 } } as Partial<
        typeof input
      >)
    ).toEqual(result)
    await expect(
      h.call({ input: { topicId: "topic", count: 3 } } as Partial<typeof input>)
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
  })

  test("a hidden target or created block denies replay before exposing the saved result", async () => {
    for (const method of ["authorize", "authorizeResult"] as const) {
      const h = harness([stored()])
      h.callbacks[method] = async () => {
        throw new ToolActionExecutionError("unavailable", "FORBIDDEN")
      }
      await expect(h.call()).rejects.toMatchObject({ code: "FORBIDDEN" })
      expect(h.events).not.toContain("execute")
    }
  })

  test("deleted or detached exact-key retries return only an actor-bound receipt", async () => {
    for (const actionKey of [
      "exam.delete",
      "chapter.delete",
      "topic.delete",
      "exam.detach-subject",
    ]) {
      const row = stored()
      row.actionKey = actionKey
      row.payload.output = {
        ...result,
        data: { deletedBlockIds: ["former-private-child"], title: "secret" },
      }
      const h = harness([row])
      expect(await h.call({ actionKey })).toEqual({
        runId: "run",
        status: "succeeded",
        createdBlockIds: [],
        evidenceIds: [],
        data: { completed: true, replayed: true },
      })
      expect(h.events).toEqual(["lookup"])
    }
  })

  test("incomplete runs and missing/malformed output fail without execution", async () => {
    for (const status of ["RUNNING", "QUEUED", "FAILED", "CANCELLED"]) {
      const h = harness([{ ...stored(), status }])
      await expect(h.call()).rejects.toMatchObject({ code: "RUN_FAILED" })
      expect(h.events).toEqual(["lookup"])
    }
    const row = stored()
    row.payload.output = { ...result, createdBlockIds: [123] }
    const h = harness([row])
    await expect(h.call()).rejects.toMatchObject({ code: "RUN_FAILED" })
    expect(h.events).not.toContain("execute")
  })

  test("web and modern st1/mt1 reservation actions retain their existing protocol", async () => {
    const h = harness([stored()])
    await h.call({}, "web")
    expect(h.events).toEqual(["authorize", "execute"])
    expect(
      usesLegacyAgentReplay({ ...input, actionKey: "exam.create" }, principal)
    ).toBe(false)
    expect(
      usesLegacyAgentReplay(
        { ...input, actionKey: "scheduled-test.create" },
        principal
      )
    ).toBe(false)
    expect(
      usesLegacyAgentReplay(
        {
          ...input,
          toolKey: "core.mock-tests",
          actionKey: "assessment.create",
        },
        principal
      )
    ).toBe(false)
    expect(
      usesLegacyAgentReplay(
        { ...input, toolKey: "core.goals-paths" },
        principal
      )
    ).toBe(false)
    expect(
      usesLegacyAgentReplay(input, {
        ...principal,
        invocationSource: "agent_api",
      })
    ).toBe(true)
  })
})

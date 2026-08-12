// @ts-expect-error Bun supplies this module at test runtime
import { describe, expect, test, mock } from "bun:test"

mock.module("server-only", () => ({}))

import type { ExecuteToolActionInput } from "@/lib/tools/execute-tool-action"
import type { ToolExecutionPrincipal } from "@/lib/tools/contracts"

// Mock the DB
mock.module("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: {
      findUnique: mock(() => Promise.resolve(null)),
    },
  },
}))

describe("executeToolActionForPrincipal", () => {
  test("rejects execution if input workspaceId does not match principal workspaceId", async () => {
    const { executeToolActionForPrincipal, ToolActionExecutionError } =
      await import("@/lib/tools/execute-tool-action")
    const input: ExecuteToolActionInput = {
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      installationId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      toolKey: "core.goals-paths",
      actionKey: "arc.create",
      idempotencyKey: "test",
      input: {},
    }

    const principal: ToolExecutionPrincipal = {
      actorId: "user-123",
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f6", // different
      invocationSource: "web",
    }

    try {
      await executeToolActionForPrincipal(input, principal)
      expect(true).toBe(false) // Should not reach here
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ToolActionExecutionError)
      if (error instanceof ToolActionExecutionError) {
        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe(
          "The principal workspace does not match the action workspace."
        )
      }
    }
  })

  test("rejects execution if the user is not a member of the workspace", async () => {
    const { executeToolActionForPrincipal, ToolActionExecutionError } =
      await import("@/lib/tools/execute-tool-action")

    const input: ExecuteToolActionInput = {
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      installationId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      toolKey: "core.goals-paths",
      actionKey: "arc.create",
      idempotencyKey: "test",
      input: {},
    }

    const principal: ToolExecutionPrincipal = {
      actorId: "user-123",
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      invocationSource: "web",
    }

    try {
      await executeToolActionForPrincipal(input, principal)
      expect(true).toBe(false)
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ToolActionExecutionError)
      if (error instanceof ToolActionExecutionError) {
        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe("Workspace access is required.")
      }
    }
  })

  test("rejects execution if the user is a VIEWER and action requires blocks.write", async () => {
    // Override the mock to return VIEWER role
    const { prisma } = await import("@/lib/prisma")
    prisma.workspaceMember.findUnique = mock(() =>
      Promise.resolve({ role: "VIEWER" })
    )

    const { executeToolActionForPrincipal, ToolActionExecutionError } =
      await import("@/lib/tools/execute-tool-action")

    // We mock the getFirstPartyToolManifest to return a manifest that requires blocks.write
    await import("@/lib/tools/registry")
    mock.module("@/lib/tools/registry", () => ({
      getFirstPartyToolManifest: mock(() => ({
        release: { version: "1.0.0" },
        actions: [
          {
            key: "arc.create",
            requiredPermissions: ["blocks.write:some-block"],
            inputSchema: {},
            output: { createsBlockTypeKeys: [], writesBlockTypeKeys: [] },
          },
        ],
      })),
    }))

    const input: ExecuteToolActionInput = {
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      installationId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      toolKey: "core.goals-paths",
      actionKey: "arc.create",
      idempotencyKey: "test",
      input: {},
    }

    const principal: ToolExecutionPrincipal = {
      actorId: "user-123",
      workspaceId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
      invocationSource: "web",
    }

    try {
      await executeToolActionForPrincipal(input, principal)
      expect(true).toBe(false)
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ToolActionExecutionError)
      if (error instanceof ToolActionExecutionError) {
        expect(error.code).toBe("FORBIDDEN")
        expect(error.message).toBe("Workspace write access is required.")
      }
    }
  })
})

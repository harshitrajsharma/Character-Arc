// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import {
  readActiveToolInstallation,
  ToolInstallationUnavailableError,
} from "@/lib/workspaces/tool-installation-access"

describe("tool access does not imply installation consent", () => {
  function setup(
    status: "ACTIVE" | "DISABLED" | "REMOVED" | null,
    enabled = true
  ) {
    const reads: Prisma.ToolInstallationFindFirstArgs[] = []
    let writes = 0
    const db = {
      toolInstallation: {
        findFirst: async (args: Prisma.ToolInstallationFindFirstArgs) => {
          reads.push(args)
          return status === "ACTIVE" &&
            enabled &&
            args.where?.workspaceId === "workspace"
            ? {
                id: "installation",
                toolDefinition: { key: "core.mock-tests", name: "Assessments" },
              }
            : null
        },
        upsert: async () => {
          writes++
          throw new Error("Read path tried to install")
        },
        create: async () => {
          writes++
          throw new Error("Read path tried to create")
        },
      },
    } as unknown as Pick<PrismaClient, "toolInstallation">
    return { db, reads, writes: () => writes }
  }
  for (const status of ["DISABLED", "REMOVED", null] as const) {
    test(`${status ?? "missing"} stays unavailable without any write`, async () => {
      const state = setup(status)
      await expect(
        readActiveToolInstallation(state.db, "workspace", "core.mock-tests")
      ).rejects.toBeInstanceOf(ToolInstallationUnavailableError)
      expect(state.writes()).toBe(0)
      expect(state.reads[0].where).toMatchObject({
        workspaceId: "workspace",
        status: "ACTIVE",
        toolDefinition: { key: "core.mock-tests", enabled: true },
        toolRelease: { status: "PUBLISHED" },
      })
    })
  }
  test("an active installation is returned read-only and stays tenant scoped", async () => {
    const state = setup("ACTIVE")
    expect(
      (
        await readActiveToolInstallation(
          state.db,
          "workspace",
          "core.mock-tests"
        )
      ).id
    ).toBe("installation")
    await expect(
      readActiveToolInstallation(state.db, "foreign", "core.mock-tests")
    ).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
      recoveryHref: "/tools/mock-tests",
    })
    expect(state.writes()).toBe(0)
  })
  test("a globally disabled definition does not become available through an active row", async () => {
    const state = setup("ACTIVE", false)
    await expect(
      readActiveToolInstallation(state.db, "workspace", "core.mock-tests")
    ).rejects.toMatchObject({ code: "NOT_AVAILABLE" })
    expect(state.writes()).toBe(0)
  })
})

// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { createHash } from "node:crypto"
const workspaceId = "30c56bf7-bd9e-46dc-975e-c37a83ddb7ae"
const tokenId = "ec16a1c2-2039-4513-98b5-0ae0261b2fda"
const userId = "9625ade5-1f2f-41d4-bbe1-2d2c13a330c2"
const legacy = `mcp_sec_${"a".repeat(40)}`
let role: string | null = "OWNER"
let count = 0
let created: { keyHash: string; keyPrefix: string; name: string } | null = null
let revoked: unknown
const tx = {
  workspaceMember: { findFirst: async () => (role ? { role } : null) },
  mcpToken: {
    count: async () => count,
    create: async ({
      data,
    }: {
      data: { keyHash: string; keyPrefix: string; name: string }
    }) => {
      created = data
      return {
        id: tokenId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        createdAt: new Date("2026-11-10T00:00:00Z"),
      }
    },
    findMany: async () => [
      {
        id: tokenId,
        name: "legacy",
        keyPrefix: legacy,
        createdAt: new Date(),
        lastUsedAt: null,
      },
    ],
    updateMany: async (input: unknown) => {
      revoked = input
      return { count: 1 }
    },
  },
}
mock.module("server-only", () => ({}))
mock.module("@/lib/auth/session", () => ({
  requireVerifiedClaims: async () => ({ sub: userId }),
}))
mock.module("@/lib/prisma", () => ({
  prisma: {
    ...tx,
    $transaction: async (operation: (db: typeof tx) => Promise<unknown>) =>
      operation(tx),
  },
}))
const { createMcpToken, listMcpTokens, revokeMcpToken } =
  await import("./token-actions")
beforeEach(() => {
  role = "OWNER"
  count = 0
  created = null
  revoked = undefined
})

describe("MCP credential management", () => {
  test("new keys store only a hash and nonrecoverable display prefix", async () => {
    const result = await createMcpToken({ workspaceId, name: " Agent " })
    expect(result.rawSecret).toMatch(/^mcp_sec_[a-f0-9]{64}$/)
    expect(created).not.toBeNull()
    const stored = created as unknown as {
      keyHash: string
      keyPrefix: string
      name: string
    }
    expect(stored.keyHash).toBe(
      createHash("sha256").update(result.rawSecret).digest("hex")
    )
    expect(stored.keyPrefix).not.toBe(result.rawSecret)
    expect(stored.name).toBe("Agent")
    expect(JSON.stringify(stored)).not.toContain(result.rawSecret)
    expect(result).not.toHaveProperty("keyHash")
  })
  test("editors/viewers cannot create or revoke integration access", async () => {
    for (const value of ["EDITOR", "VIEWER", null]) {
      role = value
      await expect(
        createMcpToken({ workspaceId, name: "agent" })
      ).rejects.toThrow("owner")
      await expect(revokeMcpToken({ workspaceId, tokenId })).rejects.toThrow(
        "owner"
      )
    }
    expect(created).toBeNull()
    expect(revoked).toBeUndefined()
  })
  test("metadata listing masks recoverable legacy prefixes, including for viewers", async () => {
    role = "VIEWER"
    const result = await listMcpTokens(workspaceId)
    expect(JSON.stringify(result)).not.toContain(legacy)
    expect(result[0]).not.toHaveProperty("rawSecret")
    expect(result[0]).not.toHaveProperty("token")
    expect(result[0].keyPrefix.length).toBeLessThan(20)
  })
  test("creation bounds names/key count and revoke remains workspace-scoped", async () => {
    await expect(
      createMcpToken({ workspaceId, name: "x".repeat(81) })
    ).rejects.toThrow("name")
    count = 50
    await expect(
      createMcpToken({ workspaceId, name: "agent" })
    ).rejects.toThrow("50 active")
    expect(created).toBeNull()
    await revokeMcpToken({ workspaceId, tokenId })
    expect(revoked).toMatchObject({
      where: { id: tokenId, workspaceId, revokedAt: null },
    })
  })
})

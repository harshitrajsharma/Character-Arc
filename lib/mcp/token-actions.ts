"use server"

import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { maskMcpTokenPrefix } from "./token-metadata"

const createInput = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(80),
})
const revokeInput = z.object({ workspaceId: z.uuid(), tokenId: z.uuid() })

async function requireOwner(
  workspaceId: string,
  userId: string,
  tx: Prisma.TransactionClient
) {
  const member = await tx.workspaceMember.findFirst({
    where: { workspaceId, userId, workspace: { archivedAt: null } },
    select: { role: true },
  })
  if (member?.role !== "OWNER")
    throw new Error("Only the workspace owner can manage agent keys.")
}

/** The secret is returned only by this explicit owner action; only its hash and display prefix are stored. */
export async function createMcpToken(input: {
  workspaceId: string
  name: string
}) {
  const parsed = createInput.safeParse(input)
  if (!parsed.success)
    throw new Error(
      "Choose a key name between 1 and 80 characters and a valid workspace."
    )
  const claims = await requireVerifiedClaims()
  const userId = claims.sub
  const rawSecret = `mcp_sec_${randomBytes(32).toString("hex")}`
  const created = await prisma.$transaction(
    async (tx) => {
      await requireOwner(parsed.data.workspaceId, userId, tx)
      const active = await tx.mcpToken.count({
        where: { workspaceId: parsed.data.workspaceId, revokedAt: null },
      })
      if (active >= 50)
        throw new Error(
          "Revoke an unused key before creating another. A workspace supports up to 50 active keys."
        )
      return tx.mcpToken.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          createdById: userId,
          name: parsed.data.name,
          keyHash: createHash("sha256").update(rawSecret).digest("hex"),
          keyPrefix: maskMcpTokenPrefix(rawSecret),
        },
        select: { id: true, name: true, keyPrefix: true, createdAt: true },
      })
    },
    { isolationLevel: "Serializable" }
  )
  return { ...created, rawSecret, createdAt: created.createdAt.toISOString() }
}

export async function listMcpTokens(workspaceId: string) {
  if (!z.uuid().safeParse(workspaceId).success)
    throw new Error("A valid workspace is required.")
  const claims = await requireVerifiedClaims()
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: claims.sub, workspace: { archivedAt: null } },
    select: { role: true },
  })
  if (!member) throw new Error("Workspace access is required.")
  const tokens = await prisma.mcpToken.findMany({
    where: { workspaceId, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return tokens.map((token) => ({
    ...token,
    keyPrefix: maskMcpTokenPrefix(token.keyPrefix),
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  }))
}

export async function revokeMcpToken(input: {
  workspaceId: string
  tokenId: string
}) {
  const parsed = revokeInput.safeParse(input)
  if (!parsed.success)
    throw new Error("A valid workspace and key are required.")
  const claims = await requireVerifiedClaims()
  const result = await prisma.$transaction(async (tx) => {
    await requireOwner(parsed.data.workspaceId, claims.sub, tx)
    return tx.mcpToken.updateMany({
      where: {
        id: parsed.data.tokenId,
        workspaceId: parsed.data.workspaceId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  })
  if (!result.count)
    throw new Error("The active key is no longer available in this workspace.")
  return { success: true }
}

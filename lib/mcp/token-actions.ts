"use server"

import { createHash, randomBytes } from "node:crypto"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function isMissingTableError(err: unknown): boolean {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2021"
  ) {
    return true
  }
  return err instanceof Error && err.message.includes("does not exist")
}

export async function createMcpToken(input: {
  workspaceId: string
  name: string
}) {
  const claims = await requireVerifiedClaims()
  const userId = claims.sub

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId,
      },
    },
  })

  if (!member || member.role === "VIEWER") {
    throw new Error("Only workspace owners or editors can generate API tokens.")
  }

  const rawSecret = `mcp_sec_${randomBytes(20).toString("hex")}`
  const keyHash = hashMcpToken(rawSecret)
  const keyPrefix = `${rawSecret.slice(0, 14)}...`
  const name = input.name.trim() || "Agent Key"

  try {
    const created = await prisma.mcpToken.create({
      data: {
        workspaceId: input.workspaceId,
        createdById: userId,
        name,
        keyHash,
        keyPrefix,
      },
    })

    return {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      rawSecret,
      createdAt: created.createdAt.toISOString(),
    }
  } catch (err) {
    if (isMissingTableError(err)) {
      throw new Error("Database table 'mcp_tokens' does not exist yet. Please run 'npx prisma db push' against your database.")
    }
    throw err
  }
}

export async function listMcpTokens(workspaceId: string) {
  const claims = await requireVerifiedClaims()
  const userId = claims.sub

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!member) {
    throw new Error("Workspace access required.")
  }

  try {
    const tokens = await prisma.mcpToken.findMany({
      where: {
        workspaceId,
        revokedAt: null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return tokens.map((token) => ({
      ...token,
      createdAt: token.createdAt.toISOString(),
      lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
    }))
  } catch {
    // If the table doesn't exist in Postgres yet, return empty list gracefully
    return []
  }
}

export async function revokeMcpToken(input: {
  workspaceId: string
  tokenId: string
}) {
  const claims = await requireVerifiedClaims()
  const userId = claims.sub

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId,
      },
    },
  })

  if (!member || member.role === "VIEWER") {
    throw new Error("Only workspace owners or editors can revoke API tokens.")
  }

  try {
    await prisma.mcpToken.update({
      where: {
        id: input.tokenId,
        workspaceId: input.workspaceId,
      },
      data: {
        revokedAt: new Date(),
      },
    })
    return { success: true }
  } catch (err) {
    if (isMissingTableError(err)) {
      throw new Error("Database table 'mcp_tokens' does not exist yet. Please run 'npx prisma db push' against your database.")
    }
    throw err
  }
}

"use server"

import { headers } from "next/headers"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"
import { listMcpTokens } from "@/lib/mcp/token-actions"
import { getToolCatalog } from "@/lib/tools/catalog"

export async function getSettingsModalData(workspaceSlug?: string) {
  const claims = await requireVerifiedClaims()
  const userId = claims.sub!

  let workspace = null
  if (workspaceSlug) {
    workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        archivedAt: null,
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        kind: true,
        createdAt: true,
      },
    })
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: {
        archivedAt: null,
        members: {
          some: { userId },
        },
      },
      orderBy: [
        { kind: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        kind: true,
        createdAt: true,
      },
    })
  }

  if (!workspace) {
    throw new Error("No active workspace found")
  }

  const [rawMembers, tokens, manifests, catalog] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    listMcpTokens(workspace.id).catch(() => []),
    Promise.resolve(listFirstPartyToolManifests()),
    getToolCatalog().catch(() => ({ items: [] })),
  ])

  const members = (rawMembers || []).map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    displayName: m.user?.displayName ?? null,
    avatarUrl: m.user?.avatarUrl ?? null,
  }))

  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  const origin = `${proto}://${host}`

  const metadata = (
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? claims.user_metadata
      : {}
  ) as { full_name?: unknown; avatar_url?: unknown }
  const email = typeof claims.email === "string" ? claims.email : "Account"
  const name =
    typeof metadata.full_name === "string" ? metadata.full_name : email
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined
  const initials = name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return {
    workspace: {
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
    },
    members,
    initialTokens: tokens || [],
    manifests: manifests || [],
    catalogItems: catalog.items || [],
    origin,
    user: { name, email, avatarUrl, initials },
  }
}


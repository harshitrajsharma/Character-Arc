import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { listFirstPartyToolManifests } from "@/lib/tools/registry"
import { listMcpTokens } from "@/lib/mcp/token-actions"
import { getToolCatalog } from "@/lib/tools/catalog"
import { UnifiedWorkspaceSettings } from "@/components/workspace/unified-workspace-settings"

export default async function WorkspaceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { workspaceSlug } = await params
  const { tab } = await searchParams
  const claims = await requireVerifiedClaims()

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      archivedAt: null,
      members: {
        some: {
          userId: claims.sub,
        },
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

  if (!workspace) {
    notFound()
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
    listMcpTokens(workspace.id),
    Promise.resolve(listFirstPartyToolManifests()),
    getToolCatalog(),
  ])

  const members = rawMembers.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
    displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl,
  }))

  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  const origin = `${proto}://${host}`

  return (
    <UnifiedWorkspaceSettings
      workspace={{
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
      }}
      members={members}
      initialTokens={tokens}
      manifests={manifests}
      catalogItems={catalog.items}
      origin={origin}
      defaultTab={tab ?? "general"}
    />
  )
}

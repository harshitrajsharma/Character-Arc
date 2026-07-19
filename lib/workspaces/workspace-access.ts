import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export const getWorkspaceIdentity = cache(async (slug: string) => {
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(slug)}`)
  const userId = claims.sub!

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      archivedAt: null,
      members: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })

  if (!workspace) {
    notFound()
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    kind: workspace.kind,
    role: workspace.members[0].role,
  }
})

export const requireActiveToolInstallation = cache(
  async (workspaceSlug: string, toolKey: string) => {
    const workspace = await getWorkspaceIdentity(workspaceSlug)
    const installation = await prisma.toolInstallation.findFirst({
      where: {
        workspaceId: workspace.id,
        status: "ACTIVE",
        toolDefinition: {
          key: toolKey,
        },
      },
      select: { 
        id: true,
        toolDefinition: {
          select: {
            key: true,
            name: true,
          }
        }
      },
    })

    if (!installation) {
      notFound()
    }
    
    return installation
  }
)

export const getAuthorizedActiveToolInstallations = cache(async (workspaceSlug: string) => {
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installations = await prisma.toolInstallation.findMany({
    where: {
      workspaceId: workspace.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      toolDefinition: {
        select: {
          key: true,
          name: true,
          description: true,
          icon: true,
        },
      },
    },
  })

  return installations
})

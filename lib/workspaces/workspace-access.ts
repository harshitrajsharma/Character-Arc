import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export const getWorkspaceIdentity = cache(async (slug: string) => {
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(slug)}`
  )
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
        select: {
          role: true,
          user: { select: { timezone: true } },
        },
      },
    },
  })

  if (!workspace) {
    notFound()
  }

  return {
    id: workspace.id,
    userId,
    name: workspace.name,
    slug: workspace.slug,
    kind: workspace.kind,
    role: workspace.members[0].role,
    timezone: workspace.members[0].user.timezone,
  }
})

export const requireActiveToolInstallation = cache(
  async (workspaceSlug: string, toolKey: string) => {
    const workspace = await getWorkspaceIdentity(workspaceSlug)
    let installation = await prisma.toolInstallation.findFirst({
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
          },
        },
      },
    })

    // If tool is not installed yet and caller is the owner, auto-install first-party tool
    if (!installation && workspace.role === "OWNER") {
      const toolDef = await prisma.toolDefinition.findUnique({
        where: { key: toolKey },
        include: {
          releases: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (toolDef && toolDef.releases.length > 0) {
        const newInst = await prisma.toolInstallation.upsert({
          where: {
            workspaceId_toolDefinitionId: {
              workspaceId: workspace.id,
              toolDefinitionId: toolDef.id,
            },
          },
          create: {
            workspaceId: workspace.id,
            installedById: workspace.userId,
            toolDefinitionId: toolDef.id,
            toolReleaseId: toolDef.releases[0].id,
            status: "ACTIVE",
          },
          update: {
            status: "ACTIVE",
            disabledAt: null,
          },
          select: {
            id: true,
            toolDefinition: {
              select: {
                key: true,
                name: true,
              },
            },
          },
        })
        installation = newInst
      }
    }

    if (!installation) {
      redirect(`/tools/${encodeURIComponent(toolKey)}`)
    }

    return installation
  }
)

export const getAppShellData = cache(async () => {
  const claims = await requireVerifiedClaims()
  const userId = claims.sub!

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
      workspace: {
        archivedAt: null,
      },
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          kind: true,
          toolInstallations: {
            where: {
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
          },
        },
      },
    },
    orderBy: [
      { workspace: { kind: "asc" } },
      { workspace: { createdAt: "asc" } },
    ],
  })

  return memberships.map((m) => ({
    role: m.role,
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    kind: m.workspace.kind,
    installations: m.workspace.toolInstallations,
  }))
})

export const getAuthorizedActiveToolInstallations = cache(
  async (workspaceSlug: string) => {
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
  }
)

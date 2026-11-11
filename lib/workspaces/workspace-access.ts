import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import {
  readActiveToolInstallation,
  ToolInstallationUnavailableError,
} from "./tool-installation-access"

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

/** Shared action boundary: unavailable tools fail with a normal typed error. */
export const getActiveToolInstallation = cache(
  async (workspaceSlug: string, toolKey: string) => {
    const workspace = await getWorkspaceIdentity(workspaceSlug)
    return readActiveToolInstallation(prisma, workspace.id, toolKey)
  }
)

/** Page boundary: offer catalog recovery after the same fail-closed authorized read. */
export const requireActiveToolInstallation = cache(
  async (workspaceSlug: string, toolKey: string) => {
    try {
      return await getActiveToolInstallation(workspaceSlug, toolKey)
    } catch (error) {
      if (error instanceof ToolInstallationUnavailableError)
        redirect(error.recoveryHref)
      throw error
    }
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
          blocks: {
            where: {
              status: "ACTIVE",
              archivedAt: null,
              blockType: { key: "exam-prep.exam" },
              originToolInstallation: {
                status: "ACTIVE",
                toolDefinition: { key: "core.exam-prep" },
              },
              userStates: { none: { userId, status: "ARCHIVED" } },
            },
            select: { id: true, title: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: 6,
          },
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
    exams: m.workspace.blocks,
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

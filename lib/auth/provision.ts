import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { User } from "@supabase/supabase-js"
import { cache } from "react"

export const ensureUserProvisioned = cache(async (user: User) => {
  const displayName = user.user_metadata?.full_name || null
  const avatarUrl = user.user_metadata?.avatar_url || null
  const resolvedName = displayName || "My Workspace"

  let profile = await prisma.profile.findUnique({ where: { id: user.id } })

  if (!profile) {
    try {
      profile = await prisma.profile.create({
        data: {
          id: user.id,
          displayName,
          avatarUrl,
        },
      })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        profile = await prisma.profile.findUnique({ where: { id: user.id } })
      } else {
        throw err
      }
    }
  }

  if (profile) {
    const dataToUpdate: Prisma.ProfileUpdateInput = {}
    if (displayName && !profile.displayName) {
      dataToUpdate.displayName = displayName
    }
    if (avatarUrl && !profile.avatarUrl) {
      dataToUpdate.avatarUrl = avatarUrl
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.profile.update({
        where: { id: user.id },
        data: dataToUpdate,
      })
    }
  }

  let workspace = await prisma.workspace.findFirst({
    where: { createdById: user.id, kind: "PERSONAL" },
  })

  if (!workspace) {
    try {
      workspace = await prisma.workspace.create({
        data: {
          createdById: user.id,
          kind: "PERSONAL",
          name: resolvedName,
          slug: `personal-${user.id}`,
        },
      })
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        workspace = await prisma.workspace.findFirst({
          where: { createdById: user.id, kind: "PERSONAL" },
        })
      } else {
        throw err
      }
    }
  }

  if (workspace) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
      update: {},
    })

    // Ensure default core tools are active for new personal workspaces
    try {
      const coreToolKeys = ["core.exam-prep", "core.goals-paths", "core.mock-tests"]
      const toolDefs = await prisma.toolDefinition.findMany({
        where: { key: { in: coreToolKeys }, enabled: true },
        include: {
          releases: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      for (const def of toolDefs) {
        if (def.releases.length > 0) {
          await prisma.toolInstallation.upsert({
            where: {
              workspaceId_toolDefinitionId: {
                workspaceId: workspace.id,
                toolDefinitionId: def.id,
              },
            },
            create: {
              workspaceId: workspace.id,
              installedById: user.id,
              toolDefinitionId: def.id,
              toolReleaseId: def.releases[0].id,
              status: "ACTIVE",
            },
            update: {
              status: "ACTIVE",
              disabledAt: null,
            },
          })
        }
      }
    } catch (err) {
      // Non-blocking fallback
      console.error("Auto-installing core tools error:", err)
    }
  }
})

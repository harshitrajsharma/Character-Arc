import { prisma } from "@/lib/prisma"
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
    } catch (err: any) {
      if (err.code === "P2002") {
        profile = await prisma.profile.findUnique({ where: { id: user.id } })
      } else {
        throw err
      }
    }
  }

  if (profile) {
    const dataToUpdate: any = {}
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
    } catch (err: any) {
      if (err.code === "P2002") {
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
  }
})

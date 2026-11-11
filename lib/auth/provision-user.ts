import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import type { User } from "@supabase/supabase-js"
import { provisionDefaultCoreTools } from "./provision-default-tools"

/** Verified-user lifecycle; database access is injectable for isolated boundary tests. */
export async function provisionUserIdentity(db: PrismaClient, user: User) {
  const displayName = user.user_metadata?.full_name || null
  const avatarUrl = user.user_metadata?.avatar_url || null
  const resolvedName = displayName || "My Workspace"

  let profile = await db.profile.findUnique({ where: { id: user.id } })

  if (!profile) {
    try {
      profile = await db.profile.create({
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
        profile = await db.profile.findUnique({ where: { id: user.id } })
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
      await db.profile.update({
        where: { id: user.id },
        data: dataToUpdate,
      })
    }
  }

  let workspace = await db.workspace.findFirst({
    where: { createdById: user.id, kind: "PERSONAL" },
  })

  if (!workspace) {
    try {
      workspace = await db.$transaction(
        async (tx) => {
          const created = await tx.workspace.create({
            data: {
              createdById: user.id,
              kind: "PERSONAL",
              name: resolvedName,
              slug: `personal-${user.id}`,
            },
          })
          await tx.workspaceMember.create({
            data: {
              workspaceId: created.id,
              userId: user.id,
              role: "OWNER",
            },
          })
          await provisionDefaultCoreTools(tx, created.id, user.id)
          return created
        },
        { timeout: 30000, maxWait: 10000 }
      )
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        workspace = await db.workspace.findFirst({
          where: { createdById: user.id, kind: "PERSONAL" },
        })
        if (!workspace) throw err
      } else {
        throw err
      }
    }
  }

  if (workspace) {
    await db.workspaceMember.upsert({
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

    // Existing workspaces are never installed, reactivated or regranted on sign-in.
    // Enabling a tool is an explicit installTool operation from the catalog.
  }
}

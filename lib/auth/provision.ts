import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { provisionUserIdentity } from "./provision-user"

// Process-level in-memory cache of provisioned user IDs to prevent redundant Prisma queries on every navigation
const provisionedUserIds = new Set<string>()

export function markUserProvisioned(userId: string) {
  provisionedUserIds.add(userId)
}

export function isUserProvisioned(userId: string) {
  return provisionedUserIds.has(userId)
}

export function clearProvisionedUserCache() {
  provisionedUserIds.clear()
}

export const ensureUserProvisioned = cache(async (user: User) => {
  if (provisionedUserIds.has(user.id)) {
    return
  }
  await provisionUserIdentity(prisma, user)
  provisionedUserIds.add(user.id)
})

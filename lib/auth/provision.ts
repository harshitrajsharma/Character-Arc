import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import { provisionUserIdentity } from "./provision-user"

export const ensureUserProvisioned = cache(async (user: User) => {
  await provisionUserIdentity(prisma, user)
})

import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ensureUserProvisioned } from "@/lib/auth/provision"

export const getVerifiedClaims = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) {
    return null
  }

  return data.claims
})

export async function requireVerifiedClaims(next = "/dashboard") {
  const claims = await getVerifiedClaims()

  if (!claims) {
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await ensureUserProvisioned(user)
  }

  return claims
}

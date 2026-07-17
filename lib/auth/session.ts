import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"

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

  return claims
}

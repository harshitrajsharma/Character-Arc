import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ensureUserProvisioned } from "@/lib/auth/provision"
import {
  AuthVerificationUnavailableError,
  isAuthServiceUnavailable,
  reportAuthVerificationFailure,
} from "./verification-errors"

const getVerifiedSession = cache(async () => {
  const supabase = await createServerSupabaseClient()
  let claimResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>
  try {
    claimResult = await supabase.auth.getClaims()
  } catch (error) {
    reportAuthVerificationFailure("claims", error)
    if (isAuthServiceUnavailable(error))
      throw new AuthVerificationUnavailableError()
    throw error
  }
  const { data, error } = claimResult

  if (error || !data?.claims?.sub) {
    reportAuthVerificationFailure("claims", error)
    if (isAuthServiceUnavailable(error))
      throw new AuthVerificationUnavailableError()
    return null
  }

  let userResult: Awaited<ReturnType<typeof supabase.auth.getUser>>
  try {
    userResult = await supabase.auth.getUser()
  } catch (error) {
    reportAuthVerificationFailure("user", error)
    if (isAuthServiceUnavailable(error))
      throw new AuthVerificationUnavailableError()
    throw error
  }
  const { data: userData, error: userError } = userResult
  if (userError || !userData.user || userData.user.id !== data.claims.sub) {
    reportAuthVerificationFailure("user", userError)
    if (isAuthServiceUnavailable(userError))
      throw new AuthVerificationUnavailableError()
    return null
  }
  return { claims: data.claims, user: userData.user }
})

export const getVerifiedClaims = cache(async () => {
  const session = await getVerifiedSession()
  return session?.claims ?? null
})

export async function requireVerifiedClaims(next = "/workspace") {
  const session = await getVerifiedSession()

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  await ensureUserProvisioned(session.user)

  return session.claims
}

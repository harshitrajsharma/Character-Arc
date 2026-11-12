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

export type SessionClaims = {
  sub: string
  email?: string
  phone?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  role?: string
  aud?: string
  [key: string]: unknown
}

const getVerifiedSession = cache(async () => {
  const supabase = await createServerSupabaseClient()

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
  if (userError || !userData?.user) {
    reportAuthVerificationFailure("user", userError)
    if (isAuthServiceUnavailable(userError))
      throw new AuthVerificationUnavailableError()
    return null
  }

  const user = userData.user
  const claims: SessionClaims = {
    sub: user.id,
    ...(user.email !== undefined ? { email: user.email } : {}),
    ...(user.phone !== undefined ? { phone: user.phone } : {}),
    ...(user.role !== undefined ? { role: user.role } : {}),
    ...(user.aud !== undefined ? { aud: user.aud } : {}),
    ...(user.app_metadata && Object.keys(user.app_metadata).length > 0
      ? { app_metadata: user.app_metadata }
      : {}),
    ...(user.user_metadata && Object.keys(user.user_metadata).length > 0
      ? { user_metadata: user.user_metadata }
      : {}),
  }

  return { claims, user }
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

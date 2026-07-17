import "server-only"

import { cookies } from "next/headers"

const PENDING_SIGNUP_COOKIE = "character-arc-pending-signup-email"
const PENDING_SIGNUP_MAX_AGE = 15 * 60

export async function getPendingSignupEmail() {
  return (await cookies()).get(PENDING_SIGNUP_COOKIE)?.value ?? null
}

export async function setPendingSignupEmail(email: string) {
  const cookieStore = await cookies()

  cookieStore.set(PENDING_SIGNUP_COOKIE, email, {
    httpOnly: true,
    maxAge: PENDING_SIGNUP_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function clearPendingSignupEmail() {
  const cookieStore = await cookies()
  cookieStore.delete(PENDING_SIGNUP_COOKIE)
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@")

  if (!localPart || !domain) {
    return email
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length))
  return `${visible}${"*".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`
}

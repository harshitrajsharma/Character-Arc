import { redirect } from "next/navigation"

import { getVerifiedClaims } from "@/lib/auth/session"

export default async function HomePage() {
  const claims = await getVerifiedClaims()
  redirect(claims ? "/dashboard" : "/login")
}

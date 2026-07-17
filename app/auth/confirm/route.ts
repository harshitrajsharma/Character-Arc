import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/auth/urls"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const fallback = type === "recovery" ? "/update-password" : "/dashboard"
  const next = safeNextPath(request.nextUrl.searchParams.get("next") ?? fallback)

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  const errorUrl = new URL("/login", request.url)
  errorUrl.searchParams.set("error", "The confirmation link is invalid or has expired.")
  return NextResponse.redirect(errorUrl)
}

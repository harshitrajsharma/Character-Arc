import { NextResponse, type NextRequest } from "next/server"

import { safeNextPath } from "@/lib/auth/urls"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = safeNextPath(request.nextUrl.searchParams.get("next"))

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  const errorUrl = new URL("/login", request.url)
  errorUrl.searchParams.set(
    "error",
    "The sign-in link is invalid or has expired."
  )
  return NextResponse.redirect(errorUrl)
}

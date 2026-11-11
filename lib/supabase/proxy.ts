import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  isAuthServiceUnavailable,
  reportAuthVerificationFailure,
} from "@/lib/auth/verification-errors"

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  let refreshedCookies = false

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          refreshedCookies = true
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh expired auth cookies before a Server Component reads them.
  const { data, error } = await supabase.auth
    .getClaims()
    .catch((error: unknown) => {
      if (isAuthServiceUnavailable(error)) return { data: null, error }
      throw error
    })
  const isProtectedRoute = [
    "/dashboard",
    "/tools",
    "/workspace",
    "/assessments",
  ].some(
    (prefix) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(`${prefix}/`)
  )

  if (isProtectedRoute || refreshedCookies)
    response.headers.set("Cache-Control", "private, no-store")

  if (isProtectedRoute && (error || !data?.claims?.sub)) {
    reportAuthVerificationFailure("proxy-claims", error)
    if (isAuthServiceUnavailable(error)) {
      const unavailable = NextResponse.json(
        {
          error:
            "Sign-in verification is temporarily unavailable. Please try again.",
        },
        { status: 503, headers: { "Cache-Control": "private, no-store" } }
      )
      for (const cookie of response.cookies.getAll())
        unavailable.cookies.set(cookie)
      return unavailable
    }
    const loginUrl = request.nextUrl.clone()
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`

    loginUrl.pathname = "/login"
    loginUrl.search = ""
    loginUrl.searchParams.set("next", nextPath)

    const redirect = NextResponse.redirect(loginUrl)
    // Keep refreshed/cleared auth cookies even when the response redirects.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    redirect.headers.set("Cache-Control", "private, no-store")
    return redirect
  }

  // Secure user/membership checks also run in the DAL and every Server Action.
  return response
}

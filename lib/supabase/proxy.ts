import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  isAuthServiceUnavailable,
  reportAuthVerificationFailure,
} from "@/lib/auth/verification-errors"

export function hasAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) =>
      (/^sb-.*-auth-token(\.\d+)?$/.test(c.name) || c.name.startsWith("sb-")) &&
      c.value.length > 0
  )
}

export function extractJwtPayloadFromCookies(
  request: NextRequest
): { exp?: number; sub?: string; [key: string]: unknown } | null {
  const allCookies = request.cookies.getAll()
  const authCookies = allCookies.filter(
    (c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name) && c.value.length > 0
  )
  if (authCookies.length === 0) return null

  const single = authCookies.find((c) => /^sb-.*-auth-token$/.test(c.name))
  let rawValue = ""
  if (single) {
    rawValue = single.value
  } else {
    const baseNames = Array.from(
      new Set(authCookies.map((c) => c.name.replace(/\.\d+$/, "")))
    )
    for (const base of baseNames) {
      const chunks: string[] = []
      for (let i = 0; ; i++) {
        const chunk = authCookies.find((c) => c.name === `${base}.${i}`)
        if (!chunk) break
        chunks.push(chunk.value)
      }
      if (chunks.length > 0) {
        rawValue = chunks.join("")
        break
      }
    }
  }

  if (!rawValue) return null

  let sessionJson = rawValue
  if (rawValue.startsWith("base64-")) {
    try {
      sessionJson = Buffer.from(rawValue.slice(7), "base64url").toString("utf8")
    } catch {
      return null
    }
  }

  try {
    const session = JSON.parse(sessionJson)
    const token =
      session?.access_token ||
      (typeof session === "string" ? session : null)
    if (!token || typeof token !== "string") return null
    const parts = token.split(".")
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
  } catch {
    return null
  }
}

export async function refreshSupabaseSession(request: NextRequest) {
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

  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-purpose") === "prefetch"

  // Fast-path 1: On prefetch, if auth cookies are present, bypass remote auth roundtrips
  if (isPrefetch && hasAuthCookies(request)) {
    return NextResponse.next({ request })
  }

  // Fast-path 2: If a valid JWT cookie exists with > 60s lifetime, bypass remote auth refresh
  const jwtPayload = extractJwtPayloadFromCookies(request)
  if (
    jwtPayload?.exp &&
    typeof jwtPayload.exp === "number" &&
    jwtPayload.sub &&
    jwtPayload.exp * 1000 - Date.now() > 60_000
  ) {
    const response = NextResponse.next({ request })
    if (isProtectedRoute) {
      response.headers.set("Cache-Control", "private, no-store")
    }
    return response
  }

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

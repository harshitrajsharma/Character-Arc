import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
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
  const { data } = await supabase.auth.getClaims()
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/tools") ||
    request.nextUrl.pathname.startsWith("/workspace")

  if (isProtectedRoute && !data?.claims?.sub) {
    const loginUrl = request.nextUrl.clone()
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`

    loginUrl.pathname = "/login"
    loginUrl.search = ""
    loginUrl.searchParams.set("next", nextPath)

    return NextResponse.redirect(loginUrl)
  }

  // The JWT may still be valid after a DB reset or user deletion.
  // Verify the user actually exists in the auth database.
  if (isProtectedRoute && data?.claims?.sub) {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user) {
      await supabase.auth.signOut()

      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.search = ""

      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

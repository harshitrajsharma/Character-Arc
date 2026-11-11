import type { NextRequest } from "next/server"
import { refreshSupabaseSession } from "@/lib/supabase/proxy"

export function proxy(request: NextRequest) {
  return refreshSupabaseSession(request)
}

// API/MCP bearer authentication and static assets do not use browser sessions.
export const config = {
  matcher: [
    "/",
    "/login",
    "/signup/:path*",
    "/forgot-password",
    "/update-password",
    "/auth/:path*",
    "/dashboard/:path*",
    "/workspace/:path*",
    "/tools/:path*",
    "/assessments/:path*",
  ],
}

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

export function createBrowserSupabaseClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

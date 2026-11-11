// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest } from "next/server"

type CookieWrite = {
  name: string
  value: string
  options?: { httpOnly?: boolean; secure?: boolean }
}
let cookiesAdapter: { setAll: (items: CookieWrite[]) => void }
type ClaimsResult = { data: { claims: { sub: string } | null }; error: unknown }
const getClaims = mock(async (): Promise<ClaimsResult> => ({
  data: { claims: { sub: "user-1" } },
  error: null,
}))
mock.module("@supabase/ssr", () => ({
  createServerClient: (
    _url: unknown,
    _key: unknown,
    options: { cookies: typeof cookiesAdapter }
  ) => {
    cookiesAdapter = options.cookies
    return { auth: { getClaims } }
  },
}))
const { refreshSupabaseSession } = await import("../../lib/supabase/proxy")

beforeEach(() => {
  getClaims.mockReset()
  getClaims.mockResolvedValue({
    data: { claims: { sub: "user-1" } },
    error: null,
  })
})

describe("Next browser session proxy", () => {
  test("an authentication outage returns no-store 503 without a login redirect", async () => {
    getClaims.mockResolvedValue({
      data: { claims: null },
      error: { name: "AuthRetryableFetchError", status: 503 },
    })
    const result = await refreshSupabaseSession(
      new NextRequest("https://example.com/workspace")
    )
    expect(result.status).toBe(503)
    expect(result.headers.get("location")).toBeNull()
    expect(result.headers.get("cache-control")).toBe("private, no-store")
  })
  test("a rejected transport promise also returns 503 rather than clearing the identity", async () => {
    getClaims.mockRejectedValue(new TypeError("fetch failed"))
    const result = await refreshSupabaseSession(
      new NextRequest("https://example.com/workspace")
    )
    expect(result.status).toBe(503)
    expect(result.headers.get("location")).toBeNull()
  })
  test("protects direct assessment routes and preserves the next destination", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null })
    const result = await refreshSupabaseSession(
      new NextRequest("https://example.com/assessments/attempt-1?resume=1")
    )
    const redirect = new URL(result.headers.get("location")!)
    expect(redirect.pathname).toBe("/login")
    expect(redirect.searchParams.get("next")).toBe(
      "/assessments/attempt-1?resume=1"
    )
    expect(result.headers.get("cache-control")).toContain("no-store")
  })
  test("keeps refreshed cookies on both request and redirect", async () => {
    const request = new NextRequest("https://example.com/workspace")
    getClaims.mockImplementationOnce(async () => {
      cookiesAdapter.setAll([
        {
          name: "sb-test",
          value: "cleared",
          options: { httpOnly: true, secure: true },
        },
      ])
      return { data: { claims: null }, error: null }
    })
    const result = await refreshSupabaseSession(request)
    expect(request.cookies.get("sb-test")?.value).toBe("cleared")
    expect(result.cookies.get("sb-test")?.value).toBe("cleared")
    expect(result.headers.get("set-cookie")).toContain("HttpOnly")
  })
  test("refreshes valid sessions and prevents private response caching", async () => {
    const result = await refreshSupabaseSession(
      new NextRequest("https://example.com/workspace/example")
    )
    expect(result.status).toBe(200)
    expect(result.headers.get("cache-control")).toBe("private, no-store")
  })
  test("allows anonymous public auth pages and fails closed on claims errors", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null })
    expect(
      (
        await refreshSupabaseSession(
          new NextRequest("https://example.com/login")
        )
      ).status
    ).toBe(200)
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: new Error("invalid"),
    })
    expect(
      (
        await refreshSupabaseSession(
          new NextRequest("https://example.com/workspace")
        )
      ).status
    ).toBe(307)
  })
})

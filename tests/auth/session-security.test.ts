// @ts-expect-error Bun supplies this module at test runtime.
import { beforeEach, describe, expect, mock, test } from "bun:test"

type UserResult = { data: { user: { id: string } | null }; error: unknown }
const getUser = mock(async (): Promise<UserResult> => ({
  data: { user: { id: "user-1" } },
  error: null,
}))
const provision = mock(async () => {})
mock.module("server-only", () => ({}))
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}))
mock.module("@/lib/auth/provision", () => ({
  ensureUserProvisioned: provision,
}))
mock.module("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))

const { getVerifiedClaims, requireVerifiedClaims } =
  await import("../../lib/auth/session")

beforeEach(() => {
  getUser.mockReset()
  provision.mockReset()
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
})

describe("verified browser session", () => {
  test("expired session cannot authorize or provision a user", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("expired"),
    })
    expect(await getVerifiedClaims()).toBeNull()
    expect(requireVerifiedClaims()).rejects.toThrow(
      "REDIRECT:/login?next=%2Fworkspace"
    )
    expect(provision).not.toHaveBeenCalled()
  })
  test("a signed JWT for a deleted user cannot authorize or loop the login page", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getVerifiedClaims()).toBeNull()
    await expect(requireVerifiedClaims()).rejects.toThrow("REDIRECT:")
    expect(provision).not.toHaveBeenCalled()
  })
  test("auth lookup errors fail closed", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("invalid"),
    })
    expect(await getVerifiedClaims()).toBeNull()
  })
  test("only a matching verified identity reaches provisioning", async () => {
    expect(await requireVerifiedClaims()).toEqual({ sub: "user-1" })
    expect(provision).toHaveBeenCalledWith({ id: "user-1" })
  })
  test("a transient current-user outage cannot authorize or redirect a valid session to logout", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", status: 503 },
    })
    await expect(requireVerifiedClaims()).rejects.toThrow(
      "temporarily unavailable"
    )
    expect(provision).not.toHaveBeenCalled()
  })
  test("transport errors fail closed with a recoverable service error", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", status: 0 },
    })
    await expect(requireVerifiedClaims()).rejects.toThrow(
      "temporarily unavailable"
    )
    expect(provision).not.toHaveBeenCalled()
  })
  test("a rejected transport promise exposes only the safe retry error", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed: provider detail"))
    await expect(requireVerifiedClaims()).rejects.toThrow(
      "Sign-in verification is temporarily unavailable. Please try again."
    )
    expect(provision).not.toHaveBeenCalled()
  })
})

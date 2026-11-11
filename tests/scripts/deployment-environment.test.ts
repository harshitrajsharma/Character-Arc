// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { validateDeploymentEnvironment } from "../../lib/config/deployment-environment"

const valid = {
  DATABASE_URL: "postgresql://local:synthetic@127.0.0.1:5432/qa",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  NEXT_PUBLIC_SITE_URL: "https://app.example.com",
}
describe("deployment environment preflight", () => {
  test("accepts production origin and keeps upload setup optional", () => {
    const result = validateDeploymentEnvironment(valid, { production: true })
    expect(result.errors).toEqual([])
    expect(result.warnings.join(" ")).toContain("Question-image")
  })
  test("never echoes values and rejects accidental browser secret exposure", () => {
    const secret = "sb_secret_should-never-be-printed"
    const result = validateDeploymentEnvironment({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
      DATABASE_URL: "invalid-private-password",
    })
    expect(result.errors.length).toBe(2)
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(JSON.stringify(result)).not.toContain("invalid-private-password")
  })
  test("rejects service-role JWTs in the public key slot", () => {
    const jwt = [
      "e30",
      Buffer.from(JSON.stringify({ role: "service_role" })).toString(
        "base64url"
      ),
      "signature",
    ].join(".")
    expect(
      validateDeploymentEnvironment({
        ...valid,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt,
      }).errors.join(" ")
    ).toContain("service-role")
  })
  test("production cannot use localhost or insecure origins", () => {
    expect(
      validateDeploymentEnvironment(
        { ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
        { production: true }
      ).errors.length
    ).toBeGreaterThan(0)
    expect(
      validateDeploymentEnvironment(
        { ...valid, NEXT_PUBLIC_SITE_URL: "https://localhost" },
        { production: true }
      ).errors.length
    ).toBeGreaterThan(0)
  })
  test("MCP browser origins cannot contain credentials, wildcards or paths", () => {
    for (const origin of [
      "*",
      "null",
      "https://app.example.com/path",
      "https://user:pass@app.example.com",
      "http://remote.example.com",
    ]) {
      expect(
        validateDeploymentEnvironment({
          ...valid,
          MCP_ALLOWED_ORIGINS: origin,
        }).errors.join(" ")
      ).toContain("MCP_ALLOWED_ORIGINS")
    }
    expect(
      validateDeploymentEnvironment({
        ...valid,
        MCP_ALLOWED_ORIGINS:
          "https://client.example.com,https://other.example.com",
      }).errors
    ).toEqual([])
  })
})

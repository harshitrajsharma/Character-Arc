// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import {
  getBrowserTestConfig,
  requireBrowserMutationOptIn,
} from "../../scripts/lib/browser-test-config"

const environment = {
  E2E_USER_EMAIL: "tester@example.com",
  E2E_USER_PASSWORD: "synthetic-test-password",
  E2E_WORKSPACE_SLUG: "qa-workspace",
}

describe("browser verification configuration", () => {
  test("requires local credentials and workspace without echoing secrets", () => {
    expect(() => getBrowserTestConfig({})).toThrow("E2E_USER_EMAIL")
    expect(() =>
      getBrowserTestConfig({ ...environment, E2E_USER_PASSWORD: "" })
    ).toThrow("E2E_USER_PASSWORD")
    expect(getBrowserTestConfig(environment)).toEqual({
      baseUrl: "http://127.0.0.1:3000",
      email: environment.E2E_USER_EMAIL,
      password: environment.E2E_USER_PASSWORD,
      workspaceSlug: "qa-workspace",
    })
  })

  test("rejects unsafe base origins and workspace paths", () => {
    for (const E2E_BASE_URL of [
      "file:///secret",
      "https://user:secret@example.com",
      "https://example.com/app",
      "https://example.com?key=secret",
      "not-a-url",
    ]) {
      expect(() =>
        getBrowserTestConfig({ ...environment, E2E_BASE_URL })
      ).toThrow("E2E_BASE_URL")
    }
    for (const E2E_WORKSPACE_SLUG of [
      "../../other",
      "workspace?admin=1",
      "x".repeat(201),
    ]) {
      expect(() =>
        getBrowserTestConfig({ ...environment, E2E_WORKSPACE_SLUG })
      ).toThrow("E2E_WORKSPACE_SLUG")
    }
  })

  test("mutation suites require explicit opt-in", () => {
    expect(() => requireBrowserMutationOptIn({})).toThrow(
      "creates test records"
    )
    expect(() =>
      requireBrowserMutationOptIn({ E2E_ALLOW_MUTATIONS: "true" })
    ).toThrow()
    expect(() =>
      requireBrowserMutationOptIn({ E2E_ALLOW_MUTATIONS: "1" })
    ).not.toThrow()
  })
})

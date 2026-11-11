// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { safeNextPath } from "../../lib/auth/urls"

describe("authentication return destinations", () => {
  test("keeps normal workspace paths and query context", () => {
    for (const path of [
      "/workspace",
      "/workspace/demo/assessments?tab=attempts",
      "/tools?q=linear%20algebra",
      "/workspace/demo#recent",
    ]) {
      expect(safeNextPath(path)).toBe(path)
    }
  })
  test("rejects authority, backslash, control and malformed destinations", () => {
    for (const path of [
      undefined,
      null,
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/%5cexample.com",
      "/%2fexample.com",
      "/\n/example.com",
      "/workspace\r\nLocation:evil",
      "/%zz",
    ]) {
      expect(safeNextPath(path)).toBe("/workspace")
    }
  })
})

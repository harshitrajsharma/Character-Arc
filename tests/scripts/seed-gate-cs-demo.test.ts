// @ts-expect-error Bun supplies this module at test runtime
import { describe, expect, test } from "bun:test"

import {
  getGateCsDemoIdempotencyKey,
  parseGateCsDemoSeedArguments,
} from "../../scripts/seed-gate-cs-demo.helpers"

describe("seed-gate-cs-demo helpers", () => {
  test("generates deterministic, executor-safe idempotency keys", () => {
    expect(getGateCsDemoIdempotencyKey("exam.create", "main-exam")).toBe(
      "seed-gate-2027-exam.create-main-exam"
    )
    expect(
      getGateCsDemoIdempotencyKey(
        "subject.create",
        "subj-Engineering Mathematics"
      )
    ).toBe("seed-gate-2027-subject.create-subj-engineering-mathematics")
    expect(
      getGateCsDemoIdempotencyKey("topic.create", "x".repeat(500))
    ).toHaveLength(128)
  })

  test("parses only the required seed arguments", () => {
    expect(
      parseGateCsDemoSeedArguments([
        "--workspace-slug",
        "demo-slug",
        "--actor-id",
        "user-123",
        "--confirm",
      ])
    ).toEqual({
      workspaceSlug: "demo-slug",
      actorId: "user-123",
      confirm: true,
    })
  })
})

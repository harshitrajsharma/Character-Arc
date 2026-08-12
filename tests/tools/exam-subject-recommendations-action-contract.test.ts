// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

import { validateToolActionInput } from "@/lib/tools/action-contract"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"

const examId = "11111111-1111-4111-8111-111111111111"

describe("exam subject recommendation action contract", () => {
  test("publishes a deterministic read action in release 1.11.0", () => {
    const action = examPrepManifest.actions.find(
      (candidate) => candidate.key === "exam.get-subject-recommendations"
    )

    expect(examPrepManifest.release.version).toBe("1.11.0")
    expect(action).toBeDefined()
    expect(action?.execution).toBe("deterministic")
    expect(action?.requiredPermissions).toEqual(["blocks.read.owned"])
    expect(action?.output.rootBlockTypeKey).toBe("exam-prep.exam")
    expect(action?.output.createsBlockTypeKeys).toEqual([])
  })

  test("accepts only a valid exam id", () => {
    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.get-subject-recommendations",
        { examId }
      ).success
    ).toBe(true)
    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.get-subject-recommendations",
        {}
      ).success
    ).toBe(false)
    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.get-subject-recommendations",
        { examId: "not-a-uuid" }
      ).success
    ).toBe(false)
    expect(
      validateToolActionInput(
        examPrepManifest,
        "exam.get-subject-recommendations",
        { examId, unexpected: true }
      ).success
    ).toBe(false)
  })

  test("registers the release-scoped trusted handler", () => {
    const source = readFileSync("lib/tools/execute-tool-action.ts", "utf8")

    expect(source).toContain(
      "core.exam-prep@1.11.0:exam.get-subject-recommendations"
    )
    expect(source).toContain("executeExamPrepGetSubjectRecommendations")
    expect(source).toContain("exam-prep.exam.get-subject-recommendations.v1")
  })
})

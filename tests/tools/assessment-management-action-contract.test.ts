// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import {
  resolveToolAction,
  validateToolActionInput,
} from "@/lib/tools/action-contract"
import { mockTestsManifest } from "@/lib/tools/definitions/mock-tests/manifest"
const assessmentId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
describe("assessment management action contract", () => {
  test("registers both management actions", () => {
    expect(
      resolveToolAction(mockTestsManifest, "assessment.rename").success
    ).toBe(true)
    expect(
      resolveToolAction(mockTestsManifest, "assessment.delete").success
    ).toBe(true)
  })
  test("rename requires revision and bounded name", () => {
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.rename", {
        assessmentId,
        expectedRevision: 1,
        title: "Paper",
      }).success
    ).toBe(true)
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.rename", {
        assessmentId,
        title: "Paper",
      }).success
    ).toBe(false)
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.rename", {
        assessmentId,
        expectedRevision: 1,
        title: "x".repeat(201),
      }).success
    ).toBe(false)
  })
  test("delete rejects missing revision and arbitrary hard-delete flags", () => {
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.delete", {
        assessmentId,
        expectedRevision: 1,
      }).success
    ).toBe(true)
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.delete", {
        assessmentId,
      }).success
    ).toBe(false)
    expect(
      validateToolActionInput(mockTestsManifest, "assessment.delete", {
        assessmentId,
        expectedRevision: 1,
        hardDelete: true,
      }).success
    ).toBe(false)
  })
})

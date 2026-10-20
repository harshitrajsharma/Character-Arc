import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { assessmentsForScope, joinTestRecords } from "./unified-test-helpers"
import type {
  ScheduledTest,
  SubjectLinkedAssessment,
} from "@/types/progressapp/domain"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"

// Partial fixtures focus on linkage, without coupling these tests to form fields.
const plan = (id: string, testRecordId?: string) =>
  ({ id, testRecordId }) as ScheduledTest
const record = (id: string, scheduledTestId?: string) =>
  ({ id, scheduledTestId }) as BaseTestRecord

describe("unified test history", () => {
  it("joins completed schedules by either linkage direction without duplicate result rows", () => {
    const result = joinTestRecords(
      [plan("p1", "r1"), plan("p2")],
      [record("r1"), record("r2", "p2"), record("r3")]
    )
    assert.deepEqual(
      result.scheduled.map((entry) => entry.record?.id),
      ["r1", "r2"]
    )
    assert.deepEqual(
      result.standalone.map((entry) => entry.id),
      ["r3"]
    )
  })
  it("preserves results with missing schedules and plans with missing results", () => {
    const result = joinTestRecords(
      [plan("p1", "missing")],
      [record("r1", "missing-plan")]
    )
    assert.equal(result.scheduled[0].record, undefined)
    assert.equal(result.standalone.length, 1)
  })
  it("does not infer chapter coverage for subject-wide assessments", () => {
    const assessments = [
      {
        assessmentId: "whole",
        targetsWholeSubject: true,
        targetChapterIds: [],
      },
      {
        assessmentId: "chapter",
        targetsWholeSubject: false,
        targetChapterIds: ["c1", "c2"],
      },
    ] as SubjectLinkedAssessment[]
    assert.deepEqual(
      assessmentsForScope(assessments, "c1").map((item) => item.assessmentId),
      ["chapter"]
    )
    assert.deepEqual(
      assessmentsForScope(assessments).map((item) => item.assessmentId),
      ["whole"]
    )
    assert.deepEqual(assessmentsForScope(assessments, "unrelated"), [])
  })
})

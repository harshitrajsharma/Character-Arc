// @ts-expect-error - bun:test types might not be in tsconfig
import { describe, it, expect } from "bun:test"
import {
  getTargetMessage,
  getScoreStatus,
  validateTestRecordForm,
} from "../../components/tools/exam-prep/subjects/tests/test-record-helpers"

describe("test-record-helpers", () => {
  describe("getTargetMessage", () => {
    it("returns correctly for target 0", () => {
      expect(getTargetMessage(1, 0)).toBe(
        "Not required · records count as extra evidence"
      )
      expect(getTargetMessage(0, 0)).toBe(
        "Not required · records count as extra evidence"
      )
    })

    it("returns correctly when incomplete", () => {
      expect(getTargetMessage(1, 3)).toBe("1 of 3 required tests recorded")
      expect(getTargetMessage(0, 2)).toBe("0 of 2 required tests recorded")
    })

    it("returns correctly when target is met", () => {
      expect(getTargetMessage(3, 3)).toBe("Target met · 3 of 3")
      expect(getTargetMessage(1, 1)).toBe("Target met · 1 of 1")
    })

    it("returns correctly when overachieved", () => {
      expect(getTargetMessage(4, 3)).toBe("4 tests recorded · target 3")
      expect(getTargetMessage(2, 1)).toBe("2 tests recorded · target 1")
    })
  })

  describe("getScoreStatus", () => {
    it("returns Strong for >= 80", () => {
      expect(getScoreStatus(80)).toEqual({
        label: "Strong",
        variant: "success",
      })
      expect(getScoreStatus(95)).toEqual({
        label: "Strong",
        variant: "success",
      })
    })

    it("returns Building for 50 - 79", () => {
      expect(getScoreStatus(79)).toEqual({
        label: "Building",
        variant: "warning",
      })
      expect(getScoreStatus(50)).toEqual({
        label: "Building",
        variant: "warning",
      })
      expect(getScoreStatus(65)).toEqual({
        label: "Building",
        variant: "warning",
      })
    })

    it("returns Needs review for < 50", () => {
      expect(getScoreStatus(49)).toEqual({
        label: "Needs review",
        variant: "destructive",
      })
      expect(getScoreStatus(0)).toEqual({
        label: "Needs review",
        variant: "destructive",
      })
    })
  })

  describe("validateTestRecordForm", () => {
    it("returns null for valid marks", () => {
      expect(validateTestRecordForm(80, 100)).toBeNull()
      expect(validateTestRecordForm(0, 100)).toBeNull()
      expect(validateTestRecordForm(100, 100)).toBeNull()
    })

    it("returns error for invalid marksObtained", () => {
      expect(validateTestRecordForm(-1, 100)).toBe(
        "Marks obtained must be 0 or greater."
      )
      expect(validateTestRecordForm(NaN, 100)).toBe(
        "Marks obtained must be 0 or greater."
      )
      expect(validateTestRecordForm(Number.POSITIVE_INFINITY, 100)).toBe(
        "Marks obtained must be 0 or greater."
      )
    })

    it("returns error for invalid totalMarks", () => {
      expect(validateTestRecordForm(50, 0)).toBe(
        "Total marks must be greater than 0."
      )
      expect(validateTestRecordForm(50, -10)).toBe(
        "Total marks must be greater than 0."
      )
      expect(validateTestRecordForm(50, NaN)).toBe(
        "Total marks must be greater than 0."
      )
      expect(validateTestRecordForm(50, Number.POSITIVE_INFINITY)).toBe(
        "Total marks must be greater than 0."
      )
    })

    it("returns error if marksObtained > totalMarks", () => {
      expect(validateTestRecordForm(101, 100)).toBe(
        "Marks obtained cannot exceed total marks."
      )
    })
  })
})

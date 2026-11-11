// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import {
  ASSESSMENT_DISPLAY_QUERY,
  canUseAssessmentDisplayNow,
  supportsAssessmentDisplay,
} from "@/lib/tools/mock-tests/attempt-display"

describe("live assessment viewport policy", () => {
  test("allows tablet and desktop windows at the minimum boundary", () => {
    expect(supportsAssessmentDisplay(1024, 600)).toBe(true)
    expect(supportsAssessmentDisplay(1024, 768)).toBe(true)
    expect(supportsAssessmentDisplay(1440, 900)).toBe(true)
  })

  test("requires sufficient width and height independently", () => {
    expect(supportsAssessmentDisplay(1023, 1024)).toBe(false)
    expect(supportsAssessmentDisplay(768, 1024)).toBe(false)
    expect(supportsAssessmentDisplay(1440, 599)).toBe(false)
    expect(supportsAssessmentDisplay(390, 844)).toBe(false)
    expect(supportsAssessmentDisplay(844, 390)).toBe(false)
  })

  test("does not treat invalid measurements as a usable screen", () => {
    for (const [width, height] of [
      [NaN, 900],
      [1440, Infinity],
      [Infinity, 900],
      [0, 0],
      [-1440, 900],
    ]) {
      expect(supportsAssessmentDisplay(width, height)).toBe(false)
    }
  })

  test("uses the same thresholds for subscription and server preflight", () => {
    expect(ASSESSMENT_DISPLAY_QUERY).toBe(
      "(min-width: 1024px) and (min-height: 600px)"
    )
    expect(canUseAssessmentDisplayNow()).toBe(false)
  })
})

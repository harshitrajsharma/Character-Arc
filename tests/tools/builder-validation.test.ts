// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { validateBuilder } from "@/components/tools/mock-tests/builder-validation"

const valid = {
  title: "Assessment",
  instructions: "",
  duration: "",
  totalMarks: "",
  examTag: "",
  subjectsText: "",
  passingBenchmark: 33,
  distinctionBenchmark: 70,
  entries: [{ id: "q1", marks: 1, negativeMarks: 0 }],
}
describe("assessment builder validation", () => {
  test("permits untimed, derived marks and an empty draft without inventing publish rules", () => {
    expect(validateBuilder(valid)).toEqual([])
    expect(validateBuilder({ ...valid, entries: [] })).toEqual([])
  })
  test("matches metadata limits and returns focusable settings identifiers", () => {
    const issues = validateBuilder({
      ...valid,
      title: " ",
      duration: "1441",
      totalMarks: "1.234",
      instructions: "x".repeat(20001),
      passingBenchmark: 80,
      distinctionBenchmark: 70,
    })
    expect(issues.map((issue) => issue.id)).toEqual([
      "blueprint-field-title",
      "blueprint-field-instructions",
      "blueprint-field-durationMinutes",
      "blueprint-field-totalMarks",
      "blueprint-field-distinctionBenchmark",
    ])
    expect(issues.every((issue) => issue.settings)).toBe(true)
    expect(
      validateBuilder({
        ...valid,
        title: "x".repeat(200),
        duration: "1440",
        totalMarks: "999999.99",
      })
    ).toEqual([])
  })
  test("rejects nonfinite, oversized, overprecise and positive penalty values by question", () => {
    for (const marks of [NaN, Infinity, -1, 1000000, 1.234])
      expect(
        validateBuilder({
          ...valid,
          entries: [{ id: "q", marks, negativeMarks: 0 }],
        })[0]
      ).toMatchObject({ id: "marks-q", questionId: "q" })
    for (const negativeMarks of [NaN, Infinity, 1, -1.234, -1000000])
      expect(
        validateBuilder({
          ...valid,
          entries: [{ id: "q", marks: 1, negativeMarks }],
        })[0]
      ).toMatchObject({ id: "negative-q", questionId: "q" })
    expect(
      validateBuilder({
        ...valid,
        entries: [{ id: "q", marks: 2, negativeMarks: -0.67 }],
      })
    ).toEqual([])
  })
})

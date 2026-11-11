// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  normalizeAssessmentMetadata,
  validateAssessmentMetadata,
  type AssessmentMetadataValues,
} from "@/components/tools/mock-tests/assessment-metadata-model"
import { AttemptResultSummary } from "@/components/tools/mock-tests/attempt-presentation"
import { paginationWindow } from "@/lib/forms/pagination"
import {
  getNavbarDestinations,
  isNavbarDestinationActive,
  resolveNavigationWorkspace,
} from "@/components/navigation/navbar-data"
import { formatAttemptDate, formatAttemptTime } from "@/lib/dates/attempt-date"
import { parseIsoLocalDate, parseTimestamp } from "@/lib/dates/local-date"

const draft: AssessmentMetadataValues = {
  title: "Assessment",
  instructions: "",
  paperType: "full_length",
  examTag: "",
  subjects: "",
  durationMinutes: "",
  totalMarks: "",
  calculatorAllowed: false,
  passingBenchmark: "33",
  distinctionBenchmark: "70",
}

describe("shared assessment metadata contract", () => {
  test("normalizes optional settings without turning an untimed draft into a timed test", () => {
    expect(validateAssessmentMetadata(draft)).toEqual({})
    expect(
      normalizeAssessmentMetadata({
        ...draft,
        title: "  My test  ",
        subjects: " Algebra, , Logic  ",
        examTag: " Course ",
      })
    ).toMatchObject({
      title: "My test",
      subjects: ["Algebra", "Logic"],
      examTag: "Course",
      durationMinutes: null,
      totalMarks: null,
    })
  })
  test("validates raw formatted instructions and dependent benchmarks consistently", () => {
    expect(
      validateAssessmentMetadata({
        ...draft,
        durationMinutes: "1.5",
        totalMarks: "1.234",
        passingBenchmark: "80",
        distinctionBenchmark: "70",
        instructions: "x".repeat(20001),
      })
    ).toHaveProperty("distinctionBenchmark")
    expect(
      Object.keys(
        validateAssessmentMetadata({
          ...draft,
          durationMinutes: "1.5",
          totalMarks: "1.234",
          instructions: "x".repeat(20001),
        })
      )
    ).toEqual(["instructions", "durationMinutes", "totalMarks"])
    expect(
      validateAssessmentMetadata({
        ...draft,
        passingBenchmark: "",
        distinctionBenchmark: "",
      })
    ).toHaveProperty("passingBenchmark")
    expect(
      validateAssessmentMetadata({
        ...draft,
        durationMinutes: "1440",
        totalMarks: "999999.99",
      })
    ).toEqual({})
  })
})

describe("pagination and workspace boundaries", () => {
  test("provides bounded unique ordered windows at both ends and across a large history", () => {
    expect(paginationWindow(1, 1)).toEqual([1])
    expect(paginationWindow(1, 20)).toEqual([1, 2, 20])
    expect(paginationWindow(10, 20)).toEqual([1, 9, 10, 11, 20])
    expect(paginationWindow(20, 20)).toEqual([1, 19, 20])
    expect(paginationWindow(40, 3)).toEqual([1, 2, 3])
  })
  test("mobile and desktop resolve the route workspace instead of always choosing the first membership", () => {
    const memberships = [{ slug: "first" }, { slug: "my space" }]
    const current = resolveNavigationWorkspace(
      "/workspace/my%20space/assessments",
      memberships
    )
    expect(current?.slug).toBe("my space")
    const workspace = getNavbarDestinations(current?.slug).find(
      (item) => item.key === "workspace"
    )!
    expect(workspace.href).toBe("/workspace/my%20space")
    expect(
      isNavbarDestinationActive("/workspace/my%20space/assessments", workspace)
    ).toBe(false)
    expect(
      isNavbarDestinationActive("/workspace/my%20space-other", workspace)
    ).toBe(false)
    expect(
      resolveNavigationWorkspace("/workspace/%ZZ", memberships)?.slug
    ).toBe("first")
  })
})

describe("attempt evidence presentation", () => {
  test("zero is a score, pending evaluation is not a zero score", () => {
    const evaluated = renderToStaticMarkup(
      <AttemptResultSummary
        status="evaluated"
        score={0}
        maxScore={100}
        percentage={0}
      />
    )
    expect(evaluated).toContain("0 / 100")
    expect(evaluated).toContain("0% score")
    const pending = renderToStaticMarkup(
      <AttemptResultSummary
        status="submitted"
        score={null}
        maxScore={100}
        percentage={null}
      />
    )
    expect(pending).toContain("Awaiting evaluation")
    expect(pending).not.toContain("0%")
  })
  test("uses an explicit timezone around midnight and rejects invalid dates", () => {
    expect(formatAttemptDate("2026-10-28T20:00:00Z")).toBe("29 Oct 2026")
    expect(formatAttemptTime("bad")).toBe("Time unavailable")
    expect(parseIsoLocalDate("2026-02-30")).toBeUndefined()
    expect(parseIsoLocalDate("2028-02-29")?.getDate()).toBe(29)
    expect(parseTimestamp("bad")).toBeNull()
    expect(parseTimestamp("2026-10-29T00:00:00Z")?.toISOString()).toBe(
      "2026-10-29T00:00:00.000Z"
    )
  })
})

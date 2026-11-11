// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { AnalysisBenchmark } from "@/components/tools/mock-tests/analysis-benchmark"

function render(percentage: number, overrides = {}) {
  return renderToStaticMarkup(
    <AnalysisBenchmark
      analysis={{
        status: "EVALUATED",
        maxScore: 4,
        percentage,
        passingBenchmark: 33,
        distinctionBenchmark: 70,
        ...overrides,
      }}
    />
  )
}

describe("analysis target comparison", () => {
  test("explains the selected attempt's passing result and remaining distinction gap", () => {
    const html = render(33.5)
    expect(html).toContain("Passing target met")
    expect(html).toContain("0.5 percentage points above")
    expect(html).toContain("36.5 percentage points to go")
    expect(html).toContain("Current assessment targets")
    expect(html).not.toContain("Qualified")
  })
  test("uses inclusive target boundaries without calling equality an exceeded target", () => {
    expect(render(33)).toContain("Passing target met")
    expect(render(70)).toContain("Distinction target met")
    expect(render(70)).toContain(">Target met</dd>")
    expect(render(32.5)).toContain("Below passing target")
  })
  test("does not announce a passed target before evaluation or without scorable marks", () => {
    for (const overrides of [{ status: "SUBMITTED" }, { maxScore: 0 }]) {
      const html = render(90, overrides)
      expect(html).not.toContain("target met")
      expect(html).not.toContain('role="progressbar"')
      expect(html).toContain("Awaiting a score")
    }
  })
  test("preserves out-of-scale scores in text and accessible meter descriptions", () => {
    expect(render(-16.5)).toContain("-16.5% score")
    expect(render(-16.5)).toContain('aria-valuenow="0"')
    expect(render(125)).toContain("125% score")
    expect(render(125)).toContain('aria-valuenow="100"')
    expect(render(125)).toContain("Distinction target met")
  })
  test("does not classify scores against invalid or reversed targets", () => {
    for (const overrides of [
      { passingBenchmark: 80, distinctionBenchmark: 70 },
      { passingBenchmark: NaN },
      { distinctionBenchmark: Infinity },
    ]) {
      const html = render(90, overrides)
      expect(html).toContain("Targets unavailable")
      expect(html).not.toContain("target met")
    }
  })
})

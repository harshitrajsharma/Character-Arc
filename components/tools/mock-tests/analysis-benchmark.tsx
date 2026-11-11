import { CheckCircleIcon, CircleDotIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { AnalysisDoc } from "@/lib/tools/definitions/mock-tests/calculations/analysis"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { cn } from "@/lib/utils"

type BenchmarkAnalysis = Pick<
  AnalysisDoc,
  | "percentage"
  | "maxScore"
  | "status"
  | "passingBenchmark"
  | "distinctionBenchmark"
>

/** A comparison with the assessment's current targets, not an exam qualification. */
export function AnalysisBenchmark({
  analysis,
}: {
  analysis: BenchmarkAnalysis
}) {
  const passing = analysis.passingBenchmark ?? 33
  const distinction = analysis.distinctionBenchmark ?? 70
  const validTargets =
    Number.isFinite(passing) &&
    Number.isFinite(distinction) &&
    passing >= 0 &&
    distinction <= 100 &&
    passing <= distinction
  const evaluated = analysis.status === "EVALUATED"
  const percentage =
    evaluated && analysis.maxScore > 0 && Number.isFinite(analysis.percentage)
      ? analysis.percentage
      : null
  const passingMet =
    percentage !== null && validTargets && percentage >= passing
  const distinctionMet =
    percentage !== null && validTargets && percentage >= distinction
  const outcome = !evaluated
    ? "Awaiting evaluation"
    : percentage === null
      ? "Score unavailable"
      : !validTargets
        ? "Targets unavailable"
        : distinctionMet
          ? "Distinction target met"
          : passingMet
            ? "Passing target met"
            : "Below passing target"
  const hasOutcome = percentage !== null && validTargets
  const OutcomeIcon = passingMet ? CheckCircleIcon : CircleDotIcon

  return (
    <section
      aria-label="Score against targets"
      data-analysis-benchmark
      className="flex min-w-0 flex-col gap-3 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Current assessment targets
          </h3>
          <p className="mt-1 flex flex-wrap items-baseline gap-2 font-heading text-3xl font-semibold tabular-nums">
            <span data-benchmark-percentage>
              {percentage === null ? "—" : `${formatNumber(percentage)}%`}
            </span>
            <span className="font-sans text-xs font-normal text-muted-foreground">
              Your score
            </span>
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-auto max-w-full gap-1.5 py-1 text-xs whitespace-normal",
            hasOutcome &&
              (passingMet
                ? "border-success-line bg-success-soft text-success-ink"
                : "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink")
          )}
        >
          <OutcomeIcon aria-hidden="true" />
          {outcome}
        </Badge>
      </div>

      {percentage !== null ? (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-xs text-muted-foreground tabular-nums"
          >
            0%
          </span>
          <div className="relative min-w-0 flex-1 py-1">
            <Progress
              value={Math.min(100, Math.max(0, percentage))}
              aria-label="Assessment score percentage"
              aria-valuetext={`${formatNumber(percentage)}% score${validTargets ? `; passing target ${formatNumber(passing)}%, distinction target ${formatNumber(distinction)}%` : ""}`}
              indicatorClassName="bg-brand-violet-ink motion-reduce:transition-none"
            />
            {validTargets
              ? [passing, distinction].map((target, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                    style={{ left: `${target}%` }}
                  />
                ))
              : null}
          </div>
          <span
            aria-hidden="true"
            className="text-xs text-muted-foreground tabular-nums"
          >
            100%
          </span>
        </div>
      ) : null}

      {validTargets ? (
        <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-border pt-3">
          {[
            { label: "Passing target", value: passing },
            { label: "Distinction target", value: distinction },
          ].map((target) => {
            const met = percentage !== null && percentage >= target.value
            const gap =
              percentage === null ? null : Math.abs(percentage - target.value)
            const difference =
              gap !== null && gap > 0 && gap < 0.01
                ? "<0.01"
                : formatNumber(gap ?? 0)
            return (
              <div key={target.label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-xs text-muted-foreground">
                  {target.label}
                </dt>
                <dd className="flex flex-wrap items-center gap-1.5 text-base font-semibold tabular-nums">
                  {formatNumber(target.value)}%
                  {met ? (
                    <CheckCircleIcon
                      aria-label="Target met"
                      className="size-4 text-success-ink"
                    />
                  ) : null}
                </dd>
                <dd
                  className={cn(
                    "text-xs leading-relaxed",
                    met ? "text-success-ink" : "text-muted-foreground"
                  )}
                >
                  {gap === null
                    ? "Awaiting a score"
                    : gap === 0
                      ? "Target met"
                      : `${difference} percentage points ${met ? "above" : "to go"}`}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Target settings are unavailable for comparison.
        </p>
      )}
    </section>
  )
}

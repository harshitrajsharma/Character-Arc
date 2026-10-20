"use client"
import type { AssessmentAttemptHistory } from "@/lib/tools/definitions/mock-tests/repository"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"

export function ScoreTrajectoryGraph({
  attempts,
  passingBenchmark,
  distinctionBenchmark,
}: {
  attempts: AssessmentAttemptHistory[]
  maxMarks: number
  passingBenchmark: number
  distinctionBenchmark: number
  isLastSegment?: boolean
  hideHeaderBorder?: boolean
}) {
  const scored = [...attempts]
    .filter(
      (a) =>
        a.status === "evaluated" &&
        a.score !== null &&
        a.maxScore !== null &&
        a.maxScore > 0
    )
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
  const points = scored.map((a, i) => ({
    attempt: a,
    pct: (a.score! / a.maxScore!) * 100,
    x: scored.length === 1 ? 400 : 60 + (i * 680) / (scored.length - 1),
  }))
  const min = Math.min(0, ...points.map((p) => p.pct))
  const max = Math.max(100, ...points.map((p) => p.pct))
  const y = (pct: number) => 190 - ((pct - min) / (max - min)) * 155
  const mixed = new Set(scored.map((a) => a.maxScore)).size > 1
  return (
    <section aria-label="Score trajectory" className="bg-card">
      <div className="flex flex-col gap-1 border-b border-border p-4 sm:px-6">
        <h2 className="text-sm font-bold">Score Improvement Trajectory</h2>
        <p className="text-xs text-muted-foreground">
          Score percentage  -  earned marks divided by each attempt's maximum
          marks.
        </p>
        {mixed && (
          <p className="text-xs text-muted-foreground">
            These attempts have different total marks. Percentages normalize the
            scale, but changes to the paper can affect comparability.
          </p>
        )}
      </div>
      {points.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          Complete an evaluated attempt to see your score trend.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto p-4">
            <svg
              viewBox="0 0 800 240"
              className="h-56 w-full min-w-[480px]"
              role="img"
              aria-label="Score percentages by attempt. Exact values are listed below."
            >
              {[
                {
                  pct: passingBenchmark,
                  label: "Passing",
                  color: "var(--brand-amber-ink)",
                },
                {
                  pct: distinctionBenchmark,
                  label: "Distinction",
                  color: "var(--success-ink)",
                },
              ].map((line) => (
                <g key={line.label}>
                  <line
                    x1="60"
                    x2="740"
                    y1={y(line.pct)}
                    y2={y(line.pct)}
                    stroke={line.color}
                    strokeDasharray="4 4"
                  />
                  <text
                    x="740"
                    y={y(line.pct) - 6}
                    textAnchor="end"
                    fill={line.color}
                    fontSize="12"
                  >
                    {line.label} {line.pct}%
                  </text>
                </g>
              ))}
              <text x="10" y="35" fill="currentColor" fontSize="12">
                {max}%
              </text>
              <text x="10" y="195" fill="currentColor" fontSize="12">
                {min}%
              </text>
              <polyline
                points={points.map((p) => `${p.x},${y(p.pct)}`).join(" ")}
                fill="none"
                stroke="var(--brand-cyan-ink)"
                strokeWidth="3"
              />
              {points.map((p) => (
                <g key={p.attempt.id}>
                  <circle
                    cx={p.x}
                    cy={y(p.pct)}
                    r="4"
                    fill="var(--brand-cyan-ink)"
                  />
                  <text
                    x={p.x}
                    y="220"
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="12"
                  >
                    #{p.attempt.attemptNumber}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border p-4 sm:px-6">
            {points.map((p) => (
              <a
                key={p.attempt.id}
                href={`#attempt-card-${p.attempt.id}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring"
              >
                #{p.attempt.attemptNumber}: {formatNumber(p.pct)}% (
                {formatNumber(p.attempt.score!)} /{" "}
                {formatNumber(p.attempt.maxScore!)})
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

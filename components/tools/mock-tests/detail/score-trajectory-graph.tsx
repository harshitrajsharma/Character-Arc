"use client"

import { useMemo, useState } from "react"
import {
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatDuration, formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type { AssessmentAttemptHistory } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

interface ScoreTrajectoryGraphProps {
  attempts: AssessmentAttemptHistory[]
  maxMarks: number
  passingBenchmark: number
  distinctionBenchmark: number
  isLastSegment?: boolean
  hideHeaderBorder?: boolean
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(d)
}


export function ScoreTrajectoryGraph({
  attempts,
  maxMarks,
  passingBenchmark,
  distinctionBenchmark,
  isLastSegment = false,
  hideHeaderBorder = false,
}: ScoreTrajectoryGraphProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [metric, setMetric] = useState<"marks" | "accuracy">("marks")
  const [scaleMode, setScaleMode] = useState<"target" | "focus">("target")

  // Chronological evaluated attempts (Attempt #1 -> Attempt #N)
  const chronologicalAttempts = useMemo(() => {
    return [...attempts]
      .filter((a) => a.score !== null)
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
  }, [attempts])

  const effectiveMaxMarks = maxMarks > 0 ? maxMarks : 100

  // Trajectory Summary KPIs
  const summary = useMemo(() => {
    if (chronologicalAttempts.length === 0) return null
    const firstScore = chronologicalAttempts[0]?.score ?? 0
    const latestScore =
      chronologicalAttempts[chronologicalAttempts.length - 1]?.score ?? 0
    const highestScore = Math.max(
      ...chronologicalAttempts.map((a) => a.score ?? 0)
    )
    const netChange = latestScore - firstScore
    const highestPct = Math.round((highestScore / effectiveMaxMarks) * 100)
    const latestPct = Math.round((latestScore / effectiveMaxMarks) * 100)

    const totalScore = chronologicalAttempts.reduce(
      (sum, a) => sum + (a.score ?? 0),
      0
    )
    const avgScore =
      chronologicalAttempts.length > 0
        ? Math.round((totalScore / chronologicalAttempts.length) * 10) / 10
        : 0

    return {
      firstScore,
      latestScore,
      highestScore,
      netChange,
      highestPct,
      latestPct,
      totalEvaluated: chronologicalAttempts.length,
      avgScore,
    }
  }, [chronologicalAttempts, effectiveMaxMarks])

  const distinctionMarks = Math.round(
    (distinctionBenchmark / 100) * effectiveMaxMarks
  )
  const passingMarks = Math.round(
    (passingBenchmark / 100) * effectiveMaxMarks
  )

  // Dynamic Domain Ceiling (effectiveDomainMax)
  const effectiveDomainMax = useMemo(() => {
    if (scaleMode === "target") {
      return metric === "marks" ? effectiveMaxMarks : 100
    }

    if (metric === "marks") {
      const maxScore = summary?.highestScore ?? 0
      if (maxScore < passingMarks) {
        return Math.max(passingMarks, 10)
      }
      if (maxScore < distinctionMarks) {
        return Math.max(distinctionMarks, 20)
      }
      return effectiveMaxMarks
    }

    // metric === "accuracy"
    const maxAcc =
      chronologicalAttempts.length > 0
        ? Math.max(...chronologicalAttempts.map((a) => a.accuracyRate ?? 0))
        : 0

    if (maxAcc < passingBenchmark) {
      return Math.max(passingBenchmark, 20)
    }
    if (maxAcc < distinctionBenchmark) {
      return Math.max(distinctionBenchmark, 50)
    }
    return 100
  }, [
    scaleMode,
    metric,
    effectiveMaxMarks,
    summary?.highestScore,
    passingMarks,
    distinctionMarks,
    chronologicalAttempts,
    passingBenchmark,
    distinctionBenchmark,
  ])

  // SVG Chart Geometry - Maximized usable width, eliminating dead left/right voids
  const width = 800
  const height = 230
  const padLeft = 34 // Compact Y-axis numeric column (fits 0-9999 monospace ticks)
  const padRight = 20 // Edge-to-edge chart extension with right-anchored milestone tags
  const padTop = 26
  const padBottom = 48
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const baselineOffset = 12 // Keeps 0-score dots safely floating above bottom border
  const usableH = chartH - baselineOffset

  const passingRatio =
    metric === "marks"
      ? passingMarks / effectiveDomainMax
      : Math.min(
          1,
          passingBenchmark /
            (scaleMode === "target" ? 100 : effectiveDomainMax)
        )
  const passingY = padTop + (1 - passingRatio) * usableH

  const distinctionRatio =
    (metric === "marks" ? distinctionMarks : distinctionBenchmark) /
    effectiveDomainMax
  const distinctionY = padTop + (1 - distinctionRatio) * usableH

  // Data Points Calculation
  const points = useMemo(() => {
    return chronologicalAttempts.map((att, idx) => {
      const x =
        chronologicalAttempts.length === 1
          ? padLeft + chartW / 2
          : padLeft + (idx / (chronologicalAttempts.length - 1)) * chartW

      const val =
        metric === "marks"
          ? (att.score ?? 0)
          : (att.accuracyRate ??
             (att.score !== null && att.maxScore
               ? (att.score / att.maxScore) * 100
               : 0))

      const scoreRatio = Math.min(1, Math.max(0, val / effectiveDomainMax))
      const y = padTop + (1 - scoreRatio) * usableH

      const pct =
        metric === "marks"
          ? Math.round(((att.score ?? 0) / effectiveMaxMarks) * 100)
          : Math.round(val)

      return { x, y, attempt: att, pct, scoreRatio }
    })
  }, [
    chronologicalAttempts,
    effectiveDomainMax,
    effectiveMaxMarks,
    chartW,
    usableH,
    padLeft,
    padTop,
    metric,
  ])

  // Smooth Bezier Curve Path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: "", areaPath: "" }
    }

    let line = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const mx = (p0.x + p1.x) / 2
      // Cubic Bezier with horizontal control handles
      line += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`
    }

    const baselineY = padTop + chartH
    const area = `${line} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`

    return { linePath: line, areaPath: area }
  }, [points, padTop, chartH])

  const activePointIdx = hoveredIdx !== null ? hoveredIdx : -1
  const activePoint = activePointIdx >= 0 ? points[activePointIdx] : null

  const scoreDelta = useMemo(() => {
    if (activePointIdx < 0 || !activePoint) return null
    if (activePointIdx === 0) return { isFirst: true, delta: 0 }
    const prevScore = chronologicalAttempts[activePointIdx - 1]?.score
    if (
      activePoint.attempt.score === null ||
      prevScore === null ||
      prevScore === undefined
    ) {
      return null
    }
    return { isFirst: false, delta: activePoint.attempt.score - prevScore }
  }, [activePointIdx, activePoint, chronologicalAttempts])

  // Tooltip geometry calculations - optimized for wide edge-to-edge chart
  const xPct = activePoint ? (activePoint.x / width) * 100 : 0
  const clampedX = Math.max(16, Math.min(84, xPct))
  const rawOffset = ((xPct - clampedX) / 100) * 300
  const maxCaretOffset = 104 // Keeps caret safely within the w-64 card body (128px half-width)
  const caretOffsetPercent = Math.max(
    -maxCaretOffset,
    Math.min(maxCaretOffset, rawOffset)
  )
  const isTopFlipped = activePoint ? activePoint.y < 110 : false

  return (
    <>
      {/* ── Segment A: Segment Sub-Header ── */}
      <div
        className={cn(
          "bg-muted/10 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3",
          !hideHeaderBorder && "border-t border-border"
        )}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="size-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">
              Score Improvement Trajectory
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Chronological score progression against target benchmarks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Metric Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMetric("marks")}
              className={cn(
                "px-2.5 py-1 rounded-md font-semibold transition-colors",
                metric === "marks"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Marks
            </button>
            <button
              type="button"
              onClick={() => setMetric("accuracy")}
              className={cn(
                "px-2.5 py-1 rounded-md font-semibold transition-colors",
                metric === "accuracy"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Accuracy %
            </button>
          </div>

          {/* Scale Focus vs Full Paper Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScaleMode("target")}
              className={cn(
                "px-2.5 py-1 rounded-md font-semibold transition-colors",
                scaleMode === "target"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Full Paper
            </button>
            <button
              type="button"
              onClick={() => setScaleMode("focus")}
              className={cn(
                "px-2.5 py-1 rounded-md font-semibold transition-colors",
                scaleMode === "focus"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Score Focus
            </button>
          </div>

          {summary ? (
            <>
              {summary.totalEvaluated > 1 ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 gap-1",
                    summary.netChange >= 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {summary.netChange >= 0 ? (
                    <TrendingUpIcon className="size-3" />
                  ) : (
                    <TrendingDownIcon className="size-3" />
                  )}
                  {summary.netChange >= 0
                    ? `+${formatNumber(summary.netChange)} marks gained`
                    : `${formatNumber(summary.netChange)} marks trend`}
                </Badge>
              ) : null}

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono font-bold text-foreground shadow-2xs">
                <TrophyIcon className="size-3 text-amber-500" />
                Peak: {formatNumber(summary.highestScore)} /{" "}
                {formatNumber(effectiveMaxMarks)} ({summary.highestPct}%)
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Graph Container ── */}
      {chronologicalAttempts.length === 0 ? (
        <div
          className={cn(
            "border-t border-border p-8 text-center space-y-2 bg-card",
            isLastSegment && "rounded-b-2xl"
          )}
        >
          <TargetIcon className="mx-auto size-7 text-muted-foreground opacity-40" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              No evaluated test attempts yet
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Complete your first attempt to start charting your score trajectory
              against the {passingBenchmark}% passing and {distinctionBenchmark}
              % distinction cut-offs.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Segment B: Chart Canvas Area ── */}
          <div className="relative w-full px-2.5 sm:px-4 py-3.5 bg-card border-t border-border">
            {/* SVG Canvas wrapper */}
            <div className="relative w-full overflow-visible">
              {/* ── Segment C: Unclipped Floating Tooltip ── */}
              {activePoint && (
                <div
                  className={cn(
                    "absolute z-50 pointer-events-none transition-all duration-75 ease-out",
                    "w-64 rounded-xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-2 text-popover-foreground",
                    "-translate-x-1/2",
                    isTopFlipped ? "translate-y-4" : "-translate-y-[calc(100%+14px)]"
                  )}
                  style={{
                    left: `${clampedX}%`,
                    top: `${(activePoint.y / height) * 100}%`,
                  }}
                >
                  {/* Caret pointing directly to point.x */}
                  <div
                    className={cn(
                      "absolute size-3 rotate-45 border-border bg-popover",
                      isTopFlipped
                        ? "-top-1.5 border-t border-l"
                        : "-bottom-1.5 border-b border-r"
                    )}
                    style={{
                      left: `calc(50% + ${caretOffsetPercent}px)`,
                      transform: "translateX(-50%) rotate(45deg)",
                    }}
                  />

                {/* Tooltip Content */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-foreground">
                      Attempt #{activePoint.attempt.attemptNumber}
                    </span>
                    {scoreDelta ? (
                      scoreDelta.isFirst ? (
                        <Badge
                          variant="outline"
                          className="border-border bg-muted/50 text-muted-foreground text-[10px] font-medium"
                        >
                          First Attempt
                        </Badge>
                      ) : scoreDelta.delta > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold gap-0.5"
                        >
                          <TrendingUpIcon className="size-2.5" />
                          +{formatNumber(scoreDelta.delta)} vs prev
                        </Badge>
                      ) : scoreDelta.delta < 0 ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] font-semibold gap-0.5"
                        >
                          <TrendingDownIcon className="size-2.5" />
                          {formatNumber(scoreDelta.delta)} vs prev
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-border bg-muted/50 text-muted-foreground text-[10px] font-medium"
                        >
                          Same score
                        </Badge>
                      )
                    ) : null}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {formatDate(activePoint.attempt.startedAt)}
                  </span>
                </div>

                {/* Milestone Status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Result:</span>
                  {activePoint.pct >= distinctionBenchmark ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                    >
                      Distinction 🌟
                    </Badge>
                  ) : activePoint.pct >= passingBenchmark ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                    >
                      Qualified ✓
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold"
                    >
                      Needs Review
                    </Badge>
                  )}
                </div>

                {/* Score & Accuracy metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 font-mono text-[11px]">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Score
                    </span>
                    <span className="font-bold text-foreground">
                      {formatNumber(activePoint.attempt.score)} /{" "}
                      {formatNumber(effectiveMaxMarks)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      ({activePoint.pct}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Accuracy
                    </span>
                    <span className="font-bold text-foreground">
                      {activePoint.attempt.accuracyRate !== null
                        ? `${Math.round(activePoint.attempt.accuracyRate)}%`
                        : "—"}
                    </span>
                    {activePoint.attempt.durationSeconds ? (
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        ⏱ {formatDuration(activePoint.attempt.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-[9px] text-muted-foreground text-center pt-1 border-t border-border/40">
                  Click point to jump to attempt card
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-44 sm:h-52 select-none overflow-visible"
            >
              <defs>
                <linearGradient id="curveSkyGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="scoreAreaSkyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
                <filter id="skyGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* ── Milestone Zone Shading ── */}
              {distinctionY >= padTop && (
                <rect
                  x={padLeft}
                  y={padTop}
                  width={chartW}
                  height={distinctionY - padTop}
                  fill="#10b981"
                  fillOpacity="0.03"
                />
              )}
              {passingY >= padTop && (
                <rect
                  x={padLeft}
                  y={distinctionY >= padTop ? distinctionY : padTop}
                  width={chartW}
                  height={passingY - (distinctionY >= padTop ? distinctionY : padTop)}
                  fill="#f59e0b"
                  fillOpacity="0.025"
                />
              )}

              {/* Horizontal Grid Reference Lines */}
              {[0.25, 0.5, 0.75].map((ratio) => {
                const gridY = padTop + (1 - ratio) * usableH
                return (
                  <line
                    key={ratio}
                    x1={padLeft}
                    y1={gridY}
                    x2={width - padRight}
                    y2={gridY}
                    stroke="currentColor"
                    className="stroke-border/25"
                    strokeDasharray="2 4"
                    strokeWidth="1"
                  />
                )
              })}

              {/* Distinction Milestone Guide Line & Right-Anchored Badge */}
              {distinctionY >= padTop && (
                <g>
                  <line
                    x1={padLeft}
                    y1={distinctionY}
                    x2={width - padRight}
                    y2={distinctionY}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x={padLeft - 5}
                    y={distinctionY + 3.5}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-emerald-600 dark:fill-emerald-400 font-bold"
                  >
                    {metric === "marks"
                      ? `${distinctionMarks}`
                      : `${distinctionBenchmark}%`}
                  </text>
                  <g
                    transform={`translate(${width - padRight - 86}, ${
                      distinctionY - 14 < padTop ? distinctionY + 2 : distinctionY - 14
                    })`}
                    className="pointer-events-none"
                  >
                    <rect
                      width="86"
                      height="14"
                      rx="3.5"
                      className="fill-card/90 stroke-emerald-500/30 backdrop-blur-xs"
                      strokeWidth="1"
                    />
                    <text
                      x="43"
                      y="10"
                      textAnchor="middle"
                      className="text-[8.5px] font-bold fill-emerald-500 dark:fill-emerald-400 font-mono"
                    >
                      ★ Distinction ({distinctionBenchmark}%)
                    </text>
                  </g>
                </g>
              )}

              {/* Passing Milestone Guide Line & Right-Anchored Badge */}
              {passingY >= padTop && (
                <g>
                  <line
                    x1={padLeft}
                    y1={passingY}
                    x2={width - padRight}
                    y2={passingY}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x={padLeft - 5}
                    y={passingY + 3.5}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-amber-600 dark:fill-amber-400 font-bold"
                  >
                    {metric === "marks"
                      ? `${passingMarks}`
                      : `${passingBenchmark}%`}
                  </text>
                  <g
                    transform={`translate(${width - padRight - 76}, ${
                      passingY - 14 < padTop ? passingY + 2 : passingY - 14
                    })`}
                    className="pointer-events-none"
                  >
                    <rect
                      width="76"
                      height="14"
                      rx="3.5"
                      className="fill-card/90 stroke-amber-500/30 backdrop-blur-xs"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y="10"
                      textAnchor="middle"
                      className="text-[8.5px] font-bold fill-amber-500 dark:fill-amber-400 font-mono"
                    >
                      ✓ Passing ({passingBenchmark}%)
                    </text>
                  </g>
                </g>
              )}

              {/* Zero Baseline */}
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={width - padRight}
                y2={padTop + chartH}
                stroke="currentColor"
                className="stroke-border/80"
                strokeWidth="1"
              />
              <text
                x={padLeft - 5}
                y={padTop + chartH + 3.5}
                textAnchor="end"
                className="text-[9px] font-mono fill-muted-foreground"
              >
                {metric === "marks" ? "0" : "0%"}
              </text>

              {/* Max Score Baseline */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={width - padRight}
                y2={padTop}
                stroke="currentColor"
                className="stroke-border/40"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {distinctionY > padTop + 12 && passingY > padTop + 12 && (
                <text
                  x={padLeft - 5}
                  y={padTop + 3.5}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-muted-foreground"
                >
                  {metric === "marks"
                    ? formatNumber(effectiveDomainMax)
                    : `${effectiveDomainMax}%`}
                </text>
              )}

              {/* Area Fill */}
              {areaPath ? (
                <path d={areaPath} fill="url(#scoreAreaSkyGradient)" />
              ) : null}

              {/* Bezier Line */}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#curveSkyGradient)"
                  filter="url(#skyGlow)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Data Dots, Score Pins & Timeline Chips */}
              {points.map((p, idx) => {
                const isHovered = hoveredIdx === idx
                const isPeak =
                  p.attempt.score !== null &&
                  p.attempt.score === summary?.highestScore &&
                  (summary?.highestScore ?? 0) > 0

                return (
                  <g
                    key={p.attempt.id}
                    className="pointer-events-none"
                  >
                    {/* Vertical hover guide bar */}
                    {isHovered ? (
                      <line
                        x1={p.x}
                        y1={padTop}
                        x2={p.x}
                        y2={padTop + chartH}
                        stroke="currentColor"
                        className="stroke-muted-foreground/30"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    ) : null}

                    {/* Outer halo */}
                    {isHovered ? (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={10}
                        className="fill-sky-500/25 transition-all duration-150"
                      />
                    ) : null}

                    {/* Main Dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : 4}
                      className={cn(
                        "transition-all duration-150",
                        isHovered
                          ? "fill-sky-500 stroke-card stroke-2"
                          : "fill-card stroke-sky-500 stroke-2"
                      )}
                    />

                    {/* In-Place Score Pins & Peak 🏆 Marker */}
                    {isPeak ? (
                      <g transform={`translate(${p.x}, ${p.y - 14})`}>
                        <rect
                          x="-16"
                          y="-11"
                          width="32"
                          height="14"
                          rx="4"
                          className="fill-amber-500/20 stroke-amber-500/40"
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="-1"
                          className="text-[8px] font-mono font-bold fill-amber-400"
                        >
                          🏆 {metric === "marks" ? formatNumber(p.attempt.score) : `${p.pct}%`}
                        </text>
                      </g>
                    ) : (
                      <text
                        x={p.x}
                        y={p.y - 7}
                        textAnchor="middle"
                        className="text-[8px] font-mono fill-muted-foreground/60 font-semibold"
                      >
                        {metric === "marks" ? formatNumber(p.attempt.score) : `${p.pct}%`}
                      </text>
                    )}

                    {/* Compact Timeline Chip */}
                    <g transform={`translate(${p.x}, ${padTop + chartH + 8})`}>
                      <rect
                        x="-13"
                        y="0"
                        width="26"
                        height="14"
                        rx="4"
                        className={cn(
                          isHovered
                            ? "fill-primary stroke-primary"
                            : "fill-muted/50 stroke-border/40"
                        )}
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="10"
                        className={cn(
                          "text-[9px] font-mono font-bold",
                          isHovered
                            ? "fill-primary-foreground"
                            : "fill-muted-foreground"
                        )}
                      >
                        #{p.attempt.attemptNumber}
                      </text>
                    </g>

                    {/* Short Date Context */}
                    <text
                      x={p.x}
                      y={padTop + chartH + 34}
                      textAnchor="middle"
                      className="text-[8px] font-sans fill-muted-foreground/60"
                    >
                      {formatShortDate(p.attempt.startedAt)}
                    </text>
                  </g>
                )
              })}

              {/* Interactive Canvas Scrubbing Overlay */}
              <rect
                x={padLeft}
                y={padTop}
                width={chartW}
                height={chartH + 38}
                fill="transparent"
                className="cursor-pointer"
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const mouseXRel = (e.clientX - rect.left) / rect.width
                  const svgX = padLeft + mouseXRel * chartW
                  // Find closest point
                  let closestIdx = 0
                  let minDiff = Infinity
                  points.forEach((p, idx) => {
                    const diff = Math.abs(p.x - svgX)
                    if (diff < minDiff) {
                      minDiff = diff
                      closestIdx = idx
                    }
                  })
                  setHoveredIdx(closestIdx)
                }}
                onPointerLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (activePoint) {
                    const el = document.getElementById(
                      `attempt-card-${activePoint.attempt.id}`
                    )
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" })
                      el.classList.add(
                        "ring-2",
                        "ring-primary",
                        "transition-all"
                      )
                      setTimeout(
                        () => el.classList.remove("ring-2", "ring-primary"),
                        2000
                      )
                    }
                  }
                }}
              />
            </svg>
          </div>
        </div>

          {/* ── Segment D: Segment Sub-Footer ── */}
          <div
            className={cn(
              "border-t border-border/60 bg-muted/10 px-5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground",
              isLastSegment && "rounded-b-2xl"
            )}
          >
            {/* Left: Legend tags */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-sky-500" />
                {metric === "marks" ? "Score Trendline" : "Accuracy Trendline"}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-amber-500" />
                Passing Cut-off ({passingBenchmark}%)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                Distinction Cut-off ({distinctionBenchmark}%)
              </span>
            </div>

            {/* Right: Telemetry summary */}
            <span className="text-[10px] text-muted-foreground font-mono">
              {chronologicalAttempts.length}{" "}
              {chronologicalAttempts.length === 1 ? "attempt" : "attempts"} plotted
              {summary
                ? ` • Avg: ${formatNumber(summary.avgScore)} marks • Best: ${formatNumber(summary.highestScore)} marks`
                : ""}
            </span>
          </div>
        </>
      )}
    </>
  )
}


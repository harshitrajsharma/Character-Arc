"use client"

import { LayersIcon } from "lucide-react"

import {
  questionKindLabel,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { ScoreTrajectoryGraph } from "./score-trajectory-graph"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

interface MockTestTelemetryCardProps {
  assessment: AssessmentDetail
  attempts: AssessmentAttemptHistory[]
  effectiveSections: SectionDefinition[]
  sectionStats: {
    map: Map<string, { count: number; marks: number }>
    unassigned: { count: number; marks: number }
  }
  typeCounts: Record<string, number>
  pacingEstimate: string | null
}

export function MockTestTelemetryCard({
  assessment,
  attempts,
  effectiveSections,
  sectionStats,
  typeCounts,
  pacingEstimate,
}: MockTestTelemetryCardProps) {
  const passingBenchmark = assessment.passingBenchmark ?? 33
  const distinctionBenchmark = assessment.distinctionBenchmark ?? 70

  return (
    <section className="relative rounded-2xl border border-border bg-card shadow-xs">
      {/* ── Segment 1: 4 Stats Blocks in Segmented Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-t-2xl overflow-hidden">
        {/* 1. Questions & Structure */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Questions &amp; Structure
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.questions.length}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {effectiveSections.length > 0
              ? `${effectiveSections.length} Sections • `
              : ""}
            {Object.entries(typeCounts)
              .map(([kind, count]) => `${count} ${questionKindLabel(kind)}`)
              .join(" • ") || "No questions yet"}
          </p>
        </div>

        {/* 2. Duration & Pacing */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Duration &amp; Pacing
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.durationMinutes ? `${assessment.durationMinutes}m` : "Untimed"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {pacingEstimate ?? "Self-paced practice"}
          </p>
        </div>

        {/* 3. Total Marks */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Total Marks
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {assessment.totalMarks !== null
              ? formatNumber(assessment.totalMarks)
              : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Standard negative penalty
          </p>
        </div>

        {/* 4. Performance Cut-offs */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Performance Cut-offs
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {passingBenchmark}%{" "}
            <span className="text-sm font-sans font-medium text-muted-foreground">
              /
            </span>{" "}
            {distinctionBenchmark}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            Passing &amp; Distinction targets
          </p>
        </div>
      </div>

      {/* ── Segment 2: Score Trajectory & Performance Improvement Graph ── */}
      <ScoreTrajectoryGraph
        attempts={attempts}
        maxMarks={assessment.totalMarks ?? 100}
        passingBenchmark={passingBenchmark}
        distinctionBenchmark={distinctionBenchmark}
        isLastSegment={effectiveSections.length === 0}
      />

      {/* ── Segment 3: Exam Blueprint Ribbon ── */}
      {effectiveSections.length > 0 ? (
        <div className="border-t border-border bg-muted/20 px-5 py-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground rounded-b-2xl">
          <div className="flex items-center gap-1.5 font-semibold text-foreground mr-1">
            <LayersIcon className="size-3.5 text-foreground" />
            <span>Exam Blueprint:</span>
          </div>
          {effectiveSections.map((sec) => {
            const stats = sectionStats.map.get(sec.key) ?? { count: 0, marks: 0 }
            return (
              <span
                key={sec.key}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-2xs"
              >
                <span className="size-1.5 rounded-full bg-sky-500" />
                <span className="font-semibold">{sec.title}</span>
                <span className="text-muted-foreground">
                  ({stats.count} {stats.count === 1 ? "Q" : "Qs"} •{" "}
                  {formatNumber(stats.marks)} marks)
                </span>
              </span>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

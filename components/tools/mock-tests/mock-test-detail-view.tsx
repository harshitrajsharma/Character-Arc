"use client"

import { useState } from "react"
import { AssessmentCoverage } from "./detail/assessment-coverage"

import { TestProfileHeroCard } from "./detail/test-profile-hero-card"
import { ScoreTrajectoryGraph } from "./detail/score-trajectory-graph"
import { AttemptHistoryList } from "./detail/attempt-history-list"
import { ShareAssessmentDialog } from "./share-assessment-dialog"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
} from "@/lib/tools/definitions/mock-tests/repository"

export function MockTestDetailView({
  workspaceSlug,
  assessment,
  attempts,
  canWrite,
}: {
  workspaceSlug: string
  assessment: AssessmentDetail
  attempts: AssessmentAttemptHistory[]
  canWrite: boolean
}) {
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <div className="space-y-8 font-sans text-foreground antialiased">
      {/* ── 1. Unified Canonical Test Profile Hero Card ── */}
      <TestProfileHeroCard
        mode="workspace"
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        attempts={attempts}
        canWrite={canWrite}
        onOpenShare={() => setShareOpen(true)}
      >
        <ScoreTrajectoryGraph
          attempts={attempts}
          maxMarks={assessment.totalMarks ?? 100}
          passingBenchmark={assessment.passingBenchmark ?? 33}
          distinctionBenchmark={assessment.distinctionBenchmark ?? 70}
          hideHeaderBorder
          isLastSegment
        />
      </TestProfileHeroCard>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AssessmentCoverage assessment={assessment} workspaceSlug={workspaceSlug} />
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <AttemptHistoryList
            workspaceSlug={workspaceSlug}
            assessmentId={assessment.id}
            attempts={attempts}
            isPublished={assessment.status === "published"}
          />
        </div>
      </div>

      {/* Share Assessment Dialog */}
      <ShareAssessmentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        workspaceSlug={workspaceSlug}
        assessment={assessment}
      />
    </div>
  )
}

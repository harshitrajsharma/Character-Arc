"use client"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { AssessmentCard } from "./assessment-card"
import { AssessmentListView } from "./assessment-list-view"
import { EmptyStateCard } from "./empty-state-card"
import { RecentAttemptsTable } from "./recent-attempts-table"
import type { WorkspaceTestsViewProps } from "./types"

export function WorkspaceTestsView({
  workspaceSlug,
  assessments,
  totalCount,
  viewMode,
  canWrite,
  hasActiveFilters,
  onResetFilters,
  onShare,
  recentAttempts,
}: WorkspaceTestsViewProps) {
  return (
    <section aria-labelledby="workspace-tests-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="workspace-tests-heading"
          className="font-heading text-lg font-bold text-foreground"
        >
          Workspace Test Papers
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Showing {assessments.length} of {totalCount}
        </span>
      </div>

      {assessments.length === 0 ? (
        <EmptyStateCard
          icon={hasActiveFilters ? "search" : "test"}
          title={
            hasActiveFilters
              ? "No test papers match your criteria"
              : "No test papers created yet"
          }
          description={
            hasActiveFilters
              ? "Try adjusting or clearing your search filters to see all available papers."
              : "You haven't created any test papers yet. Build your first computer-based assessment to begin."
          }
          actionLabel={
            hasActiveFilters
              ? "Reset Filters"
              : canWrite
              ? "Create First Paper"
              : undefined
          }
          onAction={hasActiveFilters ? onResetFilters : undefined}
          actionHref={
            !hasActiveFilters && canWrite
              ? workspaceRoutes.mockTests.new(workspaceSlug)
              : undefined
          }
        />
      ) : viewMode === "list" ? (
        <AssessmentListView
          workspaceSlug={workspaceSlug}
          mode="workspace"
          items={assessments}
          canWrite={canWrite}
          onShare={onShare}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((item) => (
            <AssessmentCard
              key={item.id}
              workspaceSlug={workspaceSlug}
              mode="workspace"
              item={item}
              canWrite={canWrite}
              onShare={onShare}
            />
          ))}
        </div>
      )}

      {/* Recent Attempts History */}
      <RecentAttemptsTable
        workspaceSlug={workspaceSlug}
        recentAttempts={recentAttempts}
      />
    </section>
  )
}

"use client"

import { AssessmentCard } from "./assessment-card"
import { AssessmentListView } from "./assessment-list-view"
import { EmptyStateCard } from "./empty-state-card"
import type { CommunityHubViewProps } from "./types"

export function CommunityHubView({
  workspaceSlug,
  communityAssessments,
  totalCount,
  viewMode,
  cloningId,
  isPending,
  hasActiveFilters,
  onResetFilters,
  onClonePaper,
}: CommunityHubViewProps) {
  return (
    <section aria-labelledby="community-papers-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="community-papers-heading"
          className="font-heading text-lg font-bold text-foreground"
        >
          Community Question Papers
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Showing {communityAssessments.length} of {totalCount}
        </span>
      </div>

      {communityAssessments.length === 0 ? (
        <EmptyStateCard
          icon={hasActiveFilters ? "search" : "globe"}
          title={
            hasActiveFilters
              ? "No community papers match your filters"
              : "No community papers available"
          }
          description={
            hasActiveFilters
              ? "Try broadening your search query or clearing your filter criteria to see all community tests."
              : "Community papers shared by other workspaces and educators will appear here."
          }
          actionLabel={hasActiveFilters ? "Reset Filters" : undefined}
          onAction={hasActiveFilters ? onResetFilters : undefined}
        />
      ) : viewMode === "list" ? (
        <AssessmentListView
          workspaceSlug={workspaceSlug}
          mode="community"
          items={communityAssessments}
          cloningId={cloningId}
          onClone={onClonePaper}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communityAssessments.map((item) => (
            <AssessmentCard
              key={item.id}
              workspaceSlug={workspaceSlug}
              mode="community"
              item={item}
              isCloning={cloningId === item.id || (isPending && cloningId === item.id)}
              onClone={onClonePaper}
            />
          ))}
        </div>
      )}
    </section>
  )
}

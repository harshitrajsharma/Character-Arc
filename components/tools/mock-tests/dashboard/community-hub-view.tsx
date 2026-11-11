"use client"

import { useState } from "react"
import {
  AssessmentPagination,
  ASSESSMENTS_PER_PAGE,
} from "./assessment-pagination"
import { cn } from "@/lib/utils"
import { AssessmentCard } from "./assessment-card"
import { AssessmentListView } from "./assessment-list-view"
import { EmptyStateCard } from "./empty-state-card"
import type { CommunityHubViewProps } from "./types"

export function CommunityHubView({
  workspaceSlug,
  canWrite,
  communityAssessments,
  totalCount,
  viewMode,
  cloningId,
  isPending,
  hasActiveFilters,
  onResetFilters,
  onClonePaper,
}: CommunityHubViewProps) {
  const [requestedPage, setPage] = useState(1)
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(communityAssessments.length / ASSESSMENTS_PER_PAGE))
  )
  const pageItems = communityAssessments.slice(
    (page - 1) * ASSESSMENTS_PER_PAGE,
    page * ASSESSMENTS_PER_PAGE
  )
  return (
    <section
      aria-labelledby="community-papers-heading"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="community-papers-heading"
          tabIndex={-1}
          className="scroll-mt-24 font-heading text-lg font-bold text-foreground outline-none"
        >
          Shared papers
        </h2>
        <span
          className="text-xs text-muted-foreground tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {communityAssessments.length === totalCount
            ? `${totalCount} ${totalCount === 1 ? "paper" : "papers"}`
            : `${communityAssessments.length} matching papers`}
        </span>
      </div>

      {totalCount >= 100 ? (
        <p className="text-xs text-muted-foreground">
          Showing available recently shared papers.
        </p>
      ) : null}
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
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="hidden md:block">
              <AssessmentListView
                workspaceSlug={workspaceSlug}
                mode="community"
                canWrite={canWrite}
                items={pageItems}
                cloningId={cloningId}
                onClone={onClonePaper}
              />
            </div>
          ) : null}
          <div
            className={cn(
              "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
              viewMode === "list" && "md:hidden"
            )}
          >
            {pageItems.map((item) => (
              <AssessmentCard
                key={item.id}
                workspaceSlug={workspaceSlug}
                mode="community"
                canWrite={canWrite}
                item={item}
                isCloning={
                  cloningId === item.id || (isPending && cloningId === item.id)
                }
                onClone={onClonePaper}
              />
            ))}
          </div>
          <AssessmentPagination
            page={page}
            total={communityAssessments.length}
            onChange={setPage}
            headingId="community-papers-heading"
          />
        </>
      )}
    </section>
  )
}

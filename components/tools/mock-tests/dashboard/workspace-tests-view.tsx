"use client"

import { useState } from "react"
import {
  AssessmentPagination,
  ASSESSMENTS_PER_PAGE,
} from "./assessment-pagination"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { AssessmentCard } from "./assessment-card"
import { AssessmentListView } from "./assessment-list-view"
import { EmptyStateCard } from "./empty-state-card"
import type { WorkspaceTestsViewProps } from "./types"

export function WorkspaceTestsView({
  workspaceSlug,
  assessments,
  totalCount,
  viewMode,
  canWrite,
  hasActiveFilters,
  onResetFilters,
  recentAttempts,
}: WorkspaceTestsViewProps) {
  const [requestedPage, setPage] = useState(1)
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(assessments.length / ASSESSMENTS_PER_PAGE))
  )
  const pageItems = assessments.slice(
    (page - 1) * ASSESSMENTS_PER_PAGE,
    page * ASSESSMENTS_PER_PAGE
  )
  return (
    <section
      aria-labelledby="workspace-tests-heading"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="workspace-tests-heading"
          tabIndex={-1}
          className="scroll-mt-24 font-heading text-lg font-bold text-foreground outline-none"
        >
          Your papers
        </h2>
        <span
          className="text-xs text-muted-foreground tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {assessments.length === totalCount
            ? `${totalCount} ${totalCount === 1 ? "paper" : "papers"}`
            : `${assessments.length} matching papers`}
        </span>
      </div>

      {totalCount >= 50 ? (
        <p className="text-xs text-muted-foreground">
          Browsing the 50 most recently updated papers.
        </p>
      ) : null}
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
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="hidden md:block">
              <AssessmentListView
                workspaceSlug={workspaceSlug}
                mode="workspace"
                items={pageItems}
                activeAttempts={Object.fromEntries(
                  recentAttempts
                    .filter((attempt) => attempt.status === "in_progress")
                    .map((attempt) => [attempt.assessmentId, attempt.id])
                )}
                canWrite={canWrite}
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
                mode="workspace"
                item={item}
                canWrite={canWrite}
                activeAttemptId={
                  recentAttempts.find(
                    (attempt) =>
                      attempt.assessmentId === item.id &&
                      attempt.status === "in_progress"
                  )?.id
                }
              />
            ))}
          </div>
          <AssessmentPagination
            page={page}
            total={assessments.length}
            onChange={setPage}
            headingId="workspace-tests-heading"
          />
        </>
      )}
    </section>
  )
}

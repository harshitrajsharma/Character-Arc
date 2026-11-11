"use client"

import { UrlPagination } from "@/components/shared/url-pagination"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { AttemptHistoryPage } from "@/lib/tools/mock-tests/actions/attempt-history-actions"

export function AttemptHistoryPagination({
  history,
  workspaceSlug,
  assessmentId,
}: {
  history: AttemptHistoryPage
  workspaceSlug: string
  assessmentId?: string
}) {
  return (
    <UrlPagination
      pagination={history}
      pathname={
        assessmentId
          ? workspaceRoutes.mockTests.detail(workspaceSlug, assessmentId)
          : workspaceRoutes.mockTests.home(workspaceSlug)
      }
      queryKey="attemptPage"
      unit="attempts"
      headingId="attempt-history-heading"
      fixedParams={assessmentId ? undefined : { tab: "attempts" }}
    />
  )
}

import type { Metadata } from "next"
import { CircleAlertIcon } from "lucide-react"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MockTestsDashboard } from "@/components/tools/mock-tests/mock-tests-dashboard"
import { getMockTestsOverview } from "@/lib/tools/definitions/mock-tests/repository"
import { getAttemptHistoryAction } from "@/lib/tools/mock-tests/actions/attempt-history-actions"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Assessments — Dashboard" }
export const dynamic = "force-dynamic"

export default async function MockTestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ tab?: string; attemptPage?: string }>
}) {
  const { workspaceSlug } = await params
  const { tab, attemptPage } = await searchParams
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.mock-tests"
  )

  const [overview, attemptHistory] = await Promise.all([
    getMockTestsOverview(workspace.id, workspaceSlug, installation.id),
    getAttemptHistoryAction({
      workspaceSlug,
      page: tab === "attempts" ? attemptPage : 1,
    }),
  ])

  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-20 pb-28 sm:pb-16 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          { label: "Assessments" },
        ]}
        backHref={`/workspace/${encodeURIComponent(workspaceSlug)}`}
        backLabel="Back to Workspace"
      />
      {overview.issue ? (
        <Alert variant="destructive" className="mt-6">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Your tests are temporarily unavailable</AlertTitle>
          <AlertDescription>
            Your saved workspace data remains private. Refresh after the latest
            workspace setup has completed.
          </AlertDescription>
        </Alert>
      ) : null}

      <MockTestsDashboard
        workspaceSlug={workspaceSlug}
        assessments={overview.assessments}
        communityAssessments={overview.communityAssessments}
        recentAttempts={overview.recentAttempts}
        attemptHistory={attemptHistory}
        canWrite={canWrite}
      />
    </main>
  )
}

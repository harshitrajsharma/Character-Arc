import type { Metadata } from "next"
import Link from "next/link"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MockTestsDashboard } from "@/components/tools/mock-tests/mock-tests-dashboard"
import { getMockTestsOverview } from "@/lib/tools/definitions/mock-tests/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Mock Tests — Dashboard" }

export default async function MockTestsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.mock-tests"
  )

  const overview = await getMockTestsOverview(
    workspace.id,
    workspaceSlug,
    installation.id
  )

  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 sm:pb-10 md:px-6 xl:px-10 space-y-6">
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
        recentAttempts={overview.recentAttempts}
        canWrite={canWrite}
      />
    </main>
  )
}

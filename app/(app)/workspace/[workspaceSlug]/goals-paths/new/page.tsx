import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { CreateArcForm } from "@/components/tools/goals-paths/create-arc-form"
import { getGoalsPathsOverview } from "@/lib/tools/definitions/goals-paths/repository"

export const metadata: Metadata = { title: "Create an Arc" }

export default async function NewArcPage(props: { params: Promise<{ workspaceSlug: string }> }) {
  const params = await props.params
  const overview = await getGoalsPathsOverview(params.workspaceSlug)

  if (!overview.item) {
    notFound()
  }

  if (
    !overview.workspace ||
    overview.item.installationStatus !== "active" ||
    !overview.item.installationId
  ) {
    redirect(workspaceRoutes.home(params.workspaceSlug))
  }

  return (
    <main>
      <CreateArcForm
        workspaceId={overview.workspace.id}
        installationId={overview.item.installationId}
        workspaceSlug={params.workspaceSlug}
        idempotencyKey={crypto.randomUUID()}
      />
    </main>
  )
}

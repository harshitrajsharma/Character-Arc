import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { CreateArcForm } from "@/components/tools/create-arc-form"
import { getGoalsPathsOverview } from "@/lib/tools/definitions/goals-paths/overview"

export const metadata: Metadata = { title: "Create an Arc" }

export default async function NewArcPage() {
  const overview = await getGoalsPathsOverview()

  if (!overview.item) {
    notFound()
  }

  if (
    !overview.workspace ||
    overview.item.installationStatus !== "active" ||
    !overview.item.installationId
  ) {
    redirect("/tools")
  }

  return (
    <main>
      <CreateArcForm
        workspaceId={overview.workspace.id}
        installationId={overview.item.installationId}
        idempotencyKey={crypto.randomUUID()}
      />
    </main>
  )
}

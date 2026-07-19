import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArcEditForm } from "@/components/tools/goals-paths/arc-edit-form"
import { getArcDetail } from "@/lib/tools/definitions/goals-paths/repository"

export const metadata: Metadata = { title: "Edit Arc" }

type EditArcPageProps = {
  params: Promise<{ workspaceSlug: string, arcId: string }>
}

export default async function EditArcPage({ params }: EditArcPageProps) {
  const { workspaceSlug, arcId } = await params
  const { arc, workspace, item, issue } = await getArcDetail(workspaceSlug, arcId)

  if (issue === "not_found" || !arc) notFound()
  if (issue || !workspace) throw new Error("Arc data is temporarily unavailable")
  if (!item?.installationId) notFound()

  return (
    <ArcEditForm
      arcId={arc.id}
      revision={arc.revision}
      workspaceId={workspace.id}
      installationId={item.installationId}
      workspaceSlug={workspaceSlug}
      idempotencyKey={crypto.randomUUID()}
      initialDraft={{
        title: arc.title,
        objective: arc.objective,
        currentReality: arc.currentReality,
        why: arc.why ?? "",
        targetDate: arc.targetDate ?? "",
        constraints: arc.constraints.join("\n"),
      }}
    />
  )
}

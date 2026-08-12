import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import type { Metadata } from "next"

import { CreateExamForm } from "@/components/tools/exam-prep/create-exam-form"
import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Track New Exam" }

export default async function NewExamPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")

  return (
    <main>
      <CreateExamForm
        workspaceSlug={workspaceSlug}
        idempotencyKey={createIdempotencyKey()}
      />
    </main>
  )
}

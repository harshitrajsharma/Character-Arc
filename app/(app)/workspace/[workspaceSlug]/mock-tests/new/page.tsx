import type { Metadata } from "next"

import { NewAssessmentForm } from "@/components/tools/mock-tests/new-assessment-form"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { ListChecksIcon } from "lucide-react"

export const metadata: Metadata = { title: "New Mock Test" }

export default async function NewMockTestPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      <ToolPageHeader
        eyebrow="Test yourself"
        title="New mock test"
        description="Give your test a blueprint first. You can add questions, set marks, and publish it afterwards."
        icon={<ListChecksIcon aria-hidden="true" />}
        iconClassName="bg-brand-berry-soft text-brand-berry-ink"
      />
      <div className="mt-8 rounded-lg border bg-card p-6">
        <NewAssessmentForm workspaceSlug={workspaceSlug} />
      </div>
    </main>
  )
}

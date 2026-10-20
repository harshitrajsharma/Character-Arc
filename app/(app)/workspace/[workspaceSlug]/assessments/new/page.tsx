import type { Metadata } from "next"
import { ListChecksIcon } from "lucide-react"

import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { NewAssessmentForm } from "@/components/tools/mock-tests/new-assessment-form"
import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "New Test Blueprint — Assessments" }

export default async function NewMockTestPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-10 space-y-8 font-sans antialiased text-foreground">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Assessments", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: "New Blueprint" },
        ]}
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        backLabel="Back to Assessments"
      />

      <ToolPageHeader
        eyebrow="Assessments"
        title="Create Test Blueprint"
        description="Set up paper timing, score marks, and passing cut-offs. Add questions next."
        icon={<ListChecksIcon aria-hidden="true" />}
        iconClassName="bg-muted text-foreground"
      />

      <NewAssessmentForm workspaceSlug={workspaceSlug} />
    </main>
  )
}

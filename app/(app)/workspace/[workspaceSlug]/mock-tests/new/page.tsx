import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, ListChecksIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NewAssessmentForm } from "@/components/tools/mock-tests/new-assessment-form"
import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "New Mock Test — Blueprint" }

export default async function NewMockTestPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-10 space-y-6 font-sans antialiased text-foreground">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Mock Tests", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: "Create Paper" },
        ]}
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        backLabel="Back to Mock Tests"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          render={<Link href={workspaceRoutes.mockTests.home(workspaceSlug)} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
      </div>

      <div className="space-y-1 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet-ink">
            Test Paper Blueprint
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Create New Mock Test
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Set the test paper blueprint, duration, and instructions. You can add and order questions in the builder right after.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        <NewAssessmentForm workspaceSlug={workspaceSlug} />
      </div>
    </main>
  )
}

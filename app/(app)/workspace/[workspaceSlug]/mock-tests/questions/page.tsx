import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, LayersIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { QuestionBankView } from "@/components/tools/mock-tests/question-bank-view"
import { getQuestionBank } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Question Bank — Mock Tests" }

export default async function QuestionBankPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const bank = await getQuestionBank(workspace.id)
  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:pb-16 md:px-6 xl:px-10 space-y-6 font-sans antialiased text-foreground">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Mock Tests", href: workspaceRoutes.mockTests.home(workspaceSlug) },
          { label: "Question Bank" },
        ]}
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        backLabel="Back to Mock Tests"
      />

      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet-ink">
              Reusable Question Repository
            </span>
          </div>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Question Bank
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
            Create and manage reusable questions across multiple papers in MCQ, MSQ, and NAT formats with KaTeX math.
          </p>
        </div>

        {canWrite ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="text-xs h-9 font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              render={
                <Link href={workspaceRoutes.mockTests.questionNew(workspaceSlug)} />
              }
            >
              <PlusIcon className="size-3.5" />
              New Question
            </Button>
          </div>
        ) : null}
      </div>

      <QuestionBankView
        workspaceSlug={workspaceSlug}
        bank={bank}
        canWrite={canWrite}
      />
    </main>
  )
}

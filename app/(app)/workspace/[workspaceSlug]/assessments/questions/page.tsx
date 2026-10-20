import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { QuestionBankView } from "@/components/tools/mock-tests/question-bank-view"
import { getQuestionBankPage } from "@/lib/tools/mock-tests/question-bank-page"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Question Bank — Assessments" }

export default async function QuestionBankPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  await requireActiveToolInstallation(workspaceSlug, "core.mock-tests")

  const pageData = await getQuestionBankPage(workspace.id, await searchParams)
  const bank = pageData.bank
  const canWrite = workspace.role !== "VIEWER"

  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-4 pt-20 pb-24 sm:pb-16 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          {
            label: "Workspace",
            href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
          },
          {
            label: "Assessments",
            href: workspaceRoutes.mockTests.home(workspaceSlug),
          },
          { label: "Question Bank" },
        ]}
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        backLabel="Back to Assessments"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Assessments
            </span>
          </div>
          <h1 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">
            Question Bank
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Build your collection. Find, review, and reuse questions across your
            test papers.
          </p>
        </div>

        {canWrite && pageData.total > 0 ? (
          <div className="flex shrink-0">
            <Link
              className={buttonVariants({
                className: "h-11 w-full sm:h-9 sm:w-auto",
              })}
              href={workspaceRoutes.mockTests.questionNew(workspaceSlug)}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              New Question
            </Link>
          </div>
        ) : null}
      </div>

      <QuestionBankView
        key={JSON.stringify([
          pageData.filters,
          pageData.page,
          pageData.pageSize,
        ])}
        workspaceSlug={workspaceSlug}
        bank={bank}
        pageData={pageData}
        canWrite={canWrite}
      />
    </main>
  )
}

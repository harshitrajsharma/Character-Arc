import type { Metadata } from "next"
import Link from "next/link"
import { FilePenLineIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { QuestionBankView } from "@/components/tools/mock-tests/question-bank-view"
import { getQuestionBank } from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"

export const metadata: Metadata = { title: "Question Bank" }

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
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
      <ToolPageHeader
        eyebrow="Mock tests"
        title="Question bank"
        description="Reusable questions in any pattern — single choice, multiple choice, true/false, numeric or short answer. Build once, reuse across tests."
        icon={<FilePenLineIcon aria-hidden="true" />}
        iconClassName="bg-brand-cyan-soft text-brand-cyan-ink"
        primaryAction={
          canWrite ? (
            <Button
              render={
                <Link href={workspaceRoutes.mockTests.questionNew(workspaceSlug)} />
              }
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              New question
            </Button>
          ) : null
        }
      />

      <div className="mt-8">
        <QuestionBankView
          workspaceSlug={workspaceSlug}
          bank={bank}
          canWrite={canWrite}
        />
      </div>
    </main>
  )
}

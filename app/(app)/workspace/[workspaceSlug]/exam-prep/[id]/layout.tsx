import { notFound, redirect } from "next/navigation"
import type { ReactNode } from "react"

import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

/**
 * Exam-level layout. Validates that the exam exists, is active, and belongs
 * to this workspace''s exam-prep installation -- once, for every page under [id]/.
 *
 * Because getExamDetail is now React cache()-wrapped, any page in this subtree
 * that also calls getExamDetail with the same args will get a cache hit (no
 * extra Supabase or Prisma calls). The workspace identity and installation
 * queries are already deduplicated by the parent exam-prep/layout.tsx.
 */
export default async function ExamDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspaceSlug: string; id: string }>
}) {
  const { workspaceSlug, id } = await params

  // Both are cache()-wrapped -- cache hits from the parent exam-prep/layout.tsx
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )

  // getExamDetail is now cache()-wrapped -- first call here; pages that also
  // call it with the same args receive the memoized result for free.
  const { exam, issue } = await getExamDetail(workspace.id, workspaceSlug, id)

  if (
    issue === "not_found" ||
    !exam ||
    exam.originToolInstallationId !== installation.id
  ) {
    notFound()
  }

  if (issue) {
    redirect(workspaceRoutes.examPrep.home(workspaceSlug))
  }

  return <>{children}</>
}

import type { ReactNode } from "react"

import { requireActiveToolInstallation } from "@/lib/workspaces/workspace-access"

export default async function ExamPrepLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await requireActiveToolInstallation(workspaceSlug, "core.exam-prep")

  return children
}

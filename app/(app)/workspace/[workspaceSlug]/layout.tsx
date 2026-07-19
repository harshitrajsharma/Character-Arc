import type { ReactNode } from "react"
import { getWorkspaceIdentity } from "@/lib/workspaces/workspace-access"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  await getWorkspaceIdentity(workspaceSlug)

  return (
    <div className="flex w-full flex-col min-h-screen">
      {children}
    </div>
  )
}

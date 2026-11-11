import type { Metadata } from "next"
import { WorkspaceHomeView } from "@/components/workspace/workspace-home"
import { getWorkspaceHome } from "@/lib/workspaces/workspace-home"

export const metadata: Metadata = { title: "Workspace" }

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  return <WorkspaceHomeView data={await getWorkspaceHome(workspaceSlug)} />
}

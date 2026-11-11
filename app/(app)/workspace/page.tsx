import { redirect } from "next/navigation"
import { getAppShellData } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export default async function WorkspaceEntry() {
  const memberships = await getAppShellData()
  const home =
    memberships.find((workspace) => workspace.kind === "PERSONAL") ??
    memberships[0]
  redirect(home ? workspaceRoutes.home(home.slug) : "/tools")
}

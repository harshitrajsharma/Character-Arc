"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon, UserIcon, BuildingIcon, WrenchIcon } from "lucide-react"
import { mapToolIcon } from "../tools/tool-catalog-card"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>
type AppShellInstallation =
  AppShellData[number]["installations"][number]

function WorkspaceNavItem({
  workspace,
  currentSlug,
}: {
  workspace: AppShellData[number]
  currentSlug: string | undefined
}) {
  const isActive = workspace.slug === currentSlug
  const [isOpen, setIsOpen] = React.useState(isActive)
  const [wasActive, setWasActive] = React.useState(isActive)

  if (wasActive !== isActive) {
    setWasActive(isActive)
    if (isActive) {
      setIsOpen(true)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={`/workspace/${workspace.slug}`} />}
          isActive={isActive}
        >
          {workspace.kind === "PERSONAL" ? (
            <UserIcon className="text-muted-foreground" />
          ) : (
            <BuildingIcon className="text-muted-foreground" />
          )}
          <span>{workspace.name}</span>
        </SidebarMenuButton>
        {workspace.installations.length > 0 && (
          <>
            <SidebarMenuAction
              render={<CollapsibleTrigger />}
              className="left-2 bg-sidebar-accent text-sidebar-accent-foreground data-open:rotate-90"
              showOnHover
            >
              <ChevronRightIcon />
            </SidebarMenuAction>
            <CollapsibleContent>
              <SidebarMenuSub>
                {workspace.installations.map(
                  (installation: AppShellInstallation) => {
                    const toolHome = workspaceRoutes.toolHome(
                      workspace.slug,
                      installation.toolDefinition.key
                    )
                    const Icon =
                      mapToolIcon(installation.toolDefinition.icon) ||
                      WrenchIcon

                    return (
                      <SidebarMenuSubItem key={installation.id}>
                        <SidebarMenuSubButton
                          render={<Link href={toolHome || "#"} />}
                        >
                          <Icon />
                          <span>{installation.toolDefinition.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  }
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        )}
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavWorkspaces({
  workspaces,
}: {
  workspaces: AppShellData
}) {
  const params = useParams()
  const currentSlug = params?.workspaceSlug as string | undefined

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {workspaces.map((workspace) => (
            <WorkspaceNavItem
              key={workspace.id}
              workspace={workspace}
              currentSlug={currentSlug}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

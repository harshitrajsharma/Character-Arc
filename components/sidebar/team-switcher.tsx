"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChevronDownIcon, BuildingIcon, UserIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"

export function TeamSwitcher({
  workspaces,
}: {
  workspaces: NonNullable<Awaited<ReturnType<typeof getAppShellData>>>
}) {
  const router = useRouter()
  const params = useParams()
  const currentSlug = params?.workspaceSlug as string | undefined

  const activeWorkspace = React.useMemo(() => {
    if (currentSlug) {
      const match = workspaces.find((w) => w.slug === currentSlug)
      if (match) return match
    }
    return workspaces[0]
  }, [workspaces, currentSlug])

  if (!activeWorkspace) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  className="w-fit px-1.5"
                  tooltip={activeWorkspace.name}
                />
              }
            >
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                {activeWorkspace.kind === "PERSONAL" ? <UserIcon className="size-3.5" /> : <BuildingIcon className="size-3.5" />}
              </div>
              <span className="truncate font-medium">{activeWorkspace.name}</span>
              <ChevronDownIcon className="opacity-50" />
            </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {workspaces.map((workspace, index) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => router.push(`/workspace/${workspace.slug}`)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-xs border">
                    {workspace.kind === "PERSONAL" ? <UserIcon className="size-4" /> : <BuildingIcon className="size-4" /> }
                  </div>
                  {workspace.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
          </DropdownMenu>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" />
        </div>
        <SidebarTrigger className="mt-1 hidden w-full justify-center group-data-[collapsible=icon]:flex" />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

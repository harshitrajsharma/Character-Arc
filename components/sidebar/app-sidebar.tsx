"use client"

import * as React from "react"
import { useParams, usePathname } from "next/navigation"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavWorkspaces } from "@/components/sidebar/nav-workspaces"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  HomeIcon,
  BlocksIcon,
  WrenchIcon,
} from "lucide-react"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>

export function AppSidebar({
  memberships,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  memberships: AppShellData
}) {
  const pathname = usePathname()
  const params = useParams()
  const currentSlug =
    typeof params?.workspaceSlug === "string"
      ? params.workspaceSlug
      : memberships[0]?.slug

  const sidebarMain = [
    {
      title: "Home",
      url: "/dashboard",
      icon: <HomeIcon />,
      isActive: pathname === "/dashboard",
    },
    ...(currentSlug
      ? [
          {
            title: "Workspace",
            url: `/workspace/${currentSlug}`,
            icon: <BlocksIcon />,
            isActive: pathname === `/workspace/${currentSlug}`,
          },
        ]
      : []),
    {
      title: "Tools",
      url: "/tools",
      icon: <WrenchIcon />,
      isActive: pathname === "/tools" || pathname.startsWith("/tools/"),
    },
  ]

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher workspaces={memberships} />
        <NavMain items={sidebarMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspaces workspaces={memberships} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

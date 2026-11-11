"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  HistoryIcon,
  LibraryIcon,
  SettingsIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { mapToolIcon } from "@/lib/tools/presentation"
import {
  getLearningDestinations,
  isNavbarDestinationActive,
  resolveNavigationWorkspace,
} from "@/components/navigation/navbar-data"
import { NavMain } from "@/components/sidebar/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useSettings } from "@/components/settings/settings-provider"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>

export function AppSidebar({
  memberships,
  ...props
}: React.ComponentProps<typeof Sidebar> & { memberships: AppShellData }) {
  const pathname = usePathname()
  const { openSettings } = useSettings()
  const workspace = resolveNavigationWorkspace(pathname, memberships)
  const currentSlug = workspace?.slug
  const keys =
    workspace?.installations.map(
      (installation) => installation.toolDefinition.key
    ) ?? []
  const questionBank = currentSlug
    ? workspaceRoutes.mockTests.questions(currentSlug)
    : null
  const main = getLearningDestinations(currentSlug, keys).map((item) => ({
    title: item.label,
    url: item.href,
    icon: <item.icon />,
    isActive:
      isNavbarDestinationActive(pathname, item) &&
      !(
        item.key === "assessments" &&
        questionBank &&
        pathname.startsWith(questionBank)
      ) &&
      !(
        item.key === "exam-prep" &&
        workspace?.exams.some((exam) => {
          const url = workspaceRoutes.examPrep.exam(workspace.slug, exam.id)
          return pathname === url || pathname.startsWith(url + "/")
        })
      ),
  }))
  const library =
    currentSlug && keys.includes("core.mock-tests")
      ? [
          {
            title: "Question bank",
            url: workspaceRoutes.mockTests.questions(currentSlug),
            icon: <LibraryIcon />,
            isActive: pathname.startsWith(
              workspaceRoutes.mockTests.questions(currentSlug)
            ),
          },
          {
            title: "Community",
            url: `${workspaceRoutes.mockTests.home(currentSlug)}?tab=community`,
            icon: <UsersIcon />,
          },
          {
            title: "Attempt history",
            url: `${workspaceRoutes.mockTests.home(currentSlug)}?tab=attempts`,
            icon: <HistoryIcon />,
          },
        ]
      : []
  const otherTools =
    workspace?.installations
      .filter(
        (installation) =>
          !["core.exam-prep", "core.mock-tests"].includes(
            installation.toolDefinition.key
          )
      )
      .flatMap((installation) => {
        const url = workspaceRoutes.toolHome(
          workspace.slug,
          installation.toolDefinition.key
        )
        if (!url) return []
        const Icon = mapToolIcon(installation.toolDefinition.icon) || WrenchIcon
        return [
          {
            title: installation.toolDefinition.name,
            url,
            icon: <Icon />,
            isActive: pathname === url || pathname.startsWith(url + "/"),
          },
        ]
      }) ?? []

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex justify-end group-data-[collapsible=icon]:justify-center">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMain items={main} />
          </SidebarGroupContent>
        </SidebarGroup>
        {workspace &&
        keys.includes("core.exam-prep") &&
        workspace.exams.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Active exams</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMain
                items={workspace.exams.map((exam) => {
                  const url = workspaceRoutes.examPrep.exam(
                    workspace.slug,
                    exam.id
                  )
                  return {
                    title: exam.title,
                    url,
                    icon: <BookOpenIcon />,
                    isActive:
                      pathname === url || pathname.startsWith(url + "/"),
                  }
                })}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {library.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Assessment library</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMain items={library} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {otherTools.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Other tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMain items={otherTools} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Tool catalog"
              isActive={pathname.startsWith("/tools")}
              render={
                <Link
                  href="/tools"
                  aria-current={
                    pathname.startsWith("/tools") ? "page" : undefined
                  }
                />
              }
            >
              <WrenchIcon />
              <span>Tool catalog</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {currentSlug ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Workspace settings"
                onClick={() => openSettings("workspace", currentSlug)}
              >
                <SettingsIcon />
                <span>Workspace settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

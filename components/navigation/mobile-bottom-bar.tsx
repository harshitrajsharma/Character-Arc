"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  HomeIcon,
  BlocksIcon,
  WrenchIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  UserIcon,
  BuildingIcon,
  ChevronRightIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useSettings } from "@/components/settings/settings-provider"
import { mapToolIcon } from "@/components/tools/tool-catalog-card"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "@/lib/auth/actions"
import { Spinner } from "@/components/ui/spinner"
import { type NavbarUser } from "./navbar-data"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>
type AppShellInstallation = AppShellData[number]["installations"][number]

type MobileBottomBarProps = {
  user?: NavbarUser
  memberships?: AppShellData
}

export function MobileBottomBar({ user, memberships }: MobileBottomBarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { openSettings } = useSettings()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [isSigningOut, startSignOut] = React.useTransition()
  const isDark = theme === "dark"

  const primaryWorkspace = memberships?.[0]
  const currentSlug = primaryWorkspace?.slug

  const isToday = pathname === "/dashboard" || pathname === "/"
  const isWorkspace = pathname.startsWith("/workspace")
  const isTools = pathname.startsWith("/tools")

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/80 backdrop-blur-xl sm:hidden pb-[env(safe-area-inset-bottom)]">
      <nav aria-label="Mobile Navigation" className="flex h-16 items-center justify-around px-2">
        {/* Today Tab */}
        <Link
          href="/dashboard"
          aria-current={isToday ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            isToday
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-all",
              isToday ? "bg-foreground/10 text-foreground" : ""
            )}
          >
            <HomeIcon className="size-4.5" aria-hidden="true" />
          </span>
          <span>Today</span>
        </Link>

        {currentSlug ? (
          <Link
            href={`/workspace/${encodeURIComponent(currentSlug)}`}
            aria-current={isWorkspace ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isWorkspace
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-all",
                isWorkspace ? "bg-foreground/10 text-foreground" : ""
              )}
            >
              <BlocksIcon className="size-4.5" aria-hidden="true" />
            </span>
            <span>Workspace</span>
          </Link>
        ) : null}

        {/* Tools Tab */}
        <Link
          href="/tools"
          aria-current={isTools ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            isTools
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-all",
              isTools ? "bg-foreground/10 text-foreground" : ""
            )}
          >
            <WrenchIcon className="size-4.5" aria-hidden="true" />
          </span>
          <span>Tools</span>
        </Link>

        {/* More / Drawer Tab */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger
            aria-label="Open more menu"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              drawerOpen
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-all",
                drawerOpen ? "bg-foreground/10 text-foreground" : ""
              )}
            >
              <MoreHorizontalIcon className="size-4.5" aria-hidden="true" />
            </span>
            <span>More</span>
          </SheetTrigger>

          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border/50 p-6">
            <SheetHeader className="pb-4 text-left">
              <div className="flex items-center gap-3">
                {user ? (
                  <Avatar size="default">
                    {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                    <AvatarFallback>{user.initials || "CA"}</AvatarFallback>
                  </Avatar>
                ) : null}
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-base font-semibold">
                    {user?.name || "Character Arc"}
                  </SheetTitle>
                  <SheetDescription className="truncate text-xs">
                    {user?.email || "Signed in"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Workspaces & Installed Tools */}
            {memberships && memberships.length > 0 ? (
              <div className="space-y-4 py-3">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Workspaces & Tools
                </p>
                <div className="space-y-2">
                  {memberships.map((ws) => (
                    <div
                      key={ws.id}
                      className="rounded-2xl border border-border/50 bg-background/50 p-3"
                    >
                      <Link
                        href={`/workspace/${encodeURIComponent(ws.slug)}`}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-between font-medium text-foreground hover:text-primary"
                      >
                        <div className="flex items-center gap-2.5">
                          {ws.kind === "PERSONAL" ? (
                            <UserIcon className="size-4 text-muted-foreground" />
                          ) : (
                            <BuildingIcon className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{ws.name}</span>
                        </div>
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </Link>

                      {ws.installations.length > 0 ? (
                        <div className="mt-2.5 space-y-1 border-t border-border/30 pt-2.5">
                          {ws.installations.map((installation: AppShellInstallation) => {
                            const toolHome = workspaceRoutes.toolHome(
                              ws.slug,
                              installation.toolDefinition.key
                            )
                            const Icon =
                              mapToolIcon(installation.toolDefinition.icon) ||
                              WrenchIcon

                            return (
                              <Link
                                key={installation.id}
                                href={toolHome || "#"}
                                onClick={() => setDrawerOpen(false)}
                                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <Icon className="size-3.5" />
                                <span>{installation.toolDefinition.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Quick Actions & Settings */}
            <div className="space-y-1 border-t border-border/40 py-3">
        {/* Workspace Tab */}
        {currentSlug ? (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false)
                    openSettings("workspace", currentSlug)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent text-left"
                >
                  <SettingsIcon className="size-4 text-muted-foreground" />
                  <span>Settings</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent text-left"
              >
                {isDark ? (
                  <SunIcon className="size-4 text-muted-foreground" />
                ) : (
                  <MoonIcon className="size-4 text-muted-foreground" />
                )}
                <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
              </button>

              <button
                type="button"
                disabled={isSigningOut}
                onClick={() =>
                  startSignOut(async () => {
                    await signOut()
                  })
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 text-left"
              >
                {isSigningOut ? (
                  <Spinner className="size-4" />
                ) : (
                  <LogOutIcon className="size-4" />
                )}
                <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}

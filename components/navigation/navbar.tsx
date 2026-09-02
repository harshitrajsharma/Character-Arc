"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"

import { NavbarAccountMenu } from "./navbar-account-menu"
import { type NavbarDestinationKey, type NavbarUser } from "./navbar-data"
import { NavbarNotifications } from "./navbar-notifications"
import { NavbarPrimaryLinks } from "./navbar-primary-links"
import { NavbarBreadcrumbs, resolvePathnameBreadcrumbs } from "./navbar-breadcrumbs"
import { useBreadcrumb } from "./breadcrumb-context"
import { NavbarSearch } from "./navbar-search"
import { NavClock } from "./nav-clock"
import { DayPulse } from "./day-pulse"
import { dayProgress, getDayPhase } from "./day-phase"

import type { getAppShellData } from "@/lib/workspaces/workspace-access"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>

type NavbarProps = {
  user?: NavbarUser
  memberships?: AppShellData
}

export function Navbar({ user, memberships }: NavbarProps) {
  const pathname = usePathname()
  const { breadcrumbs } = useBreadcrumb()
  const [now, setNow] = useState<Date | null>(null)
  const isAuthenticated = Boolean(user)
  const primaryWorkspaceSlug = memberships?.[0]?.slug

  useEffect(() => {
    const update = () => setNow(new Date())
    update()

    const interval = window.setInterval(update, 60000)
    return () => window.clearInterval(interval)
  }, [])

  const pathActive: NavbarDestinationKey = isAuthenticated
    ? pathname.startsWith("/tools")
      ? "tools"
      : pathname.startsWith("/workspace")
        ? "workspace"
        : "today"
    : "today"

  const [selectedOverride, setSelectedOverride] =
    useState<NavbarDestinationKey | null>(null)
  const [lastSyncedPathname, setLastSyncedPathname] = useState(pathname)
  if (lastSyncedPathname !== pathname) {
    setLastSyncedPathname(pathname)
    setSelectedOverride(null)
  }
  const active = selectedOverride ?? pathActive

  const progress = now ? dayProgress() : 0
  const phase = getDayPhase(progress)
  const homeHref = user ? "/dashboard" : "/"

  // Check if we are on a deep page that should show breadcrumbs above md breakpoint
  const resolvedBreadcrumbs = breadcrumbs || resolvePathnameBreadcrumbs(pathname, primaryWorkspaceSlug)
  const isDeepPage = Boolean(resolvedBreadcrumbs && resolvedBreadcrumbs.segments.length > 0)

  return (
    <header className="fixed inset-x-0 top-0 z-30 w-full backdrop-blur-xl">
      {user ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 w-full transition-opacity duration-700 ease-out"
          style={{
            opacity: now ? 1 : 0,
            background: `linear-gradient(
        180deg,
        color-mix(in oklch, ${phase.cssVar} 20%, transparent) 0%,
        color-mix(in oklch, ${phase.accentCssVar} 10%, transparent) 45%,
        transparent 100%
      )`,
          }}
        />
      ) : null}
      <div className="flex h-15 items-center gap-2 px-4 md:gap-14">
        
        <Link
          href={homeHref}
          className="min-w-0 justify-self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-brand-neon-line"
          aria-label={user ? "Character Arc dashboard" : "Character Arc home"}
          onClick={() => setSelectedOverride("today")}
        >
          <CharacterArcLogo />
        </Link>

        {user ? (
          <div className="hidden items-center justify-start md:flex xl:pointer-events-none xl:absolute xl:inset-y-0 xl:left-1/2 xl:w-full xl:max-w-6xl xl:-translate-x-1/2 xl:px-16">
            <div className="pointer-events-auto">
              {isDeepPage ? (
                <NavbarBreadcrumbs workspaceSlug={primaryWorkspaceSlug} />
              ) : (
                <NavbarPrimaryLinks active={active} onSelect={setSelectedOverride} workspaceSlug={primaryWorkspaceSlug} />
              )}
            </div>
          </div>
        ) : null}

        <div className="ml-auto flex min-w-0 items-center gap-1 text-muted-foreground">
          <NavClock />
          {user ? (
            <>
              <NavbarSearch onSelect={setSelectedOverride} memberships={memberships} />
              <NavbarNotifications />
              <NavbarAccountMenu user={user} onSelect={setSelectedOverride} workspaceSlug={primaryWorkspaceSlug} />
            </>
          ) : null}

          <span
            aria-hidden="true"
            className="mx-2 hidden h-7 w-px bg-border md:block"
          />

          <DayPulse />
        </div>
      </div>
    </header>
  )
}

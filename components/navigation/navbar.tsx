"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { NavbarAccountMenu } from "./navbar-account-menu"
import { type NavbarDestinationKey, type NavbarUser } from "./navbar-data"
import { NavbarNotifications } from "./navbar-notifications"
import { NavbarPrimaryLinks } from "./navbar-primary-links"
import { NavbarSearch } from "./navbar-search"
import { NavClock } from "./nav-clock"
import { DayPulse } from "./day-pulse"

type NavbarProps = {
  user?: NavbarUser
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const [active, setActive] = useState<NavbarDestinationKey>("today")
  const isAuthenticated = Boolean(user)

  useEffect(() => {
    if (!isAuthenticated) return

    const syncHash = () => {
      if (pathname === "/tools" || pathname.startsWith("/tools/")) setActive("tools")
      else if (pathname === "/workspace" || pathname.startsWith("/workspace/")) setActive("workspace")
      else if (window.location.hash === "#workspace") setActive("workspace")
      else if (window.location.hash === "#tools") setActive("tools")
      else setActive("today")
    }

    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [isAuthenticated, pathname])

  const homeHref = user ? "/dashboard" : "/"

  return (
    <header className="fixed inset-x-0 top-0 z-30 w-full backdrop-blur-xl">
      <div className="flex h-15 items-center justify-between gap-2 px-4 md:gap-14">
        <Link
          href={homeHref}
          className="min-w-0 justify-self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-brand-neon-line"
          aria-label={user ? "Character Arc dashboard" : "Character Arc home"}
          onClick={() => setActive("today")}
        >
          <CharacterArcLogo />
        </Link>

        {user ? (
          <div className="hidden items-center justify-start sm:flex xl:pointer-events-none xl:absolute xl:inset-y-0 xl:left-1/2 xl:w-full xl:max-w-6xl xl:-translate-x-1/2 xl:px-8">
            <div className="pointer-events-auto">
              <NavbarPrimaryLinks active={active} onSelect={setActive} />
            </div>
          </div>
        ) : null}

        <div className="ml-auto flex min-w-0 items-center gap-1 text-muted-foreground">
          <NavClock />
          {user ? (
            <>
              <NavbarSearch onSelect={setActive} />
              <NavbarNotifications />
              <NavbarAccountMenu user={user} onSelect={setActive} />
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

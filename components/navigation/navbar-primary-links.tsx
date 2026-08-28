"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { getNavbarDestinations, type NavbarDestinationKey } from "./navbar-data"

type NavbarPrimaryLinksProps = {
  active: NavbarDestinationKey
  onSelect: (destination: NavbarDestinationKey) => void
  workspaceSlug?: string
}

export function NavbarPrimaryLinks({
  active,
  onSelect,
  workspaceSlug,
}: NavbarPrimaryLinksProps) {
  const destinations = getNavbarDestinations(workspaceSlug)

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 p-1 backdrop-blur-md">
      {destinations.map((item) => {
        const Icon = item.icon
        const isActive = active === item.key

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            onClick={() => onSelect(item.key)}
            className={cn(
              "group relative flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-all duration-200 outline-none select-none",
              isActive
                ? "bg-foreground/10 font-semibold text-foreground shadow-xs dark:bg-foreground/15"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <Icon
              className={cn(
                "size-3.5 transition-transform duration-150 group-hover:scale-110",
                isActive && "text-foreground"
              )}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

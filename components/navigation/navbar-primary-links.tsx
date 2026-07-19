"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { NAVBAR_DESTINATIONS, type NavbarDestinationKey } from "./navbar-data"

type NavbarPrimaryLinksProps = {
  active: NavbarDestinationKey
  onSelect: (destination: NavbarDestinationKey) => void
}

export function NavbarPrimaryLinks({
  active,
  onSelect,
}: NavbarPrimaryLinksProps) {
  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      {NAVBAR_DESTINATIONS.map((item) => {
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
              "group relative flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 lg:px-3",
              isActive && "font-semibold"
            )}
          >
            <Icon
              className="size-4 transition-transform duration-150 group-hover:-rotate-3"
              aria-hidden="true"
            />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

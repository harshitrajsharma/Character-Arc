import { BlocksIcon, HomeIcon, WrenchIcon, type LucideIcon } from "lucide-react"

export type NavbarDestinationKey = "today" | "workspace" | "tools"

export type NavbarDestination = {
  key: NavbarDestinationKey
  label: string
  description: string
  href: string
  icon: LucideIcon
  keywords: string
}

export type NavbarUser = {
  name: string
  email: string
  avatarUrl?: string
  initials: string
}

export function getNavbarDestinations(workspaceSlug?: string): NavbarDestination[] {
  const destinations: NavbarDestination[] = [
    {
      key: "today",
      label: "Today",
      description: "Your current arc and next move",
      href: "/dashboard",
      icon: HomeIcon,
      keywords: "home dashboard now focus daily momentum",
    },
  ]

  if (!workspaceSlug) {
    destinations.push({
      key: "tools",
      label: "Tools",
      description: "Discover and install tool systems",
      href: "/tools",
      icon: WrenchIcon,
      keywords: "quiz skills paths connectors installed catalog store",
    })
    return destinations
  }

  destinations.push(
    {
      key: "workspace",
      label: "Workspace",
      description: "Your private context boundary and active tools",
      href: `/workspace/${encodeURIComponent(workspaceSlug)}`,
      icon: BlocksIcon,
      keywords: "blocks context personal private workspace tools data",
    },
    {
      key: "tools",
      label: "Tools",
      description: "Discover and install tool systems",
      href: "/tools",
      icon: WrenchIcon,
      keywords: "quiz skills paths connectors installed catalog store",
    }
  )

  return destinations
}

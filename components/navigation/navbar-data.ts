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

export const NAVBAR_DESTINATIONS: NavbarDestination[] = [
  {
    key: "today",
    label: "Today",
    description: "Your current arc and next move",
    href: "/dashboard",
    icon: HomeIcon,
    keywords: "home dashboard now focus",
  },
  {
    key: "workspace",
    label: "Workspace",
    description: "Your private context boundary",
    href: "/dashboard#workspace",
    icon: BlocksIcon,
    keywords: "blocks context personal private",
  },
  {
    key: "tools",
    label: "Tools",
    description: "Installed systems and outcomes",
    href: "/tools",
    icon: WrenchIcon,
    keywords: "quiz skills paths connectors installed",
  },
]

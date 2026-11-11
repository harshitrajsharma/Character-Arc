import { RouteIcon, ListChecksIcon, type LucideIcon } from "lucide-react"
export const toolIconByKey: Record<string, LucideIcon> = {
  route: RouteIcon,
  "list-checks": ListChecksIcon,
}

export function mapToolIcon(
  iconKey: string | null | undefined
): LucideIcon | null {
  if (!iconKey) return null
  return toolIconByKey[iconKey] || null
}

export const categoryLabel = {
  learn: "Learn",
  plan: "Plan",
  decide: "Decide",
  track: "Track",
  practice: "Practice",
  connect: "Connect",
} as const

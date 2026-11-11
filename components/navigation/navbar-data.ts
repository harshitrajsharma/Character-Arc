import {
  BlocksIcon,
  BookOpenIcon,
  FileCheckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

export type NavbarDestinationKey =
  "workspace" | "exam-prep" | "assessments" | "tools"

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

export function getNavbarDestinations(
  workspaceSlug?: string
): NavbarDestination[] {
  return [
    {
      key: "workspace",
      label: "Workspace",
      description: "Your exams, subjects and assessments",
      href: workspaceSlug
        ? `/workspace/${encodeURIComponent(workspaceSlug)}`
        : "/workspace",
      icon: BlocksIcon,
      keywords: "home workspace subjects exams tests assessments",
    },
    {
      key: "tools",
      label: "Tools",
      description: "Discover and install tool systems",
      href: "/tools",
      icon: WrenchIcon,
      keywords: "quiz skills paths connectors installed catalog store",
    },
  ]
}

/** Match a primary destination while respecting path boundaries. */
export function isNavbarDestinationActive(
  pathname: string,
  destination: NavbarDestination
) {
  if (destination.key === "workspace")
    return (
      pathname === destination.href ||
      pathname === "/workspace" ||
      pathname === "/dashboard"
    )
  return (
    pathname === destination.href || pathname.startsWith(destination.href + "/")
  )
}

/** Installed learning tools stay one tap away without duplicating Workspace. */
export function getLearningDestinations(
  workspaceSlug: string | undefined,
  installedKeys: readonly string[]
) {
  const home = getNavbarDestinations(workspaceSlug)[0]
  if (!workspaceSlug) return [home]
  const prefix = `/workspace/${encodeURIComponent(workspaceSlug)}`
  return [
    home,
    ...(installedKeys.includes("core.exam-prep")
      ? [
          {
            key: "exam-prep" as const,
            label: "Exam Prep",
            description: "Exams, subjects, syllabus and subject tests",
            href: `${prefix}/exam-prep`,
            icon: BookOpenIcon,
            keywords: "exam subject syllabus study test",
          },
        ]
      : []),
    ...(installedKeys.includes("core.mock-tests")
      ? [
          {
            key: "assessments" as const,
            label: "Assessments",
            description: "Papers, community and attempt history",
            href: `${prefix}/assessments`,
            icon: FileCheckIcon,
            keywords: "mock test paper assessment attempt",
          },
        ]
      : []),
  ]
}
export function resolveNavigationWorkspace<T extends { slug: string }>(
  pathname: string,
  memberships: readonly T[]
) {
  const segment =
    pathname.split("/")[1] === "workspace" ? pathname.split("/")[2] : undefined
  let slug: string | undefined
  try {
    slug = segment ? decodeURIComponent(segment) : undefined
  } catch {
    /* Invalid route encoding falls back to a known membership. */
  }
  return (
    memberships.find((workspace) => workspace.slug === slug) ?? memberships[0]
  )
}

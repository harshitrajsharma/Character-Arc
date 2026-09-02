"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { useBreadcrumb, type BreadcrumbSegment } from "./breadcrumb-context"
import { cn } from "@/lib/utils"

function formatToolSlug(slug: string): string {
  if (slug === "core.exam-prep" || slug === "exam-prep") return "Exam Prep"
  if (slug === "core.goals-paths" || slug === "goals-paths") return "Goals & Paths"
  if (slug === "core.mock-tests" || slug === "mock-tests") return "Mock Tests"
  return slug
    .replace(/^core./, "")
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

export function resolvePathnameBreadcrumbs(
  pathname: string,
  workspaceSlug?: string
): { segments: BreadcrumbSegment[]; backHref?: string; backLabel?: string } | null {
  // Root primary pages - show primary links instead of breadcrumbs
  if (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/tools" ||
    (workspaceSlug && pathname === `/workspace/${encodeURIComponent(workspaceSlug)}`)
  ) {
    return null
  }

  // Workspace subpages
  if (pathname.startsWith("/workspace/")) {
    const parts = pathname.split("/").filter(Boolean)
    // parts = ['workspace', slug, toolKey, ...]
    const currentSlug = parts[1] || workspaceSlug || ""
    const wsHome = `/workspace/${encodeURIComponent(currentSlug)}`

    if (parts.length === 2) {
      // /workspace/[slug] -> root workspace page
      return null
    }

    const tool = parts[2]
    if (tool === "exam-prep") {
      const examHome = `${wsHome}/exam-prep`
      if (parts.length === 3) {
        return {
          segments: [
            { label: "Workspace", href: wsHome },
            { label: "Exam Prep" },
          ],
          backHref: wsHome,
        }
      }
      if (parts[3] === "new") {
        return {
          segments: [
            { label: "Exam Prep", href: examHome },
            { label: "New Exam" },
          ],
          backHref: examHome,
        }
      }
      const examId = parts[3]
      const examUrl = `${examHome}/${encodeURIComponent(examId)}`
      if (parts.length === 4) {
        return {
          segments: [
            { label: "Exam Prep", href: examHome },
            { label: "Exam Details" },
          ],
          backHref: examHome,
        }
      }
      if (parts[4] === "settings") {
        return {
          segments: [
            { label: "Exam Prep", href: examHome },
            { label: "Exam", href: examUrl },
            { label: "Settings" },
          ],
          backHref: examUrl,
        }
      }
      if (parts[4] === "subjects" && parts[5]) {
        return {
          segments: [
            { label: "Exam", href: examUrl },
            { label: "Subject" },
          ],
          backHref: examUrl,
        }
      }
    }

    if (tool === "mock-tests") {
      const mockHome = `${wsHome}/mock-tests`
      if (parts.length === 3) {
        return {
          segments: [
            { label: "Workspace", href: wsHome },
            { label: "Mock Tests" },
          ],
          backHref: wsHome,
        }
      }
      if (parts[3] === "authoring") {
        return {
          segments: [
            { label: "Mock Tests", href: mockHome },
            { label: "Authoring" },
          ],
          backHref: mockHome,
        }
      }
      if (parts[3] === "questions") {
        if (parts[4] === "new") {
          return {
            segments: [
              { label: "Questions", href: `${mockHome}/questions` },
              { label: "New Question" },
            ],
            backHref: `${mockHome}/questions`,
          }
        }
        return {
          segments: [
            { label: "Mock Tests", href: mockHome },
            { label: "Question Bank" },
          ],
          backHref: mockHome,
        }
      }
      if (parts[3] === "new") {
        return {
          segments: [
            { label: "Mock Tests", href: mockHome },
            { label: "New Test" },
          ],
          backHref: mockHome,
        }
      }
      if (parts[3] === "attempts" && parts[5] === "analysis") {
        return {
          segments: [
            { label: "Mock Tests", href: mockHome },
            { label: "Attempt Analysis" },
          ],
          backHref: mockHome,
        }
      }
      const testId = parts[3]
      const testUrl = `${mockHome}/${encodeURIComponent(testId)}`
      if (parts[4] === "edit") {
        return {
          segments: [
            { label: "Mock Tests", href: mockHome },
            { label: "Test Paper", href: testUrl },
            { label: "Edit" },
          ],
          backHref: testUrl,
        }
      }
      return {
        segments: [
          { label: "Mock Tests", href: mockHome },
          { label: "Test Paper" },
        ],
        backHref: mockHome,
      }
    }

    if (tool === "goals-paths") {
      const goalsHome = `${wsHome}/goals-paths`
      if (parts.length === 3) {
        return {
          segments: [
            { label: "Workspace", href: wsHome },
            { label: "Goals & Paths" },
          ],
          backHref: wsHome,
        }
      }
      if (parts[3] === "new") {
        return {
          segments: [
            { label: "Goals & Paths", href: goalsHome },
            { label: "New Arc" },
          ],
          backHref: goalsHome,
        }
      }
      const arcId = parts[3]
      const arcUrl = `${goalsHome}/${encodeURIComponent(arcId)}`
      if (parts[4] === "edit") {
        return {
          segments: [
            { label: "Goals & Paths", href: goalsHome },
            { label: "Arc", href: arcUrl },
            { label: "Edit" },
          ],
          backHref: arcUrl,
        }
      }
      return {
        segments: [
          { label: "Goals & Paths", href: goalsHome },
          { label: "Arc Details" },
        ],
        backHref: goalsHome,
      }
    }

    return {
      segments: [
        { label: "Workspace", href: wsHome },
        { label: formatToolSlug(tool) },
      ],
      backHref: wsHome,
    }
  }

  // /tools/[toolSlug]
  if (pathname.startsWith("/tools/")) {
    const slug = pathname.replace("/tools/", "")
    return {
      segments: [
        { label: "Tools", href: "/tools" },
        { label: formatToolSlug(slug) },
      ],
      backHref: "/tools",
    }
  }

  return null
}

export function NavbarBreadcrumbs({
  workspaceSlug,
}: {
  workspaceSlug?: string
}) {
  const pathname = usePathname()
  const { breadcrumbs } = useBreadcrumb()

  const resolved = breadcrumbs || resolvePathnameBreadcrumbs(pathname, workspaceSlug)

  if (!resolved || !resolved.segments.length) {
    return null
  }

  const { segments, backHref, backLabel = "Go back" } = resolved

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 p-1 backdrop-blur-md max-w-[52vw] xl:max-w-[58vw] shadow-2xs animate-in fade-in zoom-in-95 duration-150"
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}

      <div className="flex items-center gap-1 min-w-0">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1

          return (
            <React.Fragment key={`${segment.label}-${idx}`}>
              {idx > 0 && (
                <ChevronRightIcon
                  className="size-3 shrink-0 text-muted-foreground/40"
                  aria-hidden="true"
                />
              )}

              {isLast || !segment.href ? (
                <span
                  aria-current="page"
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs select-none truncate",
                    isLast
                      ? "bg-foreground/10 font-semibold text-foreground shadow-xs dark:bg-foreground/15 max-w-36 sm:max-w-56 md:max-w-64"
                      : "font-medium text-muted-foreground max-w-28 sm:max-w-40"
                  )}
                >
                  <span className="truncate">{segment.label}</span>
                </span>
              ) : (
                <Link
                  href={segment.href}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-w-28 sm:max-w-40 truncate select-none"
                >
                  <span className="truncate">{segment.label}</span>
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </nav>
  )
}

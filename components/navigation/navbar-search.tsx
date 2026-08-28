"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useSettings } from "@/components/settings/settings-provider"
import {
  SearchIcon,
  WrenchIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  LayersIcon,
  BookOpenIcon,
  TargetIcon,
  FileCheckIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { mapToolIcon } from "@/components/tools/tool-catalog-card"
import type { getAppShellData } from "@/lib/workspaces/workspace-access"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getNavbarDestinations, type NavbarDestinationKey } from "./navbar-data"
import { cn } from "@/lib/utils"

type AppShellData = NonNullable<Awaited<ReturnType<typeof getAppShellData>>>
type AppShellInstallation = AppShellData[number]["installations"][number]

type CommandCategory = "Navigation" | "Workspace & Tools" | "Quick Actions"

type SearchResult = {
  key: string
  label: string
  description: string
  category: CommandCategory
  href?: string
  action?: () => void
  icon: React.ElementType
  badge?: string
}

type NavbarSearchProps = {
  onSelect: (destination: NavbarDestinationKey) => void
  memberships?: AppShellData
}

const LISTBOX_ID = "navbar-search-results"

export function NavbarSearch({ onSelect, memberships }: NavbarSearchProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { openSettings } = useSettings()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const primaryWorkspace = memberships?.[0]
  const primarySlug = primaryWorkspace?.slug

  const setSearchOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    setSelectedIndex(0)
    if (!nextOpen) {
      setQuery("")
      return
    }
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    const toggleSearch = (event: globalThis.KeyboardEvent) => {
      const usesSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"

      if (!usesSearchShortcut) return

      event.preventDefault()
      setSearchOpen(!open)
    }

    window.addEventListener("keydown", toggleSearch)
    return () => window.removeEventListener("keydown", toggleSearch)
  }, [open, setSearchOpen])

  const allDestinations = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = []

    // 1. Navigation items
    const navItems = getNavbarDestinations(primarySlug)
    navItems.forEach((dest) => {
      items.push({
        key: dest.key,
        label: dest.label,
        description: dest.description,
        category: "Navigation",
        href: dest.href,
        icon: dest.icon,
      })
    })

    // 2. Workspaces & Installed Tools
    if (memberships) {
      memberships.forEach((workspace) => {
        items.push({
          key: `workspace-${workspace.id}`,
          label: workspace.name,
          description: `${workspace.kind === "PERSONAL" ? "Personal" : "Team"} Workspace`,
          category: "Workspace & Tools",
          href: `/workspace/${encodeURIComponent(workspace.slug)}`,
          icon: LayersIcon,
          badge: "Workspace",
        })

        workspace.installations.forEach((installation: AppShellInstallation) => {
          const toolHome = workspaceRoutes.toolHome(
            workspace.slug,
            installation.toolDefinition.key
          )
          if (toolHome) {
            items.push({
              key: `tool-${installation.id}`,
              label: installation.toolDefinition.name,
              description: `Tool in ${workspace.name}`,
              category: "Workspace & Tools",
              href: toolHome,
              icon: mapToolIcon(installation.toolDefinition.icon) || WrenchIcon,
              badge: "Installed",
            })
          }
        })
      })
    }

    // 3. Quick Actions
    if (primarySlug) {
      items.push(
        {
          key: "action-new-goal",
          label: "New Goal or Character Arc",
          description: "Define a new target milestone in Goals & Paths",
          category: "Quick Actions",
          href: workspaceRoutes.goalsPaths.new(primarySlug),
          icon: TargetIcon,
          badge: "Action",
        },
        {
          key: "action-new-exam",
          label: "Add Exam & Syllabus",
          description: "Setup a syllabus tracker in Exam Prep",
          category: "Quick Actions",
          href: workspaceRoutes.examPrep.new(primarySlug),
          icon: BookOpenIcon,
          badge: "Action",
        },
        {
          key: "action-new-mock",
          label: "Create Mock Test",
          description: "Author or generate a new practice test",
          category: "Quick Actions",
          href: workspaceRoutes.mockTests.new(primarySlug),
          icon: FileCheckIcon,
          badge: "Action",
        },
        {
          key: "action-settings",
          label: "Workspace Settings",
          description: "Configure workspace, members, appearance, and MCP tokens",
          category: "Quick Actions",
          action: () => {
            setOpen(false)
            openSettings("workspace", primarySlug)
          },
          icon: SettingsIcon,
          badge: "Settings",
        }
      )
    }

    // Global toggle theme action
    items.push({
      key: "action-toggle-theme",
      label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      description: "Toggle app appearance",
      category: "Quick Actions",
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
      icon: theme === "dark" ? SunIcon : MoonIcon,
      badge: "Theme",
    })

    return items
  }, [memberships, primarySlug, theme, setTheme, openSettings])

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return allDestinations

    return allDestinations.filter((item) =>
      `${item.label} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(normalized)
    )
  }, [query, allDestinations])

  function executeResult(item: SearchResult) {
    if (item.action) {
      item.action()
      setSearchOpen(false)
      return
    }

    if (item.href) {
      if (item.key === "today" || item.key === "workspace" || item.key === "tools") {
        onSelect(item.key as NavbarDestinationKey)
      }
      setSearchOpen(false)
      router.push(item.href)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length))
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (results[selectedIndex]) {
        executeResult(results[selectedIndex])
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              aria-label="Search Character Arc (Cmd+K)"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-full"
              )}
            />
          }
        >
          <SearchIcon className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Search or jump to...
          <KbdGroup className="ml-1.5">
            <Kbd>Ctrl</Kbd>
            <span aria-hidden="true">+</span>
            <Kbd>K</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      <DialogContent showCloseButton={false} className="gap-3 p-4 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Command & Search</DialogTitle>
          <DialogDescription>
            Search destinations, active tools, or run actions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <SearchIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="search"
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            aria-label="Search destinations and tools"
            aria-expanded
            aria-autocomplete="list"
            aria-controls={results.length ? LISTBOX_ID : undefined}
            aria-activedescendant={
              results[selectedIndex]
                ? `${LISTBOX_ID}-option-${results[selectedIndex].key}`
                : undefined
            }
            spellCheck={false}
            className="h-10 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
          />
          <Kbd className="hidden sm:inline-block">Esc</Kbd>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {results.length > 0
            ? `${results.length} result${results.length === 1 ? "" : "s"} available. Use arrow keys to navigate, Enter to select.`
            : "No results found."}
        </p>

        {results.length ? (
          <div
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Search results"
            className="flex max-h-80 flex-col gap-1 overflow-y-auto pt-1"
          >
            {results.map((item, index) => {
              const Icon = item.icon
              const isSelected = index === selectedIndex

              return (
                <button
                  type="button"
                  key={item.key}
                  id={`${LISTBOX_ID}-option-${item.key}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => executeResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                  {item.badge ? (
                    <span className="shrink-0 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <Empty variant="compact">
            <EmptyHeader>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Try searching for &quot;Today&quot;, &quot;Exam&quot;, &quot;Goal&quot;, or &quot;Settings&quot;.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </DialogContent>
    </Dialog>
  )
}

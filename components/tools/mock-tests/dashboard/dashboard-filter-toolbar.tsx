"use client"

import { useEffect, useId, useRef } from "react"
import {
  BookOpenIcon,
  GlobeIcon,
  LayoutGridIcon,
  ListIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { DashboardFilterToolbarProps } from "./types"

const PAPER_TYPES = [
  {
    id: "ALL",
    label: "All Types",
    activeClass: "bg-foreground text-background border-foreground shadow-2xs font-semibold",
  },
  {
    id: "full_length",
    label: "Full-Length Mock",
    activeClass: "border-sky-500 bg-sky-500 text-white shadow-2xs font-semibold",
  },
  {
    id: "multi_subject",
    label: "Multi-Subject",
    activeClass: "border-teal-500 bg-teal-500 text-white shadow-2xs font-semibold",
  },
  {
    id: "subject_wise",
    label: "Subject Test",
    activeClass: "border-emerald-500 bg-emerald-500 text-white shadow-2xs font-semibold",
  },
  {
    id: "topic_wise",
    label: "Topic Drill",
    activeClass: "border-amber-500 bg-amber-500 text-white shadow-2xs font-semibold",
  },
  {
    id: "pyq",
    label: "PYQ",
    activeClass: "border-cyan-500 bg-cyan-500 text-white shadow-2xs font-semibold",
  },
]

export function DashboardFilterToolbar({
  activeTab,
  onTabChange,
  workspaceCount,
  communityCount,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  selectedPaperType,
  onSelectPaperType,
  workspaceStatus,
  onWorkspaceStatusChange,
  workspaceSortBy,
  onWorkspaceSortByChange,
  communityScope,
  onCommunityScopeChange,
  communitySortBy,
  onCommunitySortByChange,
  hasActiveFilters,
  onResetFilters,
}: DashboardFilterToolbarProps) {
  const searchId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="space-y-3 pt-1">
      {/* ── Upper Deck: Segmented Tab Switcher + View Toggle + Select Dropdowns ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented Pill Tabs */}
        <div className="inline-flex items-center p-1 rounded-full bg-muted/60 border border-border/80 text-xs w-full sm:w-auto shadow-2xs">
          <button
            type="button"
            onClick={() => onTabChange("workspace")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-medium transition-all text-xs cursor-pointer",
              activeTab === "workspace"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpenIcon className="size-3.5" />
            <span>My Workspace Tests</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-medium">
              {workspaceCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("community")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-medium transition-all text-xs cursor-pointer",
              activeTab === "community"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GlobeIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Community Hub</span>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {communityCount} Public
            </span>
          </button>
        </div>

        {/* Action Controls: View Mode Toggle & Dropdowns */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Grid vs List View Mode Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-muted/60 border border-border/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1.5 rounded-full transition-all text-muted-foreground hover:text-foreground cursor-pointer",
                viewMode === "grid" && "bg-background text-foreground shadow-2xs"
              )}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-1.5 rounded-full transition-all text-muted-foreground hover:text-foreground cursor-pointer",
                viewMode === "list" && "bg-background text-foreground shadow-2xs"
              )}
              title="List View"
              aria-label="List View"
            >
              <ListIcon className="size-3.5" />
            </button>
          </div>

          {activeTab === "workspace" ? (
            <>
              {/* Workspace Status */}
              <Select
                value={workspaceStatus}
                onValueChange={(val) => {
                  if (val) onWorkspaceStatusChange(val)
                }}
              >
                <SelectTrigger className="h-9 w-34 text-xs rounded-full bg-card border-border/80 shadow-2xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Drafts Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Workspace Sort */}
              <Select
                value={workspaceSortBy}
                onValueChange={(val) => {
                  if (val) onWorkspaceSortByChange(val as typeof workspaceSortBy)
                }}
              >
                <SelectTrigger className="h-9 w-38 text-xs rounded-full bg-card border-border/80 shadow-2xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="questions">Most Questions</SelectItem>
                  <SelectItem value="best_score">Highest Score</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              {/* Community Scope */}
              <Select
                value={communityScope}
                onValueChange={(val) => {
                  if (val) onCommunityScopeChange(val)
                }}
              >
                <SelectTrigger className="h-9 w-34 text-xs rounded-full bg-card border-border/80 shadow-2xs font-medium">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Scopes</SelectItem>
                  <SelectItem value="single_subject">Single Subject</SelectItem>
                  <SelectItem value="multi_subject">Multi-Subject</SelectItem>
                </SelectContent>
              </Select>

              {/* Community Sort */}
              <Select
                value={communitySortBy}
                onValueChange={(val) => {
                  if (val) onCommunitySortByChange(val as typeof communitySortBy)
                }}
              >
                <SelectTrigger className="h-9 w-38 text-xs rounded-full bg-card border-border/80 shadow-2xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Attempted</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="score">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 rounded-full text-xs text-muted-foreground hover:text-foreground gap-1.5 px-3 border border-dashed border-border/80 hover:border-border cursor-pointer shrink-0"
            >
              <RotateCcwIcon className="size-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Lower Deck: Integrated Search Bar & Neutral-by-Default Paper Type Ribbon ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-muted/20 border border-border/70 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
        <div className="relative w-full md:w-80 shrink-0">
          <label htmlFor={searchId} className="sr-only">
            Search tests
          </label>
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title, exam tag, or subjects..."
            className="h-9 pl-9 pr-12 text-xs rounded-full bg-card border-border/80 shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer transition-colors"
              aria-label="Clear search"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/70 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span>⌘</span>K
            </kbd>
          )}
        </div>

        {/* Paper Type Filter Ribbon (Neutral Base with Vibrant Active Contours) */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
          {PAPER_TYPES.map((pt) => {
            const isSelected = selectedPaperType === pt.id
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => onSelectPaperType(pt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer border",
                  isSelected
                    ? pt.activeClass
                    : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 font-medium"
                )}
              >
                {pt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

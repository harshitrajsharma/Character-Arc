"use client"

import { useId } from "react"
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
    activeClass: "bg-foreground text-background border-foreground shadow-xs",
  },
  {
    id: "full_length",
    label: "Full-Length Mock",
    activeClass: "border-sky-500 bg-sky-500 text-white dark:text-zinc-900 shadow-xs",
    inactiveClass: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    id: "subject_wise",
    label: "Subject Test",
    activeClass: "border-emerald-500 bg-emerald-500 text-white dark:text-zinc-900 shadow-xs",
    inactiveClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "topic_wise",
    label: "Topic Drill",
    activeClass: "border-amber-500 bg-amber-500 text-white dark:text-zinc-900 shadow-xs",
    inactiveClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    id: "pyq",
    label: "PYQ",
    activeClass: "border-cyan-500 bg-cyan-500 text-white dark:text-zinc-900 shadow-xs",
    inactiveClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
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

  return (
    <div className="space-y-3 pt-1">
      {/* Row 1: Primary Segmented Tab Switcher + View Toggle + Contextual Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented Pill Tabs */}
        <div className="inline-flex items-center p-1 rounded-full bg-muted/60 border border-border/80 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onTabChange("workspace")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-semibold transition-all text-xs cursor-pointer",
              activeTab === "workspace"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpenIcon className="size-3.5" />
            My Workspace Tests
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
              {workspaceCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("community")}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-semibold transition-all text-xs cursor-pointer",
              activeTab === "community"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GlobeIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Community Hub
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {communityCount} Public
            </span>
          </button>
        </div>

        {/* Action Controls: View Mode Toggle & Dropdowns */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Grid vs List View Mode Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-muted/60 border border-border/80">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1.5 rounded-full transition-all text-muted-foreground hover:text-foreground cursor-pointer",
                viewMode === "grid" && "bg-background text-foreground shadow-xs"
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
                viewMode === "list" && "bg-background text-foreground shadow-xs"
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
                <SelectTrigger className="h-9 w-34 text-xs rounded-full bg-card border-border shadow-2xs font-medium">
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
                <SelectTrigger className="h-9 w-38 text-xs rounded-full bg-card border-border shadow-2xs font-medium">
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
                <SelectTrigger className="h-9 w-34 text-xs rounded-full bg-card border-border shadow-2xs font-medium">
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
                <SelectTrigger className="h-9 w-38 text-xs rounded-full bg-card border-border shadow-2xs font-medium">
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
              className="h-9 rounded-full text-xs text-muted-foreground hover:text-foreground gap-1 px-3"
            >
              <RotateCcwIcon className="size-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Universal Search Bar & Horizontal Paper Type Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-muted/20 border border-border/70 rounded-2xl p-3">
        <div className="relative w-full md:w-80 shrink-0">
          <label htmlFor={searchId} className="sr-only">
            Search tests
          </label>
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title, exam tag, or subjects..."
            className="h-9 pl-9 pr-8 text-xs rounded-full bg-card border-border shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
          {PAPER_TYPES.map((pt) => {
            const isSelected = selectedPaperType === pt.id
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => onSelectPaperType(pt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 cursor-pointer",
                  isSelected
                    ? pt.activeClass
                    : pt.inactiveClass ?? "border-border bg-card text-muted-foreground hover:text-foreground"
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

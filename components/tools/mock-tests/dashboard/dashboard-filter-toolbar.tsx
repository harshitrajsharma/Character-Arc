"use client"

import { useId, useState } from "react"
import {
  LayoutGridIcon,
  ListIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { FilterSelectField } from "@/components/shared/filter-select-field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DashboardFilterToolbarProps } from "./types"

const PAPER_TYPES = [
  { value: "ALL", label: "All types" },
  { value: "full_length", label: "Full-length mock" },
  { value: "multi_subject", label: "Multi-subject" },
  { value: "subject_wise", label: "Subject test" },
  { value: "topic_wise", label: "Topic drill" },
  { value: "pyq", label: "Previous year" },
]
const WORKSPACE_STATUS = [
  { value: "ALL", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
]
const WORKSPACE_SORT = [
  { value: "newest", label: "Recently updated" },
  { value: "oldest", label: "Oldest updated" },
  { value: "questions", label: "Most questions" },
  { value: "best_score", label: "Highest score" },
]
const COMMUNITY_SCOPE = [
  { value: "ALL", label: "All subjects" },
  { value: "single_subject", label: "Single subject" },
  { value: "multi_subject", label: "Multi-subject" },
]
const COMMUNITY_SORT = [
  { value: "popular", label: "Most attempted" },
  { value: "newest", label: "Newest first" },
  { value: "score", label: "Highest average score" },
]

export function DashboardFilterToolbar({
  activeTab,
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
  const [open, setOpen] = useState(false)
  const workspace = activeTab === "workspace"
  const filterCount =
    Number(selectedPaperType !== "ALL") +
    Number(workspace ? workspaceStatus !== "ALL" : communityScope !== "ALL") +
    Number(
      workspace ? workspaceSortBy !== "newest" : communitySortBy !== "popular"
    )
  const selectedType = PAPER_TYPES.find(
    (item) => item.value === selectedPaperType
  )?.label
  const scopeLabel = workspace
    ? WORKSPACE_STATUS.find((item) => item.value === workspaceStatus)?.label
    : COMMUNITY_SCOPE.find((item) => item.value === communityScope)?.label
  const filterFields = (
    <>
      <FilterSelectField
        label="Paper type"
        value={selectedPaperType}
        items={PAPER_TYPES}
        onChange={onSelectPaperType}
      />
      {workspace ? (
        <>
          <FilterSelectField
            label="Status"
            value={workspaceStatus}
            items={WORKSPACE_STATUS}
            onChange={onWorkspaceStatusChange}
          />
          <FilterSelectField
            label="Sort by"
            value={workspaceSortBy}
            items={WORKSPACE_SORT}
            onChange={(value) =>
              onWorkspaceSortByChange(value as typeof workspaceSortBy)
            }
          />
        </>
      ) : (
        <>
          <FilterSelectField
            label="Subject scope"
            value={communityScope}
            items={COMMUNITY_SCOPE}
            onChange={onCommunityScopeChange}
          />
          <FilterSelectField
            label="Sort by"
            value={communitySortBy}
            items={COMMUNITY_SORT}
            onChange={(value) =>
              onCommunitySortByChange(value as typeof communitySortBy)
            }
          />
        </>
      )}
    </>
  )
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.15fr)_auto] lg:gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor={searchId}
            className="sr-only text-xs text-muted-foreground lg:not-sr-only"
          >
            Search papers
          </label>
          <InputGroup className="h-11 min-w-0 rounded-lg">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id={searchId}
              name="paper-search"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search papers"
            />
            {searchQuery ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  className="size-11"
                  aria-label="Clear search"
                  onClick={() => onSearchQueryChange("")}
                >
                  <XIcon aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </div>
        <Button
          variant="outline"
          className="h-11 shrink-0 lg:hidden"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
          Filters
          {filterCount > 0 ? (
            <span className="tabular-nums">{filterCount}</span>
          ) : null}
        </Button>
        <div aria-label="Paper filters" className="hidden lg:contents">
          {filterFields}
        </div>
        <ToggleGroup
          aria-label="Paper view"
          value={[viewMode]}
          onValueChange={(values) => {
            const next = values[0]
            if (next === "grid" || next === "list") onViewModeChange(next)
          }}
          className="ml-auto hidden md:flex"
          spacing={1}
        >
          <ToggleGroupItem
            value="grid"
            aria-label="Grid View"
            title="Grid View"
            className="size-11 p-0"
          >
            <LayoutGridIcon aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List View"
            title="List View"
            className="size-11 p-0"
          >
            <ListIcon aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {selectedPaperType !== "ALL" ? <span>{selectedType}</span> : null}
          {(
            workspace ? workspaceStatus !== "ALL" : communityScope !== "ALL"
          ) ? (
            <span>{scopeLabel}</span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            onClick={onResetFilters}
          >
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Reset filters
          </Button>
        </div>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-popover [&_[data-slot=sheet-close]]:size-11"
        >
          <SheetHeader>
            <SheetTitle>Filter papers</SheetTitle>
            <SheetDescription>
              Filter and sort your assessment library.
            </SheetDescription>
          </SheetHeader>
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-6 pb-6">
            {filterFields}
          </div>
          <SheetFooter className="flex-row justify-end border-t border-border pb-[max(24px,env(safe-area-inset-bottom))]">
            <Button variant="outline" className="h-11" onClick={onResetFilters}>
              Reset
            </Button>
            <Button className="h-11" onClick={() => setOpen(false)}>
              Show papers
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

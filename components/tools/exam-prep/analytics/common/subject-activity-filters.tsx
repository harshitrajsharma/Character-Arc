import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Filter, Search, X } from "lucide-react"

export type SubjectActivitySortOption =
  "activity" | "progress" | "alphabetical" | "weightage"

interface SubjectActivityFiltersProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  showEmptySubjects: boolean
  onShowEmptySubjectsChange: (value: boolean) => void
  sortOption: SubjectActivitySortOption
  onSortOptionChange: (value: SubjectActivitySortOption) => void
  subjectCountText: string
}

export function SubjectActivityFilters({
  searchQuery,
  onSearchQueryChange,
  showEmptySubjects,
  onShowEmptySubjectsChange,
  sortOption,
  onSortOptionChange,
  subjectCountText,
}: SubjectActivityFiltersProps) {
  const hasActiveFilters = Boolean(searchQuery || !showEmptySubjects)

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-9 pl-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-7 w-7 p-0"
              onClick={() => onSearchQueryChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 px-2 text-xs",
                    showEmptySubjects
                      ? "border-purple-300 dark:border-purple-700"
                      : ""
                  )}
                  onClick={() => onShowEmptySubjectsChange(!showEmptySubjects)}
                >
                  {showEmptySubjects ? (
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {showEmptySubjects ? "Hide Inactive" : "Show All"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showEmptySubjects
                  ? "Hide subjects with no activity"
                  : "Show all subjects including those with no activity"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={sortOption}
                  onChange={(event) =>
                    onSortOptionChange(
                      event.target.value as SubjectActivitySortOption
                    )
                  }
                >
                  <option value="progress">Sort by Progress</option>
                  <option value="activity">Sort by Activity</option>
                  <option value="weightage">Sort by Weightage</option>
                  <option value="alphabetical">Sort Alphabetically</option>
                </select>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Change how subjects are sorted
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          <Filter className="mr-1.5 h-3 w-3" />
          <span>
            {subjectCountText} {searchQuery && `matching "${searchQuery}"`}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-5 px-1.5 text-xs"
            onClick={() => {
              onSearchQueryChange("")
              onShowEmptySubjectsChange(true)
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </>
  )
}

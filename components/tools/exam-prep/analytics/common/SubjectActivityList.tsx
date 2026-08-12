"use client"

import { SubjectActivity } from "@/types/progressapp/analytics"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  Bookmark,
  TrendingUp,
  AlertCircle,
  Filter,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { useState, useMemo, useEffect } from "react"
import { ActivityConfig } from "../types"
import { CustomScrollbar } from "./CustomScrollbar"
import { useProgress } from "@/components/tools/exam-prep/contexts/progress-context"
import { useAnalytics } from "@/components/tools/exam-prep/contexts/analytics-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubjectActivityDetailCard } from "./subject-activity-detail-card"
import {
  SubjectActivityFilters,
  SubjectActivitySortOption,
} from "./subject-activity-filters"
import { SubjectActivityOverview } from "./subject-activity-overview"

interface SubjectActivityListProps {
  subjects: SubjectActivity[]
  activityConfig: Record<string, ActivityConfig>
  getPredominantActivityType: (subject: SubjectActivity) => string
}

export function SubjectActivityList({
  subjects,
  activityConfig,
  getPredominantActivityType,
}: SubjectActivityListProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({})
  const { formatProgressPercentage } = useProgress()
  const { selectedDate } = useAnalytics()

  // Display options - show all subjects by default
  const [sortOption, setSortOption] =
    useState<SubjectActivitySortOption>("progress")
  const [showEmptySubjects, setShowEmptySubjects] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"categories" | "list">("categories")
  const [expandedSections, setExpandedSections] = useState({
    completed: true,
    inProgress: true,
    notStarted: true,
  })

  // Toggle subject expansion
  const toggleSubjectExpansion = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }))
  }

  // Expand a subject
  const expandSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: true,
    }))
  }

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Auto-expand the first subject when there are few subjects
  useEffect(() => {
    if (subjects?.length === 1) {
      expandSubject(subjects[0].id)
    }
  }, [subjects])

  // Process and sort subjects based on user preferences and search
  const processedSubjects = useMemo(() => {
    // Apply search filter first
    const filteredSubjects =
      subjects?.filter((s) => {
        // Check if subject should be shown based on activity
        const activityFilter = showEmptySubjects || s.activity.total > 0

        // Apply search filter if query exists
        const searchFilter =
          !searchQuery ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())

        return activityFilter && searchFilter
      }) || []

    // Sort based on selected option
    switch (sortOption) {
      case "activity":
        return [...filteredSubjects].sort(
          (a, b) => b.activity.total - a.activity.total
        )
      case "progress":
        return [...filteredSubjects].sort(
          (a, b) => b.overallProgress - a.overallProgress
        )
      case "weightage":
        return [...filteredSubjects].sort((a, b) => b.weightage - a.weightage)
      case "alphabetical":
        return [...filteredSubjects].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      default:
        return [...filteredSubjects].sort(
          (a, b) => b.overallProgress - a.overallProgress
        )
    }
  }, [subjects, sortOption, showEmptySubjects, searchQuery])

  // Group subjects by progress range for better insights
  const subjectGroups = useMemo(() => {
    const groups = {
      completed: [] as SubjectActivity[],
      highProgress: [] as SubjectActivity[],
      mediumProgress: [] as SubjectActivity[],
      lowProgress: [] as SubjectActivity[],
      noProgress: [] as SubjectActivity[],
    }

    processedSubjects.forEach((subject) => {
      if (subject.overallProgress >= 100) {
        groups.completed.push(subject)
      } else if (subject.overallProgress >= 75) {
        groups.highProgress.push(subject)
      } else if (subject.overallProgress >= 50) {
        groups.mediumProgress.push(subject)
      } else if (subject.overallProgress > 0) {
        groups.lowProgress.push(subject)
      } else {
        groups.noProgress.push(subject)
      }
    })

    return groups
  }, [processedSubjects])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const total = subjects?.length || 0
    if (!total) return null

    const totalActivities =
      subjects?.reduce((sum, s) => sum + s.activity.total, 0) || 0
    const avgProgress =
      subjects?.reduce((sum, s) => sum + s.overallProgress, 0) / total || 0
    const completedCount =
      subjects?.filter((s) => s.overallProgress >= 100).length || 0
    const activeSubjects =
      subjects?.filter((s) => s.activity.total > 0).length || 0
    const totalWeight = subjects?.reduce((sum, s) => sum + s.weightage, 0) || 0

    return {
      totalSubjects: total,
      totalActivities,
      avgProgress,
      completedCount,
      activeSubjects,
      completionRate: (completedCount / total) * 100,
      remainingSubjects: total - completedCount,
      totalWeight,
    }
  }, [subjects])

  // Check if no subjects match the current filters
  const noMatchingSubjects =
    processedSubjects.length === 0 && subjects && subjects.length > 0

  // Generate overall subject count text
  const subjectCountText = useMemo(() => {
    if (!subjects?.length) return "No subjects"

    if (processedSubjects.length === subjects.length) {
      return `All ${subjects.length} subjects`
    }

    return `${processedSubjects.length} of ${subjects.length} subjects`
  }, [subjects, processedSubjects])

  return (
    <Card className="flex h-full flex-col border-muted">
      <CardHeader className="pb-0">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center text-xl">
              <BookOpen className="mr-2.5 h-6 w-6 text-purple-500" />
              Subject Activity
            </CardTitle>
            <CardDescription className="mt-1">
              Comprehensive view of all your study subjects
            </CardDescription>
          </div>

          {/* View mode selector */}
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              setViewMode(value as "categories" | "list")
            }
            className="w-auto"
          >
            <TabsList className="h-8 px-1">
              <TabsTrigger value="categories" className="h-6 px-2 text-xs">
                <Layers className="mr-1 h-3.5 w-3.5" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="list" className="h-6 px-2 text-xs">
                <BarChart3 className="mr-1 h-3.5 w-3.5" />
                All Subjects
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <SubjectActivityOverview
          metrics={metrics}
          formatProgressPercentage={formatProgressPercentage}
        />

        <SubjectActivityFilters
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          showEmptySubjects={showEmptySubjects}
          onShowEmptySubjectsChange={setShowEmptySubjects}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          subjectCountText={subjectCountText}
        />
      </CardHeader>

      <CardContent className="mt-2 flex-1 p-0">
        <CustomScrollbar className="h-full">
          {/* List View Mode */}
          {viewMode === "list" && (
            <div className="space-y-3 p-4">
              {processedSubjects.length > 0 ? (
                processedSubjects.map((subject) => renderSubjectCard(subject))
              ) : (
                <RenderEmptyState />
              )}
            </div>
          )}

          {/* Categories View Mode */}
          {viewMode === "categories" && (
            <div className="space-y-6 p-4">
              {/* Completed subjects section with green styling */}
              {subjectGroups.completed.length > 0 && (
                <section className="space-y-3">
                  <button
                    onClick={() => toggleSection("completed")}
                    className="flex w-full items-center justify-between text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <div className="flex items-center">
                      <Bookmark className="mr-1.5 h-4 w-4" />
                      Completed Subjects ({subjectGroups.completed.length})
                    </div>
                    {expandedSections.completed ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedSections.completed && (
                    <div className="space-y-2">
                      {subjectGroups.completed.map((subject) =>
                        renderSubjectCard(subject)
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* High progress subjects */}
              {(subjectGroups.highProgress.length > 0 ||
                subjectGroups.mediumProgress.length > 0 ||
                subjectGroups.lowProgress.length > 0) && (
                <section className="space-y-3">
                  <button
                    onClick={() => toggleSection("inProgress")}
                    className="flex w-full items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <div className="flex items-center">
                      <TrendingUp className="mr-1.5 h-4 w-4" />
                      In Progress Subjects (
                      {subjectGroups.highProgress.length +
                        subjectGroups.mediumProgress.length +
                        subjectGroups.lowProgress.length}
                      )
                    </div>
                    {expandedSections.inProgress ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedSections.inProgress && (
                    <div className="space-y-2">
                      {/* High progress */}
                      {subjectGroups.highProgress.length > 0 && (
                        <div className="space-y-2 border-l-2 border-blue-200 pl-6 dark:border-blue-800">
                          <h4 className="mb-2 text-xs font-medium text-blue-500 dark:text-blue-400">
                            Almost Complete ({subjectGroups.highProgress.length}
                            )
                          </h4>
                          {subjectGroups.highProgress.map((subject) =>
                            renderSubjectCard(subject)
                          )}
                        </div>
                      )}

                      {/* Medium progress */}
                      {subjectGroups.mediumProgress.length > 0 && (
                        <div className="mt-4 space-y-2 border-l-2 border-purple-200 pl-6 dark:border-purple-800">
                          <h4 className="mb-2 text-xs font-medium text-purple-500 dark:text-purple-400">
                            Halfway Complete (
                            {subjectGroups.mediumProgress.length})
                          </h4>
                          {subjectGroups.mediumProgress.map((subject) =>
                            renderSubjectCard(subject)
                          )}
                        </div>
                      )}

                      {/* Low progress */}
                      {subjectGroups.lowProgress.length > 0 && (
                        <div className="mt-4 space-y-2 border-l-2 border-amber-200 pl-6 dark:border-amber-800">
                          <h4 className="mb-2 text-xs font-medium text-amber-500 dark:text-amber-400">
                            Just Started ({subjectGroups.lowProgress.length})
                          </h4>
                          {subjectGroups.lowProgress.map((subject) =>
                            renderSubjectCard(subject)
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Subjects with no progress */}
              {subjectGroups.noProgress.length > 0 && (
                <section className="space-y-3">
                  <button
                    onClick={() => toggleSection("notStarted")}
                    className="flex w-full items-center justify-between text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <div className="flex items-center">
                      <AlertCircle className="mr-1.5 h-4 w-4" />
                      Not Started ({subjectGroups.noProgress.length})
                    </div>
                    {expandedSections.notStarted ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedSections.notStarted && (
                    <div className="space-y-2">
                      {subjectGroups.noProgress.map((subject) =>
                        renderSubjectCard(subject)
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* If no subjects match filters */}
              {noMatchingSubjects && <RenderEmptyState />}
            </div>
          )}
        </CustomScrollbar>
      </CardContent>

      {subjects?.length > 0 && (
        <CardFooter className="flex justify-between border-t p-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(activityConfig).map(([key, config]) => (
              <div key={key} className="flex items-center">
                <div
                  className={`h-3 w-3 ${config.bgColor} mr-1.5 rounded-full`}
                ></div>
                <span className="text-xs">{config.label}</span>
              </div>
            ))}
          </div>

          <span className="text-xs">
            Data for {format(selectedDate, "MMMM d, yyyy")}
          </span>
        </CardFooter>
      )}
    </Card>
  )

  // Helper component to render empty states
  function RenderEmptyState() {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {noMatchingSubjects ? (
          <>
            <Filter className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="mb-2">No subjects match the current filters</p>
            <p className="mb-4 text-sm">
              Try adjusting your search or show all subjects
            </p>
            <div className="flex justify-center gap-2">
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
              {!showEmptySubjects && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmptySubjects(true)}
                >
                  Show all subjects
                </Button>
              )}
            </div>
          </>
        ) : subjects?.length === 0 ? (
          <>
            <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="mb-2">No subjects have been added yet</p>
            <p className="text-sm">
              Create subjects to start tracking your progress
            </p>
            <Button variant="default" size="sm" className="mt-4">
              <a href="/subjects/add">
                Create a new subject
                <Zap className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </>
        ) : (
          <>
            <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="mb-2">No subject activity data available</p>
            <p className="text-sm">
              Try selecting a different time period or check your subjects setup
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              <a href="/subjects">
                Go to my subjects
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </>
        )}
      </div>
    )
  }

  function renderSubjectCard(subject: SubjectActivity) {
    return (
      <SubjectActivityDetailCard
        key={subject.id}
        subject={subject}
        activityConfig={activityConfig}
        predominantActivityType={getPredominantActivityType(subject)}
        isExpanded={expandedSubjects[subject.id] || false}
        onToggle={() => toggleSubjectExpansion(subject.id)}
      />
    )
  }
}

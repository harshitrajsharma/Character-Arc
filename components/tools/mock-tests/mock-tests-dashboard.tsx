"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { cloneAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { ActiveAttemptBanner } from "./dashboard/active-attempt-banner"
import { CommunityHubView } from "./dashboard/community-hub-view"
import { DashboardFilterToolbar } from "./dashboard/dashboard-filter-toolbar"
import { DashboardHeader } from "./dashboard/dashboard-header"
import { RecentAttemptsTable } from "./dashboard/recent-attempts-table"
import { WorkspaceTestsView } from "./dashboard/workspace-tests-view"
import type {
  CommunitySortOption,
  DashboardTab,
  MockTestsDashboardProps,
  WorkspaceSortOption,
} from "./dashboard/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAssessmentView } from "./dashboard/use-assessment-view"
import {
  AssessmentContentSkeleton,
  AssessmentFiltersSkeleton,
} from "./dashboard/assessment-skeleton"

export function MockTestsDashboard({
  workspaceSlug,
  assessments,
  communityAssessments = [],
  recentAttempts,
  attemptHistory,
  canWrite,
}: MockTestsDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Primary Tab & View Mode
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: DashboardTab =
    tabParam === "community" || tabParam === "attempts" ? tabParam : "workspace"
  const [tabPending, startTabTransition] = useTransition()
  const [requestedTab, setRequestedTab] = useState<DashboardTab>(activeTab)
  const displayedTab = tabPending ? requestedTab : activeTab
  const [viewMode, setViewMode] = useAssessmentView(workspaceSlug)

  // Community cloning state
  const [cloningId, setCloningId] = useState<string | null>(null)

  // Unified Search & Paper Type Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPaperType, setSelectedPaperType] = useState<string>("ALL")

  // Tab-specific Filters
  const [workspaceStatus, setWorkspaceStatus] = useState<string>("ALL")
  const [workspaceSortBy, setWorkspaceSortBy] =
    useState<WorkspaceSortOption>("newest")
  const [communityScope, setCommunityScope] = useState<string>("ALL")
  const [communitySortBy, setCommunitySortBy] =
    useState<CommunitySortOption>("popular")

  // URL sync on tab change
  const handleTabChange = (tab: DashboardTab) => {
    if (tab === displayedTab) return
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (tab !== "workspace") {
        url.searchParams.set("tab", tab)
      } else {
        url.searchParams.delete("tab")
      }
      if (tab !== "attempts") url.searchParams.delete("attemptPage")
      setRequestedTab(tab)
      startTabTransition(() =>
        router.push(`${url.pathname}${url.search}`, { scroll: false })
      )
    }
  }

  // Active in-progress test attempt
  const activeAttempt = useMemo(() => {
    return recentAttempts.find((a) => a.status === "in_progress") ?? null
  }, [recentAttempts])

  // Filtered Workspace Tests
  const filteredAssessments = useMemo(() => {
    let result = assessments

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.taxonomy?.examTag?.toLowerCase().includes(q) ||
          item.taxonomy?.subjects?.some((s) => s.toLowerCase().includes(q))
      )
    }

    if (selectedPaperType !== "ALL") {
      result = result.filter(
        (item) => item.taxonomy?.paperType === selectedPaperType
      )
    }

    if (workspaceStatus !== "ALL") {
      result = result.filter((item) => item.status === workspaceStatus)
    }

    return [...result].sort((a, b) => {
      if (workspaceSortBy === "newest") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (workspaceSortBy === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }
      if (workspaceSortBy === "questions") {
        return b.questionCount - a.questionCount
      }
      if (workspaceSortBy === "best_score") {
        return (b.myBestPercentage ?? -1) - (a.myBestPercentage ?? -1)
      }
      return 0
    })
  }, [
    assessments,
    searchQuery,
    selectedPaperType,
    workspaceStatus,
    workspaceSortBy,
  ])

  // Filtered Community Assessments
  const filteredCommunity = useMemo(() => {
    let result = communityAssessments

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q) ||
          item.workspaceName.toLowerCase().includes(q) ||
          item.taxonomy?.examTag?.toLowerCase().includes(q) ||
          item.taxonomy?.subjects?.some((s) => s.toLowerCase().includes(q))
      )
    }

    if (selectedPaperType !== "ALL") {
      result = result.filter(
        (item) => item.taxonomy?.paperType === selectedPaperType
      )
    }

    if (communityScope !== "ALL") {
      result = result.filter(
        (item) => item.taxonomy?.subjectScope === communityScope
      )
    }

    return [...result].sort((a, b) => {
      if (communitySortBy === "popular") {
        return b.attemptsCount - a.attemptsCount
      }
      if (communitySortBy === "newest") {
        return (
          new Date(b.publishedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? 0).getTime()
        )
      }
      if (communitySortBy === "score") {
        return (b.avgScorePercentage ?? -1) - (a.avgScorePercentage ?? -1)
      }
      return 0
    })
  }, [
    communityAssessments,
    searchQuery,
    selectedPaperType,
    communityScope,
    communitySortBy,
  ])

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedPaperType !== "ALL" ||
    (activeTab === "workspace"
      ? workspaceStatus !== "ALL" || workspaceSortBy !== "newest"
      : communityScope !== "ALL" || communitySortBy !== "popular")

  function resetAllFilters() {
    setSearchQuery("")
    setSelectedPaperType("ALL")
    setWorkspaceStatus("ALL")
    setWorkspaceSortBy("newest")
    setCommunityScope("ALL")
    setCommunitySortBy("popular")
  }

  // Handle cloning community paper
  const handleClonePaper = (paperId: string, title: string) => {
    setCloningId(paperId)
    startTransition(async () => {
      try {
        const result = await cloneAssessmentAction({
          workspaceSlug,
          sourceAssessmentId: paperId,
        })
        toast.success(`"${title}" copied to your workspace`, {
          action: {
            label: "Open Editor",
            onClick: () =>
              router.push(
                workspaceRoutes.mockTests.edit(
                  workspaceSlug,
                  result.assessmentId
                )
              ),
          },
        })
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not copy this paper."
        )
      } finally {
        setCloningId(null)
      }
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-8 font-sans text-foreground antialiased">
      {/* 1. Header & Actions */}
      <DashboardHeader workspaceSlug={workspaceSlug} canWrite={canWrite} />

      {/* 2. Active in-progress test banner */}
      {canWrite ? <ActiveAttemptBanner activeAttempt={activeAttempt} /> : null}

      <Tabs
        value={displayedTab}
        onValueChange={(value) => handleTabChange(value as DashboardTab)}
        className="gap-5"
      >
        <TabsList
          variant="line"
          aria-label="Assessment views"
          className="h-12! w-full justify-start gap-2 border-b border-border p-0"
        >
          <TabsTrigger
            value="workspace"
            className="h-12 flex-none px-2 sm:px-4"
          >
            My papers
          </TabsTrigger>
          <TabsTrigger
            value="community"
            className="h-12 flex-none px-2 sm:px-4"
          >
            Community
          </TabsTrigger>
          <TabsTrigger value="attempts" className="h-12 flex-none px-2 sm:px-4">
            Attempts
          </TabsTrigger>
        </TabsList>
        {/* 4. Filter Toolbar */}
        {displayedTab !== "attempts" ? (
          tabPending ? (
            <AssessmentFiltersSkeleton />
          ) : (
            <DashboardFilterToolbar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              workspaceCount={assessments.length}
              communityCount={communityAssessments.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedPaperType={selectedPaperType}
              onSelectPaperType={setSelectedPaperType}
              workspaceStatus={workspaceStatus}
              onWorkspaceStatusChange={setWorkspaceStatus}
              workspaceSortBy={workspaceSortBy}
              onWorkspaceSortByChange={setWorkspaceSortBy}
              communityScope={communityScope}
              onCommunityScopeChange={setCommunityScope}
              communitySortBy={communitySortBy}
              onCommunitySortByChange={setCommunitySortBy}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetAllFilters}
            />
          )
        ) : null}

        {/* 5. Main Content Area */}
        <TabsContent value="workspace">
          {tabPending ? (
            <AssessmentContentSkeleton tab="workspace" viewMode={viewMode} />
          ) : (
            <WorkspaceTestsView
              key={`${searchQuery}|${selectedPaperType}|${workspaceStatus}|${workspaceSortBy}`}
              workspaceSlug={workspaceSlug}
              assessments={filteredAssessments}
              totalCount={assessments.length}
              viewMode={viewMode}
              canWrite={canWrite}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetAllFilters}

              recentAttempts={recentAttempts}
            />
          )}
        </TabsContent>
        <TabsContent value="community">
          {tabPending ? (
            <AssessmentContentSkeleton tab="community" viewMode={viewMode} />
          ) : (
            <CommunityHubView
              key={`${searchQuery}|${selectedPaperType}|${communityScope}|${communitySortBy}`}
              canWrite={canWrite}
              workspaceSlug={workspaceSlug}
              communityAssessments={filteredCommunity}
              totalCount={communityAssessments.length}
              viewMode={viewMode}
              cloningId={cloningId}
              isPending={isPending}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetAllFilters}
              onClonePaper={handleClonePaper}
            />
          )}
        </TabsContent>
        <TabsContent value="attempts">
          {tabPending ? (
            <AssessmentContentSkeleton tab="attempts" />
          ) : (
            <RecentAttemptsTable
              canWrite={canWrite}
              workspaceSlug={workspaceSlug}
              history={attemptHistory}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

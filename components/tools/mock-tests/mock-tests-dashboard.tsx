"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { cloneAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type {
  CommunityMockTestItem,
  MockTestListItem,
  RecentAttemptItem,
} from "@/lib/tools/definitions/mock-tests/repository"

import {
  ActiveAttemptBanner,
  CommunityHubView,
  DashboardFilterToolbar,
  DashboardHeader,
  DashboardMetricsStrip,
  WorkspaceTestsView,
  type CommunitySortOption,
  type DashboardTab,
  type MockTestsDashboardProps,
  type ViewMode,
  type WorkspaceSortOption,
} from "./dashboard"
import { ShareAssessmentDialog } from "./share-assessment-dialog"

export function MockTestsDashboard({
  workspaceSlug,
  assessments,
  communityAssessments = [],
  recentAttempts,
  canWrite,
  initialTab = "workspace",
}: MockTestsDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Primary Tab & View Mode
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Share Dialog & Cloning state
  const [sharingAssessment, setSharingAssessment] = useState<MockTestListItem | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)

  // Unified Search & Paper Type Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPaperType, setSelectedPaperType] = useState<string>("ALL")

  // Tab-specific Filters
  const [workspaceStatus, setWorkspaceStatus] = useState<string>("ALL")
  const [workspaceSortBy, setWorkspaceSortBy] = useState<WorkspaceSortOption>("newest")
  const [communityScope, setCommunityScope] = useState<string>("ALL")
  const [communitySortBy, setCommunitySortBy] = useState<CommunitySortOption>("popular")

  // URL sync on tab change
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (tab === "community") {
        url.searchParams.set("tab", "community")
      } else {
        url.searchParams.delete("tab")
      }
      window.history.replaceState(null, "", url.toString())
    }
  }

  // Active in-progress test attempt
  const activeAttempt = useMemo(() => {
    return recentAttempts.find((a) => a.status === "in_progress") ?? null
  }, [recentAttempts])

  // Summary Metrics: Workspace
  const workspaceStats = useMemo(() => {
    const total = assessments.length
    const published = assessments.filter((a) => a.status === "published").length
    const drafts = assessments.filter((a) => a.status === "draft").length
    const attemptsCount = recentAttempts.length
    const graded = recentAttempts.filter((a) => a.percentage !== null)
    const avgAccuracy =
      graded.length > 0
        ? Math.round(
            graded.reduce((acc, curr) => acc + (curr.percentage ?? 0), 0) / graded.length
          )
        : null

    return { total, published, drafts, attemptsCount, avgAccuracy }
  }, [assessments, recentAttempts])

  // Summary Metrics: Community Hub
  const communityStats = useMemo(() => {
    const total = communityAssessments.length
    const allSubjects = new Set<string>()
    let totalAttempts = 0

    for (const c of communityAssessments) {
      totalAttempts += c.attemptsCount
      if (c.taxonomy?.subjects) {
        for (const s of c.taxonomy.subjects) {
          allSubjects.add(s.toLowerCase().trim())
        }
      }
    }

    return {
      total,
      subjectsCount: allSubjects.size,
      totalAttempts,
    }
  }, [communityAssessments])

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
      result = result.filter((item) => item.taxonomy?.paperType === selectedPaperType)
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
  }, [assessments, searchQuery, selectedPaperType, workspaceStatus, workspaceSortBy])

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
      result = result.filter((item) => item.taxonomy?.paperType === selectedPaperType)
    }

    if (communityScope !== "ALL") {
      result = result.filter((item) => item.taxonomy?.subjectScope === communityScope)
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
  }, [communityAssessments, searchQuery, selectedPaperType, communityScope, communitySortBy])

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
        toast.success(`"${title}" cloned to your workspace!`, {
          action: {
            label: "Open Editor",
            onClick: () =>
              router.push(
                workspaceRoutes.mockTests.edit(workspaceSlug, result.assessmentId)
              ),
          },
        })
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to clone mock test."
        )
      } finally {
        setCloningId(null)
      }
    })
  }

  return (
    <div className="space-y-6 font-sans antialiased text-foreground">
      {/* 1. Header & Actions */}
      <DashboardHeader workspaceSlug={workspaceSlug} canWrite={canWrite} />

      {/* 2. Active in-progress test banner */}
      <ActiveAttemptBanner activeAttempt={activeAttempt} />

      {/* 3. Metrics Summary Strip */}
      <DashboardMetricsStrip
        activeTab={activeTab}
        workspaceStats={workspaceStats}
        communityStats={communityStats}
        workspaceCount={assessments.length}
        communityCount={communityAssessments.length}
        onTabChange={handleTabChange}
      />

      {/* 4. Filter Toolbar */}
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

      {/* 5. Main Content Area */}
      {activeTab === "workspace" ? (
        <WorkspaceTestsView
          workspaceSlug={workspaceSlug}
          assessments={filteredAssessments}
          totalCount={assessments.length}
          viewMode={viewMode}
          canWrite={canWrite}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetAllFilters}
          onShare={(item) => setSharingAssessment(item)}
          recentAttempts={recentAttempts}
        />
      ) : (
        <CommunityHubView
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

      {/* 6. Share Assessment Dialog */}
      {sharingAssessment && (
        <ShareAssessmentDialog
          open={Boolean(sharingAssessment)}
          onOpenChange={(open) => {
            if (!open) setSharingAssessment(null)
          }}
          workspaceSlug={workspaceSlug}
          assessment={{
            id: sharingAssessment.id,
            title: sharingAssessment.title,
            visibility: sharingAssessment.visibility,
            allowCloning: sharingAssessment.allowCloning,
            taxonomy: sharingAssessment.taxonomy,
          }}
          onUpdated={() => {
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

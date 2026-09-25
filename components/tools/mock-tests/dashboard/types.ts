import type {
  CommunityMockTestItem,
  MockTestListItem,
  RecentAttemptItem,
} from "@/lib/tools/definitions/mock-tests/repository"

export type DashboardTab = "workspace" | "community"
export type ViewMode = "grid" | "list"
export type PaperTypeFilter =
  | "ALL"
  | "full_length"
  | "multi_subject"
  | "subject_wise"
  | "topic_wise"
  | "pyq"

export type WorkspaceStatusFilter = "ALL" | "published" | "draft"
export type WorkspaceSortOption = "newest" | "oldest" | "questions" | "best_score"

export type CommunityScopeFilter = "ALL" | "single_subject" | "multi_subject"
export type CommunitySortOption = "popular" | "newest" | "score"

export interface WorkspaceStats {
  total: number
  published: number
  drafts: number
  attemptsCount: number
  avgAccuracy: number | null
}

export interface CommunityStats {
  total: number
  subjectsCount: number
  totalAttempts: number
}

// ── Subcomponent Props Contracts ──

export interface DashboardHeaderProps {
  workspaceSlug: string
  canWrite: boolean
}

export interface ActiveAttemptBannerProps {
  activeAttempt: RecentAttemptItem | null
}

export interface DashboardMetricsStripProps {
  activeTab: DashboardTab
  workspaceStats: WorkspaceStats
  communityStats: CommunityStats
  communityCount: number
  workspaceCount: number
  onTabChange: (tab: DashboardTab) => void
}

export interface DashboardFilterToolbarProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  workspaceCount: number
  communityCount: number
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  selectedPaperType: string
  onSelectPaperType: (type: string) => void
  // Workspace specific
  workspaceStatus: string
  onWorkspaceStatusChange: (status: string) => void
  workspaceSortBy: WorkspaceSortOption
  onWorkspaceSortByChange: (sort: WorkspaceSortOption) => void
  // Community specific
  communityScope: string
  onCommunityScopeChange: (scope: string) => void
  communitySortBy: CommunitySortOption
  onCommunitySortByChange: (sort: CommunitySortOption) => void
  // Reset
  hasActiveFilters: boolean
  onResetFilters: () => void
}

export interface AssessmentCardProps {
  workspaceSlug: string
  mode: "workspace" | "community"
  item: MockTestListItem | CommunityMockTestItem
  canWrite?: boolean
  isCloning?: boolean
  onShare?: (item: MockTestListItem) => void
  onClone?: (paperId: string, title: string) => void
}

export interface AssessmentListViewProps {
  workspaceSlug: string
  mode: "workspace" | "community"
  items: (MockTestListItem | CommunityMockTestItem)[]
  canWrite?: boolean
  cloningId?: string | null
  onShare?: (item: MockTestListItem) => void
  onClone?: (paperId: string, title: string) => void
}

export interface WorkspaceTestsViewProps {
  workspaceSlug: string
  assessments: MockTestListItem[]
  totalCount: number
  viewMode: ViewMode
  canWrite: boolean
  hasActiveFilters: boolean
  onResetFilters: () => void
  onShare: (item: MockTestListItem) => void
  recentAttempts: RecentAttemptItem[]
}

export interface CommunityHubViewProps {
  workspaceSlug: string
  communityAssessments: CommunityMockTestItem[]
  totalCount: number
  viewMode: ViewMode
  cloningId: string | null
  isPending: boolean
  hasActiveFilters: boolean
  onResetFilters: () => void
  onClonePaper: (paperId: string, title: string) => void
}

export interface RecentAttemptsTableProps {
  workspaceSlug: string
  recentAttempts: RecentAttemptItem[]
}

export interface EmptyStateCardProps {
  icon?: "search" | "test" | "globe"
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
}

export interface MockTestsDashboardProps {
  workspaceSlug: string
  assessments: MockTestListItem[]
  communityAssessments?: CommunityMockTestItem[]
  recentAttempts: RecentAttemptItem[]
  canWrite: boolean
  initialTab?: DashboardTab
}

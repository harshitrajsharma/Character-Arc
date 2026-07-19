import type { ProgressMode } from "@/types/progressapp/domain";

export interface SubjectAnalytics {
  id: string;
  name: string;
  weightage: number;
  expectedMarks: number;
  learningProgress: number;
  revisionProgress: number;
  practiceProgress: number;
  testProgress: number;
}

// Activity Types
export type ActivityType = ProgressMode;

export type ViewMode = 'activities' | 'goal';
export type TimeRange = '7d' | '30d' | '90d' | 'all';

// Base Activity Interface
export interface ActivityCount {
  [key: string]: number | string;
  learning: number;
  revision: number;
  practice: number;
  test: number;
}

// Daily Activity Data
export interface DailyActivity extends ActivityCount {
  date: string;
  totalCount: number;
  goalProgress: number;
}

// Activity Statistics
export interface ActivityStats {
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// Daily Statistics
export interface DailyStats {
  date: string;
  stats: Record<ActivityType, ActivityStats>;
  total: number;
  goalAchievement: number;
}

// Progress Insights
export interface ProgressInsights {
  currentStreak: number;
  bestActivity: ActivityType;
  averageDailyActivities: number;
  daysGoalAchieved: number;
  weeklyAverage: number;
  monthlyAverage: number;
  completionRate: number;
  lastActive: string;
}

// Activity Configuration
export interface ActivityConfig {
  name: string;
  color: string;
  icon: string;
  weight: number;
}

// Progress Data
export interface ProgressData {
  daily: DailyActivity[];
  insights: ProgressInsights;
  config: {
    dailyGoal: number;
    activities: Record<ActivityType, ActivityConfig>;
  };
}

// Common Props
export interface LoadingErrorProps {
  isLoading?: boolean;
  error?: string | null;
}

// Chart Props
export interface ChartProps extends LoadingErrorProps {
  data: ProgressData | null;
  viewMode?: ViewMode;
  timeRange?: TimeRange;
  onViewModeChange?: (mode: ViewMode) => void;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export interface DailyProgress {
  date: string;
  learning: number;
  revision: number;
  practice: number;
  test: number;
  totalActivities: number;
  goalAchievement: number;
  learningPercentage: number;
  revisionPercentage: number;
  practicePercentage: number;
  testPercentage: number;
}

export interface ActivityDetail {
  subject: string;
  topic: string;
  completedAt: string;
}

export interface DailyActivityDetails {
  learning: ActivityDetail[];
  revision: ActivityDetail[];
  practice: ActivityDetail[];
  test: ActivityDetail[];
}

export interface CalendarActivity {
  date: string;
  learning: number;
  revision: number;
  practice: number;
  test: number;
  totalCount: number;
  details: DailyActivityDetails;
  currentStreak?: number;
  longestStreak?: number;
}

export interface SubjectActivity {
  id: string;
  name: string;
  weightage: number;
  overallProgress: number;
  learningProgress: number;
  revisionProgress: number;
  practiceProgress: number;
  testProgress: number;
  createdAt: string;
  updatedAt: string;
  activity: {
    learning: number;
    revision: number;
    practice: number;
    test: number;
    total: number;
  };
  activityPercentage: number;
}

export interface TotalStats {
  learning: number;
  revision: number;
  practice: number;
  test: number;
  total: number;
}

export interface DateRange {
  start: string;
  end: string;
  range: 'day' | 'week' | 'month' | 'all';
}

export interface SubjectProgressResponse {
  subjects: SubjectActivity[];
  totalStats: TotalStats;
  dateRange: DateRange;
}

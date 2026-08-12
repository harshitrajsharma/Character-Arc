"use client"

import { DashboardProgressOverview } from "@/components/tools/exam-prep/dashboard/progress-overview"
import { ExamCountdown } from "@/components/tools/exam-prep/dashboard/exam-countdown"
import { ExamFoundationCard } from "@/components/tools/exam-prep/dashboard/exam-foundation-card"
import { StatsCard } from "@/components/tools/exam-prep/dashboard/stats-card"
import {
  MockTest,
  DailyActivity,
  StudyStreak,
} from "@/types/progressapp/domain"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { calculateDashboardProgressFromRollups } from "@/lib/tools/exam-prep/calculations/dashboard-progress"
import { calculateExamFoundation } from "@/lib/tools/exam-prep/calculations/exam-foundation"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import { calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"
import { calculateWeightedAverageMarks } from "@/lib/tools/exam-prep/calculations/test-records"
import { Category, Progress } from "@/types/progressapp/progress"
import { ProgressCard } from "./progress-card"
import { AnalyticsProvider } from "@/components/tools/exam-prep/contexts/analytics-context"
import dynamic from "next/dynamic"
import { useMemo } from "react"
import {
  surfaceVariants,
  typographyVariants,
} from "@/lib/tools/exam-prep/design-system"
import { cn } from "@/lib/utils"

const StudyProgressAnalytics = dynamic(
  () =>
    import("@/components/tools/exam-prep/analytics/StudyProgressAnalytics").then(
      (mod) => mod.StudyProgressAnalytics
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          surfaceVariants({ variant: "muted", padding: "none" }),
          "h-48 bg-muted/40"
        )}
      />
    ),
  }
)

const TopicWeightageAnalysis = dynamic(
  () =>
    import("@/components/tools/exam-prep/dashboard/topic-weightage-analysis").then(
      (mod) => mod.TopicWeightageAnalysis
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          surfaceVariants({ variant: "muted", padding: "none" }),
          "h-[420px] bg-muted/40"
        )}
      />
    ),
  }
)

const CategoryView = dynamic(
  () => import("./category-view").then((mod) => mod.CategoryView),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          surfaceVariants({ variant: "muted", padding: "none" }),
          "h-72 bg-muted/40"
        )}
      />
    ),
  }
)

interface DashboardContentProps {
  user: {
    name: string
    examName: string
    examDate: Date
    subjects: SubjectWithRelations[]
    mockTests: MockTest[]
    studyStreak: StudyStreak | null
    dailyActivities: DailyActivity[]
    targetMarks: number
  }
}

export function DashboardContent({ user }: DashboardContentProps) {
  const progress = useMemo(
    () => calculateDashboardProgressFromRollups(user.subjects),
    [user.subjects]
  )
  const foundationResult = useMemo(
    () => calculateExamFoundation(user.subjects),
    [user.subjects]
  )
  const subjectProgress = useMemo(
    () =>
      user.subjects.map((subject) => ({
        subject,
        progress: getProgressSummary(subject),
        marksEvidence: calculateSubjectProgress(subject).expectedMarksEvidence,
      })),
    [user.subjects]
  )

  // Calculate completed subjects
  const completedSubjects = subjectProgress.filter(
    ({ progress }) => progress.learning === 100
  ).length

  const averageMarksEvidence = calculateWeightedAverageMarks(
    subjectProgress.map(({ subject, marksEvidence }) => ({
      percentage: marksEvidence.percentage,
      weightage: subject.weightage,
    }))
  )
  const averageMarksSuffix =
    averageMarksEvidence.percentage !== null
      ? `based on ${averageMarksEvidence.evidencedSubjects}/${averageMarksEvidence.totalSubjects} subjects`
      : "No test data"

  const getProgressValue = (progress: Progress, category: Category): number => {
    switch (category) {
      case "learning":
        return progress.learning
      case "revision":
        return progress.revision
      case "practice":
        return progress.practice
      case "test":
        return progress.test
      default:
        return progress.overall
    }
  }

  const welcomeHeader = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-blue-500 md:text-3xl">
        Welcome {user?.name?.split(" ")[0]}
      </h1>
      <div
        className={cn(
          typographyVariants({ variant: "bodyMuted" }),
          "text-base leading-normal"
        )}
      >
        Here&apos;s an overview of your {user.examName} preparation
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.4fr_0.6fr]">
        {/* Left Column */}
        <div>
          {/* Header - Desktop */}
          <div className="hidden md:block">{welcomeHeader}</div>

          {/* Mobile Header and Stats */}
          <div className="md:hidden">
            {welcomeHeader}
            <div className="mb-4 space-y-4 md:mb-6 md:space-y-6">
              <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-rows-2">
                <StatsCard
                  title="Subject Progress"
                  value={completedSubjects}
                  total={user.subjects.length}
                  tooltipText="Number of subjects where learning phase is completed"
                  suffix="completed"
                />
                <StatsCard
                  title="Average Marks"
                  value={
                    averageMarksEvidence.percentage === null
                      ? "—"
                      : `${averageMarksEvidence.percentage}%`
                  }
                  tooltipText="Weightage-adjusted average of subjects with valid Test Records. Subjects without evidence are excluded."
                  suffix={averageMarksSuffix}
                />
              </div>

              <ExamFoundationCard
                key={JSON.stringify(foundationResult)}
                result={foundationResult}
                examName={user.examName}
              />

              <DashboardProgressOverview
                progress={progress}
                subjects={user.subjects}
              />

              <div className="w-full">
                <ExamCountdown examDate={user.examDate} />
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="lg:space-y-6">
            <div className="gap-6 space-y-6">
              <div className="hidden gap-6 md:flex md:flex-col lg:flex-row">
                <div className="lg:w-[45%]">
                  <div className="flex h-full gap-4 lg:flex-col">
                    <StatsCard
                      title="Subject Progress"
                      value={completedSubjects}
                      total={user.subjects.length}
                      tooltipText="Number of subjects where learning phase is completed"
                      suffix="completed"
                      className="flex-1"
                    />
                    <StatsCard
                      title="Average Marks"
                      value={
                        averageMarksEvidence.percentage === null
                          ? "—"
                          : `${averageMarksEvidence.percentage}%`
                      }
                      tooltipText="Weightage-adjusted average of subjects with valid Test Records. Subjects without evidence are excluded."
                      suffix={averageMarksSuffix}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-6 lg:w-[55%]">
                  <ProgressCard progress={progress} showToggle={false} />
                </div>
              </div>

              <ExamFoundationCard
                key={JSON.stringify(foundationResult)}
                result={foundationResult}
                examName={user.examName}
                className="hidden lg:block"
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="custom-scrollbar sticky top-20 hidden h-fit max-h-[calc(100vh-6rem)] overflow-y-auto md:block">
          <ExamCountdown examDate={user.examDate} />
        </div>
      </div>

      <ExamFoundationCard
        key={JSON.stringify(foundationResult)}
        result={foundationResult}
        examName={user.examName}
        className="hidden md:block lg:hidden"
      />

      {/* Study Progress Analytics - Full Width Bottom Section */}
      <div className="w-full">
        <AnalyticsProvider initialDate={new Date()} examDate={user.examDate}>
          <StudyProgressAnalytics />
        </AnalyticsProvider>
      </div>

      {/* Analysis Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left Column */}
        <div>
          {/* Desktop Layout */}
          <div className="space-y-6">
            <TopicWeightageAnalysis subjects={user.subjects} />
          </div>
        </div>

        {/* Right Column */}
        <div className="hidden lg:block">
          <div className="space-y-6">
            <div className="space-y-4 rounded-lg">
              <CategoryView
                subjects={user.subjects}
                getProgressValue={getProgressValue}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

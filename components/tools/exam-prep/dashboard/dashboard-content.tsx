"use client";

import { DashboardProgressOverview } from "@/components/tools/exam-prep/dashboard/progress-overview";
import { ExamCountdown } from "@/components/tools/exam-prep/dashboard/exam-countdown";
import { ExamFoundationCard } from "@/components/tools/exam-prep/dashboard/exam-foundation-card";
import { StatsCard } from "@/components/tools/exam-prep/dashboard/stats-card";
import { MockTest, DailyActivity, StudyStreak } from "@/types/progressapp/domain";
import { SubjectWithRelations } from "@/types/progressapp/domain";
import { calculateDashboardProgressFromRollups } from "@/lib/tools/exam-prep/calculations/dashboard-progress";
import { calculateExamFoundation } from "@/lib/tools/exam-prep/calculations/exam-foundation";
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors";
import { Target } from "lucide-react";
import { Category, Progress } from "@/types/progressapp/progress";
import { ProgressCard } from "./progress-card";
import { AnalyticsProvider } from "@/components/tools/exam-prep/contexts/analytics-context";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { surfaceVariants, typographyVariants } from "@/lib/tools/exam-prep/design-system";
import { cn } from "@/lib/utils";

const StudyProgressAnalytics = dynamic(
  () => import("@/components/tools/exam-prep/analytics/StudyProgressAnalytics").then((mod) => mod.StudyProgressAnalytics),
  {
    ssr: false,
    loading: () => <div className={cn(surfaceVariants({ variant: "muted", padding: "none" }), "h-48 bg-muted/40")} />,
  }
);

const TopicWeightageAnalysis = dynamic(
  () => import("@/components/tools/exam-prep/dashboard/topic-weightage-analysis").then((mod) => mod.TopicWeightageAnalysis),
  {
    ssr: false,
    loading: () => <div className={cn(surfaceVariants({ variant: "muted", padding: "none" }), "h-[420px] bg-muted/40")} />,
  }
);

const CategoryView = dynamic(
  () => import("./category-view").then((mod) => mod.CategoryView),
  {
    ssr: false,
    loading: () => <div className={cn(surfaceVariants({ variant: "muted", padding: "none" }), "h-72 bg-muted/40")} />,
  }
);

interface DashboardContentProps {
  user: {
    name: string;
    examName: string;
    examDate: Date;
    subjects: SubjectWithRelations[];
    mockTests: MockTest[];
    studyStreak: StudyStreak | null;
    dailyActivities: DailyActivity[];
    targetMarks: number;
  }
}

export function DashboardContent({ user }: DashboardContentProps) {
  const progress = useMemo(() => calculateDashboardProgressFromRollups(user.subjects), [user.subjects]);
  const foundationResult = useMemo(() => calculateExamFoundation(user.subjects), [user.subjects]);
  const subjectProgress = useMemo(
    () => user.subjects.map(subject => ({
      subject,
      progress: getProgressSummary(subject),
    })),
    [user.subjects]
  );

  // Calculate completed subjects
  const completedSubjects = subjectProgress.filter(({ progress }) => progress.learning === 100).length;

  // Calculate total expected marks
  const totals = subjectProgress.reduce((acc, { subject }) => {
    return {
      expectedMarks: acc.expectedMarks + subject.expectedMarks,
      totalWeightage: acc.totalWeightage + subject.weightage
    };
  }, { expectedMarks: 0, totalWeightage: 0 });

  const getProgressValue = (progress: Progress, category: Category): number => {
    switch (category) {
      case 'learning': return progress.learning;
      case 'revision': return progress.revision;
      case 'practice': return progress.practice;
      case 'test': return progress.test;
      default: return progress.overall;
    }
  };

  const welcomeHeader = (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-500">Welcome {user?.name?.split(" ")[0]}</h1>
      <div className={cn(typographyVariants({ variant: "bodyMuted" }), "text-base leading-normal")}>
        Here&apos;s an overview of your {user.examName} preparation
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
          {/* Main Content */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.4fr_0.6fr]">
            {/* Left Column */}
            <div>
              {/* Header - Desktop */}
              <div className="hidden md:block">
                {welcomeHeader}
              </div>

              {/* Mobile Header and Stats */}
              <div className="md:hidden">
                {welcomeHeader}
                <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
                  <div className="grid grid-cols-2 lg:grid-rows-2 gap-2 md:gap-4">
                    <StatsCard
                      title="Subject Progress"
                      value={completedSubjects}
                      total={user.subjects.length}
                      tooltipText="Number of subjects where learning phase is completed"
                      suffix="completed"
                    />
                    <StatsCard
                      title="Projected Marks"
                      value={Math.round(totals.expectedMarks)}
                      total={Math.round(totals.totalWeightage)}
                      tooltipText="Projected Marks based on your test performance across all subjects"
                      suffix="expected"
                      badge={{
                        value: user.targetMarks,
                        icon: <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
                        tooltipText: "Your target marks set during onboarding"
                      }}
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
                    <ExamCountdown
                      examDate={user.examDate}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="lg:space-y-6">
                <div className="gap-6 space-y-6">
                  <div className="md:flex md:flex-col lg:flex-row hidden gap-6">
                    <div className="lg:w-[45%]">
                      <div className="flex lg:flex-col gap-4 h-full">
                        <StatsCard
                          title="Subject Progress"
                          value={completedSubjects}
                          total={user.subjects.length}
                          tooltipText="Number of subjects where learning phase is completed"
                          suffix="completed"
                          className="flex-1"
                        />
                        <StatsCard
                          title="Projected Marks"
                          value={Math.round(totals.expectedMarks)}
                          total={Math.round(totals.totalWeightage)}
                          tooltipText="Projected Marks based on your test performance across all subjects"
                          suffix="expected"
                          badge={{
                            value: user.targetMarks,
                            icon: <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
                            tooltipText: "Your target marks set during onboarding"
                          }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className=" lg:w-[55%] space-y-6">
                      <ProgressCard
                        progress={progress}
                        showToggle={false}
                      />
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
            <div className="hidden md:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <ExamCountdown
                examDate={user.examDate}
              />
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
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
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
  );
}

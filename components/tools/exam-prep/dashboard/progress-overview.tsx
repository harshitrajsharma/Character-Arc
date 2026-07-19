"use client";

import { SubjectWithRelations } from "@/types/progressapp/domain"
import { useState } from "react"
import { ProgressCard } from "./progress-card"
import { CategoryView } from "./category-view"
import { Category, Progress } from "@/types/progressapp/progress"

interface DashboardProgressOverviewProps {
  progress: Progress;
  subjects: SubjectWithRelations[];
}

export function DashboardProgressOverview({ progress, subjects }: DashboardProgressOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // const [selectedCategory, setSelectedCategory] = useState<Category>('overall');

  const getProgressValue = (progress: Progress, category: Category): number => {
    switch (category) {
      case 'learning': return progress.learning;
      case 'revision': return progress.revision;
      case 'practice': return progress.practice;
      case 'test': return progress.test;
      default: return progress.overall;
    }
  };

  return (
    <div className="space-y-4 rounded-lg">
      <ProgressCard
        progress={progress}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      { isExpanded && (<CategoryView
        subjects={subjects}
        getProgressValue={getProgressValue}
      />)}
    </div>
  );
} 

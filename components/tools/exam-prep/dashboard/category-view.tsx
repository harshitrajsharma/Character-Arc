import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubjectWithRelations } from "@/types/progressapp/domain";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors";
import { Category, CATEGORIES, Progress as ProgressSummary } from "@/types/progressapp/progress";
import { Star, TrendingUp } from 'lucide-react';

interface CategoryViewProps {
  subjects: SubjectWithRelations[];
  initialCategory?: Category;
  getProgressValue: (progress: ProgressSummary, category: Category) => number;
  className?: string;
}

export function CategoryView({ 
  subjects, 
  initialCategory = 'overall',
  getProgressValue,
  className 
}: CategoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>(initialCategory);
  const [sortMethod, setSortMethod] = useState<'weightage' | 'progress'>('weightage');

  const processedSubjects = useMemo(() => {
    return subjects
      .map(subject => ({
        ...subject,
        progress: getProgressSummary(subject)
      }))
      .sort((a, b) => {
        if (sortMethod === 'weightage') return b.weightage - a.weightage;
        return getProgressValue(b.progress, selectedCategory) - 
               getProgressValue(a.progress, selectedCategory);
      });
  }, [subjects, selectedCategory, sortMethod, getProgressValue]);

  return (
    <Card 
      className={cn(
        "p-3 sm:p-6 space-y-3 sm:space-y-6 shadow-md transition-all duration-300 rounded-xl",
        className
      )}
    >
      {/* Responsive Header */}
      <div className="flex flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-xl font-semibold tracking-tight text-blue-500 dark:text-blue-400">
            Subject Progress Analysis
          </h2>
        </div>
        {/* Intelligent Sorting Mechanism */}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 sm:gap-2 text-[10px] sm:text-sm h-7 sm:h-9"
          onClick={() => setSortMethod(
            sortMethod === 'weightage' ? 'progress' : 'weightage'
          )}
        >
          {sortMethod === 'weightage' ? (
            <Star className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          Sort by {sortMethod === 'weightage' ? 'Progress' : 'Weightage'}
        </Button>
      </div>

      {/* Semantically Structured Category Filters */}
      <div 
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Progress Categories"
      >
        {Object.entries(CATEGORIES).map(([key, config]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={selectedCategory === key}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full transition-colors duration-200",
              selectedCategory === key 
                ? `${config.bgColor} shadow-md` 
                : "hover:bg-secondary/20"
            )}
            onClick={() => setSelectedCategory(key as Category)}
          >
            <div 
              className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full", 
                config.progressColor
              )} 
            />
            <span className="text-[10px] sm:text-sm font-medium">{config.label}</span>
          </Button>
        ))}
      </div>

      {/* Responsive Subjects List */}
      <div className="space-y-3">
        {processedSubjects.map(({ progress, ...subject }) => {
          const progressValue = Math.round(getProgressValue(progress, selectedCategory));
          return (
            <Link 
              key={subject.id} 
              href={`/subjects/${subject.id}`}
              className="block group"
            >
              <div 
                className={cn(
                  "p-2.5 sm:p-4 rounded-lg border transition-all duration-300 mb-2 sm:mb-3",
                  "hover:shadow-md",
                  CATEGORIES[selectedCategory].bgColor,
                  "bg-opacity-10 hover:bg-opacity-20",
                  "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <div className="relative w-1.5 h-1.5 sm:w-2 sm:h-2 hidden sm:block">
                      <div className={cn(
                        "absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-ping",
                        CATEGORIES[selectedCategory].progressColor
                      )} />
                      <div className={cn(
                        "absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                        CATEGORIES[selectedCategory].progressColor
                      )} />
                    </div>
                    <h3 className="text-xs sm:text-base font-semibold truncate text-gray-900 dark:text-gray-100">
                      {subject.name}
                    </h3>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] sm:text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1",
                        CATEGORIES[selectedCategory].color,
                        progressValue < 30 && "bg-red-500/20 text-red-700 dark:text-red-400",
                        progressValue >= 70 && "bg-green-500/20 text-green-700 dark:text-green-400",
                        "bg-opacity-50"
                      )}
                    >
                      {progressValue}%
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                    >
                      {subject.weightage} Marks
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={progressValue}
                  className="h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700"
                  indicatorClassName={cn(
                    CATEGORIES[selectedCategory].progressColor,
                    "transition-all duration-500"
                  )}
                />
              </div>
            </Link>
          );
        })}
        {processedSubjects.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No subjects available for this category
          </div>
        )}
      </div>
    </Card>
  );
}

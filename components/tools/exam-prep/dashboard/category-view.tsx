import React, { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import {
  Category,
  CATEGORIES,
  Progress as ProgressSummary,
} from "@/types/progressapp/progress"
import { Star, TrendingUp } from "lucide-react"

interface CategoryViewProps {
  subjects: SubjectWithRelations[]
  initialCategory?: Category
  getProgressValue: (progress: ProgressSummary, category: Category) => number
  className?: string
}

export function CategoryView({
  subjects,
  initialCategory = "overall",
  getProgressValue,
  className,
}: CategoryViewProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<Category>(initialCategory)
  const [sortMethod, setSortMethod] = useState<"weightage" | "progress">(
    "weightage"
  )

  const processedSubjects = useMemo(() => {
    return subjects
      .map((subject) => ({
        ...subject,
        progress: getProgressSummary(subject),
      }))
      .sort((a, b) => {
        if (sortMethod === "weightage") return b.weightage - a.weightage
        return (
          getProgressValue(b.progress, selectedCategory) -
          getProgressValue(a.progress, selectedCategory)
        )
      })
  }, [subjects, selectedCategory, sortMethod, getProgressValue])

  return (
    <Card
      className={cn(
        "space-y-3 rounded-xl p-3 shadow-md transition-all duration-300 sm:space-y-6 sm:p-6",
        className
      )}
    >
      {/* Responsive Header */}
      <div className="flex flex-row items-start justify-between gap-3 sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-blue-500 sm:text-xl dark:text-blue-400">
            Subject Progress Analysis
          </h2>
        </div>
        {/* Intelligent Sorting Mechanism */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-[10px] sm:h-9 sm:gap-2 sm:text-sm"
          onClick={() =>
            setSortMethod(sortMethod === "weightage" ? "progress" : "weightage")
          }
        >
          {sortMethod === "weightage" ? (
            <Star className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          Sort by {sortMethod === "weightage" ? "Progress" : "Weightage"}
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
                "h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                config.progressColor
              )}
            />
            <span className="text-[10px] font-medium sm:text-sm">
              {config.label}
            </span>
          </Button>
        ))}
      </div>

      {/* Responsive Subjects List */}
      <div className="space-y-3">
        {processedSubjects.map(({ progress, ...subject }) => {
          const progressValue = Math.round(
            getProgressValue(progress, selectedCategory)
          )
          return (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="group block"
            >
              <div
                className={cn(
                  "mb-2 rounded-lg border p-2.5 transition-all duration-300 sm:mb-3 sm:p-4",
                  "hover:shadow-md",
                  CATEGORIES[selectedCategory].bgColor,
                  "bg-opacity-10 hover:bg-opacity-20",
                  "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="mb-2 flex flex-row items-start justify-between gap-2 sm:mb-3 sm:items-center sm:gap-3">
                  <div className="flex flex-1 items-center gap-2 sm:gap-3">
                    <div className="relative hidden h-1.5 w-1.5 sm:block sm:h-2 sm:w-2">
                      <div
                        className={cn(
                          "absolute h-1.5 w-1.5 animate-ping rounded-full sm:h-2 sm:w-2",
                          CATEGORIES[selectedCategory].progressColor
                        )}
                      />
                      <div
                        className={cn(
                          "absolute h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                          CATEGORIES[selectedCategory].progressColor
                        )}
                      />
                    </div>
                    <h3 className="truncate text-xs font-semibold text-gray-900 sm:text-base dark:text-gray-100">
                      {subject.name}
                    </h3>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs",
                        CATEGORIES[selectedCategory].color,
                        progressValue < 30 &&
                          "bg-red-500/20 text-red-700 dark:text-red-400",
                        progressValue >= 70 &&
                          "bg-green-500/20 text-green-700 dark:text-green-400",
                        "bg-opacity-50"
                      )}
                    >
                      {progressValue}%
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 sm:px-2 sm:py-1 sm:text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {subject.weightage} Marks
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={progressValue}
                  className="h-1.5 bg-gray-200 sm:h-2 dark:bg-gray-700"
                  indicatorClassName={cn(
                    CATEGORIES[selectedCategory].progressColor,
                    "transition-all duration-500"
                  )}
                />
              </div>
            </Link>
          )
        })}
        {processedSubjects.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No subjects available for this category
          </div>
        )}
      </div>
    </Card>
  )
}

"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import { BookOpen, GraduationCap, CheckCircle2 } from "lucide-react"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { CATEGORIES, type Category } from "@/types/progressapp/progress"

interface SubjectsListProps {
  subjects: SubjectWithRelations[]
}

export function SubjectsList({ subjects }: SubjectsListProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("overall")

  // Sort subjects by weightage and calculate progress
  const sortedSubjects = useMemo(() => {
    return subjects
      .map((subject) => ({
        ...subject,
        progress: getProgressSummary(subject),
      }))
      .sort((a, b) => b.weightage - a.weightage)
  }, [subjects])

  const getProgressValue = (
    progress: ReturnType<typeof getProgressSummary>,
    category: Category
  ) => {
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

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Subjects</h3>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, config]) => (
            <Button
              key={key}
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 rounded-full",
                selectedCategory === key && config.bgColor
              )}
              onClick={() => setSelectedCategory(key as Category)}
            >
              <div
                className={cn(
                  "mr-2 h-2 w-2 rounded-full",
                  config.progressColor
                )}
              />
              <span className="text-xs">{config.label}</span>
            </Button>
          ))}
        </div>

        {/* Subjects List */}
        <div className="space-y-6">
          {sortedSubjects.map(({ progress, ...subject }) => (
            <div key={subject.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{subject.name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {subject.weightage}% weightage
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {subject.foundationLevel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <span>
                    {Math.round(getProgressValue(progress, selectedCategory))}%
                  </span>
                  {progress.overall >= 100 && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <Progress
                value={getProgressValue(progress, selectedCategory)}
                className="h-2 bg-secondary/50"
                indicatorClassName={cn(
                  CATEGORIES[selectedCategory].progressColor,
                  "transition-all duration-300"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

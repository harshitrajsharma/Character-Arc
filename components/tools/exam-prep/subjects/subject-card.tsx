"use client"

import Link from "next/link"
import { Book, Pencil, Target, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"
import { getFoundationLevelColor, getFoundationLevelBG, categoryVariants, progressVariants } from "./shared-styles"

export type SubjectCategory = "not-started" | "in-progress" | "completed"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function SubjectCard({
  workspaceSlug,
  subject,
  category,
  examId,
}: {
  workspaceSlug: string
  subject: SubjectWithRelations
  category: SubjectCategory
  examId: string
}) {
  const progress = calculateSubjectProgress(subject)
  const totalChapters = subject.chapterCount ?? subject.chapters?.length ?? 0
  const totalTopics = subject.topicCount ?? subject.chapters?.reduce((acc, chap) => acc + (chap.topicCount ?? chap.topics?.length ?? 0), 0) ?? 0

  const learningProgress = Math.round(progress.learning)
  const revisionProgress = Math.round(progress.revision)
  const practiceProgress = Math.round(progress.practice)
  const testProgress = Math.round(progress.test)
  const overallProgress = Math.round(progress.overall)
  const foundationLevel = progress.foundationLevel

  return (
    <div className="group relative transform-gpu transition-all duration-300 hover:z-10">
      <Link href={workspaceRoutes.examPrep.subject(workspaceSlug, examId, subject.id)} className="block">
        <Card
          className={cn(
            "relative border border-white/10 p-4 transition-all duration-300",
            categoryVariants[category].cardHover,
            "group-hover:scale-[1.02] group-hover:border-white/30 group-hover:shadow-xl dark:group-hover:border-white/20",
            "before:absolute before:inset-0 before:rounded-lg before:bg-linear-to-b before:from-white/5 before:to-black/10 before:dark:from-white/5 before:dark:to-black/20",
            "after:absolute after:inset-0 after:rounded-lg after:bg-black/5 after:opacity-0 after:dark:bg-white/5",
            "hover:after:opacity-100"
          )}
        >
          {/* Action Buttons */}
          <div className="absolute right-3 top-3 z-20 flex translate-y-1 gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 backdrop-blur-md hover:bg-white dark:bg-black/50 dark:hover:bg-black/70"
              onClick={(e) => {
                e.preventDefault()
                // setEditDialogOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 backdrop-blur-md hover:bg-red-50 hover:text-red-500 dark:bg-black/50 dark:hover:bg-red-950"
              onClick={(e) => {
                e.preventDefault()
                // setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative z-10 space-y-4">
            {/* Header Section */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="line-clamp-2 text-xl font-bold leading-tight text-foreground">
                  {subject.name}
                </h2>
                <Badge
                  className={cn(
                    "px-2 py-1 text-xs font-medium backdrop-blur-sm",
                    categoryVariants[category].badge
                  )}
                >
                  {overallProgress}%
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Book className="h-4 w-4" />
                    <span>{totalChapters} chapters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    <span>{totalTopics} topics</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-normal backdrop-blur-sm">
                  {subject.weightage} marks
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-brand-neon" />
                <div className="p-2.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Weightage</p>
                  <p className="mt-0.5 text-lg font-semibold text-brand-neon-ink">
                    {subject.weightage} Marks
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                <div
                  className={cn("absolute bottom-0 left-0 top-0 w-1", getFoundationLevelBG(foundationLevel))}
                />
                <div className="p-2.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Foundation</p>
                  <p
                    className={cn(
                      "mt-0.5 text-lg font-semibold capitalize",
                      getFoundationLevelColor(foundationLevel)
                    )}
                  >
                    {foundationLevel}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{overallProgress}%</span>
                </div>
                <Progress
                  value={overallProgress}
                  className="h-2 bg-secondary/50"
                  indicatorClassName="bg-black dark:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Learning", value: learningProgress, color: progressVariants.learning.high },
                  { label: "Revision", value: revisionProgress, color: progressVariants.revision.high },
                  { label: "Practice", value: practiceProgress, color: progressVariants.practice.high },
                  { label: "Test", value: testProgress, color: progressVariants.test.high },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <Progress
                      value={item.value}
                      className="h-1.5 bg-secondary/50"
                      indicatorClassName={item.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  )
}

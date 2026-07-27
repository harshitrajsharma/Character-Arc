"use client"

import Link from "next/link"
import { Book, Pencil, Target, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { getFoundationLevelColor, getFoundationLevelBG, categoryVariants, progressVariants } from "./shared-styles"
import { getCanonicalSubjectProgress } from "./progress-helper"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export type SubjectCategory = "not-started" | "in-progress" | "completed"

interface SubjectCardProps {
  workspaceSlug: string
  subject: SubjectWithRelations
  examId: string
}

export function SubjectCard({
  workspaceSlug,
  subject,
  examId,
}: SubjectCardProps) {
  const {
    overall,
    learning,
    revision,
    practice,
    test,
    category,
    foundationLevel,
  } = getCanonicalSubjectProgress(subject)

  const totalChapters = subject.chapterCount ?? subject.chapters?.length ?? 0
  const totalTopics =
    subject.topicCount ??
    subject.chapters?.reduce(
      (acc, chap) => acc + (chap.topicCount ?? chap.topics?.length ?? 0),
      0
    ) ??
    0

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast.info(`Editing is managed via ${subject.name} settings page.`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast.info(`Delete operations are disabled directly from the card.`)
  }

  return (
    <div className="group relative h-full transform-gpu transition-all duration-300 hover:z-10">
      {/* Action Buttons: Rendered outside/on top of the Link to avoid nesting interactive elements */}
      <div className="absolute right-3 top-3 z-30 flex translate-y-1 gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-white/80 backdrop-blur-md hover:bg-white dark:bg-black/50 dark:hover:bg-black/70 pointer-events-auto"
          onClick={handleEdit}
          aria-label={`Edit ${subject.name}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-white/80 backdrop-blur-md hover:bg-destructive/10 hover:text-destructive dark:bg-black/50 dark:hover:bg-destructive/20 pointer-events-auto"
          onClick={handleDelete}
          aria-label={`Delete ${subject.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Link
        href={workspaceRoutes.examPrep.subject(workspaceSlug, examId, subject.id)}
        className="block h-full rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`View subject details for ${subject.name}, overall progress ${overall} percent, status is ${category.replace("-", " ")}`}
      >
        <Card
          className={cn(
            "relative h-full border border-white/10 p-4 transition-all duration-300",
            categoryVariants[category].cardHover,
            "group-hover:scale-[1.02] group-hover:border-white/30 group-hover:shadow-xl dark:group-hover:border-white/20",
            "before:absolute before:inset-0 before:rounded-lg before:bg-linear-to-b before:from-white/5 before:to-black/10 before:dark:from-white/5 before:dark:to-black/20",
            "after:absolute after:inset-0 after:rounded-lg after:bg-black/5 after:opacity-0 after:dark:bg-white/5",
            "hover:after:opacity-100"
          )}
        >
          <div className="relative z-10 space-y-4">
            {/* Header Section */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="min-h-12 line-clamp-2 wrap-break-words pr-12 text-xl font-bold leading-tight text-foreground">
                  {subject.name}
                </h2>
                <Badge
                  className={cn(
                    "px-2 py-1 text-xs font-medium backdrop-blur-sm shrink-0 rounded-md",
                    categoryVariants[category].badge
                  )}
                >
                  {overall}%
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Book className="h-4 w-4 text-muted-foreground/75" aria-hidden="true" />
                    <span>{totalChapters} chapters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-muted-foreground/75" aria-hidden="true" />
                    <span>{totalTopics} topics</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-normal backdrop-blur-sm rounded-md shrink-0">
                  {subject.weightage} marks
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 border border-border/30">
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-brand-neon" />
                <div className="p-2.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Weightage</p>
                  <p className="mt-0.5 text-lg font-semibold text-brand-neon-ink">
                    {subject.weightage} Marks
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 border border-border/30">
                <div className={cn("absolute bottom-0 left-0 top-0 w-1", getFoundationLevelBG(foundationLevel))} />
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
                  <span className="font-semibold">{overall}%</span>
                </div>
                <Progress
                  value={overall}
                  className="h-2 bg-secondary/50"
                  indicatorClassName="bg-black dark:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Learning", value: learning, color: progressVariants.learning.high },
                  { label: "Revision", value: revision, color: progressVariants.revision.high },
                  { label: "Practice", value: practice, color: progressVariants.practice.high },
                  { label: "Test", value: test, color: progressVariants.test.high },
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

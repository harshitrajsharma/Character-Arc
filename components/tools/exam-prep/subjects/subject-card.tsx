"use client"

import Link from "next/link"
import { Book, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import {
  getFoundationLevelColor,
  getFoundationLevelBG,
  categoryVariants,
  progressVariants,
} from "./shared-styles"
import { getCanonicalSubjectProgress } from "./progress-helper"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export type SubjectCategory = "not-started" | "in-progress" | "completed"

interface SubjectCardProps {
  workspaceSlug: string
  subject: SubjectWithRelations
  examId: string
  dragActivatorProps?: React.HTMLAttributes<HTMLAnchorElement>
  shouldSuppressNavigation?: () => boolean
  isDragging?: boolean
}

export function SubjectCard({
  workspaceSlug,
  subject,
  examId,
  dragActivatorProps,
  shouldSuppressNavigation,
  isDragging = false,
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

  return (
    <div className="group relative h-full transform-gpu transition-all duration-300 hover:z-10">
      <Link
        href={workspaceRoutes.examPrep.subject(
          workspaceSlug,
          examId,
          subject.id
        )}
        {...dragActivatorProps}
        onClickCapture={(event) => {
          if (!shouldSuppressNavigation?.()) return

          event.preventDefault()
          event.stopPropagation()
        }}
        className={cn(
          "block h-full rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden",
          dragActivatorProps && "cursor-pointer touch-manipulation select-none",
          isDragging && "cursor-grabbing"
        )}
        aria-label={`View subject details for ${subject.name}, overall progress ${overall} percent, status is ${category.replace("-", " ")}`}
      >
        <Card
          className={cn(
            "relative h-full border border-border p-4 transition-all duration-300",
            categoryVariants[category].cardHover,
            "group-hover:scale-[1.02] group-hover:border-brand-violet-line group-hover:shadow-xl",
            "before:absolute before:inset-0 before:rounded-lg before:bg-linear-to-b before:from-foreground/[0.04] before:to-transparent",
            "after:absolute after:inset-0 after:rounded-lg after:bg-background/5 after:opacity-0",
            "hover:after:opacity-100",
            isDragging && "scale-[1.01] border-brand-violet-line shadow-xl"
          )}
        >
          <div className="relative z-10 space-y-4">
            {/* Header Section */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="wrap-break-words line-clamp-2 min-h-12 text-xl leading-tight font-bold text-foreground">
                  {subject.name}
                </h2>
                <Badge
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-medium backdrop-blur-sm",
                    categoryVariants[category].badge
                  )}
                >
                  {overall}%
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Book
                      className="h-4 w-4 text-muted-foreground/75"
                      aria-hidden="true"
                    />
                    <span>{totalChapters} chapters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target
                      className="h-4 w-4 text-muted-foreground/75"
                      aria-hidden="true"
                    />
                    <span>{totalTopics} topics</span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-md text-xs font-normal backdrop-blur-sm"
                >
                  {subject.weightage}% weightage
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/50">
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-brand-violet" />
                <div className="p-2.5">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Weightage
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-brand-violet-ink">
                    {subject.weightage}%
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/50">
                <div
                  className={cn(
                    "absolute top-0 bottom-0 left-0 w-1",
                    getFoundationLevelBG(foundationLevel)
                  )}
                />
                <div className="p-2.5">
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Foundation
                  </p>
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
                  <span className="font-medium text-muted-foreground">
                    Overall Progress
                  </span>
                  <span className="font-semibold">{overall}%</span>
                </div>
                <Progress
                  value={overall}
                  className="h-2 bg-secondary/50"
                  indicatorClassName="bg-foreground/80"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Learning",
                    value: learning,
                    color: progressVariants.learning.high,
                  },
                  {
                    label: "Revision",
                    value: revision,
                    color: progressVariants.revision.high,
                  },
                  {
                    label: "Practice",
                    value: practice,
                    color: progressVariants.practice.high,
                  },
                  {
                    label: "Test",
                    value: test,
                    color: progressVariants.test.high,
                  },
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

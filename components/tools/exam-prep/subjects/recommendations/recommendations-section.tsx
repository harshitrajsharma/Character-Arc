"use client"

import { useMemo, useState } from "react"
import { PanelRightOpenIcon, CheckCircle2Icon } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  generateStudyPath,
  subjectToStudyPathInput,
} from "@/lib/tools/exam-prep/study-path"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import type { NavigationTarget } from "./types"
import { UpNextCard } from "./up-next-card"
import { StudyPathSheet } from "./study-path-sheet"

export interface RecommendationsSectionProps {
  subject: SubjectWithRelations
  onNavigate: (target: NavigationTarget) => void
}

export function RecommendationsSkeleton() {
  return (
    <section
      className="space-y-3"
      aria-label="Loading study path recommendations"
      aria-busy="true"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-3 md:pb-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-32 w-[82vw] max-w-sm shrink-0 flex-col justify-between rounded-2xl border border-border bg-card p-3 sm:w-72 md:w-auto"
          >
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function RecommendationsSection({
  subject,
  onNavigate,
}: RecommendationsSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const studyPath = useMemo(() => {
    const input = subjectToStudyPathInput(subject, new Date())
    return generateStudyPath(input)
  }, [subject])

  const hasContent =
    subject.chapters &&
    subject.chapters.some((c) => c.topics && c.topics.length > 0)
  const isSyllabusEmpty = subject.chapters && subject.chapters.length === 0

  if (isSyllabusEmpty || !hasContent) {
    return null
  }

  if (studyPath.isCompleted) {
    return (
      <section aria-label="Study Path Recommendations" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground md:text-lg">
              Study Path
            </h2>
            <p className="text-xs text-muted-foreground">
              Personalized, step-by-step preparation plan.
            </p>
          </div>
        </div>
        <Empty className="border-success-line bg-success-soft/30 py-8">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="bg-success-soft text-success-ink"
            >
              <CheckCircle2Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-success-ink">
              You are all caught up!
            </EmptyTitle>
            <EmptyDescription>
              You have completed all learning, revision, practice, and test
              requirements for this subject.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    )
  }

  function handleSheetNavigate(target: NavigationTarget) {
    setSheetOpen(false)
    onNavigate(target)
  }

  return (
    <section
      aria-label="Study Path Recommendations"
      className="space-y-2.5 sm:space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground md:text-lg">
            Study Path
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:whitespace-normal">
            Personalized, step-by-step preparation plan for this subject.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium text-foreground",
            "border-border/70 bg-card hover:bg-accent",
            "focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="sm:hidden">Full path</span>
          <span className="hidden sm:inline">View full study path</span>
          <PanelRightOpenIcon className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Up Next
        </h3>

        {/* Clean, naturally aligned horizontal scroll on mobile (< md), 3-col grid on desktop */}
        <div
          role="list"
          className={cn(
          "flex snap-x snap-mandatory scrollbar-none gap-3 overflow-x-auto pb-2 md:grid md:gap-3 md:pb-0",
          studyPath.nextSteps.slice(0, 3).length === 1 && "md:grid-cols-1 md:max-w-sm",
          studyPath.nextSteps.slice(0, 3).length === 2 && "md:grid-cols-2 md:max-w-2xl",
          studyPath.nextSteps.slice(0, 3).length >= 3 && "md:grid-cols-3"
        )}
        >
          {studyPath.nextSteps.slice(0, 3).map((step) => (
            <div
              key={step.id}
              className="flex w-[82vw] max-w-sm shrink-0 snap-start flex-col sm:w-72 md:w-auto"
            >
              <UpNextCard step={step} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      </div>

      <StudyPathSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        subjectName={subject.name}
        studyPath={studyPath}
        onNavigate={handleSheetNavigate}
      />
    </section>
  )
}

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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-36 flex-col justify-between rounded-lg border border-border bg-card p-3.5"
          >
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
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
    <section aria-label="Study Path Recommendations" className="space-y-4">
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
            "h-11 shrink-0 gap-1.5 px-3 text-xs font-semibold text-foreground sm:h-9 sm:px-3.5",
            "border-border bg-card hover:bg-accent dark:hover:bg-accent!",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="sm:hidden">Full path</span>
          <span className="hidden sm:inline">View full study path</span>
          <PanelRightOpenIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Up Next
        </h3>

        <div role="list" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {studyPath.nextSteps.slice(0, 3).map((step) => (
            <UpNextCard key={step.id} step={step} onNavigate={onNavigate} />
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

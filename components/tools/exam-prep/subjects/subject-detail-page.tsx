"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { cn } from "@/lib/utils"

import { SubjectHeader } from "./subject-header"
import { ProgressOverview } from "./stats/progress-overview"
import { SubjectStats } from "./stats/subject-stats"
import { SubjectSyllabus } from "./syllabus/subject-syllabus"
import { SubjectTestView } from "./tests/subject-test-view"
import { SubjectProgressProvider, useSubjectProgress } from "./subject-progress-context"
import { RecommendationsSection, type NavigationTarget } from "./recommendations"

import type { SyllabusStage } from "@/components/tools/exam-prep/subjects/syllabus/syllabus-model"

// -----------------------------------------------------------------------------
// Main Component: SubjectDetailPage
// -----------------------------------------------------------------------------
export function SubjectDetailPage({ workspaceSlug, examId, subject }: { workspaceSlug: string; examId: string; subject: SubjectWithRelations }) {
  return (
    <SubjectProgressProvider initialSubject={subject}>
      <SubjectDetailContent workspaceSlug={workspaceSlug} examId={examId} />
    </SubjectProgressProvider>
  )
}

function SubjectDetailContent({ workspaceSlug, examId }: { workspaceSlug: string, examId: string }) {
  const { subject } = useSubjectProgress()
  const [stage, setStage] = useState<SyllabusStage>("learning")
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null)
  const [highlightSubjectTest, setHighlightSubjectTest] = useState(false)
  const subjectTestRef = useRef<HTMLDivElement>(null)

  const handleNavigate = useCallback((target: NavigationTarget) => {
    setStage(target.stage)
    setNavigationTarget(target)
  }, [])

  const handleNavigationComplete = useCallback(() => {
    setNavigationTarget(null)
  }, [])

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | undefined
    let highlightTimer: ReturnType<typeof setTimeout> | undefined

    if (navigationTarget && navigationTarget.stage === "test" && !navigationTarget.chapterId) {
      const element = subjectTestRef.current
      if (element) {
        delayTimer = setTimeout(() => {
          const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          })
          setHighlightSubjectTest(true)
          highlightTimer = setTimeout(() => {
            setHighlightSubjectTest(false)
            handleNavigationComplete()
          }, 2000)
        }, 100)
      }
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (highlightTimer) clearTimeout(highlightTimer)
      setHighlightSubjectTest(false)
    }
  }, [navigationTarget, handleNavigationComplete])

  return (
    <div className="space-y-5 md:space-y-8">
      <SubjectHeader workspaceSlug={workspaceSlug} examId={examId} subject={subject} />

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <ProgressOverview subject={subject} />
        <div className="space-y-3 md:space-y-6">
          <SubjectStats subject={subject} />
        </div>
      </div>

      <RecommendationsSection subject={subject} onNavigate={handleNavigate} />

      <SubjectSyllabus 
        workspaceSlug={workspaceSlug} 
        examId={examId} 
        stage={stage}
        onStageChange={setStage}
        navigationTarget={navigationTarget}
        onNavigationComplete={handleNavigationComplete}
      />

      <div
        ref={subjectTestRef}
        className={cn(
          "rounded-xl transition-all duration-300 scroll-mt-24",
          highlightSubjectTest && "ring-2 ring-brand-violet-line ring-offset-2 shadow-md"
        )}
      >
        <SubjectTestView 
          workspaceSlug={workspaceSlug}
          examId={examId} 
          subjectId={subject.id} 
          targetTests={subject.progressPolicy?.subjectTestTarget}
        />
      </div>
    </div>
  )
}

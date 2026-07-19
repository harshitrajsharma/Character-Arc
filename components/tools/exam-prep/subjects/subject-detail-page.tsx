"use client"

import type { SubjectWithRelations } from "@/types/progressapp/domain"

import { SubjectHeader } from "./subject-header"
import { ProgressOverview } from "./progress-overview"
import { SubjectStats } from "./subject-stats"
import { SubjectSyllabus } from "./subject-syllabus"
import { SubjectTestView } from "./subject-test-view"
import { SubjectProgressProvider, useSubjectProgress } from "./subject-progress-context"



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

  return (
    <div className="space-y-5 md:space-y-8">
      <SubjectHeader workspaceSlug={workspaceSlug} examId={examId} subject={subject} />

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <ProgressOverview subject={subject} />
        <div className="space-y-3 md:space-y-6">
          <SubjectStats subject={subject} />
        </div>
      </div>

      <SubjectSyllabus workspaceSlug={workspaceSlug} examId={examId} />

      <SubjectTestView 
        workspaceSlug={workspaceSlug}
        examId={examId} 
        subjectId={subject.id} 
        scheduledTests={subject.scheduledTests} 
        targetTests={subject.progressPolicy?.subjectTestTarget}
      />
    </div>
  )
}

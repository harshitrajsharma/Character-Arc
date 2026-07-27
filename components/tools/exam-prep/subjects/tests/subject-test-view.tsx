"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { TestRecordsSection } from "./test-records-section"

type SubjectTestViewProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  targetTests?: number
}

export function SubjectTestView({ workspaceSlug, examId, subjectId, targetTests = 1 }: SubjectTestViewProps) {
  const { subject } = useSubjectProgress()
  const records = subject.testRecords?.filter(r => !r.chapterId) || []
  
  return (
    <TestRecordsSection
      workspaceSlug={workspaceSlug}
      examId={examId}
      subjectId={subjectId}
      title="Subject tests"
      targetTests={targetTests}
      records={records}
    />
  )
}

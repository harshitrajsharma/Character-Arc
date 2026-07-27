"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { TestRecordsSection } from "./test-records-section"

type ChapterTestViewProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  chapterId: string
  targetTests?: number
}

export function ChapterTestView({ workspaceSlug, examId, subjectId, chapterId, targetTests = 1 }: ChapterTestViewProps) {
  const { subject } = useSubjectProgress()
  const records = subject.testRecords?.filter(r => r.chapterId === chapterId) || []
  
  return (
    <TestRecordsSection
      workspaceSlug={workspaceSlug}
      examId={examId}
      subjectId={subjectId}
      chapterId={chapterId}
      title="Chapter tests"
      records={records}
      targetTests={targetTests}
    />
  )
}

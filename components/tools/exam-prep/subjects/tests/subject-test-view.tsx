"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { UnifiedTestsSection } from "./unified-tests-section"

type SubjectTestViewProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  targetTests?: number
  localDate?: string
}

export function SubjectTestView({
  workspaceSlug,
  examId,
  subjectId,
  targetTests = 1,
  localDate,
}: SubjectTestViewProps) {
  const { subject } = useSubjectProgress()
  const records =
    subject.testRecords?.filter(
      (record) =>
        record.scope === "subject" || (!record.scope && !record.chapterId)
    ) || []

  return (
    <UnifiedTestsSection
      workspaceSlug={workspaceSlug}
      examId={examId}
      subjectId={subjectId}
      title="Full-subject tests"
      localDate={localDate}
      records={records}
      targetTests={targetTests}
    />
  )
}

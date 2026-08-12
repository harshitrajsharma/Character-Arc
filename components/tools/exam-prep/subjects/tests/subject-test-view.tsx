"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { ScheduledTestsSection } from "./scheduled-tests-section"
import { TestRecordsSection } from "./test-records-section"

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
    <section className="flex flex-col gap-6">
      <ScheduledTestsSection
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        title="Full-subject test plan"
        localDate={localDate}
      />
      <TestRecordsSection
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        title="Full-subject results"
        targetTests={targetTests}
        records={records}
      />
    </section>
  )
}

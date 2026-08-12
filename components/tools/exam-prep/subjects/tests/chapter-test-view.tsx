"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { ScheduledTestsSection } from "./scheduled-tests-section"
import { TestRecordsSection } from "./test-records-section"

type ChapterTestViewProps = {
  workspaceSlug: string
  examId: string
  subjectId: string
  chapterId: string
  targetTests?: number
  localDate?: string
}

export function ChapterTestView({
  workspaceSlug,
  examId,
  subjectId,
  chapterId,
  targetTests = 1,
  localDate,
}: ChapterTestViewProps) {
  const { subject } = useSubjectProgress()
  const records =
    subject.testRecords?.filter(
      (record) =>
        record.chapterId === chapterId ||
        record.targetChapterIds?.includes(chapterId)
    ) || []

  return (
    <div className="flex flex-col gap-6">
      <ScheduledTestsSection
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        chapterId={chapterId}
        localDate={localDate}
      />
      <TestRecordsSection
        workspaceSlug={workspaceSlug}
        examId={examId}
        subjectId={subjectId}
        chapterId={chapterId}
        title="Completed results"
        records={records}
        targetTests={targetTests}
      />
    </div>
  )
}

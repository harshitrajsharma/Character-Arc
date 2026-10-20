"use client"

import { useSubjectProgress } from "../subject-progress-context"
import { UnifiedTestsSection } from "./unified-tests-section"

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
    <UnifiedTestsSection
      workspaceSlug={workspaceSlug}
      examId={examId}
      subjectId={subjectId}
      chapterId={chapterId}
      localDate={localDate}
      records={records}
      targetTests={targetTests}
    />
  )
}

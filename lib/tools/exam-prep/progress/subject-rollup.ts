import type { SubjectWithRelations } from "@/types/progressapp/domain"
import {
  calculateChapterProgress,
  calculateSubjectProgress,
} from "@/lib/tools/exam-prep/calculations/progress"

export function withCalculatedSubjectProgress(
  subject: SubjectWithRelations
): SubjectWithRelations {
  const chapters = subject.chapters.map((chapter) => {
    const progress = calculateChapterProgress(chapter, subject.progressPolicy)

    return {
      ...chapter,
      topicCount: chapter.topics.length,
      overallProgress: progress.overall,
      learningProgress: progress.learning,
      revisionProgress: progress.revision,
      practiceProgress: progress.practice,
      testProgress: progress.test,
    }
  })
  const topicCount = chapters.reduce(
    (total, chapter) => total + chapter.topics.length,
    0
  )
  const subjectWithChapters = {
    ...subject,
    chapters,
    chapterCount: chapters.length,
    topicCount,
  }
  const progress = calculateSubjectProgress(subjectWithChapters)

  return {
    ...subjectWithChapters,
    overallProgress: progress.overall,
    learningProgress: progress.learning,
    revisionProgress: progress.revision,
    practiceProgress: progress.practice,
    testProgress: progress.test,
    foundationLevel: progress.foundationLevel,
    expectedMarks: progress.expectedMarks,
  }
}

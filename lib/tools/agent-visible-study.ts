import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { withCalculatedSubjectProgress } from "@/lib/tools/exam-prep/progress/subject-rollup"

/** Recompute from visible descendants; cached aggregate fields must not reveal hidden syllabus activity. */
export function filterAgentVisibleSubjects(
  subjects: SubjectWithRelations[],
  visible: ReadonlySet<string>
) {
  return subjects
    .filter((subject) => visible.has(subject.id))
    .map((subject) => {
      const chapters = subject.chapters
        .filter((chapter) => visible.has(chapter.id))
        .map((chapter) => ({
          ...chapter,
          topics: chapter.topics.filter((topic) => visible.has(topic.id)),
          learningProgress: 0,
          revisionProgress: 0,
          practiceProgress: 0,
          testProgress: 0,
          overallProgress: 0,
        }))
      const chapterIds = new Set(chapters.map((chapter) => chapter.id))
      const records = (subject.testRecords ?? [])
        .filter((record) =>
          record.chapterId
            ? chapterIds.has(record.chapterId)
            : record.scope === "multi-chapter"
              ? record.targetChapterIds?.some((chapterId) =>
                  chapterIds.has(chapterId)
                )
              : true
        )
        .map((record) => ({
          ...record,
          targetChapterIds: record.targetChapterIds?.filter((chapterId) =>
            chapterIds.has(chapterId)
          ),
        }))
      return withCalculatedSubjectProgress({
        ...subject,
        chapters,
        testRecords: records,
        chapterCount: chapters.length,
        topicCount: chapters.reduce(
          (count, chapter) => count + chapter.topics.length,
          0
        ),
        learningProgress: 0,
        revisionProgress: 0,
        practiceProgress: 0,
        testProgress: 0,
        overallProgress: 0,
        foundationLevel: "Beginner",
      })
    })
}

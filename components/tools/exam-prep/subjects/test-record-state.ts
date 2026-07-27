import type { SubjectWithRelations } from "@/types/progressapp/domain"
import type { NormalizedTestRecord } from "@/lib/tools/exam-prep/actions/test-actions"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"

export function upsertTestRecord(subject: SubjectWithRelations, record: NormalizedTestRecord): SubjectWithRelations {
  if (record.subjectId !== subject.id) return subject

  const normalizedRecord: BaseTestRecord = {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }

  const existingSubjectRecords = subject.testRecords || []
  const newSubjectRecords = existingSubjectRecords.some((r) => r.id === record.id)
    ? existingSubjectRecords.map((existingRecord) => existingRecord.id === record.id ? normalizedRecord : existingRecord)
    : [normalizedRecord, ...existingSubjectRecords]

  const newChapters = (subject.chapters || []).map((chapter) => {
    let chapterRecords = chapter.testRecords || []
    
    // If the record belongs to this chapter, upsert it.
    if (record.chapterId === chapter.id) {
      if (chapterRecords.some((r) => r.id === record.id)) {
        chapterRecords = chapterRecords.map((existingRecord) => existingRecord.id === record.id ? normalizedRecord : existingRecord)
      } else {
        chapterRecords = [normalizedRecord, ...chapterRecords]
      }
    } else {
      // If the record does not belong to this chapter (e.g. its scope changed to subject or another chapter), remove it if it exists.
      chapterRecords = chapterRecords.filter((r) => r.id !== record.id)
    }

    // Preserve references if nothing changed
    if (chapterRecords.length === (chapter.testRecords || []).length && chapterRecords.every((r, i) => r === (chapter.testRecords || [])[i])) {
      return chapter
    }

    return { ...chapter, testRecords: chapterRecords }
  })

  return {
    ...subject,
    testRecords: newSubjectRecords,
    chapters: newChapters,
  }
}

export function removeTestRecord(subject: SubjectWithRelations, recordId: string): SubjectWithRelations {
  const existingSubjectRecords = subject.testRecords || []
  const newSubjectRecords = existingSubjectRecords.filter((r) => r.id !== recordId)

  const newChapters = (subject.chapters || []).map((chapter) => {
    const chapterRecords = (chapter.testRecords || []).filter((r) => r.id !== recordId)

    // Preserve references if nothing changed
    if (chapterRecords.length === (chapter.testRecords || []).length) {
      return chapter
    }

    return { ...chapter, testRecords: chapterRecords }
  })

  return {
    ...subject,
    testRecords: newSubjectRecords,
    chapters: newChapters,
  }
}

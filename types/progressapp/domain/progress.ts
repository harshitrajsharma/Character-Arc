export const PROGRESS_MODES = [
  "learning",
  "revision",
  "practice",
  "test",
] as const

export type ProgressMode = (typeof PROGRESS_MODES)[number]
export type FoundationLevel = "Beginner" | "Moderate" | "Advanced"

export interface ProgressStats {
  totalTopics: number
  completedTopics: number
  percentage: number
}

export interface TestProgressEvidence {
  percentage: number
  completedRecords: number
  targetRecords: number
  chapter: {
    completedRecords: number
    targetRecords: number
  }
  subject: {
    completedRecords: number
    targetRecords: number
  }
}

export interface ExpectedMarksEvidence {
  percentage: number | null
  chapterAveragePercentage: number | null
  subjectAveragePercentage: number | null
  validChapterRecords: number
  validSubjectRecords: number
  testedChapters: number
  activeChapters: number
  chapterCoveragePercentage: number
  coverageStatus: "none" | "limited" | "developing" | "strong"
}

export interface TopicProgress {
  learning: number
  revision: number
  practice: number
  test: number
}

export interface ChapterProgress extends TopicProgress {
  overall: number
  stats: Record<ProgressMode, ProgressStats>
}

export interface SubjectProgress extends TopicProgress {
  overall: number
  foundationLevel: FoundationLevel
  expectedMarks: number | null
  expectedMarksEvidence: ExpectedMarksEvidence
  testEvidence: TestProgressEvidence
  stats: Record<ProgressMode, ProgressStats>
}

export type ProgressRollup = TopicProgress & {
  overall: number
}

export type ProgressField =
  | "overallProgress"
  | "learningProgress"
  | "revisionProgress"
  | "practiceProgress"
  | "testProgress"

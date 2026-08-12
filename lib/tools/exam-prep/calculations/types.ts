export type {
  ChapterProgress,
  ChapterWithRelations,
  FoundationLevel,
  ProgressStats,
  SubjectProgress,
  SubjectWithRelations,
  TestStatistics,
  TopicProgress,
  TopicWithRelations,
} from "@/types/progressapp/domain"

export type ExamFoundationLevel = {
  level: number
  title: string
  description: string
  minProgress: number
  requirements: {
    learning: number
    revision: number
    practice: number
    test: number
  }
}

export type ExamFoundationResult = {
  currentLevel: ExamFoundationLevel
  nextLevel: ExamFoundationLevel | null
  progressToNextLevel: number
  strengths: string[]
  areasToImprove: string[]
  overallProgress: number
}

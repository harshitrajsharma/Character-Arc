export interface BaseTest {
  id: string
  name: string
  score: number
  totalMarks: number
  marksScored: number
  subjectId: string
  createdAt: Date
  updatedAt: Date
}

export interface BaseTestRecord {
  id: string
  userId?: string
  workspaceId?: string
  examId: string
  subjectId?: string | null
  chapterId?: string | null
  scheduledTestId?: string | null
  scope?: "chapter" | "multi-chapter" | "subject" | null
  targetChapterIds?: string[]
  attemptedAt?: Date | null
  title: string
  marksObtained: number
  totalMarks: number
  summary?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TestWithRelations extends BaseTest {
  subject: {
    id: string
    name: string
    weightage: number
  }
}

export interface TestStats {
  totalTests: number
  highestScore: number
  lowestScore: number
  averageScore: number
  expectedMarks: number
  weightage: number
  averagePerformance: number
}

export interface MockTest {
  id: string
  name: string
  date: Date
  expectedMarks: number
  actualMarks?: number
  subjectId: string
  createdAt: Date
  updatedAt: Date
}

export interface TestStatistics {
  totalTests: number
  averageScore: number
  highestScore: number
  lowestScore: number
  recentScore: number
  trend: "up" | "down" | "stable"
}

import type { BaseTest, MockTest } from "./assessment"
import type { FoundationLevel } from "./progress"
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

export interface ScheduledTest {
  id: string
  examId: string
  subjectId: string
  title: string
  scope: "chapter" | "multi-chapter" | "subject"
  status: "planned" | "scheduled" | "completed" | "cancelled"
  scheduledFor: string | null
  durationMinutes: number | null
  totalMarks: number | null
  notes: string | null
  revision: number
  rescheduleCount: number
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  targetChapterIds: string[]
  testRecordId: string | null
  createdAt: string
  updatedAt: string
}

export interface BaseTopic {
  id: string
  name: string
  important: boolean
  learningStatus: boolean
  revisionCount: number
  practiceCount: number
  testCount: number
  position: number
  learningCompletedAt?: Date | null
  lastRevised: Date | null
  lastPracticed?: Date | null
  nextRevision: Date | null
  chapterId: string
  createdAt: Date
  updatedAt: Date
  targetRevisions?: number
  targetPractices?: number
}

export interface TopicWithRelations extends BaseTopic {
  chapter: ChapterWithRelations
}

export interface BaseChapter {
  id: string
  name: string
  important: boolean
  overallProgress: number
  learningProgress: number
  revisionProgress: number
  practiceProgress: number
  testProgress: number
  position: number
  subjectId: string
  createdAt: Date
  updatedAt: Date
  topicCount?: number
}

export interface ChapterWithRelations extends BaseChapter {
  topics: BaseTopic[]
  testRecords?: import("./assessment").BaseTestRecord[]
  subject: Subject
}

export interface Subject {
  id: string
  name: string
  weightage: number
  /** Whether this subject is required in its current exam relation. */
  isRequired?: boolean
  expectedMarks: number | null
  foundationLevel: FoundationLevel
  overallProgress: number
  learningProgress: number
  revisionProgress: number
  practiceProgress: number
  testProgress: number
  position: number
  userId: string
  createdAt: Date
  updatedAt: Date
  chapterCount?: number
  topicCount?: number
  scheduledTests?: ScheduledTest[]
  progressPolicy?: SubjectProgressPolicy
}

export interface SubjectWithRelations extends Subject {
  chapters: ChapterWithRelations[]
  tests: BaseTest[]
  mockTests: MockTest[]
  linkedAssessments?: SubjectLinkedAssessment[]
  linkedAssessmentsIssue?: string
  assessmentToolAvailable?: boolean
  linkedAssessmentsHasMore?: boolean
  canManageAssessments?: boolean
  assessmentViewerId?: string
  testRecords?: import("./assessment").BaseTestRecord[]
}

/** Canonical papers explicitly linked to the syllabus or matched by question targets. */
export interface SubjectLinkedAssessment {
  assessmentId: string
  title: string
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED"
  durationMinutes: number | null
  linkage: "context" | "exam" | "syllabus"
  studyContextId?: string | null
  revision?: number
  questionCount?: number
  totalMarks?: number | null
  attemptCount?: number
  targetChapterIds: string[]
  targetsWholeSubject: boolean
  attempts: Array<{
    id: string
    status: "IN_PROGRESS" | "SUBMITTED" | "EVALUATED" | "ABANDONED"
    score: number | null
    maxScore: number | null
    startedAt: string
    submittedAt: string | null
  }>
}

export interface TopicResponse {
  success: boolean
  topic: BaseTopic
}

export interface TopicUpdateData {
  name?: string
  important?: boolean
  position?: number
  learningStatus?: boolean
  revisionCount?: number
  practiceCount?: number
  learningCompletedAt?: Date
  lastRevised?: Date
  lastPracticed?: Date
  nextRevision?: Date
}

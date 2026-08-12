import { SubjectProgressPolicyInput } from "../progress/policy"

export type StudyPathStepKind =
  | "learn"
  | "revise"
  | "practice"
  | "chapter-test"
  | "subject-test"
  | "remediation"

export type StudyPathStepStatus =
  "completed" | "ready" | "due" | "locked" | "overachieved"

export interface StudyPathStep {
  id: string
  kind: StudyPathStepKind
  status: StudyPathStepStatus
  stage: "learning" | "revision" | "practice" | "test"
  title: string
  reason: string
  evidence: string
  chapterId?: string
  chapterName?: string
  topicId?: string
  topicName?: string
  isHighYield: boolean
  order: number
  dependencyIds: string[]
  urgencyScore: number
  completedAt?: string | null
}

export interface StudyPathChapter {
  id: string
  name: string
  position: number
  isHighYield: boolean
  steps: StudyPathStep[]
}

export interface StudyPathOutput {
  chapters: StudyPathChapter[]
  subjectSteps: StudyPathStep[]
  allSteps: StudyPathStep[]
  actionableSteps: StudyPathStep[]
  nextSteps: StudyPathStep[]
  isCompleted: boolean
}

export interface StudyPathEngineInputTopic {
  id: string
  name: string
  position: number
  important: boolean
  learningStatus: boolean
  revisionCount: number
  practiceCount: number
  nextRevision: Date | string | null
  learningCompletedAt?: Date | string | null
  lastRevised?: Date | string | null
  lastPracticed?: Date | string | null
  targetRevisions?: number | null
  targetPractices?: number | null
}

export interface StudyPathEngineInputTestRecord {
  id: string
  chapterId?: string | null
  marksObtained: number
  totalMarks: number
  createdAt: Date | string
}

export interface StudyPathEngineInputChapter {
  id: string
  name: string
  position: number
  important: boolean
  topics: StudyPathEngineInputTopic[]
  testRecords: StudyPathEngineInputTestRecord[]
}

export interface StudyPathEngineInput {
  chapters: StudyPathEngineInputChapter[]
  subjectTestRecords: StudyPathEngineInputTestRecord[]
  policy?: Partial<SubjectProgressPolicyInput> | null
  now: Date
}

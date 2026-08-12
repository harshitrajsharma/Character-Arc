import type { SyllabusStage } from "@/components/tools/exam-prep/subjects/syllabus/syllabus-model"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import type { RecommendationUrgency } from "./types"

export type ExamSubjectRecommendationLane =
  "revise" | "priority-focus" | "start-next" | "test-progress"

export type ExamSubjectRecommendationStage = SyllabusStage | "setup"

/**
 * The exam relation may enrich a subject with whether it is required. The
 * current dashboard already supplies exam-scoped weightage on `subject`.
 */
export type ExamSubjectRecommendationSource = SubjectWithRelations & {
  isRequired?: boolean | null
}

export interface ExamSubjectRecommendationsInput {
  subjects: ReadonlyArray<ExamSubjectRecommendationSource>
  /** The current instant is injected so the result is deterministic. */
  now: Date
}

/** Serializable presentation data shared by the UI and future tool actions. */
export interface ExamSubjectRecommendation {
  id: string
  lane: ExamSubjectRecommendationLane
  subjectId: string
  subjectName: string
  weightage: number
  overallProgress: number
  metricLabel: string
  metricValue: number
  reason: string
  evidence: string
  actionLabel: string
  stage: ExamSubjectRecommendationStage
  chapterId?: string
  topicId?: string
  urgency: RecommendationUrgency
  position: number
}

export type ExamSubjectRecommendationGroups = Record<
  ExamSubjectRecommendationLane,
  ExamSubjectRecommendation[]
>

export type ExamSubjectRecommendationCounts = Record<
  ExamSubjectRecommendationLane,
  number
>

export interface ExamSubjectRecommendationsOutput {
  /** Every eligible subject, ordered by lane and then lane-specific priority. */
  recommendations: ExamSubjectRecommendation[]
  /** At most three visible recommendations in each lane. */
  groups: ExamSubjectRecommendationGroups
  /** Total eligible recommendation count per lane, including hidden items. */
  counts: ExamSubjectRecommendationCounts
  /** True only when at least one subject exists and every subject is complete. */
  isComplete: boolean
}

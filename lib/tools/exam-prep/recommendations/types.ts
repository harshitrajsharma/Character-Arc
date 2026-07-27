/**
 * Recommendation engine types for Exam Prep.
 *
 * These types are React-free and Prisma-free so they can be consumed by both
 * UI components and unit tests without pulling in heavy dependencies.
 */

import type { SyllabusStage } from "@/components/tools/exam-prep/subjects/syllabus/syllabus-model"

// ---------------------------------------------------------------------------
// Recommendation type discriminators
// ---------------------------------------------------------------------------

/**
 * Every recommendation has a type that tells the UI what kind of action the
 * user should take. This replaces the legacy "learn | revise | practice |
 * test" with finer-grained variants.
 */
export type RecommendationType =
  | "overdue-revision"
  | "unlearned-high-yield"
  | "weak-test"
  | "revision-gap"
  | "practice-gap"
  | "missing-chapter-test"
  | "missing-subject-test"
  | "unlearned-topic"

/**
 * Non-color status values that can be communicated accessibly via icon + label.
 */
export type RecommendationUrgency = "critical" | "warning" | "suggestion" | "completed"

// ---------------------------------------------------------------------------
// Core recommendation interface
// ---------------------------------------------------------------------------

export interface Recommendation {
  /** Stable, deterministic identifier (e.g. `overdue-revision::chapterId::topicId`). */
  id: string

  /** Discriminator for the recommendation category. */
  type: RecommendationType

  /**
   * Numeric priority. Lower = more urgent. Used for ranking.
   *
   * Priority bands:
   *  1 – overdue high-yield revision
   *  2 – unlearned high-yield topic
   *  3 – weak test outcome
   *  4 – overdue standard revision
   *  5 – high-yield practice gap
   *  6 – high-yield revision gap (count-based, not overdue)
   *  7 – standard revision/practice gap
   *  8 – unlearned standard topic
   *  9 – missing chapter/subject test
   */
  priority: number

  /** Short human-readable title (e.g. "Revise: Thermodynamics – Heat Transfer"). */
  title: string

  /** Explains *why* this recommendation exists (one sentence). */
  reason: string

  /** Compact evidence string (e.g. "1/5 revisions" or "Overdue by 3 days"). */
  evidence: string

  /** Accessible, non-color urgency. */
  urgency: RecommendationUrgency

  /** The syllabus stage the user should switch to. */
  stage: SyllabusStage

  /** Button/link label (e.g. "Start Revision", "Learn Topic"). */
  actionLabel: string

  // --- contextual fields ---

  /** Chapter ID when the recommendation is scoped to a chapter. */
  chapterId?: string

  /** Chapter name for display. */
  chapterName?: string

  /** Topic ID when the recommendation is scoped to a single topic. */
  topicId?: string

  /** Topic name for display. */
  topicName?: string

  /** Optional target block ID for deep-linking within the syllabus. */
  targetBlockId?: string

  /** Subject ID when the recommendation is surfaced at the exam level. */
  subjectId?: string

  /** Subject name for display when surfaced at the exam level. */
  subjectName?: string

  /**
   * Numeric tie-breaking sub-priority within the same priority band.
   * Higher = more urgent. Used for stable ordering inside a band.
   * For overdue revisions this is the number of overdue days.
   * For gaps this is the deficit count.
   */
  subPriority: number
}

// ---------------------------------------------------------------------------
// Engine input / output
// ---------------------------------------------------------------------------

export interface RecommendationEngineInput {
  /** All chapters with their topics (includes BaseTopic fields). */
  chapters: ReadonlyArray<{
    id: string
    name: string
    important: boolean
    topics: ReadonlyArray<{
      id: string
      name: string
      important: boolean
      learningStatus: boolean
      revisionCount: number
      practiceCount: number
      testCount: number
      lastRevised: Date | string | null
      nextRevision: Date | string | null
      targetRevisions?: number | null
      targetPractices?: number | null
    }>
    /** Test records at the chapter level. */
    testRecords?: ReadonlyArray<{
      id: string
      marksObtained: number
      totalMarks: number
      createdAt: Date | string
    }>
  }>

  /** Subject-level test records (scope = subject only). */
  subjectTestRecords?: ReadonlyArray<{
    id: string
    marksObtained: number
    totalMarks: number
    createdAt: Date | string
  }>

  /** Subject progress policy — falls back to defaults when missing. */
  policy?: {
    revisionTarget: number
    practiceTarget: number
    highYieldRevisionTarget: number
    highYieldPracticeTarget: number
    chapterTestTarget: number
    subjectTestTarget: number
  } | null

  /** The current instant. Never call `new Date()` inside the engine. */
  now: Date
}

export interface RecommendationEngineOutput {
  /** All generated recommendations sorted by priority (most urgent first). */
  all: Recommendation[]

  /** Top 3 primary recommendations for default display. */
  primary: Recommendation[]

  /**
   * True when the subject has no actionable recommendations — the user has
   * completed everything the policy requires.
   */
  isCompleted: boolean
}

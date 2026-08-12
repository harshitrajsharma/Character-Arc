/**
 * Pure deterministic recommendation engine for Exam Prep subjects.
 *
 * Design principles:
 * - Pure function: same inputs → same outputs.
 * - `now` is injected; `new Date()` is never called.
 * - Invalid dates are handled safely (treated as missing).
 * - Uses SubjectProgressPolicy targets for progress, while weak-test detection uses a named recommendation heuristic.
 * - Deduplicates: one recommendation per chapter+type combination at most.
 * - Returns at most `MAX_PRIMARY` primary recommendations.
 */

import { normalizeSubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"
import {
  getRequiredRevisions,
  getRequiredPractices,
} from "@/lib/tools/exam-prep/progress/rules"
import type {
  Recommendation,
  RecommendationEngineInput,
  RecommendationEngineOutput,
  RecommendationType,
  RecommendationUrgency,
} from "./types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PRIMARY = 3
/**
 * Heuristic threshold for identifying a weak test score.
 * Note: This is an engine-level heuristic, not user-policy driven.
 */
export const WEAK_TEST_HEURISTIC_THRESHOLD = 0.5
const MS_PER_DAY = 86_400_000

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toSafeDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null
  try {
    const d = value instanceof Date ? value : new Date(value)
    return Number.isFinite(d.getTime()) ? d : null
  } catch {
    return null
  }
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY)
}

// ---------------------------------------------------------------------------
// ID builder (deterministic, dedup-safe)
// ---------------------------------------------------------------------------

function makeId(
  type: RecommendationType,
  chapterId?: string,
  topicId?: string
): string {
  const parts: string[] = [type]
  if (chapterId) parts.push(chapterId)
  if (topicId) parts.push(topicId)
  return parts.join("::")
}

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

function rec(
  partial: Omit<Recommendation, "id"> & { chapterId?: string; topicId?: string }
): Recommendation {
  return {
    ...partial,
    id: makeId(partial.type, partial.chapterId, partial.topicId),
  }
}

function urgencyFromPriority(priority: number): RecommendationUrgency {
  if (priority <= 2) return "critical"
  if (priority <= 5) return "warning"
  return "suggestion"
}

// ---------------------------------------------------------------------------
// Test record helper / validation (Requirement 2)
// ---------------------------------------------------------------------------

interface ValidTestRecord {
  id: string
  marksObtained: number
  totalMarks: number
  createdAt: Date
}

function getValidTestRecords(
  records:
    | ReadonlyArray<{
        id: string
        marksObtained: number
        totalMarks: number
        createdAt: Date | string
      }>
    | undefined
    | null
): ValidTestRecord[] {
  if (!records) return []
  const validRecords: ValidTestRecord[] = []
  for (const r of records) {
    if (
      typeof r.marksObtained !== "number" ||
      !Number.isFinite(r.marksObtained) ||
      r.marksObtained < 0
    )
      continue
    if (
      typeof r.totalMarks !== "number" ||
      !Number.isFinite(r.totalMarks) ||
      r.totalMarks <= 0
    )
      continue
    if (r.marksObtained > r.totalMarks) continue // impossible value

    const date = toSafeDate(r.createdAt)
    if (!date) continue // invalid date

    validRecords.push({
      id: r.id,
      marksObtained: r.marksObtained,
      totalMarks: r.totalMarks,
      createdAt: date,
    })
  }
  return validRecords
}

function getLatestValidTestAttempt(
  records:
    | ReadonlyArray<{
        id: string
        marksObtained: number
        totalMarks: number
        createdAt: Date | string
      }>
    | undefined
    | null
): ValidTestRecord | null {
  const valid = getValidTestRecords(records)
  if (valid.length === 0) return null
  valid.sort((a, b) => {
    const timeDiff = b.createdAt.getTime() - a.createdAt.getTime()
    if (timeDiff !== 0) return timeDiff
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  return valid[0]
}

// ---------------------------------------------------------------------------
// Recommendation sorting & tie-breaking comparison (Requirement 5)
// ---------------------------------------------------------------------------

function compareRecommendations(a: Recommendation, b: Recommendation): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority
  }
  if (a.subPriority !== b.subPriority) {
    return b.subPriority - a.subPriority // higher subPriority is more urgent
  }
  // Deterministic tie-breaker using stable type/chapter/topic identifiers
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type)
  }
  const aCh = a.chapterId ?? ""
  const bCh = b.chapterId ?? ""
  if (aCh !== bCh) {
    return aCh.localeCompare(bCh)
  }
  const aTop = a.topicId ?? ""
  const bTop = b.topicId ?? ""
  if (aTop !== bTop) {
    return aTop.localeCompare(bTop)
  }
  return 0
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function generateRecommendations(
  input: RecommendationEngineInput
): RecommendationEngineOutput {
  const policy = normalizeSubjectProgressPolicy(input.policy)
  const { now, chapters } = input
  const candidates: Recommendation[] = []

  // ------------------------------------------------------------------
  // Scan every chapter and topic
  // ------------------------------------------------------------------
  for (const chapter of chapters) {
    for (const topic of chapter.topics) {
      const isHighYield = topic.important
      // Use canonical progress rules (Requirement 3)
      const revTarget = getRequiredRevisions(
        {
          important: topic.important,
          targetRevisions: topic.targetRevisions ?? undefined,
        },
        policy
      )
      const pracTarget = getRequiredPractices(
        {
          important: topic.important,
          targetPractices: topic.targetPractices ?? undefined,
        },
        policy
      )

      // --- 1. Overdue revisions (priority 1 high-yield, 4 standard) ---
      if (topic.learningStatus) {
        const nextRev = toSafeDate(topic.nextRevision)
        if (nextRev && nextRev.getTime() < now.getTime()) {
          const overdueDays = daysBetween(nextRev, now)
          const priority = isHighYield ? 1 : 4
          candidates.push(
            rec({
              type: "overdue-revision",
              priority,
              subPriority: overdueDays,
              title: `Revise: ${chapter.name} – ${topic.name}`,
              reason: isHighYield
                ? "High-yield topic revision is overdue."
                : "Scheduled revision is overdue.",
              evidence: `Overdue by ${overdueDays} day${overdueDays !== 1 ? "s" : ""}`,
              urgency: urgencyFromPriority(priority),
              stage: "revision",
              actionLabel: "Start Revision",
              chapterId: chapter.id,
              chapterName: chapter.name,
              topicId: topic.id,
              topicName: topic.name,
            })
          )
        }
      }

      // --- 2. Unlearned topics (priority 2 high-yield, 8 standard) ---
      if (!topic.learningStatus) {
        const priority = isHighYield ? 2 : 8
        candidates.push(
          rec({
            type: isHighYield ? "unlearned-high-yield" : "unlearned-topic",
            priority,
            subPriority: isHighYield ? 1 : 0,
            title: `Learn: ${chapter.name} – ${topic.name}`,
            reason: isHighYield
              ? "High-yield topic has not been learned yet."
              : "Topic has not been learned yet.",
            evidence: "Not learned",
            urgency: urgencyFromPriority(priority),
            stage: "learning",
            actionLabel: "Learn Topic",
            chapterId: chapter.id,
            chapterName: chapter.name,
            topicId: topic.id,
            topicName: topic.name,
          })
        )
        continue
      }

      // --- 3. Revision count gap (priority 6 high-yield, 7 standard) ---
      if (topic.revisionCount < revTarget) {
        const deficit = revTarget - topic.revisionCount
        const priority = isHighYield ? 6 : 7
        candidates.push(
          rec({
            type: "revision-gap",
            priority,
            subPriority: deficit,
            title: `Revise: ${chapter.name} – ${topic.name}`,
            reason: isHighYield
              ? "High-yield topic needs more revisions to meet target."
              : "Topic needs more revisions to meet target.",
            evidence: `${topic.revisionCount}/${revTarget} revisions`,
            urgency: urgencyFromPriority(priority),
            stage: "revision",
            actionLabel: "Revise",
            chapterId: chapter.id,
            chapterName: chapter.name,
            topicId: topic.id,
            topicName: topic.name,
          })
        )
      }

      // --- 4. Practice count gap (priority 5 high-yield, 7 standard) ---
      if (topic.practiceCount < pracTarget) {
        const deficit = pracTarget - topic.practiceCount
        const priority = isHighYield ? 5 : 7
        candidates.push(
          rec({
            type: "practice-gap",
            priority,
            subPriority: deficit,
            title: `Practice: ${chapter.name} – ${topic.name}`,
            reason: isHighYield
              ? "High-yield topic needs more practice sessions."
              : "Topic needs more practice to meet target.",
            evidence: `${topic.practiceCount}/${pracTarget} practice`,
            urgency: urgencyFromPriority(priority),
            stage: "practice",
            actionLabel: "Practice",
            chapterId: chapter.id,
            chapterName: chapter.name,
            topicId: topic.id,
            topicName: topic.name,
          })
        )
      }
    }

    // --- 5. Weak chapter test performance (priority 3) ---
    // Evaluates ONLY the latest valid attempt by createdAt (Requirement 2)
    const latestChapterTest = getLatestValidTestAttempt(chapter.testRecords)
    if (latestChapterTest) {
      if (
        latestChapterTest.marksObtained / latestChapterTest.totalMarks <
        WEAK_TEST_HEURISTIC_THRESHOLD
      ) {
        const pct = Math.round(
          (latestChapterTest.marksObtained / latestChapterTest.totalMarks) * 100
        )
        candidates.push(
          rec({
            type: "weak-test",
            priority: 3,
            subPriority: WEAK_TEST_HEURISTIC_THRESHOLD * 100 - pct,
            title: `Review: ${chapter.name} – Weak Test`,
            reason:
              "The latest chapter test score was below the 50% heuristic threshold.",
            evidence: `Scored ${pct}%`,
            urgency: "warning",
            stage: "test",
            actionLabel: "Review Chapter",
            chapterId: chapter.id,
            chapterName: chapter.name,
          })
        )
      }
    }

    // --- 6. Missing chapter test (priority 9) ---
    if (policy.chapterTestTarget > 0 && chapter.topics.length > 0) {
      const validTestRecords = getValidTestRecords(chapter.testRecords)
      const testCount = validTestRecords.length
      if (testCount < policy.chapterTestTarget) {
        candidates.push(
          rec({
            type: "missing-chapter-test",
            priority: 9,
            subPriority: policy.chapterTestTarget - testCount,
            title: `Test: ${chapter.name}`,
            reason: "Chapter test target has not been met.",
            evidence: `${testCount}/${policy.chapterTestTarget} chapter test${policy.chapterTestTarget !== 1 ? "s" : ""}`,
            urgency: "suggestion",
            stage: "test",
            actionLabel: "Take Chapter Test",
            chapterId: chapter.id,
            chapterName: chapter.name,
          })
        )
      }
    }
  }

  // --- 7. Weak subject-level test (priority 3) ---
  // Evaluates ONLY the latest valid attempt by createdAt (Requirement 2)
  const latestSubjectTest = getLatestValidTestAttempt(input.subjectTestRecords)
  if (latestSubjectTest) {
    if (
      latestSubjectTest.marksObtained / latestSubjectTest.totalMarks <
      WEAK_TEST_HEURISTIC_THRESHOLD
    ) {
      const pct = Math.round(
        (latestSubjectTest.marksObtained / latestSubjectTest.totalMarks) * 100
      )
      candidates.push(
        rec({
          type: "weak-test",
          priority: 3,
          subPriority: WEAK_TEST_HEURISTIC_THRESHOLD * 100 - pct,
          title: "Review: Weak Subject Test",
          reason:
            "The latest subject-level test score was below the 50% heuristic threshold.",
          evidence: `Scored ${pct}%`,
          urgency: "warning",
          stage: "test",
          actionLabel: "Review Subject",
        })
      )
    }
  }

  // --- 8. Missing subject test (priority 9) ---
  const totalTopicsInSubject = input.chapters.reduce(
    (sum, ch) => sum + ch.topics.length,
    0
  )
  if (policy.subjectTestTarget > 0 && totalTopicsInSubject > 0) {
    const validSubjectTestRecords = getValidTestRecords(
      input.subjectTestRecords
    )
    const subjectTestCount = validSubjectTestRecords.length
    if (subjectTestCount < policy.subjectTestTarget) {
      candidates.push(
        rec({
          type: "missing-subject-test",
          priority: 9,
          subPriority: policy.subjectTestTarget - subjectTestCount,
          title: "Subject Test",
          reason: "Subject test target has not been met.",
          evidence: `${subjectTestCount}/${policy.subjectTestTarget} subject test${policy.subjectTestTarget !== 1 ? "s" : ""}`,
          urgency: "suggestion",
          stage: "test",
          actionLabel: "Take Subject Test",
        })
      )
    }
  }

  // ------------------------------------------------------------------
  // Group and Deduplicate: keep the single most urgent one per (type, chapterId ?? "subject") (Requirement 1)
  // ------------------------------------------------------------------
  const groups = new Map<string, Recommendation[]>()
  for (const c of candidates) {
    const key = `${c.type}::${c.chapterId ?? "subject"}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(c)
  }

  const recommendations: Recommendation[] = []
  for (const groupRecs of groups.values()) {
    groupRecs.sort(compareRecommendations)
    recommendations.push(groupRecs[0])
  }

  // ------------------------------------------------------------------
  // Sort the final recommendations cleanly
  // ------------------------------------------------------------------
  recommendations.sort(compareRecommendations)

  const isCompleted = recommendations.length === 0
  const primary = recommendations.slice(0, MAX_PRIMARY)

  return { all: recommendations, primary, isCompleted }
}

// ---------------------------------------------------------------------------
// Adapter: SubjectWithRelations → RecommendationEngineInput
// ---------------------------------------------------------------------------

import type { SubjectWithRelations } from "@/types/progressapp/domain"

/**
 * Maps the domain `SubjectWithRelations` to the engine's flat input format.
 * This keeps the engine independent of the Prisma/domain shape.
 */
export function subjectToEngineInput(
  subject: SubjectWithRelations,
  now: Date
): RecommendationEngineInput {
  const subjectTestRecords = (subject.testRecords ?? [])
    .filter((r) => !r.chapterId)
    .map((r) => ({
      id: r.id,
      marksObtained: r.marksObtained,
      totalMarks: r.totalMarks,
      createdAt: r.createdAt,
    }))

  return {
    chapters: subject.chapters.map((ch) => ({
      id: ch.id,
      name: ch.name,
      important: ch.important,
      topics: ch.topics.map((t) => ({
        id: t.id,
        name: t.name,
        important: t.important,
        learningStatus: t.learningStatus,
        revisionCount: t.revisionCount,
        practiceCount: t.practiceCount,
        testCount: t.testCount,
        lastRevised: t.lastRevised,
        nextRevision: t.nextRevision,
        targetRevisions: t.targetRevisions,
        targetPractices: t.targetPractices,
      })),
      testRecords: (ch.testRecords ?? []).map((r) => ({
        id: r.id,
        marksObtained: r.marksObtained,
        totalMarks: r.totalMarks,
        createdAt: r.createdAt,
      })),
    })),
    subjectTestRecords,
    policy: subject.progressPolicy ?? null,
    now,
  }
}

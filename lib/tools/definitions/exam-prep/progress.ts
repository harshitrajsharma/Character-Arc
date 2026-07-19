/**
 * Progress calculation rules based on Character Arc's standard learning model.
 * Weights:
 * - Learn: 25%
 * - Revise: 30%
 * - Practice: 30%
 * - Test: 15%
 *
 * Importance multiplier: 1.5x weight for topics marked important.
 */

export const STUDY_WEIGHTS = {
  learn: 25,
  revise: 30,
  practice: 30,
  test: 15,
}

export const IMPORTANCE_MULTIPLIER = 1.5
export const MAX_REVISIONS = 5 // Standard for important topics, others might stop at 3 but math scales to 5
export const MAX_PRACTICE = 5
export const MAX_TESTS = 5

export interface TopicProgressState {
  learningStatus: boolean
  revisionCount: number
  practiceCount: number
  testCount: number
  important: boolean
}

/**
 * Calculates the progress of a single topic from 0 to 100.
 */
export function calculateTopicProgress(state: TopicProgressState): number {
  if (!state.learningStatus) {
    return 0 // Must be learned first
  }

  let progress = STUDY_WEIGHTS.learn

  // Revise progress (up to 30 points)
  const reviseRatio = Math.min(state.revisionCount / MAX_REVISIONS, 1)
  progress += reviseRatio * STUDY_WEIGHTS.revise

  // Practice progress (up to 30 points)
  const practiceRatio = Math.min(state.practiceCount / MAX_PRACTICE, 1)
  progress += practiceRatio * STUDY_WEIGHTS.practice

  // Test progress (up to 15 points)
  const testRatio = Math.min(state.testCount / MAX_TESTS, 1)
  progress += testRatio * STUDY_WEIGHTS.test

  return Math.min(Math.round(progress), 100)
}

/**
 * Calculates a weighted average progress for a collection of topics.
 */
export function calculateAggregateProgress(
  topics: TopicProgressState[]
): number {
  if (topics.length === 0) return 0

  let totalWeight = 0
  let weightedProgress = 0

  for (const topic of topics) {
    const topicProgress = calculateTopicProgress(topic)
    const weight = topic.important ? IMPORTANCE_MULTIPLIER : 1

    totalWeight += weight
    weightedProgress += topicProgress * weight
  }

  return Math.round(weightedProgress / totalWeight)
}

/**
 * Calculates the next spaced-repetition date based on revision count.
 * Formula: revisionCount * 2 days
 */
export function calculateNextRevisionDate(
  lastRevisedIso: string,
  revisionCount: number
): Date {
  const lastRevised = new Date(lastRevisedIso)
  const daysToAdd = Math.max(revisionCount * 2, 1) // At least 1 day if count is 0

  const nextRevision = new Date(lastRevised)
  nextRevision.setDate(nextRevision.getDate() + daysToAdd)

  return nextRevision
}

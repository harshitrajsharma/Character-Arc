import { calculateSubjectProgress } from "@/lib/tools/exam-prep/calculations/progress"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { generateRecommendations, subjectToEngineInput } from "./engine"
import type {
  Recommendation,
  RecommendationEngineOutput,
  RecommendationUrgency,
} from "./types"
import type {
  ExamSubjectRecommendation,
  ExamSubjectRecommendationCounts,
  ExamSubjectRecommendationGroups,
  ExamSubjectRecommendationLane,
  ExamSubjectRecommendationsInput,
  ExamSubjectRecommendationsOutput,
} from "./exam-subjects-types"

export const MAX_VISIBLE_EXAM_SUBJECT_RECOMMENDATIONS = 3

const LANE_ORDER: ReadonlyArray<ExamSubjectRecommendationLane> = [
  "revise",
  "priority-focus",
  "start-next",
  "test-progress",
]

type NormalizedProgress = {
  overall: number
  learning: number
  revision: number
  practice: number
  test: number
}

type RankedRecommendation = {
  item: ExamSubjectRecommendation
  enginePriority: number
  engineSubPriority: number
  isOverdue: boolean
  isWeakTest: boolean
  isSetup: boolean
  isRequired: boolean
  impact: number
  normalizedName: string
}

type PreparedSubject = {
  subject: ExamSubjectRecommendationsInput["subjects"][number]
  subjectId: string
  subjectName: string
  normalizedName: string
  position: number
  weightage: number
  isRequired: boolean
  hasSyllabus: boolean
  progress: NormalizedProgress
  engine: RecommendationEngineOutput
}

function normalizeProgress(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10))
}

function normalizeWeightage(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  return Math.round(numeric * 100) / 100
}

function normalizePosition(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.trunc(numeric))
}

function normalizeName(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Untitled subject"
}

function stableText(value: string): string {
  return value.normalize("NFKC").toLowerCase()
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareStableSubject(
  a: Pick<RankedRecommendation, "item" | "normalizedName">,
  b: Pick<RankedRecommendation, "item" | "normalizedName">
): number {
  if (a.item.position !== b.item.position) {
    return a.item.position - b.item.position
  }
  const nameOrder = compareText(a.normalizedName, b.normalizedName)
  if (nameOrder !== 0) return nameOrder
  return compareText(a.item.subjectId, b.item.subjectId)
}

function safeProgress(subject: SubjectWithRelations): NormalizedProgress {
  try {
    const calculated = calculateSubjectProgress(subject)
    return {
      overall: normalizeProgress(calculated.overall),
      learning: normalizeProgress(calculated.learning),
      revision: normalizeProgress(calculated.revision),
      practice: normalizeProgress(calculated.practice),
      test: normalizeProgress(calculated.test),
    }
  } catch {
    const stored = getProgressSummary(subject)
    return {
      overall: normalizeProgress(stored.overall),
      learning: normalizeProgress(stored.learning),
      revision: normalizeProgress(stored.revision),
      practice: normalizeProgress(stored.practice),
      test: normalizeProgress(stored.test),
    }
  }
}

function safeEngine(
  subject: SubjectWithRelations,
  now: Date
): RecommendationEngineOutput {
  try {
    return generateRecommendations(subjectToEngineInput(subject, now))
  } catch {
    return { all: [], primary: [], isCompleted: false }
  }
}

function comparePreparedSubjects(a: PreparedSubject, b: PreparedSubject) {
  if (a.position !== b.position) return a.position - b.position
  const nameOrder = compareText(a.normalizedName, b.normalizedName)
  if (nameOrder !== 0) return nameOrder
  return compareText(a.subjectId, b.subjectId)
}

function prepareSubjects(
  input: ExamSubjectRecommendationsInput
): PreparedSubject[] {
  const prepared = input.subjects
    .map((subject): PreparedSubject | null => {
      const subjectId = typeof subject.id === "string" ? subject.id.trim() : ""
      if (!subjectId) return null

      const subjectName = normalizeName(subject.name)
      return {
        subject,
        subjectId,
        subjectName,
        normalizedName: stableText(subjectName),
        position: normalizePosition(subject.position),
        weightage: normalizeWeightage(subject.weightage),
        isRequired: subject.isRequired !== false,
        hasSyllabus: subject.chapters.some(
          (chapter) =>
            Array.isArray(chapter.topics) && chapter.topics.length > 0
        ),
        progress: safeProgress(subject),
        engine: safeEngine(subject, input.now),
      }
    })
    .filter((subject): subject is PreparedSubject => subject !== null)
    .sort(comparePreparedSubjects)

  const seen = new Set<string>()
  return prepared.filter((subject) => {
    if (seen.has(subject.subjectId)) return false
    seen.add(subject.subjectId)
    return true
  })
}

function isTestRecommendation(recommendation: Recommendation): boolean {
  return (
    recommendation.type === "weak-test" ||
    recommendation.type === "missing-chapter-test" ||
    recommendation.type === "missing-subject-test"
  )
}

function isActionableMissingTest(
  recommendation: Recommendation,
  subject: SubjectWithRelations
): boolean {
  if (recommendation.type === "missing-subject-test") {
    const topics = subject.chapters.flatMap((chapter) => chapter.topics)
    return topics.length > 0 && topics.every((topic) => topic.learningStatus)
  }
  if (recommendation.type === "missing-chapter-test") {
    const chapter = subject.chapters.find(
      (candidate) => candidate.id === recommendation.chapterId
    )
    return Boolean(
      chapter &&
      chapter.topics.length > 0 &&
      chapter.topics.every((topic) => topic.learningStatus)
    )
  }
  return false
}

function selectTestRecommendation(subject: PreparedSubject) {
  const weak = subject.engine.all.find(
    (recommendation) => recommendation.type === "weak-test"
  )
  if (weak) return weak

  return subject.engine.all.find((recommendation) =>
    isActionableMissingTest(recommendation, subject.subject)
  )
}

function selectRevisionRecommendation(subject: PreparedSubject) {
  return (
    subject.engine.all.find(
      (recommendation) => recommendation.type === "overdue-revision"
    ) ??
    subject.engine.all.find(
      (recommendation) => recommendation.type === "revision-gap"
    ) ??
    subject.engine.all.find(
      (recommendation) => recommendation.stage === "revision"
    )
  )
}

function selectWorkRecommendation(subject: PreparedSubject) {
  return subject.engine.all.find(
    (recommendation) => !isTestRecommendation(recommendation)
  )
}

function progressForStage(
  progress: NormalizedProgress,
  stage: Recommendation["stage"]
): { label: string; value: number } {
  if (stage === "revision") {
    return { label: "Revision progress", value: progress.revision }
  }
  if (stage === "practice") {
    return { label: "Practice progress", value: progress.practice }
  }
  if (stage === "test") {
    return { label: "Test progress", value: progress.test }
  }
  return { label: "Learning progress", value: progress.learning }
}

function weakTestScore(recommendation: Recommendation): number {
  const score = 50 - recommendation.subPriority
  return normalizeProgress(score)
}

function buildRankedRecommendation(
  subject: PreparedSubject,
  lane: ExamSubjectRecommendationLane,
  recommendation?: Recommendation
): RankedRecommendation {
  const isSetup = !subject.hasSyllabus
  const isWeakTest = recommendation?.type === "weak-test"
  const isOverdue = recommendation?.type === "overdue-revision"

  let metric = { label: "Overall progress", value: subject.progress.overall }
  if (lane === "revise") {
    metric = { label: "Revision progress", value: subject.progress.revision }
  } else if (lane === "test-progress") {
    metric = isWeakTest
      ? { label: "Latest test score", value: weakTestScore(recommendation) }
      : { label: "Test progress", value: subject.progress.test }
  } else if (recommendation) {
    metric = progressForStage(subject.progress, recommendation.stage)
  }

  const defaultReason = isSetup
    ? "Add chapters and topics before starting this subject."
    : lane === "revise"
      ? "Learning is ahead of revision, so this subject needs reinforcement."
      : lane === "start-next"
        ? "This exam subject has not been started yet."
        : "This subject has useful unfinished work."

  const defaultEvidence = isSetup
    ? "No syllabus topics yet"
    : `${subject.progress.overall}% overall progress`

  const urgency: RecommendationUrgency = recommendation?.urgency ?? "suggestion"
  const item: ExamSubjectRecommendation = {
    id: `${lane}::${subject.subjectId}`,
    lane,
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    weightage: subject.weightage,
    overallProgress: subject.progress.overall,
    metricLabel: metric.label,
    metricValue: normalizeProgress(metric.value),
    reason: recommendation?.reason ?? defaultReason,
    evidence: recommendation?.evidence ?? defaultEvidence,
    actionLabel: isSetup
      ? "Set up syllabus"
      : (recommendation?.actionLabel ??
        (lane === "revise" ? "Revise now" : "Open subject")),
    stage: isSetup ? "setup" : (recommendation?.stage ?? "learning"),
    ...(recommendation?.chapterId
      ? { chapterId: recommendation.chapterId }
      : {}),
    ...(recommendation?.topicId ? { topicId: recommendation.topicId } : {}),
    urgency,
    position: subject.position,
  }

  const impact =
    lane === "revise"
      ? subject.weightage *
        (subject.progress.learning / 100) *
        (100 - subject.progress.revision)
      : subject.weightage * (100 - subject.progress.overall)

  return {
    item,
    enginePriority: recommendation?.priority ?? Number.MAX_SAFE_INTEGER,
    engineSubPriority: recommendation?.subPriority ?? 0,
    isOverdue,
    isWeakTest,
    isSetup,
    isRequired: subject.isRequired,
    impact,
    normalizedName: subject.normalizedName,
  }
}

function classifySubject(
  subject: PreparedSubject
): RankedRecommendation | null {
  if (subject.progress.overall >= 100) return null

  if (!subject.hasSyllabus) {
    return buildRankedRecommendation(subject, "start-next")
  }

  const testRecommendation = selectTestRecommendation(subject)
  if (testRecommendation) {
    return buildRankedRecommendation(
      subject,
      "test-progress",
      testRecommendation
    )
  }

  const revisionRecommendation = selectRevisionRecommendation(subject)
  if (
    revisionRecommendation?.type === "overdue-revision" ||
    (subject.progress.learning >= 70 && subject.progress.revision < 70)
  ) {
    return buildRankedRecommendation(subject, "revise", revisionRecommendation)
  }

  const workRecommendation = selectWorkRecommendation(subject)
  if (subject.progress.overall === 0) {
    return buildRankedRecommendation(subject, "start-next", workRecommendation)
  }

  if (subject.progress.overall < 100 && workRecommendation) {
    return buildRankedRecommendation(
      subject,
      "priority-focus",
      workRecommendation
    )
  }

  return null
}

function compareRanked(
  lane: ExamSubjectRecommendationLane,
  a: RankedRecommendation,
  b: RankedRecommendation
): number {
  if (lane === "test-progress") {
    if (a.isWeakTest !== b.isWeakTest) return a.isWeakTest ? -1 : 1
    if (a.enginePriority !== b.enginePriority) {
      return a.enginePriority - b.enginePriority
    }
    if (a.engineSubPriority !== b.engineSubPriority) {
      return b.engineSubPriority - a.engineSubPriority
    }
    if (a.item.weightage !== b.item.weightage) {
      return b.item.weightage - a.item.weightage
    }
  } else if (lane === "revise") {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (a.enginePriority !== b.enginePriority) {
      return a.enginePriority - b.enginePriority
    }
    if (a.engineSubPriority !== b.engineSubPriority) {
      return b.engineSubPriority - a.engineSubPriority
    }
    if (a.impact !== b.impact) return b.impact - a.impact
  } else if (lane === "priority-focus") {
    if (a.enginePriority !== b.enginePriority) {
      return a.enginePriority - b.enginePriority
    }
    if (a.impact !== b.impact) return b.impact - a.impact
    if (a.engineSubPriority !== b.engineSubPriority) {
      return b.engineSubPriority - a.engineSubPriority
    }
  } else {
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
    if (a.isSetup !== b.isSetup) return a.isSetup ? 1 : -1
    if (a.item.weightage !== b.item.weightage) {
      return b.item.weightage - a.item.weightage
    }
  }

  return compareStableSubject(a, b)
}

function emptyGroups(): ExamSubjectRecommendationGroups {
  return {
    revise: [],
    "priority-focus": [],
    "start-next": [],
    "test-progress": [],
  }
}

function emptyCounts(): ExamSubjectRecommendationCounts {
  return {
    revise: 0,
    "priority-focus": 0,
    "start-next": 0,
    "test-progress": 0,
  }
}

/**
 * Builds a deterministic exam-level decision layer from canonical subject
 * progress and the existing per-subject recommendation engine.
 */
export function generateExamSubjectRecommendations(
  input: ExamSubjectRecommendationsInput
): ExamSubjectRecommendationsOutput {
  const prepared = prepareSubjects(input)
  const rankedByLane = new Map<
    ExamSubjectRecommendationLane,
    RankedRecommendation[]
  >(LANE_ORDER.map((lane) => [lane, []]))

  for (const subject of prepared) {
    const recommendation = classifySubject(subject)
    if (recommendation) {
      rankedByLane.get(recommendation.item.lane)!.push(recommendation)
    }
  }

  const groups = emptyGroups()
  const counts = emptyCounts()
  const recommendations: ExamSubjectRecommendation[] = []

  for (const lane of LANE_ORDER) {
    const ranked = [...(rankedByLane.get(lane) ?? [])].sort((a, b) =>
      compareRanked(lane, a, b)
    )
    const items = ranked.map((candidate) => candidate.item)
    counts[lane] = items.length
    groups[lane] = items.slice(0, MAX_VISIBLE_EXAM_SUBJECT_RECOMMENDATIONS)
    recommendations.push(...items)
  }

  return {
    recommendations,
    groups,
    counts,
    isComplete:
      prepared.length > 0 &&
      prepared.every((subject) => subject.progress.overall >= 100),
  }
}

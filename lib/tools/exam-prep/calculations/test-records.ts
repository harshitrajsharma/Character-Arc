import type { BaseTestRecord } from "@/types/progressapp/domain"
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

export type TestRecordInput = Pick<
  BaseTestRecord,
  "id" | "chapterId" | "marksObtained" | "totalMarks"
> & {
  scope?: BaseTestRecord["scope"]
  targetChapterIds?: BaseTestRecord["targetChapterIds"]
}

export type TestProgressEvidence = {
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

export type TestScoreEvidence = {
  percentage: number | null
  weightedMarksContribution: number | null
  chapterAveragePercentage: number | null
  subjectAveragePercentage: number | null
  validChapterRecords: number
  validSubjectRecords: number
  testedChapters: number
  activeChapters: number
  chapterCoveragePercentage: number
  coverageStatus: "none" | "limited" | "developing" | "strong"
}

/**
 * @deprecated Use TestScoreEvidence. This alias remains only for currently
 * inactive dashboard code and will be removed when that surface is rebuilt.
 */
export type ExpectedMarksEvidence = TestScoreEvidence & {
  /** @deprecated Use weightedMarksContribution. */
  expectedMarks: number | null
}

export type WeightedAverageMarksEvidence = {
  percentage: number | null
  evidencedSubjects: number
  totalSubjects: number
}

export function isValidTestRecord(record: TestRecordInput): boolean {
  return (
    Number.isFinite(record.marksObtained) &&
    Number.isFinite(record.totalMarks) &&
    record.totalMarks > 0 &&
    record.marksObtained >= 0 &&
    record.marksObtained <= record.totalMarks
  )
}

export function validateTestRecordMarks(
  marksObtained: unknown,
  totalMarks: unknown
): { marksObtained: number; totalMarks: number; percentage: number } {
  const m = Number(marksObtained)
  const t = Number(totalMarks)
  if (!Number.isFinite(m) || !Number.isFinite(t)) {
    throw new Error("Marks must be finite numbers.")
  }
  if (t <= 0) {
    throw new Error("Total marks must be greater than zero.")
  }
  if (m < 0 || m > t) {
    throw new Error("Marks obtained must be between 0 and total marks.")
  }
  const percentage = Math.round((m / t) * 100 * 10) / 10
  return { marksObtained: m, totalMarks: t, percentage }
}

export function getValidTestRecords(
  records: readonly TestRecordInput[] | null | undefined
): TestRecordInput[] {
  return (records ?? []).filter(isValidTestRecord)
}

export function calculateChapterTestProgress(
  records: readonly TestRecordInput[] | null | undefined,
  target: number
): TestProgressEvidence {
  const validRecords = getValidTestRecords(records)
  const completedRecords = Math.min(validRecords.length, target)

  return {
    percentage: calculateTargetPercentage(completedRecords, target),
    completedRecords,
    targetRecords: target,
    chapter: { completedRecords, targetRecords: target },
    subject: { completedRecords: 0, targetRecords: 0 },
  }
}

export function calculateSubjectTestProgress({
  chapterIds,
  records,
  policy,
}: {
  chapterIds: readonly string[]
  records: readonly TestRecordInput[] | null | undefined
  policy: SubjectProgressPolicy
}): TestProgressEvidence {
  const activeChapterIds = new Set(chapterIds)
  const validRecords = getValidTestRecords(records)
  const recordsByChapter = new Map<string, number>()
  let validSubjectRecords = 0

  for (const record of validRecords) {
    if (record.chapterId && activeChapterIds.has(record.chapterId)) {
      recordsByChapter.set(
        record.chapterId,
        (recordsByChapter.get(record.chapterId) ?? 0) + 1
      )
    } else if (record.scope === "multi-chapter") {
      // A multi-chapter result counts as evidence for every covered chapter,
      // never toward the full-subject target.
      for (const chapterId of record.targetChapterIds ?? []) {
        if (activeChapterIds.has(chapterId)) {
          recordsByChapter.set(
            chapterId,
            (recordsByChapter.get(chapterId) ?? 0) + 1
          )
        }
      }
    } else if (!record.chapterId) {
      validSubjectRecords += 1
    }
  }

  const chapterTargetRecords = chapterIds.length * policy.chapterTestTarget
  const completedChapterRecords = chapterIds.reduce(
    (total, chapterId) =>
      total +
      Math.min(recordsByChapter.get(chapterId) ?? 0, policy.chapterTestTarget),
    0
  )
  const completedSubjectRecords = Math.min(
    validSubjectRecords,
    policy.subjectTestTarget
  )
  const targetRecords = chapterTargetRecords + policy.subjectTestTarget
  const completedRecords = completedChapterRecords + completedSubjectRecords

  return {
    percentage: calculateTargetPercentage(completedRecords, targetRecords),
    completedRecords,
    targetRecords,
    chapter: {
      completedRecords: completedChapterRecords,
      targetRecords: chapterTargetRecords,
    },
    subject: {
      completedRecords: completedSubjectRecords,
      targetRecords: policy.subjectTestTarget,
    },
  }
}

export function calculateTestScoreEvidence({
  chapterIds,
  records,
  weightage,
}: {
  chapterIds: readonly string[]
  records: readonly TestRecordInput[] | null | undefined
  weightage: number
}): ExpectedMarksEvidence {
  const activeChapterIds = new Set(chapterIds)
  const validRecords = getValidTestRecords(records)
  const chapterPercentages = new Map<string, number[]>()
  const subjectPercentages: number[] = []

  for (const record of validRecords) {
    const percentage = (record.marksObtained / record.totalMarks) * 100

    if (record.chapterId && activeChapterIds.has(record.chapterId)) {
      const percentages = chapterPercentages.get(record.chapterId) ?? []
      percentages.push(percentage)
      chapterPercentages.set(record.chapterId, percentages)
    } else if (record.scope === "multi-chapter") {
      for (const chapterId of record.targetChapterIds ?? []) {
        if (activeChapterIds.has(chapterId)) {
          const chapterPercentagesForId = chapterPercentages.get(chapterId) ?? []
          chapterPercentagesForId.push(percentage)
          chapterPercentages.set(chapterId, chapterPercentagesForId)
        }
      }
    } else if (!record.chapterId) {
      subjectPercentages.push(percentage)
    }
  }

  const chapterRecordGroups = [...chapterPercentages.values()]
  const chapterAverages = chapterRecordGroups.map(average)
  const chapterAveragePercentage = averageOrNull(chapterAverages)
  const subjectAveragePercentage = averageOrNull(subjectPercentages)
  const percentage = combineScopePercentages(
    chapterAveragePercentage,
    subjectAveragePercentage
  )
  const normalizedWeightage = Number.isFinite(weightage)
    ? Math.max(0, weightage)
    : 0
  const weightedMarksContribution =
    percentage === null
      ? null
      : roundToOneDecimal(
          Math.min(
            normalizedWeightage,
            (normalizedWeightage * percentage) / 100
          )
        )
  const validChapterRecords = chapterRecordGroups.reduce(
    (total, percentages) => total + percentages.length,
    0
  )
  const testedChapters = chapterAverages.length
  const activeChapters = chapterIds.length
  const chapterCoveragePercentage =
    activeChapters === 0
      ? subjectPercentages.length > 0
        ? 100
        : 0
      : roundToOneDecimal((testedChapters / activeChapters) * 100)
  const coverageStatus = getCoverageStatus({
    activeChapters,
    testedChapters,
    validChapterRecords,
    validSubjectRecords: subjectPercentages.length,
  })

  return {
    percentage: percentage === null ? null : roundToOneDecimal(percentage),
    weightedMarksContribution,
    // Compatibility for inactive dashboard/analytics consumers. Active code
    // should use weightedMarksContribution or percentage instead.
    expectedMarks: weightedMarksContribution,
    chapterAveragePercentage:
      chapterAveragePercentage === null
        ? null
        : roundToOneDecimal(chapterAveragePercentage),
    subjectAveragePercentage:
      subjectAveragePercentage === null
        ? null
        : roundToOneDecimal(subjectAveragePercentage),
    validChapterRecords,
    validSubjectRecords: subjectPercentages.length,
    testedChapters,
    activeChapters,
    chapterCoveragePercentage,
    coverageStatus,
  }
}

export function calculateWeightedAverageMarks(
  subjects: readonly { percentage: number | null; weightage: number }[]
): WeightedAverageMarksEvidence {
  const validSubjects = subjects.filter(
    (subject) =>
      subject.percentage !== null &&
      Number.isFinite(subject.percentage) &&
      subject.percentage >= 0 &&
      subject.percentage <= 100 &&
      Number.isFinite(subject.weightage) &&
      subject.weightage > 0
  ) as { percentage: number; weightage: number }[]
  const totalWeightage = validSubjects.reduce(
    (total, subject) => total + subject.weightage,
    0
  )
  const weightedPercentage = validSubjects.reduce(
    (total, subject) => total + subject.percentage * subject.weightage,
    0
  )

  return {
    percentage:
      totalWeightage > 0
        ? roundToOneDecimal(weightedPercentage / totalWeightage)
        : null,
    evidencedSubjects: validSubjects.length,
    totalSubjects: subjects.length,
  }
}

function getCoverageStatus({
  activeChapters,
  testedChapters,
  validChapterRecords,
  validSubjectRecords,
}: {
  activeChapters: number
  testedChapters: number
  validChapterRecords: number
  validSubjectRecords: number
}): TestScoreEvidence["coverageStatus"] {
  if (validChapterRecords + validSubjectRecords === 0) return "none"
  if (
    validSubjectRecords > 0 ||
    (activeChapters > 0 && testedChapters === activeChapters)
  ) {
    return "strong"
  }
  if (activeChapters > 0 && testedChapters / activeChapters >= 0.5)
    return "developing"
  return "limited"
}

/** @deprecated Use calculateTestScoreEvidence. */
export const calculateExpectedMarksEvidence = calculateTestScoreEvidence

function combineScopePercentages(
  chapterAverage: number | null,
  subjectAverage: number | null
): number | null {
  if (chapterAverage !== null && subjectAverage !== null) {
    return chapterAverage * 0.4 + subjectAverage * 0.6
  }
  return chapterAverage ?? subjectAverage
}

function calculateTargetPercentage(completed: number, target: number): number {
  return target === 0
    ? 100
    : roundToOneDecimal(Math.min(100, (completed / target) * 100))
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function averageOrNull(values: readonly number[]): number | null {
  return values.length > 0 ? average(values) : null
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

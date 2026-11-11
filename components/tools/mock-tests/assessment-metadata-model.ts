import { decimal82Schema } from "@/lib/tools/mock-tests/actions/common"
import type { PaperType } from "./assessment-paper-types"
export type AssessmentMetadataValues = {
  title: string
  paperType: PaperType
  examTag: string
  subjects: string
  durationMinutes: string
  totalMarks: string
  calculatorAllowed: boolean
  instructions: string
  passingBenchmark: string
  distinctionBenchmark: string
}
export type AssessmentMetadataKey = keyof AssessmentMetadataValues
export type AssessmentMetadataErrors = Partial<
  Record<AssessmentMetadataKey, string>
>
export function normalizeAssessmentMetadata(values: AssessmentMetadataValues) {
  return {
    title: values.title.trim(),
    durationMinutes: values.durationMinutes.trim()
      ? Number(values.durationMinutes)
      : null,
    totalMarks: values.totalMarks.trim() ? Number(values.totalMarks) : null,
    passingBenchmark: Number(values.passingBenchmark),
    distinctionBenchmark: Number(values.distinctionBenchmark),
    subjects: values.subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    examTag: values.examTag.trim() || null,
  }
}
export function validateAssessmentMetadata(
  values: AssessmentMetadataValues
): AssessmentMetadataErrors {
  const next: AssessmentMetadataErrors = {},
    {
      durationMinutes: duration,
      totalMarks: marks,
      passingBenchmark: passing,
      distinctionBenchmark: distinction,
    } = normalizeAssessmentMetadata(values)
  if (!values.title.trim() || values.title.trim().length > 200)
    next.title = "Enter a title between 1 and 200 characters."
  if (values.instructions.trim().length > 20000)
    next.instructions =
      "Shorten the instructions to 20,000 characters, including formatting."
  if (values.examTag.trim().length > 60)
    next.examTag = "Keep the exam label within 60 characters."
  if (values.subjects.length > 180)
    next.subjects = "Keep subject labels within 180 characters."
  if (
    duration !== null &&
    (!Number.isInteger(duration) || duration < 1 || duration > 1440)
  )
    next.durationMinutes =
      "Enter a whole number from 1 to 1,440 minutes, or leave blank."
  if (
    marks !== null &&
    (!decimal82Schema.safeParse(marks).success || marks <= 0)
  )
    next.totalMarks =
      "Enter marks from 0.01 to 999,999.99, with up to two decimal places."
  if (
    !values.passingBenchmark.trim() ||
    !Number.isInteger(passing) ||
    passing < 1 ||
    passing > 100
  )
    next.passingBenchmark = "Enter a whole percentage from 1 to 100."
  if (
    !values.distinctionBenchmark.trim() ||
    !Number.isInteger(distinction) ||
    distinction < 1 ||
    distinction > 100
  )
    next.distinctionBenchmark = "Enter a whole percentage from 1 to 100."
  else if (!next.passingBenchmark && distinction <= passing)
    next.distinctionBenchmark =
      "Distinction must be higher than the passing benchmark."
  return next
}

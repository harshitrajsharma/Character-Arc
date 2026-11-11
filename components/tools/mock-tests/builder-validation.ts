import { validateAssessmentMetadata } from "./assessment-metadata-model"
import { decimal82Schema } from "@/lib/tools/mock-tests/actions/common"

export type BuilderIssue = {
  id: string
  message: string
  settings?: boolean
  questionId?: string
}
export function validateBuilder(values: {
  title: string
  instructions: string
  duration: string
  totalMarks: string
  examTag: string
  subjectsText: string
  passingBenchmark: number
  distinctionBenchmark: number
  entries: { id: string; marks: number; negativeMarks: number }[]
}): BuilderIssue[] {
  const issues: BuilderIssue[] = []
  const metadataErrors = validateAssessmentMetadata({
    ...values,
    paperType: "full_length",
    subjects: values.subjectsText,
    durationMinutes: values.duration,
    passingBenchmark: String(values.passingBenchmark),
    distinctionBenchmark: String(values.distinctionBenchmark),
    calculatorAllowed: false,
  })
  for (const [key, message] of Object.entries(metadataErrors))
    issues.push({ id: `blueprint-field-${key}`, message, settings: true })
  values.entries.forEach((entry, index) => {
    if (!decimal82Schema.safeParse(entry.marks).success)
      issues.push({
        id: `marks-${entry.id}`,
        message: `Question ${index + 1}: enter nonnegative marks with up to two decimal places.`,
        questionId: entry.id,
      })
    if (
      entry.negativeMarks > 0 ||
      !decimal82Schema.safeParse(Math.abs(entry.negativeMarks)).success
    )
      issues.push({
        id: `negative-${entry.id}`,
        message: `Question ${index + 1}: enter a penalty of zero or less, with up to two decimal places.`,
        questionId: entry.id,
      })
  })
  return issues
}

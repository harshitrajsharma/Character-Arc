export type QuestionAllocation = { marks: number; negativeMarks: number }
export type AssessmentQuestionAuthoring = {
  id: string
  title: string
  revision: number
  questionCount: number
  totalMarks: number
  sections: Array<{ key: string; title: string }>
  section: string | null
  defaults: Record<string, QuestionAllocation>
}

/** Last saved allocation of each kind is a useful, explicit authoring default. */
export function allocationDefaults(
  rows: Array<{ kind: string; marks: number; negativeMarks: number }>
): Record<string, QuestionAllocation> {
  return Object.fromEntries(
    rows.map(({ kind, marks, negativeMarks }) => [
      kind,
      { marks, negativeMarks: Math.min(0, negativeMarks) },
    ])
  )
}

export function allocationError(marks: string, penalty: string): string | null {
  const values = [Number(marks), Number(penalty)]
  if (
    !marks.trim() ||
    !penalty.trim() ||
    values.some(
      (value) =>
        !Number.isFinite(value) ||
        Math.abs(value * 100 - Math.round(value * 100)) > 1e-8
    )
  )
    return "Enter marks and penalty using at most two decimal places."
  if (values[0] <= 0 || values[0] > 999999.99)
    return "Marks must be greater than zero and at most 999999.99."
  if (values[1] > 0 || values[1] < -999999.99)
    return "Penalty must be zero or a negative value, at least −999999.99."
  return null
}

export const QUESTION_KIND_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
  NUMERIC: "Numeric",
  SHORT_ANSWER: "Short answer",
}

export function questionKindLabel(kind: string): string {
  return QUESTION_KIND_LABELS[kind] ?? kind.replace(/_/g, " ")
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100)
}

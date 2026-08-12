export function getTargetMessage(
  recordedCount: number,
  targetCount: number
): string {
  if (targetCount === 0) {
    return "Not required · records count as extra evidence"
  }
  if (recordedCount > targetCount) {
    return `${recordedCount} tests recorded · target ${targetCount}`
  }
  if (recordedCount === targetCount) {
    return `Target met · ${recordedCount} of ${targetCount}`
  }
  return `${recordedCount} of ${targetCount} required tests recorded`
}

export function getScoreStatus(percentage: number): {
  label: string
  variant: "success" | "warning" | "destructive"
} {
  if (percentage >= 80) return { label: "Strong", variant: "success" }
  if (percentage >= 50) return { label: "Building", variant: "warning" }
  return { label: "Needs review", variant: "destructive" }
}

export function validateTestRecordForm(
  marksObtained: number,
  totalMarks: number
): string | null {
  if (!Number.isFinite(marksObtained) || marksObtained < 0)
    return "Marks obtained must be 0 or greater."
  if (!Number.isFinite(totalMarks) || totalMarks <= 0)
    return "Total marks must be greater than 0."
  if (marksObtained > totalMarks)
    return "Marks obtained cannot exceed total marks."
  return null
}

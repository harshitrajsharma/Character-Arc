export const QUESTION_KIND_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Multiple Choice (MCQ)",
  MULTIPLE_CHOICE: "Multiple Select (MSQ)",
  TRUE_FALSE: "True / False",
  NUMERIC: "Numerical Answer (NAT)",
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

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "0s"
  const safe = Math.round(seconds)

  // 1. Over 24 hours (Days + Hours)
  if (safe >= 86400) {
    const days = Math.floor(safe / 86400)
    const hours = Math.floor((safe % 86400) / 3600)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  // 2. Over 60 minutes (Hours + Minutes)
  if (safe >= 3600) {
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  // 3. Under 60 minutes (Minutes + Seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }

  return `${secs}s`
}


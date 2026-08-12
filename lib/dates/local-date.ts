const ISO_LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseIsoLocalDate(value?: string | null) {
  if (!value) {
    return undefined
  }

  const match = ISO_LOCAL_DATE_PATTERN.exec(value)
  if (!match) {
    return undefined
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

export function formatIsoLocalDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function formatDateInTimeZone(
  date: Date,
  timeZone: string,
  fallbackTimeZone = "UTC"
) {
  const format = (zone: string) => {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    )
    return `${values.year}-${values.month}-${values.day}`
  }

  if (Number.isNaN(date.getTime())) return ""
  try {
    return format(timeZone)
  } catch {
    return format(fallbackTimeZone)
  }
}

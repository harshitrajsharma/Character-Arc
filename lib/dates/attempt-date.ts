// One explicit timezone prevents server/client and cross-surface date drift.
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
})
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
})
export function formatAttemptDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : dateFormatter.format(date)
}
export function formatAttemptTime(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : timeFormatter.format(date)
}

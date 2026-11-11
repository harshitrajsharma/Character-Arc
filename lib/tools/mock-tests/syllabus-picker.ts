export const SYLLABUS_PAGE_SIZE = 30
export const MAX_QUESTION_TARGETS = 50
export const SYLLABUS_SEARCH_LIMIT = 200
export const SYLLABUS_TYPES = ["exam-prep.chapter", "exam-prep.topic"] as const
export type SyllabusType = "ALL" | (typeof SYLLABUS_TYPES)[number]
export type SyllabusItem = {
  blockId: string
  title: string
  blockTypeKey: string | null
  parentTitle?: string | null
}
export type LinkedSyllabusItem = SyllabusItem & {
  weight: number
  isPrimary: boolean
}
export type SyllabusCursor = { updatedAt: string; blockId: string }
export type SyllabusPage = {
  items: SyllabusItem[]
  nextCursor: SyllabusCursor | null
}
export function syllabusTypeLabel(key: string | null) {
  if (key === "exam-prep.chapter") return "Chapter"
  if (key === "exam-prep.topic") return "Topic"
  if (key === "exam-prep.subject") return "Subject"
  return "Syllabus item"
}
export function syllabusPageKey(
  workspaceSlug: string,
  viewerId: string,
  q: string,
  type: SyllabusType,
  cursor: SyllabusCursor | null
) {
  return [
    "syllabus-picker",
    workspaceSlug,
    viewerId,
    q.trim().slice(0, SYLLABUS_SEARCH_LIMIT),
    type,
    cursor,
  ] as const
}
export function toggleSyllabusTarget(
  current: LinkedSyllabusItem[],
  item: SyllabusItem
): LinkedSyllabusItem[] {
  if (current.some((target) => target.blockId === item.blockId))
    return current.filter((target) => target.blockId !== item.blockId)
  if (current.length >= MAX_QUESTION_TARGETS) return current
  return [...current, { ...item, weight: 100, isPrimary: current.length === 0 }]
}

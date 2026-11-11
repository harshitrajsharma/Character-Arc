import "server-only"
import { prisma } from "@/lib/prisma"
import {
  syllabusPickerReadArgs,
  syllabusPageFromRows,
} from "./syllabus-picker-query"
import {
  type SyllabusPage,
  type SyllabusCursor,
  type SyllabusType,
} from "./syllabus-picker"

/** Authorized read action supplies the workspace. No global syllabus preload/count. */
export async function getSyllabusPickerPage(
  workspaceId: string,
  {
    q,
    type,
    cursor,
  }: { q: string; type: SyllabusType; cursor: SyllabusCursor | null }
): Promise<SyllabusPage> {
  const rows = await prisma.block.findMany(
    syllabusPickerReadArgs(workspaceId, q, type, cursor)
  )
  return syllabusPageFromRows(workspaceId, rows)
}

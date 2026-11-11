import type { Prisma } from "@/generated/prisma/client"
import {
  SYLLABUS_PAGE_SIZE,
  SYLLABUS_TYPES,
  type SyllabusCursor,
  type SyllabusPage,
  type SyllabusType,
} from "./syllabus-picker"

/** Pure query builder; callers must authorize the workspace before executing it. */
export function syllabusPickerWhere(
  workspaceId: string,
  q: string,
  type: SyllabusType,
  cursor: SyllabusCursor | null
): Prisma.BlockWhereInput {
  const search = q.trim()
  return {
    workspaceId,
    status: "ACTIVE",
    archivedAt: null,
    blockType: { key: type === "ALL" ? { in: [...SYLLABUS_TYPES] } : type },
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(cursor
      ? {
          OR: [
            { updatedAt: { lt: new Date(cursor.updatedAt) } },
            {
              updatedAt: new Date(cursor.updatedAt),
              id: { lt: cursor.blockId },
            },
          ],
        }
      : {}),
  }
}

export function syllabusPickerReadArgs(
  workspaceId: string,
  q: string,
  type: SyllabusType,
  cursor: SyllabusCursor | null
) {
  const edge = {
    where: {
      workspaceId,
      relationType: {
        key: {
          in: [
            "exam-prep.chapter-has-topic",
            "exam-prep.subject-has-chapter",
            "exam-prep.exam-has-subject",
          ],
        },
      },
      fromBlock: { workspaceId, status: "ACTIVE" as const, archivedAt: null },
    },
    orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
    take: 1,
  }
  const leaf = { title: true, workspaceId: true } as const
  const next = {
    ...leaf,
    incomingRelations: { ...edge, select: { fromBlock: { select: leaf } } },
  }
  const root = {
    ...leaf,
    incomingRelations: { ...edge, select: { fromBlock: { select: next } } },
  }
  return {
    where: syllabusPickerWhere(workspaceId, q, type, cursor),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: SYLLABUS_PAGE_SIZE + 1,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      blockType: { select: { key: true } },
      parent: { select: { title: true, workspaceId: true } },
      incomingRelations: { ...edge, select: { fromBlock: { select: root } } },
    },
  } satisfies Prisma.BlockFindManyArgs
}

type SyllabusRow = {
  id: string
  title: string
  updatedAt: Date
  blockType: { key: string }
  parent: { title: string; workspaceId: string } | null
  incomingRelations?: Array<{ fromBlock: SyllabusAncestor }>
}
type SyllabusAncestor = {
  title: string
  workspaceId: string
  incomingRelations?: Array<{ fromBlock: SyllabusAncestor }>
}
function contextPath(row: SyllabusRow, workspaceId: string): string | null {
  const titles: string[] = []
  let node = row.incomingRelations?.[0]?.fromBlock
  for (let depth = 0; node && depth < 3; depth++) {
    if (node.workspaceId !== workspaceId) break
    titles.unshift(node.title)
    node = node.incomingRelations?.[0]?.fromBlock
  }
  return titles.length
    ? titles.join(" › ")
    : row.parent?.workspaceId === workspaceId
      ? row.parent.title
      : null
}
export function syllabusPageFromRows(
  workspaceId: string,
  rows: SyllabusRow[]
): SyllabusPage {
  const visible = rows.slice(0, SYLLABUS_PAGE_SIZE)
  const last = visible.at(-1)
  return {
    items: visible.map((row) => ({
      blockId: row.id,
      title: row.title,
      blockTypeKey: row.blockType.key,
      parentTitle: contextPath(row, workspaceId),
    })),
    nextCursor:
      rows.length > SYLLABUS_PAGE_SIZE && last
        ? { updatedAt: last.updatedAt.toISOString(), blockId: last.id }
        : null,
  }
}

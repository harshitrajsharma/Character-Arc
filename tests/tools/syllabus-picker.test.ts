// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import {
  syllabusPageKey,
  toggleSyllabusTarget,
  type LinkedSyllabusItem,
} from "@/lib/tools/mock-tests/syllabus-picker"
import {
  syllabusPickerReadArgs,
  syllabusPickerWhere,
  syllabusPageFromRows,
} from "@/lib/tools/mock-tests/syllabus-picker-query"

const stamp = "2026-10-20T12:00:00.000Z"
const cursor = {
  updatedAt: stamp,
  blockId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
}
describe("bounded workspace syllabus discovery", () => {
  test("duplicate chapters show authorized exam and subject ancestry", () => {
    const row = (exam: string) => ({
      id: exam,
      title: "Linear Algebra",
      updatedAt: new Date(stamp),
      blockType: { key: "exam-prep.chapter" },
      parent: null,
      incomingRelations: [
        {
          fromBlock: {
            title: "Mathematics",
            workspaceId: "mine",
            incomingRelations: [
              { fromBlock: { title: exam, workspaceId: "mine" } },
            ],
          },
        },
      ],
    })
    expect(
      syllabusPageFromRows("mine", [row("GATE DA"), row("GATE CS")]).items.map(
        (item) => item.parentTitle
      )
    ).toEqual(["GATE DA › Mathematics", "GATE CS › Mathematics"])
    const foreign = row("private exam")
    foreign.incomingRelations[0].fromBlock.workspaceId = "other"
    expect(
      syllabusPageFromRows("mine", [foreign]).items[0].parentTitle
    ).toBeNull()
  })
  test("searches active workspace items before paging, with a bounded lean projection", () => {
    const args = syllabusPickerReadArgs(
      "mine",
      "  rare older topic  ",
      "ALL",
      null
    )
    expect(args.take).toBe(31)
    expect("skip" in args).toBe(false)
    expect(args.where).toMatchObject({
      workspaceId: "mine",
      status: "ACTIVE",
      archivedAt: null,
      title: { contains: "rare older topic", mode: "insensitive" },
    })
    expect(args.where.blockType).toEqual({
      key: { in: ["exam-prep.chapter", "exam-prep.topic"] },
    })
    expect(Object.keys(args.select)).toEqual([
      "id",
      "title",
      "updatedAt",
      "blockType",
      "parent",
      "incomingRelations",
    ])
  })
  test("cursor keeps workspace/type/search restrictions and breaks timestamp ties by ID", () => {
    const where = syllabusPickerWhere("mine", "rare", "exam-prep.topic", cursor)
    expect(where).toMatchObject({
      workspaceId: "mine",
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "exam-prep.topic" },
      title: { contains: "rare" },
    })
    expect(where.OR).toEqual([
      { updatedAt: { lt: new Date(stamp) } },
      { updatedAt: new Date(stamp), id: { lt: cursor.blockId } },
    ])
    expect(syllabusPickerReadArgs("mine", "", "ALL", cursor).orderBy).toEqual([
      { updatedAt: "desc" },
      { id: "desc" },
    ])
  })
  test("lookahead is not rendered or used as the next page anchor; parent data is scoped", () => {
    const rows = Array.from({ length: 31 }, (_, i) => ({
      id: String(i),
      title: `Topic ${i}`,
      updatedAt: new Date(stamp),
      blockType: { key: "exam-prep.topic" },
      parent: {
        title: "Parent",
        workspaceId: i === 0 ? "another-workspace" : "mine",
      },
    }))
    const page = syllabusPageFromRows("mine", rows)
    expect(page.items).toHaveLength(30)
    expect(page.nextCursor).toEqual({ updatedAt: stamp, blockId: "29" })
    expect(page.items[0].parentTitle).toBeNull()
    expect(page.items[1].parentTitle).toBe("Parent")
    expect(
      syllabusPageFromRows("mine", rows.slice(0, 30)).nextCursor
    ).toBeNull()
    expect(syllabusPageFromRows("mine", [])).toEqual({
      items: [],
      nextCursor: null,
    })
  })
  test("cache is isolated by viewer/workspace and complete query/cursor identity", () => {
    const key = syllabusPageKey("mine", "me", " rare ", "ALL", null)
    expect(key).toEqual(syllabusPageKey("mine", "me", "rare", "ALL", null))
    expect(key).not.toEqual(syllabusPageKey("other", "me", "rare", "ALL", null))
    expect(key).not.toEqual(
      syllabusPageKey("mine", "someone-else", "rare", "ALL", null)
    )
    expect(key).not.toEqual(
      syllabusPageKey("mine", "me", "rare", "ALL", cursor)
    )
    expect(key).not.toEqual(
      syllabusPageKey("mine", "me", "rare", "exam-prep.topic", null)
    )
  })
  test("selection keeps labels, weights and primary status independently of result pages", () => {
    const existing: LinkedSyllabusItem = {
      blockId: "old",
      title: "Outside first page",
      blockTypeKey: "exam-prep.topic",
      weight: 35,
      isPrimary: true,
    }
    const item = {
      blockId: "new",
      title: "Other page",
      blockTypeKey: "exam-prep.chapter",
    }
    const next = toggleSyllabusTarget([existing], item)
    expect(next[0]).toEqual(existing)
    expect(next[1]).toMatchObject({ ...item, weight: 100, isPrimary: false })
    expect(toggleSyllabusTarget(next, item)).toEqual([existing])
    const full = Array.from({ length: 50 }, (_, i) => ({
      ...existing,
      blockId: String(i),
    }))
    expect(toggleSyllabusTarget(full, item)).toBe(full)
    expect(toggleSyllabusTarget(full, full[0])).toHaveLength(49)
  })
})

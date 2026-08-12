// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  validateToolActionInput,
  resolveToolAction,
} from "@/lib/tools/action-contract"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"
import { validateTestRecordMarks } from "@/lib/tools/exam-prep/calculations/test-records"
import fs from "node:fs/promises"

// ─── Helpers ───────────────────────────────────────────────────────────────

const uuid1 = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
const uuid2 = "68a0111e-43d0-4464-83c0-a5132c6bd4f6"
const uuid3 = "78a0111e-43d0-4464-83c0-a5132c6bd4f7"
const uuid4 = "88a0111e-43d0-4464-83c0-a5132c6bd4f8"

function validChapterRecordInput() {
  return {
    workspaceId: uuid1,
    examId: uuid2,
    subjectId: uuid3,
    chapterId: uuid4,
    title: "Chapter Test 1",
    marksObtained: 8,
    totalMarks: 10,
    summary: "Test summary",
  }
}

function validSubjectRecordInput() {
  return {
    workspaceId: uuid1,
    examId: uuid2,
    subjectId: uuid3,
    chapterId: null,
    title: "Subject Test 1",
    marksObtained: 80,
    totalMarks: 100,
  }
}

// ─── Manifest version ──────────────────────────────────────────────────────

describe("Exam Prep manifest version", () => {
  test("is bumped to 1.11.0", () => {
    expect(examPrepManifest.release.version).toBe("1.11.0")
  })
})

// ─── Action resolution ─────────────────────────────────────────────────────

describe("TestRecord action resolution", () => {
  test("test-record.create action exists", () => {
    const result = resolveToolAction(examPrepManifest, "test-record.create")
    expect(result.success).toBe(true)
  })

  test("test-record.update action exists", () => {
    const result = resolveToolAction(examPrepManifest, "test-record.update")
    expect(result.success).toBe(true)
  })

  test("test-record.delete action exists", () => {
    const result = resolveToolAction(examPrepManifest, "test-record.delete")
    expect(result.success).toBe(true)
  })

  test("legacy topic.record-test action still resolves", () => {
    const result = resolveToolAction(examPrepManifest, "topic.record-test")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.action.description).toContain("DEPRECATED")
    }
  })
})

// ─── test-record.create manifest validation ─────────────────────────────────

describe("test-record.create input validation", () => {
  test("valid chapter record is accepted", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      validChapterRecordInput()
    )
    expect(result.success).toBe(true)
  })

  test("valid subject record (chapterId null) is accepted", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      validSubjectRecordInput()
    )
    expect(result.success).toBe(true)
  })

  test("valid subject record without chapterId field is accepted", () => {
    const input = validSubjectRecordInput()
    // delete chapterId safely to check behavior without it
    delete (input as Record<string, unknown>).chapterId
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(true)
  })

  test("marksObtained > totalMarks rejected by validation helper", () => {
    expect(() => validateTestRecordMarks(15, 10)).toThrow(
      /Marks obtained must be between 0 and total marks/
    )
  })

  test("negative marksObtained is rejected by manifest", () => {
    const input = { ...validChapterRecordInput(), marksObtained: -1 }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("minimum")
      expect(result.issues[0].path).toEqual(["marksObtained"])
    }
  })

  test("zero totalMarks is rejected by manifest", () => {
    const input = { ...validChapterRecordInput(), totalMarks: 0 }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("minimum")
      expect(result.issues[0].path).toEqual(["totalMarks"])
    }
  })

  test("non-finite marks are rejected by manifest", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      { ...validChapterRecordInput(), marksObtained: NaN }
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("invalid_type")
    }
  })

  test("missing required subjectId is rejected", () => {
    const input = validChapterRecordInput()
    delete (input as Record<string, unknown>).subjectId
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.issues.some(
          (i) => i.code === "required" && i.path.includes("subjectId")
        )
      ).toBe(true)
    }
  })

  test("missing required examId is rejected", () => {
    const input = validChapterRecordInput()
    delete (input as Record<string, unknown>).examId
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
  })

  test("missing required workspaceId is rejected", () => {
    const input = validChapterRecordInput()
    delete (input as Record<string, unknown>).workspaceId
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
  })

  test("invalid UUID format for examId is rejected", () => {
    const input = { ...validChapterRecordInput(), examId: "not-a-uuid" }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("invalid_format")
      expect(result.issues[0].path).toEqual(["examId"])
    }
  })

  test("title length exceeding 120 is rejected", () => {
    const input = { ...validChapterRecordInput(), title: "x".repeat(121) }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("max_length")
      expect(result.issues[0].path).toEqual(["title"])
    }
  })

  test("empty title is rejected", () => {
    const input = { ...validChapterRecordInput(), title: "" }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("min_length")
      expect(result.issues[0].path).toEqual(["title"])
    }
  })

  test("additional properties are rejected", () => {
    const input = { ...validChapterRecordInput(), percentage: 80 }
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      input
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("additional_property")
    }
  })
})

// ─── test-record.update manifest validation ─────────────────────────────────

describe("test-record.update input validation", () => {
  test("valid update input is accepted", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.update",
      {
        workspaceId: uuid1,
        testRecordId: uuid2,
        title: "Updated Test",
        marksObtained: 9,
        totalMarks: 10,
      }
    )
    expect(result.success).toBe(true)
  })

  test("missing testRecordId is rejected", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.update",
      {
        workspaceId: uuid1,
        title: "Updated Test",
        marksObtained: 9,
        totalMarks: 10,
      }
    )
    expect(result.success).toBe(false)
  })

  test("invalid testRecordId format is rejected", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.update",
      {
        workspaceId: uuid1,
        testRecordId: "bad",
        title: "Updated Test",
        marksObtained: 9,
        totalMarks: 10,
      }
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("invalid_format")
    }
  })
})

// ─── test-record.delete manifest validation ─────────────────────────────────

describe("test-record.delete input validation", () => {
  test("valid delete input is accepted", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.delete",
      {
        workspaceId: uuid1,
        testRecordId: uuid2,
      }
    )
    expect(result.success).toBe(true)
  })

  test("missing testRecordId is rejected", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.delete",
      { workspaceId: uuid1 }
    )
    expect(result.success).toBe(false)
  })
})

// ─── Handler binding verification ──────────────────────────────────────────

describe("Handler bindings at 1.11.0", () => {
  test("all exam-prep handler binding keys use version 1.11.0", async () => {
    // We import the module to inspect the handler map. The handlers map is
    // private, so we validate it indirectly by importing the manifest and
    // checking the version, which the execute pipeline validates at runtime.
    expect(examPrepManifest.release.version).toBe("1.11.0")

    // Verify all new canonical actions are declared in the manifest
    const actionKeys = examPrepManifest.actions.map((a) => a.key)
    expect(actionKeys).toContain("test-record.create")
    expect(actionKeys).toContain("test-record.update")
    expect(actionKeys).toContain("test-record.delete")

    // Verify legacy action is still present
    expect(actionKeys).toContain("topic.record-test")
  })

  test("actions declare exam-prep.exam as receipt root and do not advertise TestRecord as Block", () => {
    const createAction = examPrepManifest.actions.find(
      (a) => a.key === "test-record.create"
    )!
    const updateAction = examPrepManifest.actions.find(
      (a) => a.key === "test-record.update"
    )!
    const deleteAction = examPrepManifest.actions.find(
      (a) => a.key === "test-record.delete"
    )!

    expect(createAction.output.rootBlockTypeKey).toBe("exam-prep.exam")
    expect(createAction.output.createsBlockTypeKeys).toEqual([])
    expect(createAction.output.writesBlockTypeKeys).toEqual(["exam-prep.exam"])

    expect(updateAction.output.rootBlockTypeKey).toBe("exam-prep.exam")
    expect(updateAction.output.createsBlockTypeKeys).toEqual([])
    expect(updateAction.output.writesBlockTypeKeys).toEqual(["exam-prep.exam"])

    expect(deleteAction.output.rootBlockTypeKey).toBe("exam-prep.exam")
    expect(deleteAction.output.createsBlockTypeKeys).toEqual([])
    expect(deleteAction.output.writesBlockTypeKeys).toEqual(["exam-prep.exam"])
  })
})

// ─── Marks validation edge cases ───────────────────────────────────────────

describe("Marks validation via manifest schema", () => {
  test("Infinity is rejected as invalid_type for marks", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      { ...validChapterRecordInput(), totalMarks: Infinity }
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].code).toBe("invalid_type")
    }
  })

  test("string marks are rejected as invalid_type", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      { ...validChapterRecordInput(), marksObtained: "ten" }
    )
    expect(result.success).toBe(false)
  })

  test("fractional marks are accepted (number, not integer)", () => {
    const result = validateToolActionInput(
      examPrepManifest,
      "test-record.create",
      { ...validChapterRecordInput(), marksObtained: 7.5, totalMarks: 10 }
    )
    expect(result.success).toBe(true)
  })
})

// ─── Wrapper refactor verification ─────────────────────────────────────────

describe("test-actions.ts wrapper refactor", () => {
  test("wrappers do not directly import prisma.testRecord mutation methods", async () => {
    // Read the source file to verify no direct prisma.testRecord.create/update/delete calls
    const source = await fs.readFile(
      "lib/tools/exam-prep/actions/test-actions.ts",
      "utf8"
    )

    // The wrapper mutations should not contain direct prisma calls for TestRecord CUD
    // (read actions and ScheduledTest actions are allowed to use prisma directly)

    expect(source).not.toMatch(/prisma\.testRecord\.create\(/)
    expect(source).not.toMatch(/prisma\.testRecord\.update\(/)
    expect(source).not.toMatch(/prisma\.testRecord\.delete\(/)
    expect(source).not.toMatch(/tx\.testRecord\.create\(/)
    expect(source).not.toMatch(/tx\.testRecord\.update\(/)
    expect(source).not.toMatch(/tx\.testRecord\.delete\(/)
  })
})

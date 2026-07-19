// @ts-expect-error Bun supplies this module at test runtime; Bun types are not installed.
import { describe, expect, test } from "bun:test"

import {
  ToolActionResolutionError,
  resolveToolAction,
  resolveToolActionStrict,
  validateActionInput,
  validateToolActionInput,
  type ToolAction,
} from "@/lib/tools/action-contract"
import type { ToolManifest } from "@/lib/tools/contracts"
import { examPrepManifest } from "@/lib/tools/definitions/exam-prep/manifest"
import { goalsPathsManifest } from "@/lib/tools/definitions/goals-paths/manifest"

function manifestWithInputSchema(
  inputSchema: Record<string, unknown>
): ToolManifest {
  const action: ToolAction = {
    ...goalsPathsManifest.actions[0],
    inputSchema,
  }

  return {
    ...goalsPathsManifest,
    actions: [action],
  }
}

describe("action resolution", () => {
  test("resolves an action by its stable key", () => {
    const result = resolveToolAction(goalsPathsManifest, "arc.check-in")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.action.key).toBe("arc.check-in")
    }
  })

  test("returns a structured issue when an action is missing", () => {
    const result = resolveToolAction(goalsPathsManifest, "milestone.missing")

    expect(result).toEqual({
      success: false,
      issue: {
        code: "action_not_found",
        actionKey: "milestone.missing",
        message:
          'Unknown action "milestone.missing" for tool "core.goals-paths".',
      },
    })
  })

  test("offers a strict resolver with a typed error", () => {
    expect(
      resolveToolActionStrict(goalsPathsManifest, "arc.set-status").key
    ).toBe("arc.set-status")
    expect(() =>
      resolveToolActionStrict(goalsPathsManifest, "arc.missing")
    ).toThrow(ToolActionResolutionError)
  })
})

describe("action input validation", () => {
  test("accepts valid input and nullable fields", () => {
    const input = {
      title: "Ship the prototype",
      objective: "**Ship** the prototype",
      currentReality: "The core flow _works_",
      targetDate: null,
      constraints: ["Two-week deadline"],
    }

    expect(
      validateToolActionInput(goalsPathsManifest, "arc.create", input)
    ).toEqual({ success: true, data: input })
  })

  test("reports required, additional-property, type, and length issues", () => {
    const result = validateToolActionInput(goalsPathsManifest, "arc.create", {
      title: "Prototype",
      objective: "",
      targetDate: 123,
      surprise: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.map((issue) => [issue.code, issue.path])).toEqual([
        ["required", ["currentReality"]],
        ["min_length", ["objective"]],
        ["invalid_type", ["targetDate"]],
        ["additional_property", ["surprise"]],
      ])
    }
  })

  test("validates real dates and UUID strings", () => {
    expect(
      validateToolActionInput(goalsPathsManifest, "arc.create", {
        title: "Leap year plan",
        objective: "Plan",
        currentReality: "Starting",
        targetDate: "2028-02-29",
      }).success
    ).toBe(true)

    const invalidDate = validateToolActionInput(
      goalsPathsManifest,
      "arc.create",
      {
        title: "Invalid date plan",
        objective: "Plan",
        currentReality: "Starting",
        targetDate: "2027-02-29",
      }
    )
    const invalidUuid = validateToolActionInput(
      goalsPathsManifest,
      "arc.check-in",
      { arcId: "not-a-uuid", progressPercent: 10 }
    )

    expect(invalidDate.success).toBe(false)
    expect(invalidUuid.success).toBe(false)
    if (!invalidDate.success && !invalidUuid.success) {
      expect(invalidDate.issues[0].code).toBe("invalid_format")
      expect(invalidDate.issues[0].path).toEqual(["targetDate"])
      expect(invalidUuid.issues[0].code).toBe("invalid_format")
      expect(invalidUuid.issues[0].path).toEqual(["arcId"])
    }
  })

  test("validates declared string enum values", () => {
    expect(
      validateToolActionInput(goalsPathsManifest, "arc.set-status", {
        arcId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
        status: "paused",
      }).success
    ).toBe(true)

    const invalid = validateToolActionInput(
      goalsPathsManifest,
      "arc.set-status",
      {
        arcId: "58a0111e-43d0-4464-83c0-a5132c6bd4f5",
        status: "snoozed",
      }
    )

    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.issues[0].code).toBe("invalid_enum")
      expect(invalid.issues[0].path).toEqual(["status"])
    }
  })

  test("validates number, integer, array, and nested item constraints", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      additionalProperties: false,
      required: ["confidence", "steps"],
      properties: {
        confidence: { type: "number", minimum: 0, maximum: 1 },
        estimate: { type: ["integer", "null"], minimum: 1, maximum: 10 },
        steps: {
          type: "array",
          maxItems: 2,
          items: { type: "string", maxLength: 4 },
        },
      },
    })

    const result = validateActionInput(manifest.actions[0], {
      confidence: 2,
      estimate: 1.5,
      steps: ["okay", "toolong", "last"],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.map((issue) => [issue.code, issue.path])).toEqual([
        ["maximum", ["confidence"]],
        ["invalid_type", ["estimate"]],
        ["max_items", ["steps"]],
        ["max_length", ["steps", 1]],
      ])
    }
  })

  test("returns action resolution failures as validation issues", () => {
    expect(
      validateToolActionInput(goalsPathsManifest, "arc.missing", {})
    ).toEqual({
      success: false,
      issues: [
        {
          code: "action_not_found",
          path: [],
          message: 'Unknown action "arc.missing" for tool "core.goals-paths".',
        },
      ],
    })
  })

  test("accepts the standard Markdown content annotation", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      additionalProperties: false,
      required: ["body"],
      properties: {
        body: {
          type: "string",
          minLength: 1,
          contentMediaType: "text/markdown",
        },
      },
    })

    expect(
      validateActionInput(manifest.actions[0], { body: "# Direction" })
    ).toEqual({ success: true, data: { body: "# Direction" } })
  })

  test("accepts schema descriptions and enforces unique array items", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      description: "A documented action input.",
      additionalProperties: false,
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          description: "Ordered identifiers.",
          uniqueItems: true,
          items: { type: "string", description: "One identifier." },
        },
      },
    })

    expect(validateActionInput(manifest.actions[0], { ids: ["a", "b"] })).toEqual({
      success: true,
      data: { ids: ["a", "b"] },
    })

    const duplicateResult = validateActionInput(manifest.actions[0], { ids: ["a", "a"] })
    expect(duplicateResult.success).toBe(false)
    if (!duplicateResult.success) {
      expect(duplicateResult.issues[0]).toMatchObject({
        code: "unique_items",
        path: ["ids", 1],
        schemaPath: ["properties", "ids", "uniqueItems"],
      })
    }
  })

  test("accepts Exam Prep learning and reorder action schemas", () => {
    const topicId = "58a0111e-43d0-4464-83c0-a5132c6bd4f5"
    const chapterId = "68a0111e-43d0-4464-83c0-a5132c6bd4f6"

    expect(
      validateToolActionInput(examPrepManifest, "topic.set-learning", {
        topicId,
        learned: true,
      })
    ).toEqual({ success: true, data: { topicId, learned: true } })

    expect(
      validateToolActionInput(examPrepManifest, "topic.reorder", {
        chapterId,
        topicIds: [topicId],
      }).success
    ).toBe(true)

    expect(
      validateToolActionInput(examPrepManifest, "topic.set-progress", {
        topicId,
        stage: "revision",
        count: 6,
      }).success
    ).toBe(true)

    expect(
      validateToolActionInput(examPrepManifest, "topic.set-progress", {
        topicId,
        stage: "revision",
        count: 101,
      }).success
    ).toBe(false)
  })
})

describe("schema fail-closed behavior", () => {
  test("rejects unsupported keywords before inspecting input", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      additionalProperties: false,
      properties: {
        optional: { type: "string", pattern: "^[a-z]+$" },
      },
    })
    const result = validateActionInput(manifest.actions[0], {})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toContainEqual({
        code: "unsupported_schema_keyword",
        path: [],
        schemaPath: ["properties", "optional", "pattern"],
        message: 'Unsupported schema keyword "pattern".',
      })
    }
  })

  test("rejects unsupported types and unions", () => {
    const unsupportedType = manifestWithInputSchema({ type: "date-time" })
    const unsupportedUnion = manifestWithInputSchema({
      type: ["string", "number"],
    })

    const typeResult = validateActionInput(unsupportedType.actions[0], true)
    const unionResult = validateActionInput(
      unsupportedUnion.actions[0],
      "value"
    )

    expect(typeResult.success).toBe(false)
    expect(unionResult.success).toBe(false)
    if (!typeResult.success && !unionResult.success) {
      expect(typeResult.issues[0].code).toBe("unsupported_schema_type")
      expect(unionResult.issues[0].code).toBe("unsupported_schema_type")
    }
  })

  test("rejects malformed supported schemas", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      properties: {
        values: { type: "array", maxItems: -1 },
      },
    })
    const result = validateActionInput(manifest.actions[0], {})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.map((issue) => issue.code)).toEqual([
        "invalid_schema",
        "invalid_schema",
        "invalid_schema",
      ])
    }
  })

  test("rejects unsupported string content media types", () => {
    const manifest = manifestWithInputSchema({
      type: "object",
      additionalProperties: false,
      properties: {
        body: { type: "string", contentMediaType: "text/html" },
      },
    })
    const result = validateActionInput(manifest.actions[0], {})

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0]).toMatchObject({
        code: "invalid_schema",
        schemaPath: ["properties", "body", "contentMediaType"],
      })
    }
  })
})

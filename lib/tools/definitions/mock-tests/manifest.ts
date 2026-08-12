import { parseToolManifest } from "@/lib/tools/contracts"

// ─── Shared input property helpers ──────────────────────────────────────────

const markdown = (minLength: number, maxLength: number) => ({
  type: "string",
  minLength,
  maxLength,
  contentMediaType: "text/markdown",
})

const optionalMarkdown = (maxLength: number) => ({
  type: ["string", "null"] as const,
  maxLength,
  contentMediaType: "text/markdown",
})

const assessmentIdInput = { assessmentId: { type: "string", format: "uuid" } }
const attemptIdInput = { attemptId: { type: "string", format: "uuid" } }
const questionIdInput = { questionId: { type: "string", format: "uuid" } }

// ─── Block property schemas ────────────────────────────────────────────────

/** Documented metadata for the assessment block. Domain data lives in the
 *  `assessments` table (status, durationMinutes, totalMarks, instructions,
 *  blueprint, publishedAt); block.properties stays `{}`. */
const assessmentPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    instructions: optionalMarkdown(8000),
    durationMinutes: { type: ["integer", "null"], minimum: 1, maximum: 1440 },
    totalMarks: { type: ["number", "null"], minimum: 0.01, maximum: 999999.99 },
    /** Optional link to an exam-prep block (exam/subject/chapter/topic) that
     *  gives this test its study context. */
    examBlockId: { type: ["string", "null"], format: "uuid" },
    /** Section blueprint. Sections map to `AssessmentQuestion.section`. */
    blueprint: {
      type: "object",
      additionalProperties: false,
      properties: {
        sections: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "title"],
            properties: {
              key: { type: "string", minLength: 1, maxLength: 40 },
              title: { type: "string", minLength: 1, maxLength: 120 },
              description: optionalMarkdown(1000),
            },
          },
        },
      },
    },
  },
}

/** Documented metadata for the question block type. Question rows are
 *  standalone (not Block-backed); this schema documents the question payload. */
const questionPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    kind: {
      type: "string",
      enum: [
        "SINGLE_CHOICE",
        "MULTIPLE_CHOICE",
        "TRUE_FALSE",
        "NUMERIC",
        "SHORT_ANSWER",
      ],
    },
    difficulty: { type: ["integer", "null"], minimum: 1, maximum: 5 },
  },
}

// ─── Action input schemas ──────────────────────────────────────────────────

const blueprintSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sections: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title"],
        properties: {
          key: { type: "string", minLength: 1, maxLength: 40 },
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: optionalMarkdown(1000),
        },
      },
    },
  },
}

const questionPayloadProperties = {
  /** Question stem, in markdown (rich HTML may be stored by the UI editor). */
  stem: markdown(1, 50000),
  kind: {
    type: "string",
    enum: [
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "NUMERIC",
      "SHORT_ANSWER",
    ],
  },
  /** 1 (easiest) to 5 (hardest). */
  difficulty: { type: ["integer", "null"], minimum: 1, maximum: 5 },
  /** Options for choice questions (empty for NUMERIC / SHORT_ANSWER). */
  options: {
    type: "array",
    maxItems: 26,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["key", "content", "position"],
      properties: {
        key: { type: "string", minLength: 1, maxLength: 2 },
        content: markdown(1, 10000),
        position: { type: "integer", minimum: 0, maximum: 25 },
      },
    },
  },
  /** Option keys that form the answer for choice questions. Exactly one for
   *  SINGLE_CHOICE / TRUE_FALSE, one or more for MULTIPLE_CHOICE. */
  answerKeys: {
    type: "array",
    maxItems: 26,
    uniqueItems: true,
    items: { type: "string", minLength: 1, maxLength: 2 },
  },
  /** Expected numeric answer for NUMERIC questions. */
  numericAnswer: { type: ["number", "null"] },
  /** Expected text answer for SHORT_ANSWER questions. */
  textAnswer: { type: ["string", "null"], maxLength: 8000 },
  /** Optional explanation shown in the analysis after submission. */
  explanation: optionalMarkdown(40000),
  /** Links this question to study blocks (e.g. exam-prep chapters/topics) so
   *  attempt results can feed back into progress tracking. */
  targets: {
    type: "array",
    maxItems: 50,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["blockId", "weight"],
      properties: {
        blockId: { type: "string", format: "uuid" },
        weight: { type: "number", minimum: 0, maximum: 100 },
        isPrimary: { type: "boolean" },
      },
    },
  },
}

const questionCreateInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["stem", "kind"],
  properties: questionPayloadProperties,
}

const questionUpdateInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questionId", "stem", "kind"],
  properties: {
    ...questionIdInput,
    ...questionPayloadProperties,
  },
}

const assessmentCreateInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    instructions: optionalMarkdown(8000),
    durationMinutes: { type: ["integer", "null"], minimum: 1, maximum: 1440 },
    totalMarks: { type: ["number", "null"], minimum: 0.01, maximum: 999999.99 },
    examBlockId: { type: ["string", "null"], format: "uuid" },
    blueprint: blueprintSchema,
  },
}

const assessmentUpdateInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assessmentId", "expectedRevision", "title"],
  properties: {
    ...assessmentIdInput,
    expectedRevision: { type: "integer", minimum: 1 },
    title: { type: "string", minLength: 1, maxLength: 120 },
    instructions: optionalMarkdown(8000),
    durationMinutes: { type: ["integer", "null"], minimum: 1, maximum: 1440 },
    totalMarks: { type: ["number", "null"], minimum: 0.01, maximum: 999999.99 },
    examBlockId: { type: ["string", "null"], format: "uuid" },
    blueprint: blueprintSchema,
  },
}

const addQuestionsInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assessmentId", "expectedRevision", "questions"],
  properties: {
    ...assessmentIdInput,
    expectedRevision: { type: "integer", minimum: 1 },
    questions: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["questionId", "position", "marks"],
        properties: {
          questionId: { type: "string", format: "uuid" },
          section: { type: ["string", "null"], maxLength: 40 },
          position: { type: "integer", minimum: 0, maximum: 9999 },
          marks: { type: "number", minimum: 0, maximum: 999999.99 },
          negativeMarks: {
            type: "number",
            minimum: -999999.99,
            maximum: 0,
          },
        },
      },
    },
  },
}

const reorderQuestionsInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assessmentId", "expectedRevision", "questionIds"],
  properties: {
    ...assessmentIdInput,
    expectedRevision: { type: "integer", minimum: 1 },
    questionIds: {
      type: "array",
      uniqueItems: true,
      maxItems: 500,
      items: { type: "string", format: "uuid" },
    },
  },
}

const recordAnswerInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["attemptId", "questionId"],
  properties: {
    ...attemptIdInput,
    ...questionIdInput,
    selectedOptionKeys: {
      type: "array",
      maxItems: 26,
      uniqueItems: true,
      items: { type: "string", minLength: 1, maxLength: 2 },
    },
    answerText: { type: ["string", "null"], maxLength: 8000 },
    timeSpentSeconds: { type: ["integer", "null"], minimum: 0, maximum: 86400 },
  },
}

const weakTopicsInputSchema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    limit: { type: ["integer", "null"], minimum: 1, maximum: 50 },
  },
}

export const mockTestsManifest = parseToolManifest({
  manifestVersion: 1,
  tool: {
    key: "core.mock-tests",
    name: "Mock Tests",
    description:
      "Create, attempt, and analyze mock tests in any competitive pattern — with scoring rules, sections, and progress feedback.",
    icon: "list-checks",
    category: "practice",
  },
  release: {
    version: "1.0.0",
    schemaVersion: 1,
  },
  routes: {
    home: "/tools/mock-tests",
    create: "/tools/mock-tests/new",
  },
  defaultGrants: [
    {
      permissionKey: "blocks.read.owned",
      effect: "allow",
      constraints: {
        origin: "installation",
        blockTypeKeys: [
          "mock-tests.assessment",
          "mock-tests.question",
          "mock-tests.attempt",
        ],
      },
    },
    {
      permissionKey: "blocks.write.owned",
      effect: "allow",
      constraints: {
        origin: "installation",
        blockTypeKeys: [
          "mock-tests.assessment",
          "mock-tests.question",
          "mock-tests.attempt",
        ],
      },
    },
    {
      permissionKey: "ai.generate",
      effect: "deny",
      constraints: { requiresEntitlement: "in_app_ai" },
    },
  ],

  // ─── Block types ─────────────────────────────────────────────────────────
  // Assessment is Block-backed (assessments.blockId). Questions and attempts
  // are standalone rows; their block types exist as permission scopes so
  // grants and actions can address them cleanly.
  blockTypes: [
    {
      key: "mock-tests.assessment",
      name: "Mock test",
      description:
        "A test blueprint with sections, duration, scoring rules, and a set of questions. Backed by the assessments table.",
      kind: "container",
      schemaVersion: 1,
      propertiesSchema: assessmentPropertiesSchema,
    },
    {
      key: "mock-tests.question",
      name: "Question",
      description:
        "A reusable question in the bank (choice, true/false, numeric, or short answer) with a server-only answer key.",
      kind: "entity",
      schemaVersion: 1,
      propertiesSchema: questionPropertiesSchema,
    },
    {
      key: "mock-tests.attempt",
      name: "Attempt",
      description:
        "One user's in-progress or evaluated attempt of a mock test.",
      kind: "entity",
      schemaVersion: 1,
      propertiesSchema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  ],

  // No relation types: AssessmentQuestion is the actual question→assessment
  // link, and questions/attempts are not Block-backed.
  relationTypes: [],

  // ─── Agent-callable actions ───────────────────────────────────────────────
  actions: [
    // ── Question bank ──────────────────────────────────────────────────────
    {
      key: "question.create",
      name: "Create question",
      description:
        "Creates a question in the workspace question bank with a server-only answer key.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: questionCreateInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.question",
        createsBlockTypeKeys: ["mock-tests.question"],
        writesBlockTypeKeys: [],
      },
    },
    {
      key: "question.update",
      name: "Update question",
      description: "Replaces a question's stem, options, answer key, and targets.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: questionUpdateInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.question",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.question"],
      },
    },
    {
      key: "question.delete",
      name: "Archive question",
      description:
        "Archives a question so it is no longer available for new tests (existing tests keep their copy of the question).",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["questionId"],
        properties: questionIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.question",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.question"],
      },
    },
    {
      key: "assessment.get-questions",
      name: "Get test questions",
      description:
        "Returns the public view of a test's questions (stem, options, kind, marks) without any answer keys.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["assessmentId"],
        properties: assessmentIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.question",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.question"],
      },
    },

    // ── Test builder ───────────────────────────────────────────────────────
    {
      key: "assessment.create",
      name: "Create mock test",
      description:
        "Creates a mock test blueprint with title, duration, total marks, instructions, and optional sections.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: assessmentCreateInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: ["mock-tests.assessment"],
        writesBlockTypeKeys: [],
      },
    },
    {
      key: "assessment.update",
      name: "Update mock test",
      description: "Updates the metadata of a mock test blueprint.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: assessmentUpdateInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
    {
      key: "assessment.add-questions",
      name: "Add questions to test",
      description:
        "Adds questions to a test (upsert by assessmentId + questionId) with per-question section, position, marks, and negative marks.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: addQuestionsInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
    {
      key: "assessment.remove-question",
      name: "Remove question from test",
      description: "Removes one question from a test blueprint.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["assessmentId", "expectedRevision", "questionId"],
        properties: {
          ...assessmentIdInput,
          expectedRevision: { type: "integer", minimum: 1 },
          ...questionIdInput,
        },
      },
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
    {
      key: "assessment.reorder-questions",
      name: "Reorder test questions",
      description:
        "Reorders the questions in a test. Positions are reassigned from the given order.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: reorderQuestionsInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
    {
      key: "assessment.publish",
      name: "Publish mock test",
      description:
        "Publishes a draft mock test so users can attempt it. Requires at least one question.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["assessmentId", "expectedRevision"],
        properties: {
          ...assessmentIdInput,
          expectedRevision: { type: "integer", minimum: 1 },
        },
      },
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },

    // ── Attempt player ─────────────────────────────────────────────────────
    {
      key: "attempt.create",
      name: "Start attempt",
      description:
        "Starts a new attempt of a published mock test for the acting user.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["assessmentId"],
        properties: assessmentIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.attempt",
        createsBlockTypeKeys: ["mock-tests.attempt"],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
    {
      key: "attempt.record-answer",
      name: "Record answer",
      description:
        "Records or updates the acting user's answer to one question on an in-progress attempt.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: recordAnswerInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.attempt",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.attempt"],
      },
    },
    {
      key: "attempt.submit",
      name: "Submit attempt",
      description:
        "Grades every recorded answer, finalizes the attempt, and writes progress evidence for targeted study blocks.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["attemptId"],
        properties: attemptIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.attempt",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.attempt"],
      },
    },
    {
      key: "attempt.abandon",
      name: "Abandon attempt",
      description: "Abandons an in-progress attempt without grading it.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["attemptId"],
        properties: attemptIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.attempt",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.attempt"],
      },
    },

    // ── Analysis / agent reads ─────────────────────────────────────────────
    {
      key: "attempt.get-analysis",
      name: "Get attempt analysis",
      description:
        "Returns the full graded analysis of an attempt: score, section breakdown, per-question verdicts with correct answers and explanations, and weak topics.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["attemptId"],
        properties: attemptIdInput,
      },
      output: {
        rootBlockTypeKey: "mock-tests.attempt",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.attempt"],
      },
    },
    {
      key: "assessment.get-weak-topics",
      name: "Get weak topics",
      description:
        "Returns the weakest study blocks in the workspace for the acting user, ordered by proficiency, based on past attempt evidence.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: weakTopicsInputSchema,
      output: {
        rootBlockTypeKey: "mock-tests.assessment",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["mock-tests.assessment"],
      },
    },
  ],
})

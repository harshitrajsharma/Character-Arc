import { parseToolManifest } from "@/lib/tools/contracts"

// ─── Shared property helpers ───────────────────────────────────────────────

const optionalText = (maxLength: number) => ({
  type: ["string", "null"] as const,
  maxLength,
})

// ─── Block property schemas ────────────────────────────────────────────────

/** Topic-level progress properties stored in the block's `properties` JSONB. */
const topicPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["learningStatus", "revisionCount", "practiceCount", "testCount"],
  properties: {
    /** Whether the topic has been learned at least once. Must be true before
     *  revision/practice/test counts can advance. */
    learningStatus: { type: "boolean" },
    /** Number of completed revisions (0–5 for important topics, 0–3 otherwise). */
    revisionCount: { type: "integer", minimum: 0, maximum: 5 },
    /** Number of completed practice sessions. */
    practiceCount: { type: "integer", minimum: 0, maximum: 5 },
    /** Number of completed test sessions. */
    testCount: { type: "integer", minimum: 0, maximum: 5 },
    /** ISO-8601 datetime of the last revision event. */
    lastRevised: optionalText(32),
    /** ISO-8601 datetime when the next revision is due (spaced repetition). */
    nextRevision: optionalText(32),
    /** Whether this topic is flagged as high-importance (1.5× weight in rollup). */
    important: { type: "boolean" },
  },
}

const chapterPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    /** Whether this chapter is high-priority. */
    important: { type: "boolean" },
  },
}

const subjectPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["weightage", "foundationLevel"],
  properties: {
    /** Percentage weight of this subject in the exam (0–100). */
    weightage: { type: "number", minimum: 0, maximum: 100 },
    /** User's starting knowledge level. */
    foundationLevel: {
      type: "string",
      enum: ["Beginner", "Moderate", "Advanced"],
    },
    /** Expected marks from this subject (optional, for planning). */
    expectedMarks: { type: ["number", "null"], minimum: 0 },
  },
}

const examPropertiesSchema = {
  type: "object",
  additionalProperties: false,
  required: [],
  properties: {
    /** Short exam code, e.g. "GATE-2027-CSIT". */
    examCode: optionalText(80),
    /** Conducting body, e.g. "IIT Roorkee". */
    conductingBody: optionalText(120),
    /** Total duration in minutes. */
    durationMinutes: { type: ["integer", "null"], minimum: 1 },
    /** Total marks available. */
    totalMarks: { type: ["number", "null"], minimum: 1 },
    /** User's target marks. */
    targetMarks: { type: ["number", "null"], minimum: 0 },
    /** ISO-8601 date of the exam (YYYY-MM-DD). */
    examDate: optionalText(32),
    /** Official URL for exam information. */
    officialUrl: optionalText(512),
  },
}

// ─── Action input schemas ──────────────────────────────────────────────────

const topicIdInput = { topicId: { type: "string", format: "uuid" } }
const subjectIdInput = { subjectId: { type: "string", format: "uuid" } }
const examIdInput = { examId: { type: "string", format: "uuid" } }

export const examPrepManifest = parseToolManifest({
  manifestVersion: 1,
  tool: {
    key: "core.exam-prep",
    name: "Exam Prep",
    description:
      "Track exam subjects, chapters, and topics through four study stages: Learn, Revise, Practice, and Test.",
    icon: "graduation-cap",
    category: "learn",
  },
  release: {
    version: "1.0.0",
    schemaVersion: 1,
  },
  routes: {
    home: "/tools/exam-prep",
    create: "/tools/exam-prep/new",
  },
  defaultGrants: [
    {
      permissionKey: "blocks.read.owned",
      effect: "allow",
      constraints: {
        origin: "installation",
        blockTypeKeys: [
          "exam-prep.exam",
          "exam-prep.subject",
          "exam-prep.chapter",
          "exam-prep.topic",
        ],
      },
    },
    {
      permissionKey: "blocks.write.owned",
      effect: "allow",
      constraints: {
        origin: "installation",
        blockTypeKeys: [
          "exam-prep.exam",
          "exam-prep.subject",
          "exam-prep.chapter",
          "exam-prep.topic",
        ],
      },
    },
  ],

  // ─── Block types ─────────────────────────────────────────────────────────
  blockTypes: [
    {
      key: "exam-prep.exam",
      name: "Exam",
      description: "An exam with a date, target, and set of subjects.",
      kind: "container",
      schemaVersion: 1,
      propertiesSchema: examPropertiesSchema,
    },
    {
      key: "exam-prep.subject",
      name: "Subject",
      description:
        "A subject in an exam with weightage and four-stage progress tracking.",
      kind: "container",
      schemaVersion: 1,
      propertiesSchema: subjectPropertiesSchema,
    },
    {
      key: "exam-prep.chapter",
      name: "Chapter",
      description:
        "A chapter within a subject, grouping related topics together.",
      kind: "container",
      schemaVersion: 1,
      propertiesSchema: chapterPropertiesSchema,
    },
    {
      key: "exam-prep.topic",
      name: "Topic",
      description:
        "An atomic study topic tracking Learn, Revise, Practice, and Test completion.",
      kind: "entity",
      schemaVersion: 1,
      propertiesSchema: topicPropertiesSchema,
    },
  ],

  // ─── Relation types ───────────────────────────────────────────────────────
  relationTypes: [
    {
      key: "exam-prep.exam-has-subject",
      name: "Exam has subject",
      description:
        "Links an exam to a subject. A subject can belong to multiple exams (e.g. Linear Algebra in GATE and GRE).",
      sourceBlockTypeKey: "exam-prep.exam",
      targetBlockTypeKey: "exam-prep.subject",
      cardinality: "many_to_many",
    },
    {
      key: "exam-prep.subject-has-chapter",
      name: "Subject has chapter",
      description: "Connects a subject to one of its chapters.",
      sourceBlockTypeKey: "exam-prep.subject",
      targetBlockTypeKey: "exam-prep.chapter",
      cardinality: "one_to_many",
    },
    {
      key: "exam-prep.chapter-has-topic",
      name: "Chapter has topic",
      description: "Connects a chapter to one of its topics.",
      sourceBlockTypeKey: "exam-prep.chapter",
      targetBlockTypeKey: "exam-prep.topic",
      cardinality: "one_to_many",
    },
  ],

  // ─── Agent-callable actions ───────────────────────────────────────────────
  actions: [
    // ── Topic progress mutations ───────────────────────────────────────────
    {
      key: "topic.set-learning",
      name: "Set topic learning status",
      description:
        "Marks a topic as learned (or unlearned). Learning must be true before revision, practice, or test can advance.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["topicId", "learned"],
        properties: {
          ...topicIdInput,
          learned: {
            type: "boolean",
            description: "true to mark learned, false to unmark.",
          },
        },
      },
      output: {
        rootBlockTypeKey: "exam-prep.topic",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.topic"],
      },
    },
    {
      key: "topic.record-revision",
      name: "Record topic revision",
      description:
        "Increments the revision count for a topic. Topic must be learned first. Updates spaced-repetition schedule.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["topicId"],
        properties: {
          ...topicIdInput,
          note: {
            type: ["string", "null"],
            maxLength: 500,
            description: "Optional note about this revision session.",
          },
        },
      },
      output: {
        rootBlockTypeKey: "exam-prep.topic",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.topic"],
      },
    },
    {
      key: "topic.record-practice",
      name: "Record topic practice",
      description:
        "Increments the practice count for a topic. Topic must be learned first.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["topicId"],
        properties: {
          ...topicIdInput,
          note: { type: ["string", "null"], maxLength: 500 },
        },
      },
      output: {
        rootBlockTypeKey: "exam-prep.topic",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.topic"],
      },
    },
    {
      key: "topic.record-test",
      name: "Record topic test",
      description: "Increments the test count for a topic.",
      execution: "deterministic",
      requiredPermissions: ["blocks.write.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["topicId"],
        properties: {
          ...topicIdInput,
          note: { type: ["string", "null"], maxLength: 500 },
        },
      },
      output: {
        rootBlockTypeKey: "exam-prep.topic",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.topic"],
      },
    },

    // ── Read / query actions ──────────────────────────────────────────────
    {
      key: "exam.get-context",
      name: "Get exam context",
      description:
        "Returns the full exam context: all subjects with their chapter and topic trees, progress rollups, and exam metadata.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["examId"],
        properties: examIdInput,
      },
      output: {
        rootBlockTypeKey: "exam-prep.exam",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.exam"],
      },
    },
    {
      key: "exam.get-weak-topics",
      name: "Get weak topics",
      description:
        "Returns topics that are below a progress threshold in the specified study stage. Ordered by subject weightage then chapter importance.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["examId", "stage"],
        properties: {
          ...examIdInput,
          stage: {
            type: "string",
            enum: ["learning", "revision", "practice", "test"],
            description: "Which study stage to filter on.",
          },
          limit: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 50,
            description: "Maximum number of topics to return (default 20).",
          },
        },
      },
      output: {
        rootBlockTypeKey: "exam-prep.exam",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.exam"],
      },
    },
    {
      key: "subject.get-progress",
      name: "Get subject progress",
      description:
        "Returns the four-stage progress rollup for a single subject.",
      execution: "deterministic",
      requiredPermissions: ["blocks.read.owned"],
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["subjectId"],
        properties: subjectIdInput,
      },
      output: {
        rootBlockTypeKey: "exam-prep.subject",
        createsBlockTypeKeys: [],
        writesBlockTypeKeys: ["exam-prep.subject"],
      },
    },
  ],
})

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { getExamPrepWriteContext } from "@/lib/tools/definitions/exam-prep/action-context"
import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"
import type { ScheduledTest } from "@/types/progressapp/domain"

function revalidateExamPrep(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.examPrep.home(workspaceSlug), "layout")
}

const decimal82Schema = z
  .number()
  .min(0)
  .max(999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "Use at most two decimal places"
  )
const positiveDecimal82Schema = decimal82Schema.refine(
  (value) => value > 0,
  "Value must be greater than zero"
)

export type NormalizedTestRecord = {
  id: string
  examId: string
  subjectId: string | null
  chapterId: string | null
  scheduledTestId: string | null
  scope: "subject" | "chapter" | "multi-chapter" | null
  targetChapterIds: string[]
  attemptedAt: string | null
  title: string
  marksObtained: number
  totalMarks: number
  summary: string | null
  createdAt: string
  updatedAt: string
}

export type TestRecordCreateResult = {
  status: "created"
  record: NormalizedTestRecord
  runId: string
}

export type TestRecordUpdateResult = {
  status: "updated"
  record: NormalizedTestRecord
  runId: string
}

export type TestRecordDeleteResult = {
  status: "deleted"
  deletedRecord: {
    id: string
    examId: string
    subjectId: string | null
    chapterId: string | null
  }
  runId: string
}

const normalizedTestRecordSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  subjectId: z.string().uuid().nullable(),
  chapterId: z.string().uuid().nullable(),
  scheduledTestId: z.string().uuid().nullable(),
  scope: z.enum(["subject", "chapter", "multi-chapter"]).nullable(),
  targetChapterIds: z.array(z.string().uuid()),
  attemptedAt: z.string().datetime().nullable(),
  title: z.string(),
  marksObtained: z.number(),
  totalMarks: z.number(),
  summary: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const testRecordDataSchema = z.object({
  testRecord: normalizedTestRecordSchema,
})

const deletedTestRecordDataSchema = z.object({
  deletedTestRecord: z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    subjectId: z.string().uuid().nullable(),
    chapterId: z.string().uuid().nullable(),
  }),
})

const createTestRecordSchema = z
  .object({
    workspaceSlug: workspaceSlugSchema,
    examId: z.string().uuid(),
    subjectId: z.string().uuid(),
    chapterId: z.string().uuid().optional().nullable(),
    title: z.string().min(1, "Title is required").max(120),
    marksObtained: decimal82Schema,
    totalMarks: positiveDecimal82Schema,
    summary: z.string().max(4000).optional().nullable(),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
  .refine((data) => data.marksObtained <= data.totalMarks, {
    message: "Marks obtained must not exceed total marks",
    path: ["marksObtained"],
  })

export async function createTestRecordAction(
  input: z.input<typeof createTestRecordSchema>
): Promise<TestRecordCreateResult> {
  const parsed = createTestRecordSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      examId: parsed.examId,
      subjectId: parsed.subjectId,
      chapterId: parsed.chapterId ?? null,
      title: parsed.title,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { testRecord } = testRecordDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return { status: "created", record: testRecord, runId: result.runId }
}

const updateTestRecordSchema = z
  .object({
    workspaceSlug: workspaceSlugSchema,
    id: z.string().uuid(),
    title: z.string().min(1, "Title is required").max(120),
    marksObtained: decimal82Schema,
    totalMarks: positiveDecimal82Schema,
    summary: z.string().max(4000).optional().nullable(),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
  .refine((data) => data.marksObtained <= data.totalMarks, {
    message: "Marks obtained must not exceed total marks",
    path: ["marksObtained"],
  })

export async function updateTestRecordAction(
  input: z.input<typeof updateTestRecordSchema>
): Promise<TestRecordUpdateResult> {
  const parsed = updateTestRecordSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      testRecordId: parsed.id,
      title: parsed.title,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { testRecord } = testRecordDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return { status: "updated", record: testRecord, runId: result.runId }
}

const deleteTestRecordSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  id: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(128).optional(),
})

export async function deleteTestRecordAction(
  workspaceSlug: string,
  id: string,
  idempotencyKey?: string
): Promise<TestRecordDeleteResult> {
  const parsed = deleteTestRecordSchema.parse({
    workspaceSlug,
    id,
    idempotencyKey,
  })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.delete",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      testRecordId: parsed.id,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { deletedTestRecord } = deletedTestRecordDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    status: "deleted",
    deletedRecord: deletedTestRecord,
    runId: result.runId,
  }
}

const scheduledTestPlanSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    scope: z.enum(["subject", "chapter", "multi-chapter"]),
    targetChapterIds: z.array(z.string().uuid()).max(100),
    scheduledFor: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
      .nullable()
      .optional(),
    durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    totalMarks: positiveDecimal82Schema.nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, context) => {
    const uniqueTargets = new Set(data.targetChapterIds)
    if (uniqueTargets.size !== data.targetChapterIds.length) {
      context.addIssue({
        code: "custom",
        message: "Chapter targets must be unique.",
        path: ["targetChapterIds"],
      })
    }
    const validTargetCount =
      (data.scope === "subject" && data.targetChapterIds.length === 0) ||
      (data.scope === "chapter" && data.targetChapterIds.length === 1) ||
      (data.scope === "multi-chapter" && data.targetChapterIds.length >= 2)
    if (!validTargetCount) {
      context.addIssue({
        code: "custom",
        message:
          data.scope === "subject"
            ? "A subject test cannot target chapters."
            : data.scope === "chapter"
              ? "Choose exactly one chapter."
              : "Choose at least two chapters.",
        path: ["targetChapterIds"],
      })
    }
  })

const normalizedScheduledTestSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string(),
  scope: z.enum(["subject", "chapter", "multi-chapter"]),
  status: z.enum(["planned", "scheduled", "completed", "cancelled"]),
  scheduledFor: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  totalMarks: z.number().nullable(),
  notes: z.string().nullable(),
  revision: z.number().int(),
  rescheduleCount: z.number().int(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  cancellationReason: z.string().nullable(),
  targetChapterIds: z.array(z.string().uuid()),
  testRecordId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const scheduledTestDataSchema = z.object({
  scheduledTest: normalizedScheduledTestSchema,
})

const completedScheduledTestDataSchema = scheduledTestDataSchema.extend({
  testRecord: normalizedTestRecordSchema,
})

function parseScheduledTest(value: unknown): ScheduledTest {
  return normalizedScheduledTestSchema.parse(value)
}

export type ScheduledTestPlanInput = z.input<typeof scheduledTestPlanSchema>

const createScheduledTestSchema = scheduledTestPlanSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    examId: z.string().uuid(),
    subjectId: z.string().uuid(),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
)

export async function createScheduledTestAction(
  input: z.input<typeof createScheduledTestSchema>
) {
  const parsed = createScheduledTestSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "scheduled-test.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      examId: parsed.examId,
      subjectId: parsed.subjectId,
      title: parsed.title,
      scope: parsed.scope,
      targetChapterIds: parsed.targetChapterIds,
      scheduledFor: parsed.scheduledFor ?? null,
      durationMinutes: parsed.durationMinutes ?? null,
      totalMarks: parsed.totalMarks ?? null,
      notes: parsed.notes ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { scheduledTest } = scheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    scheduledTest: parseScheduledTest(scheduledTest),
    runId: result.runId,
  }
}

const updateScheduledTestSchema = scheduledTestPlanSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    scheduledTestId: z.string().uuid(),
    expectedRevision: z.number().int().min(1),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
)

export async function updateScheduledTestAction(
  input: z.input<typeof updateScheduledTestSchema>
) {
  const parsed = updateScheduledTestSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "scheduled-test.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      scheduledTestId: parsed.scheduledTestId,
      expectedRevision: parsed.expectedRevision,
      title: parsed.title,
      scope: parsed.scope,
      targetChapterIds: parsed.targetChapterIds,
      scheduledFor: parsed.scheduledFor ?? null,
      durationMinutes: parsed.durationMinutes ?? null,
      totalMarks: parsed.totalMarks ?? null,
      notes: parsed.notes ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { scheduledTest } = scheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    scheduledTest: parseScheduledTest(scheduledTest),
    runId: result.runId,
  }
}

const revisionActionSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  scheduledTestId: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
  idempotencyKey: z.string().min(1).max(128).optional(),
})

async function runScheduledTestRevisionAction(
  actionKey: "scheduled-test.restore" | "scheduled-test.reopen",
  input: z.input<typeof revisionActionSchema>
) {
  const parsed = revisionActionSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey,
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      scheduledTestId: parsed.scheduledTestId,
      expectedRevision: parsed.expectedRevision,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { scheduledTest } = scheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    scheduledTest: parseScheduledTest(scheduledTest),
    runId: result.runId,
  }
}

export async function restoreScheduledTestAction(
  input: z.input<typeof revisionActionSchema>
) {
  return runScheduledTestRevisionAction("scheduled-test.restore", input)
}

export async function reopenScheduledTestAction(
  input: z.input<typeof revisionActionSchema>
) {
  return runScheduledTestRevisionAction("scheduled-test.reopen", input)
}

const cancelScheduledTestSchema = revisionActionSchema.extend({
  reason: z.string().trim().max(500).nullable().optional(),
})

export async function cancelScheduledTestAction(
  input: z.input<typeof cancelScheduledTestSchema>
) {
  const parsed = cancelScheduledTestSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "scheduled-test.cancel",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      scheduledTestId: parsed.scheduledTestId,
      expectedRevision: parsed.expectedRevision,
      reason: parsed.reason ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { scheduledTest } = scheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    scheduledTest: parseScheduledTest(scheduledTest),
    runId: result.runId,
  }
}

const completeScheduledTestSchema = revisionActionSchema
  .extend({
    marksObtained: decimal82Schema,
    totalMarks: positiveDecimal82Schema,
    summary: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => data.marksObtained <= data.totalMarks, {
    message: "Marks obtained must not exceed total marks",
    path: ["marksObtained"],
  })

export async function completeScheduledTestAction(
  input: z.input<typeof completeScheduledTestSchema>
) {
  const parsed = completeScheduledTestSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "scheduled-test.complete",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      scheduledTestId: parsed.scheduledTestId,
      expectedRevision: parsed.expectedRevision,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const data = completedScheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    scheduledTest: parseScheduledTest(data.scheduledTest),
    record: data.testRecord,
    runId: result.runId,
  }
}

const deletedScheduledTestDataSchema = z.object({
  deletedScheduledTest: z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    subjectId: z.string().uuid(),
  }),
})

export async function deleteScheduledTestAction(
  input: z.input<typeof revisionActionSchema>
) {
  const parsed = revisionActionSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "scheduled-test.delete",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      scheduledTestId: parsed.scheduledTestId,
      expectedRevision: parsed.expectedRevision,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const data = deletedScheduledTestDataSchema.parse(result.data)
  revalidateExamPrep(parsed.workspaceSlug)
  return {
    deletedScheduledTest: data.deletedScheduledTest,
    runId: result.runId,
  }
}

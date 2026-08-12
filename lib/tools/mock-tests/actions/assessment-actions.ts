"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { getMockTestsWriteContext } from "@/lib/tools/definitions/mock-tests/action-context"
import {
  decimal82Schema,
  idempotencyKeySchema,
  workspaceSlugSchema,
} from "./common"

function revalidateMockTests(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.mockTests.home(workspaceSlug), "layout")
}

const assessmentMetadataSchema = z.object({
  title: z.string().trim().min(1, "A test title is required").max(200),
  instructions: z.string().trim().max(20000).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  totalMarks: decimal82Schema.nullable().optional(),
  examBlockId: z.string().uuid().nullable().optional(),
  blueprint: z.record(z.string(), z.unknown()).nullable().optional(),
})

const assessmentResultSchema = z.object({
  assessment: z.object({
    id: z.string(),
    title: z.string(),
    revision: z.number().int().optional(),
    status: z.string().optional(),
    questionCount: z.number().int().optional(),
  }),
})

const createAssessmentSchema = assessmentMetadataSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    idempotencyKey: idempotencyKeySchema,
  })
)

export type CreateAssessmentInput = z.input<typeof createAssessmentSchema>

export async function createAssessmentAction(
  input: CreateAssessmentInput
): Promise<{ assessmentId: string; runId: string }> {
  const parsed = createAssessmentSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      title: parsed.title,
      instructions: parsed.instructions ?? null,
      durationMinutes: parsed.durationMinutes ?? null,
      totalMarks: parsed.totalMarks ?? null,
      examBlockId: parsed.examBlockId ?? null,
      blueprint: parsed.blueprint ?? {},
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { assessmentId: assessment.id, runId: result.runId }
}

const updateAssessmentSchema = assessmentMetadataSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    assessmentId: z.string().uuid(),
    expectedRevision: z.number().int().min(1),
    idempotencyKey: idempotencyKeySchema,
  })
)

export type UpdateAssessmentInput = z.input<typeof updateAssessmentSchema>

export async function updateAssessmentAction(
  input: UpdateAssessmentInput
): Promise<{ assessmentId: string; revision: number; runId: string }> {
  const parsed = updateAssessmentSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
      title: parsed.title,
      instructions: parsed.instructions ?? null,
      durationMinutes: parsed.durationMinutes ?? null,
      totalMarks: parsed.totalMarks ?? null,
      examBlockId: parsed.examBlockId ?? null,
      blueprint: parsed.blueprint ?? {},
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    revision: assessment.revision ?? parsed.expectedRevision,
    runId: result.runId,
  }
}

const assessmentEntrySchema = z.object({
  questionId: z.string().uuid(),
  section: z.string().trim().max(40).nullable().optional(),
  position: z.number().int().min(0).max(9999),
  marks: decimal82Schema,
  /** Penalty applied for a wrong answer; stored ≤ 0 (0 = no penalty). */
  negativeMarks: z
    .number()
    .min(-999999.99)
    .max(0)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "Use at most two decimal places"
    ),
})

const saveQuestionsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
  questions: z.array(assessmentEntrySchema).max(200),
  idempotencyKey: idempotencyKeySchema,
})

export type SaveQuestionsInput = z.input<typeof saveQuestionsSchema>

export async function saveQuestionsAction(
  input: SaveQuestionsInput
): Promise<{ assessmentId: string; revision: number; runId: string }> {
  const parsed = saveQuestionsSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.add-questions",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
      questions: parsed.questions.map((entry) => ({
        questionId: entry.questionId,
        section: entry.section ?? null,
        position: entry.position,
        marks: entry.marks,
        negativeMarks: entry.negativeMarks,
      })),
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    revision: assessment.revision ?? parsed.expectedRevision,
    runId: result.runId,
  }
}

const revisionActionSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
})

export async function removeQuestionAction(
  input: z.input<typeof revisionActionSchema> & { questionId: string }
): Promise<{ assessmentId: string; revision: number; runId: string }> {
  const parsed = revisionActionSchema.extend({
    questionId: z.string().uuid(),
  }).parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.remove-question",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
      questionId: parsed.questionId,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    revision: assessment.revision ?? parsed.expectedRevision,
    runId: result.runId,
  }
}

export async function reorderQuestionsAction(
  input: z.input<typeof revisionActionSchema> & { questionIds: string[] }
): Promise<{ assessmentId: string; revision: number; runId: string }> {
  const parsed = revisionActionSchema
    .extend({ questionIds: z.array(z.string().uuid()) })
    .parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.reorder-questions",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
      questionIds: parsed.questionIds,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    revision: assessment.revision ?? parsed.expectedRevision,
    runId: result.runId,
  }
}

export type PublishResult = {
  assessmentId: string
  status: string
  questionCount: number
  revision: number
  runId: string
}

export async function publishAssessmentAction(
  input: z.input<typeof revisionActionSchema>
): Promise<PublishResult> {
  const parsed = revisionActionSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.publish",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    status: assessment.status ?? "published",
    questionCount: assessment.questionCount ?? 0,
    revision: assessment.revision ?? parsed.expectedRevision,
    runId: result.runId,
  }
}

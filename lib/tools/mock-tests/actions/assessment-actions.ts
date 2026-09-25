"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { prisma } from "@/lib/prisma"
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

const assessmentSectionSchema = z.object({
  key: z.string().trim().min(1, "Section key is required"),
  title: z.string().trim().min(1, "Section title is required"),
  description: z.string().trim().nullable().optional(),
})

const assessmentTaxonomySchema = z.object({
  paperType: z.enum(["full_length", "multi_subject", "subject_wise", "topic_wise", "pyq"]).optional(),
  subjectScope: z.enum(["single_subject", "multi_subject"]).optional(),
  subjects: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  examTag: z.string().trim().max(60).nullable().optional(),
})

export type AssessmentTaxonomyInput = z.input<typeof assessmentTaxonomySchema>

const assessmentBlueprintSchema = z
  .object({
    sections: z.array(assessmentSectionSchema).optional(),
    calculatorAllowed: z.boolean().optional(),
    taxonomy: assessmentTaxonomySchema.optional(),
    visibility: z.enum(["private", "unlisted", "public"]).optional(),
    allowCloning: z.boolean().optional(),
  })
  .passthrough()

export type AssessmentSectionInput = z.input<typeof assessmentSectionSchema>
export type AssessmentBlueprintInput = z.input<typeof assessmentBlueprintSchema>

const assessmentMetadataSchema = z.object({
  title: z.string().trim().min(1, "A test title is required").max(200),
  instructions: z.string().trim().max(20000).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  totalMarks: decimal82Schema.nullable().optional(),
  examBlockId: z.string().uuid().nullable().optional(),
  blueprint: assessmentBlueprintSchema.nullable().optional(),
  passingBenchmark: z.coerce.number().min(1).max(100).nullable().optional(),
  distinctionBenchmark: z.coerce.number().min(1).max(100).nullable().optional(),
})

const assessmentResultSchema = z.object({
  assessment: z.object({
    id: z.string(),
    title: z.string().optional(),
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
      passingBenchmark: parsed.passingBenchmark ?? null,
      distinctionBenchmark: parsed.distinctionBenchmark ?? null,
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
      passingBenchmark: parsed.passingBenchmark ?? null,
      distinctionBenchmark: parsed.distinctionBenchmark ?? null,
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
  const block = await prisma.block.findFirst({
    where: { id: parsed.assessmentId, workspaceId: context.workspaceId },
    select: { revision: true },
  })
  const currentRevision = block ? Number(block.revision) : parsed.expectedRevision

  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.publish",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: currentRevision,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    status: assessment.status ?? "published",
    questionCount: assessment.questionCount ?? 0,
    revision: assessment.revision ?? currentRevision,
    runId: result.runId,
  }
}

const cloneAssessmentSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  sourceAssessmentId: z.string().uuid(),
  targetTitle: z.string().trim().min(1).max(120).nullable().optional(),
  idempotencyKey: idempotencyKeySchema,
})

export type CloneAssessmentInput = z.input<typeof cloneAssessmentSchema>

export async function cloneAssessmentAction(
  input: CloneAssessmentInput
): Promise<{ assessmentId: string; runId: string }> {
  const parsed = cloneAssessmentSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.clone",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      sourceAssessmentId: parsed.sourceAssessmentId,
      targetTitle: parsed.targetTitle ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { assessmentId: assessment.id, runId: result.runId }
}

const updateAssessmentSharingSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(1).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
  allowCloning: z.boolean().optional(),
  taxonomy: assessmentTaxonomySchema.optional(),
  calculatorAllowed: z.boolean().optional(),
  idempotencyKey: idempotencyKeySchema,
})

export type UpdateAssessmentSharingInput = z.input<
  typeof updateAssessmentSharingSchema
>

export async function updateAssessmentSharingAction(
  input: UpdateAssessmentSharingInput
): Promise<{ assessmentId: string; revision: number; runId: string }> {
  const parsed = updateAssessmentSharingSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)

  const current = await prisma.assessment.findFirst({
    where: {
      blockId: parsed.assessmentId,
      workspaceId: context.workspaceId,
    },
    include: {
      block: { select: { title: true, properties: true, revision: true } },
    },
  })

  if (!current) {
    throw new Error("Assessment not found in workspace.")
  }

  const currentBlueprint =
    current.blueprint &&
    typeof current.blueprint === "object" &&
    !Array.isArray(current.blueprint)
      ? (current.blueprint as Record<string, unknown>)
      : {}

  const updatedBlueprint = {
    ...currentBlueprint,
    visibility: parsed.visibility,
    allowCloning:
      parsed.allowCloning ?? (currentBlueprint.allowCloning !== false),
    ...(parsed.taxonomy !== undefined ? { taxonomy: parsed.taxonomy } : {}),
    ...(parsed.calculatorAllowed !== undefined
      ? { calculatorAllowed: parsed.calculatorAllowed }
      : {}),
  }

  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision:
        parsed.expectedRevision ?? Number(current.block.revision) ?? 1,
      title: current.block.title,
      instructions: current.instructions,
      durationMinutes: current.durationMinutes,
      totalMarks: current.totalMarks ? Number(current.totalMarks) : null,
      examBlockId: current.examBlockId,
      blueprint: updatedBlueprint,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })

  const { assessment } = assessmentResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    assessmentId: assessment.id,
    revision:
      assessment.revision ??
      parsed.expectedRevision ??
      Number(current.block.revision) ??
      1,
    runId: result.runId,
  }
}


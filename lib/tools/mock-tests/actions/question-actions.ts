"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import {
  getMockTestsActionContext,
  getMockTestsWriteContext,
} from "@/lib/tools/definitions/mock-tests/action-context"
import { idempotencyKeySchema, workspaceSlugSchema } from "./common"

function revalidateMockTests(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.mockTests.home(workspaceSlug), "layout")
  revalidatePath(workspaceRoutes.mockTests.questions(workspaceSlug), "layout")
}

const questionPayloadSchema = z.object({
  stem: z.string().trim().min(1, "Question stem is required").max(50000),
  kind: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "NUMERIC",
    "SHORT_ANSWER",
  ]),
  difficulty: z.number().int().min(1).max(5).nullable().optional(),
  options: z
    .array(
      z.object({
        key: z.string().min(1).max(2),
        content: z.string().trim().min(1).max(10000),
        position: z.number().int().min(0).max(25),
      })
    )
    .max(26)
    .optional(),
  answerKeys: z.array(z.string().min(1).max(2)).max(26).optional(),
  numericAnswer: z.number().nullable().optional(),
  textAnswer: z.string().trim().max(20000).nullable().optional(),
  explanation: z.string().trim().max(40000).nullable().optional(),
  targets: z
    .array(
      z.object({
        blockId: z.string().uuid(),
        weight: z.number().min(0).max(100).optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .max(50)
    .optional(),
})

const questionResultSchema = z.object({
  question: z.object({
    id: z.string(),
    kind: z.string(),
    stem: z.string(),
  }),
})

const createQuestionSchema = questionPayloadSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    idempotencyKey: idempotencyKeySchema,
  })
)

export type CreateQuestionInput = z.input<typeof createQuestionSchema>

export async function createQuestionAction(
  input: CreateQuestionInput
): Promise<{ questionId: string; runId: string }> {
  const parsed = createQuestionSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "question.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      stem: parsed.stem,
      kind: parsed.kind,
      difficulty: parsed.difficulty ?? null,
      options: parsed.options ?? [],
      answerKeys: parsed.answerKeys ?? [],
      numericAnswer: parsed.numericAnswer ?? null,
      textAnswer: parsed.textAnswer ?? null,
      explanation: parsed.explanation ?? null,
      targets: (parsed.targets ?? []).map((target) => ({
        blockId: target.blockId,
        weight: target.weight ?? 100,
        isPrimary: target.isPrimary ?? false,
      })),
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { question } = questionResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { questionId: question.id, runId: result.runId }
}

const updateQuestionSchema = questionPayloadSchema.and(
  z.object({
    workspaceSlug: workspaceSlugSchema,
    questionId: z.string().uuid(),
    idempotencyKey: idempotencyKeySchema,
  })
)

export async function updateQuestionAction(
  input: z.input<typeof updateQuestionSchema>
): Promise<{ questionId: string; runId: string }> {
  const parsed = updateQuestionSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "question.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      questionId: parsed.questionId,
      stem: parsed.stem,
      kind: parsed.kind,
      difficulty: parsed.difficulty ?? null,
      options: parsed.options ?? [],
      answerKeys: parsed.answerKeys ?? [],
      numericAnswer: parsed.numericAnswer ?? null,
      textAnswer: parsed.textAnswer ?? null,
      explanation: parsed.explanation ?? null,
      targets: (parsed.targets ?? []).map((target) => ({
        blockId: target.blockId,
        weight: target.weight ?? 100,
        isPrimary: target.isPrimary ?? false,
      })),
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { question } = questionResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { questionId: question.id, runId: result.runId }
}

const deleteQuestionSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  questionId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
})

export async function deleteQuestionAction(
  workspaceSlug: string,
  questionId: string,
  idempotencyKey?: string
): Promise<{ questionId: string; runId: string }> {
  const parsed = deleteQuestionSchema.parse({
    workspaceSlug,
    questionId,
    idempotencyKey,
  })
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "question.delete",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { questionId: parsed.questionId },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { question } = z
    .object({ question: z.object({ id: z.string(), deleted: z.boolean() }) })
    .parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { questionId: question.id, runId: result.runId }
}

// ---------------------------------------------------------------------------
// Agent-friendly reads (VIEWER can read)
// ---------------------------------------------------------------------------

const publicQuestionSchema = z.object({
  questionId: z.string(),
  kind: z.string(),
  stem: z.string(),
  difficulty: z.number().nullable(),
  section: z.string().nullable(),
  position: z.number(),
  marks: z.number().nullable(),
  negativeMarks: z.number().nullable(),
  options: z.array(
    z.object({ key: z.string(), content: z.string() })
  ),
})

const getQuestionsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.string().uuid(),
})

export type GetQuestionsResult = {
  assessmentId: string
  title: string
  questions: z.infer<typeof publicQuestionSchema>[]
  runId: string
}

export async function getQuestionsAction(
  input: z.input<typeof getQuestionsSchema>
): Promise<GetQuestionsResult> {
  const parsed = getQuestionsSchema.parse(input)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.get-questions",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { assessmentId: parsed.assessmentId },
    idempotencyKey: createIdempotencyKey(),
  })
  const data = z
    .object({
      assessmentId: z.string(),
      title: z.string(),
      questions: z.array(publicQuestionSchema),
    })
    .parse(result.data)
  return { ...data, runId: result.runId }
}

const weakTopicSchema = z.object({
  blockId: z.string(),
  proficiency: z.number(),
  confidence: z.number(),
  evidenceCount: z.number(),
})

const getWeakTopicsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  limit: z.number().int().min(1).max(50).nullable().optional(),
})

export type GetWeakTopicsResult = {
  weakTopics: z.infer<typeof weakTopicSchema>[]
  runId: string
}

export async function getWeakTopicsAction(
  input: z.input<typeof getWeakTopicsSchema>
): Promise<GetWeakTopicsResult> {
  const parsed = getWeakTopicsSchema.parse(input)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.get-weak-topics",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { limit: parsed.limit ?? 20 },
    idempotencyKey: createIdempotencyKey(),
  })
  const data = z
    .object({ weakTopics: z.array(weakTopicSchema) })
    .parse(result.data)
  return { weakTopics: data.weakTopics, runId: result.runId }
}

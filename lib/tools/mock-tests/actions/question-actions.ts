"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { prisma } from "@/lib/prisma"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import {
  allocationDefaults,
  type AssessmentQuestionAuthoring,
} from "../question-authoring"
import {
  getMockTestsActionContext,
  getMockTestsWriteContext,
} from "@/lib/tools/definitions/mock-tests/action-context"
import {
  decimal82Schema,
  idempotencyKeySchema,
  workspaceSlugSchema,
} from "./common"

function revalidateMockTests(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.home(workspaceSlug))
  revalidatePath(workspaceRoutes.examPrep.home(workspaceSlug), "layout")
  revalidatePath(workspaceRoutes.mockTests.home(workspaceSlug))
  revalidatePath(workspaceRoutes.mockTests.questions(workspaceSlug))
}

const questionPayloadSchema = z.object({
  stem: z.string().trim().min(1, "Question stem is required").max(50000),
  kind: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERIC"]),
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

const destinationSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(1),
  section: z.string().trim().min(1).max(40).nullable(),
  marks: decimal82Schema,
  negativeMarks: z
    .number()
    .min(-999999.99)
    .max(0)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "Use at most two decimal places"
    ),
})

export async function createAssessmentQuestionAction(
  input: CreateQuestionInput & z.input<typeof destinationSchema>
) {
  try {
    const parsed = questionPayloadSchema
      .extend({
        workspaceSlug: workspaceSlugSchema,
        idempotencyKey: z.string().min(1).max(128),
        ...destinationSchema.shape,
      })
      .parse(input)
    const context = await getMockTestsWriteContext(parsed.workspaceSlug)
    const { workspaceSlug, idempotencyKey, ...payload } = parsed
    const result = await executeToolAction({
      toolKey: "core.mock-tests",
      actionKey: "assessment.create-question",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        ...payload,
        targets: (payload.targets ?? []).map((target) => ({
          ...target,
          weight: target.weight ?? 100,
          isPrimary: target.isPrimary ?? false,
        })),
      },
      idempotencyKey,
    })
    const data = z
      .object({
        question: z.object({ id: z.string().uuid() }),
        assessment: z.object({
          id: z.string().uuid(),
          revision: z.number(),
          questionCount: z.number(),
          totalMarks: z.number(),
        }),
      })
      .parse(result.data)
    revalidateMockTests(workspaceSlug)
    revalidatePath(
      workspaceRoutes.mockTests.edit(workspaceSlug, parsed.assessmentId)
    )
    revalidatePath(
      workspaceRoutes.mockTests.detail(workspaceSlug, parsed.assessmentId)
    )
    return {
      ok: true as const,
      questionId: data.question.id,
      ...data.assessment,
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError)
      return { ok: false as const, code: error.code, message: error.message }
    throw error
  }
}

/** Lean, authorized context: no question text, answer keys or syllabus preload. */
export async function getAssessmentQuestionAuthoringContext(
  workspaceSlug: string,
  assessmentId: string,
  section: string | null = null
): Promise<AssessmentQuestionAuthoring> {
  const parsed = z
    .object({
      workspaceSlug: workspaceSlugSchema,
      assessmentId: z.string().uuid(),
      section: z.string().max(40).nullable(),
    })
    .parse({ workspaceSlug, assessmentId, section })
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const block = await prisma.block.findFirst({
    where: {
      id: parsed.assessmentId,
      workspaceId: context.workspaceId,
      originToolInstallationId: context.installationId,
      status: "ACTIVE",
      archivedAt: null,
      blockType: { key: "mock-tests.assessment" },
    },
    select: {
      id: true,
      title: true,
      revision: true,
      assessmentDetails: {
        select: {
          workspaceId: true,
          status: true,
          blueprint: true,
          _count: { select: { attempts: true } },
          questions: {
            orderBy: { position: "asc" },
            take: 200,
            select: {
              marks: true,
              negativeMarks: true,
              question: { select: { kind: true } },
            },
          },
        },
      },
    },
  })
  const assessment = block?.assessmentDetails
  if (
    !block ||
    !assessment ||
    assessment.workspaceId !== context.workspaceId ||
    assessment.status === "ARCHIVED"
  )
    throw new Error("This assessment is no longer available.")
  if (assessment._count.attempts)
    throw new Error(
      "This assessment has attempts. Create a new version before adding questions."
    )
  const blueprint = z
    .object({
      sections: z
        .array(z.object({ key: z.string(), title: z.string() }))
        .max(20)
        .optional(),
    })
    .safeParse(assessment.blueprint)
  const sections = blueprint.success ? (blueprint.data.sections ?? []) : []
  if (parsed.section && !sections.some((entry) => entry.key === parsed.section))
    throw new Error(
      "The selected section is no longer available. Return to the builder to refresh."
    )
  const rows = assessment.questions.map((row) => ({
    kind: row.question.kind,
    marks: Number(row.marks ?? 1),
    negativeMarks: Number(row.negativeMarks ?? 0),
  }))
  return {
    id: block.id,
    title: block.title ?? "Assessment",
    revision: Number(block.revision),
    sections,
    section: parsed.section,
    questionCount: rows.length,
    totalMarks: Number(
      rows.reduce((sum, row) => sum + row.marks, 0).toFixed(2)
    ),
    defaults: allocationDefaults(rows),
  }
}

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

/** Form adapter keeps expected domain failures editable without changing agent APIs. */
export async function saveBankQuestionFormAction(
  input: CreateQuestionInput & { questionId?: string }
) {
  try {
    const result = input.questionId
      ? await updateQuestionAction({ ...input, questionId: input.questionId })
      : await createQuestionAction(input)
    return { ok: true as const, ...result }
  } catch (error) {
    if (error instanceof ToolActionExecutionError)
      return { ok: false as const, code: error.code, message: error.message }
    throw error
  }
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
  options: z.array(z.object({ key: z.string(), content: z.string() })),
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

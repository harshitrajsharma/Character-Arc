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
}

const attemptSummarySchema = z.object({
  attempt: z.object({
    id: z.string(),
    assessmentId: z.string(),
    status: z.string(),
  }),
})

const createAttemptSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  assessmentId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
})

export type CreateAttemptResult = {
  attemptId: string
  assessmentId: string
  runId: string
}

export async function createAttemptAction(
  input: z.input<typeof createAttemptSchema>
): Promise<CreateAttemptResult> {
  const parsed = createAttemptSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "attempt.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { assessmentId: parsed.assessmentId },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { attempt } = attemptSummarySchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    attemptId: attempt.id,
    assessmentId: attempt.assessmentId,
    runId: result.runId,
  }
}

const recordAnswerSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptionKeys: z
    .array(z.string().min(1).max(2))
    .max(26)
    .optional(),
  answerText: z.string().trim().max(8000).nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  idempotencyKey: idempotencyKeySchema,
})

export type RecordAnswerResult = {
  attemptId: string
  questionId: string
  runId: string
}

export async function recordAnswerAction(
  input: z.input<typeof recordAnswerSchema>
): Promise<RecordAnswerResult> {
  const parsed = recordAnswerSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "attempt.record-answer",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      attemptId: parsed.attemptId,
      questionId: parsed.questionId,
      selectedOptionKeys: parsed.selectedOptionKeys ?? [],
      answerText: parsed.answerText ?? null,
      timeSpentSeconds: parsed.timeSpentSeconds ?? null,
    },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { response } = z
    .object({
      response: z.object({
        attemptId: z.string(),
        questionId: z.string(),
        saved: z.boolean(),
      }),
    })
    .parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { attemptId: response.attemptId, questionId: response.questionId, runId: result.runId }
}

const submitResultSchema = z.object({
  attempt: z.object({
    id: z.string(),
    assessmentId: z.string(),
    status: z.string(),
    score: z.number(),
    maxScore: z.number(),
    correctCount: z.number().int(),
    incorrectCount: z.number().int(),
    unansweredCount: z.number().int(),
    percentage: z.number(),
    evidenceCount: z.number().int(),
  }),
})

const attemptIdActionSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  attemptId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
})

export type SubmitAttemptResult = {
  attemptId: string
  assessmentId: string
  score: number
  maxScore: number
  percentage: number
  runId: string
}

export async function submitAttemptAction(
  input: z.input<typeof attemptIdActionSchema>
): Promise<SubmitAttemptResult> {
  const parsed = attemptIdActionSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "attempt.submit",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { attemptId: parsed.attemptId },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { attempt } = submitResultSchema.parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return {
    attemptId: attempt.id,
    assessmentId: attempt.assessmentId,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    runId: result.runId,
  }
}

export async function abandonAttemptAction(
  input: z.input<typeof attemptIdActionSchema>
): Promise<{ attemptId: string; runId: string }> {
  const parsed = attemptIdActionSchema.parse(input)
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "attempt.abandon",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { attemptId: parsed.attemptId },
    idempotencyKey: parsed.idempotencyKey ?? createIdempotencyKey(),
  })
  const { attempt } = z
    .object({ attempt: z.object({ id: z.string(), status: z.string() }) })
    .parse(result.data)
  revalidateMockTests(parsed.workspaceSlug)
  return { attemptId: attempt.id, runId: result.runId }
}

// ---------------------------------------------------------------------------
// Analysis read (VIEWER can read)
// ---------------------------------------------------------------------------

const analysisRowSchema = z.object({
  questionId: z.string(),
  position: z.number().int(),
  section: z.string().nullable(),
  kind: z.string(),
  stem: z.string(),
  difficulty: z.number().int().nullable(),
  marks: z.number(),
  negativeMarks: z.number(),
  options: z.array(z.object({ key: z.string(), content: z.string() })),
  selectedKeys: z.array(z.string()),
  answerText: z.string().nullable(),
  timeSpentSeconds: z.number().int().nullable(),
  isCorrect: z.boolean().nullable(),
  awardedMarks: z.number(),
  correctKeys: z.array(z.string()),
  explanation: z.string().nullable(),
})

const weakTopicSchema = z.object({
  blockId: z.string(),
  proficiency: z.number(),
  confidence: z.number(),
  evidenceCount: z.number(),
})

const analysisResultSchema = z.object({
  analysis: z.object({
    attemptId: z.string(),
    assessmentId: z.string(),
    assessmentTitle: z.string(),
    status: z.string(),
    startedAt: z.string().nullable(),
    submittedAt: z.string().nullable(),
    durationMinutes: z.number().int().nullable(),
    questions: z.array(analysisRowSchema),
    weakTopics: z.array(weakTopicSchema),
  }),
})

export type AnalysisResult = {
  analysis: z.infer<typeof analysisResultSchema>["analysis"]
  runId: string
}

const getAnalysisSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  attemptId: z.string().uuid(),
})

export async function getAnalysisAction(
  input: z.input<typeof getAnalysisSchema>
): Promise<AnalysisResult> {
  const parsed = getAnalysisSchema.parse(input)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "attempt.get-analysis",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: { attemptId: parsed.attemptId },
    idempotencyKey: createIdempotencyKey(),
  })
  const { analysis } = analysisResultSchema.parse(result.data)
  return { analysis, runId: result.runId }
}

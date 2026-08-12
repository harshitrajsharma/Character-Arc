"use server"

import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  ExamPrepActionContextError,
  getExamPrepActionContext,
} from "@/lib/tools/definitions/exam-prep/action-context"

import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

export type TopicProgressActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const createChapterSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1, "Chapter title is required").max(120),
  summary: z.string().trim().max(4000).optional(),
  important: z.boolean().default(false),
})

export type CreateChapterState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof createChapterSchema>, string[]>
  >
  chapterId?: string
}

const createTopicSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1, "Topic title is required").max(120),
  important: z.boolean().default(false),
})

export type CreateTopicState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof createTopicSchema>, string[]>
  >
  topicId?: string
}

const topicMutationContextSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  topicId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
})

function revalidateExamPrep(
  workspaceSlug: string,
  examId?: string,
  subjectId?: string
) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.examPrep.home(workspaceSlug), "layout")
  if (examId) {
    revalidatePath(
      workspaceRoutes.examPrep.exam(workspaceSlug, examId),
      "layout"
    )
    if (subjectId) {
      revalidatePath(
        workspaceRoutes.examPrep.subject(workspaceSlug, examId, subjectId)
      )
    }
  }
}

const reorderChaptersSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  subjectId: z.string().uuid(),
  chapterIds: z.array(z.string().uuid()).max(500),
})

const reorderTopicsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  chapterId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).max(1000),
})

const syllabusItemUpdateSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  kind: z.enum(["chapter", "topic"]),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  important: z.boolean(),
})

const syllabusItemDeleteSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  kind: z.enum(["chapter", "topic"]),
  id: z.string().uuid(),
})

async function executeExamPrepMutation(
  workspaceSlug: string,
  actionKey: string,
  input: Record<string, unknown>
) {
  const context = await getExamPrepActionContext(workspaceSlug)
  return executeToolAction({
    toolKey: "core.exam-prep",
    actionKey,
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input,
    idempotencyKey: createIdempotencyKey(),
  })
}

export async function createChapterAction(
  _previousState: CreateChapterState,
  formData: FormData
): Promise<CreateChapterState> {
  const parsed = createChapterSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    important: formData.get("important") === "on",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const result = await executeExamPrepMutation(
      parsed.data.workspaceSlug,
      "chapter.create",
      {
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        important: parsed.data.important,
        ...(parsed.data.summary ? { summary: parsed.data.summary } : {}),
      }
    )
    revalidateExamPrep(
      parsed.data.workspaceSlug,
      parsed.data.examId,
      parsed.data.subjectId
    )
    return {
      status: "success",
      message: "Chapter created.",
      chapterId: result.rootBlockId ?? undefined,
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Failed to create chapter. Please try again.",
    }
  }
}

export async function createTopicAction(
  _previousState: CreateTopicState,
  formData: FormData
): Promise<CreateTopicState> {
  const parsed = createTopicSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    chapterId: formData.get("chapterId"),
    title: formData.get("title"),
    important: formData.get("important") === "on",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const result = await executeExamPrepMutation(
      parsed.data.workspaceSlug,
      "topic.create",
      {
        chapterId: parsed.data.chapterId,
        title: parsed.data.title,
        important: parsed.data.important,
      }
    )
    revalidatePath(
      workspaceRoutes.examPrep.exam(
        parsed.data.workspaceSlug,
        parsed.data.examId
      ),
      "layout"
    )
    return {
      status: "success",
      message: "Topic created.",
      topicId: result.rootBlockId ?? undefined,
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Failed to create topic. Please try again.",
    }
  }
}

export async function reorderChaptersAction(
  input: z.input<typeof reorderChaptersSchema>
) {
  const parsed = reorderChaptersSchema.parse(input)
  await executeExamPrepMutation(parsed.workspaceSlug, "chapter.reorder", {
    subjectId: parsed.subjectId,
    chapterIds: parsed.chapterIds,
  })
  revalidateExamPrep(parsed.workspaceSlug)
}

export async function reorderTopicsAction(
  input: z.input<typeof reorderTopicsSchema>
) {
  const parsed = reorderTopicsSchema.parse(input)
  await executeExamPrepMutation(parsed.workspaceSlug, "topic.reorder", {
    chapterId: parsed.chapterId,
    topicIds: parsed.topicIds,
  })
  revalidateExamPrep(parsed.workspaceSlug)
}

export async function updateSyllabusItemAction(
  input: z.input<typeof syllabusItemUpdateSchema>
) {
  const parsed = syllabusItemUpdateSchema.parse(input)
  const idKey = parsed.kind === "chapter" ? "chapterId" : "topicId"
  await executeExamPrepMutation(parsed.workspaceSlug, `${parsed.kind}.update`, {
    [idKey]: parsed.id,
    title: parsed.name,
    important: parsed.important,
  })
  revalidateExamPrep(parsed.workspaceSlug)
}

export async function deleteSyllabusItemAction(
  input: z.input<typeof syllabusItemDeleteSchema>
) {
  const parsed = syllabusItemDeleteSchema.parse(input)
  const idKey = parsed.kind === "chapter" ? "chapterId" : "topicId"
  await executeExamPrepMutation(parsed.workspaceSlug, `${parsed.kind}.delete`, {
    [idKey]: parsed.id,
  })
  revalidateExamPrep(parsed.workspaceSlug)
}

const topicStageSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  topicId: z.string().uuid(),
  stage: z.enum(["learning", "revision", "practice", "test"]),
  learned: z.boolean().optional(),
})

export async function updateTopicStageAction(
  input: z.input<typeof topicStageSchema>
) {
  const parsed = topicStageSchema.parse(input)
  const actionKey =
    parsed.stage === "learning"
      ? "topic.set-learning"
      : `topic.record-${parsed.stage}`
  await executeExamPrepMutation(
    parsed.workspaceSlug,
    actionKey,
    parsed.stage === "learning"
      ? { topicId: parsed.topicId, learned: parsed.learned ?? true }
      : { topicId: parsed.topicId }
  )
  revalidateExamPrep(parsed.workspaceSlug)
}

const topicProgressSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  topicId: z.string().uuid(),
  stage: z.enum(["revision", "practice", "test"]),
  count: z.number().int().min(0).max(100),
})

export async function setTopicProgressAction(
  input: z.input<typeof topicProgressSchema>
) {
  const parsed = topicProgressSchema.parse(input)
  await executeExamPrepMutation(parsed.workspaceSlug, "topic.set-progress", {
    topicId: parsed.topicId,
    stage: parsed.stage,
    count: parsed.count,
  })
  revalidateExamPrep(parsed.workspaceSlug)
}

export async function setTopicLearningStatusAction(
  _previousState: TopicProgressActionState,
  formData: FormData
): Promise<TopicProgressActionState> {
  const parsed = topicMutationContextSchema
    .extend({
      learned: z.enum(["true", "false"]),
    })
    .safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      topicId: formData.get("topicId"),
      idempotencyKey: formData.get("idempotencyKey"),
      learned: formData.get("learned"),
    })

  if (!parsed.success) {
    return { status: "error", message: "Invalid action context." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "topic.set-learning",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        topicId: parsed.data.topicId,
        learned: parsed.data.learned === "true",
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidateExamPrep(parsed.data.workspaceSlug)
    return { status: "success", message: "Learning status updated." }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }
    return { status: "error", message: "An unexpected error occurred." }
  }
}

export async function recordTopicRevisionAction(
  _previousState: TopicProgressActionState,
  formData: FormData
): Promise<TopicProgressActionState> {
  const parsed = topicMutationContextSchema
    .extend({ note: z.string().optional() })
    .safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      topicId: formData.get("topicId"),
      idempotencyKey: formData.get("idempotencyKey"),
      note: formData.get("note") ?? undefined,
    })

  if (!parsed.success) {
    return { status: "error", message: "Invalid action context." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "topic.record-revision",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        topicId: parsed.data.topicId,
        note: parsed.data.note,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidateExamPrep(parsed.data.workspaceSlug)
    return { status: "success", message: "Revision recorded." }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }
    return { status: "error", message: "An unexpected error occurred." }
  }
}

export async function recordTopicPracticeAction(
  _previousState: TopicProgressActionState,
  formData: FormData
): Promise<TopicProgressActionState> {
  const parsed = topicMutationContextSchema
    .extend({ note: z.string().optional() })
    .safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      topicId: formData.get("topicId"),
      idempotencyKey: formData.get("idempotencyKey"),
      note: formData.get("note") ?? undefined,
    })

  if (!parsed.success) {
    return { status: "error", message: "Invalid action context." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "topic.record-practice",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        topicId: parsed.data.topicId,
        note: parsed.data.note,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidateExamPrep(parsed.data.workspaceSlug)
    return { status: "success", message: "Practice recorded." }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }
    return { status: "error", message: "An unexpected error occurred." }
  }
}

export async function recordTopicTestAction(
  _previousState: TopicProgressActionState,
  formData: FormData
): Promise<TopicProgressActionState> {
  const parsed = topicMutationContextSchema
    .extend({ note: z.string().optional() })
    .safeParse({
      workspaceSlug: formData.get("workspaceSlug"),
      topicId: formData.get("topicId"),
      idempotencyKey: formData.get("idempotencyKey"),
      note: formData.get("note") ?? undefined,
    })

  if (!parsed.success) {
    return { status: "error", message: "Invalid action context." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "topic.record-test",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        topicId: parsed.data.topicId,
        note: parsed.data.note,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidateExamPrep(parsed.data.workspaceSlug)
    return { status: "success", message: "Test recorded." }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }
    return { status: "error", message: "An unexpected error occurred." }
  }
}

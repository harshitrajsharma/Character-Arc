"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getExamPrepActionContext } from "@/lib/tools/definitions/exam-prep/action-context"
import { getExamDetail } from "@/lib/tools/definitions/exam-prep/repository"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

const examContentFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Exam name is required.")
    .max(120, "Exam name must be 120 characters or fewer."),
  summary: z
    .string()
    .trim()
    .max(4000, "Description must be 4000 characters or fewer."),
  expectedStartDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Expected date must be a valid date (YYYY-MM-DD)."
    ),
  targetMarks: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (val === "") return true
        const num = Number(val)
        return !Number.isNaN(num) && num >= 0
      },
      { message: "Target score must be a valid non-negative number." }
    ),
})

const formSchema = examContentFieldsSchema.extend({
  workspaceSlug: workspaceSlugSchema,
  idempotencyKey: z.string().uuid(),
})

export type CreateExamActionState = {
  status: "idle" | "success" | "error"
  message: string
  rootBlockId?: string
  fieldErrors?: Record<string, string[] | undefined>
  inputs?: {
    title: string
    summary: string
    expectedStartDate: string
    targetMarks: string
  }
}

const deleteExamSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
})

export type DeleteExamActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const updateExamSchema = examContentFieldsSchema.extend({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
})

const optionalDateStringSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Use a valid date (YYYY-MM-DD)."
  )

export type UpdateExamActionState = {
  status: "idle" | "success" | "error"
  message: string
  fieldErrors?: Record<string, string[] | undefined>
  inputs?: {
    title: string
    summary: string
    expectedStartDate: string
    targetMarks: string
  }
}

const updateExamDateSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  expectedStartDate: optionalDateStringSchema.refine(
    (value) => value !== "",
    "Choose an actual exam date."
  ),
})

export type UpdateExamDateActionState = {
  status: "idle" | "success" | "error"
  message: string
  fieldErrors?: Record<string, string[] | undefined>
}

const examSettingsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Exam name is required.")
    .max(120, "Exam name must be 120 characters or fewer."),
  summary: z
    .string()
    .trim()
    .max(4000, "Description must be 4000 characters or fewer."),
  examCode: z.string().max(80).optional().nullable(),
  conductingBody: z.string().max(120).optional().nullable(),
  targetMarks: z.number().min(0).optional().nullable(),
  targetRank: z.number().int().min(1).optional().nullable(),
  scheduleStatus: z.enum([
    "EXPECTED",
    "ANNOUNCED",
    "CONFIRMED",
    "POSTPONED",
    "CANCELLED",
  ]),
  expectedStartDate: optionalDateStringSchema,
  expectedEndDate: optionalDateStringSchema,
  patternVersion: z.number().int().min(1),
  durationMinutes: z.number().int().min(1).optional().nullable(),
  totalMarks: z.number().min(1).optional().nullable(),
  officialUrl: z
    .string()
    .max(512)
    .url()
    .optional()
    .nullable()
    .or(z.literal("")),
  correctMarks: z.number().finite().optional().nullable(),
  incorrectMarks: z
    .number()
    .finite()
    .max(0, "Incorrect-answer marks must be zero or negative.")
    .optional()
    .nullable(),
  unansweredMarks: z.number().finite().optional().nullable(),
  allowAgentAccess: z.boolean(),
  visibility: z.enum(["PRIVATE", "WORKSPACE", "PUBLIC"]),
})

export type UpdateExamSettingsState = {
  status: "idle" | "success" | "error"
  message: string
  fieldErrors?: Record<string, string[] | undefined>
}

export async function createExamAction(
  _previousState: CreateExamActionState,
  formData: FormData
): Promise<CreateExamActionState> {
  const inputs = {
    title: formData.get("title")?.toString() || "",
    summary: formData.get("summary")?.toString() || "",
    expectedStartDate: formData.get("expectedStartDate")?.toString() || "",
    targetMarks: formData.get("targetMarks")?.toString() || "",
  }

  const parsed = formSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    idempotencyKey: formData.get("idempotencyKey"),
    title: inputs.title,
    summary: inputs.summary,
    expectedStartDate: inputs.expectedStartDate,
    targetMarks: inputs.targetMarks,
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please provide an exam name and correct any invalid fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      inputs,
    }
  }

  const parsedTargetMarks =
    parsed.data.targetMarks === "" ? null : Number(parsed.data.targetMarks)

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    const result = await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "exam.create",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        expectedStartDate: parsed.data.expectedStartDate || null,
        targetMarks: parsedTargetMarks,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidatePath("/dashboard")
    revalidatePath(
      workspaceRoutes.examPrep.home(parsed.data.workspaceSlug),
      "layout"
    )

    return {
      status: "success",
      message: "Your exam has been created successfully.",
      rootBlockId: result.rootBlockId,
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message, inputs }
    }
    return {
      status: "error",
      message: "An unexpected error occurred while creating the exam.",
      inputs,
    }
  }
}

export async function deleteExamAction(
  _previousState: DeleteExamActionState,
  formData: FormData
): Promise<DeleteExamActionState> {
  const parsed = deleteExamSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    idempotencyKey: formData.get("idempotencyKey"),
  })

  if (!parsed.success) {
    return { status: "error", message: "This exam cannot be deleted." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "exam.delete",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: { examId: parsed.data.examId },
      idempotencyKey: parsed.data.idempotencyKey,
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ToolActionExecutionError
          ? error.message
          : "The exam could not be deleted. Try again.",
    }
  }

  revalidatePath(workspaceRoutes.examPrep.home(parsed.data.workspaceSlug))
  revalidatePath(
    workspaceRoutes.examPrep.exam(parsed.data.workspaceSlug, parsed.data.examId)
  )
  return { status: "success", message: "Exam permanently deleted." }
}

export async function updateExamAction(
  _previousState: UpdateExamActionState,
  formData: FormData
): Promise<UpdateExamActionState> {
  const inputs = {
    title: formData.get("title")?.toString() || "",
    summary: formData.get("summary")?.toString() || "",
    expectedStartDate: formData.get("expectedStartDate")?.toString() || "",
    targetMarks: formData.get("targetMarks")?.toString() || "",
  }

  const parsed = updateExamSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    idempotencyKey: formData.get("idempotencyKey"),
    title: inputs.title,
    summary: inputs.summary,
    expectedStartDate: inputs.expectedStartDate,
    targetMarks: inputs.targetMarks,
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please provide an exam name and correct any invalid fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      inputs,
    }
  }

  const parsedTargetMarks =
    parsed.data.targetMarks === "" ? null : Number(parsed.data.targetMarks)

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "exam.update",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        examId: parsed.data.examId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        expectedStartDate: parsed.data.expectedStartDate || null,
        targetMarks: parsedTargetMarks,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidatePath("/dashboard")
    revalidatePath(
      workspaceRoutes.examPrep.home(parsed.data.workspaceSlug),
      "layout"
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
      message: "Exam updated successfully.",
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message, inputs }
    }
    return {
      status: "error",
      message: "An unexpected error occurred while updating the exam.",
      inputs,
    }
  }
}

export async function updateExamDateAction(
  _previousState: UpdateExamDateActionState,
  formData: FormData
): Promise<UpdateExamDateActionState> {
  const parsed = updateExamDateSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    idempotencyKey: formData.get("idempotencyKey"),
    expectedStartDate: formData.get("expectedStartDate")?.toString() || "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose a valid actual exam date.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    const { exam } = await getExamDetail(
      context.workspaceId,
      parsed.data.workspaceSlug,
      parsed.data.examId
    )

    if (!exam) {
      return {
        status: "error",
        message: "This exam could not be found.",
      }
    }

    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "exam.update-settings",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        examId: exam.id,
        examCode: exam.examCode,
        conductingBody: exam.conductingBody,
        targetMarks: exam.targetMarks,
        targetRank: exam.targetRank,
        scheduleStatus: "CONFIRMED",
        expectedStartDate: parsed.data.expectedStartDate,
        expectedEndDate: exam.expectedEndDate,
        patternVersion: exam.patternVersion,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        officialUrl: exam.officialUrl,
        scoringRules: exam.scoringRules ?? {},
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidatePath("/dashboard")
    revalidatePath(
      workspaceRoutes.examPrep.home(parsed.data.workspaceSlug),
      "layout"
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
      message: "Actual exam date updated.",
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }

    return {
      status: "error",
      message: "The actual exam date could not be updated. Try again.",
    }
  }
}

export async function updateExamSettingsAction(
  _previousState: UpdateExamSettingsState,
  formData: FormData
): Promise<UpdateExamSettingsState> {
  const rawOfficialUrl = formData.get("officialUrl")?.toString() || null
  const officialUrl = rawOfficialUrl?.trim() === "" ? null : rawOfficialUrl

  const rawData = {
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    idempotencyKey: formData.get("idempotencyKey"),
    title: formData.get("title")?.toString() || "",
    summary: formData.get("summary")?.toString() || "",
    examCode: formData.get("examCode")?.toString() || null,
    conductingBody: formData.get("conductingBody")?.toString() || null,
    targetMarks: formData.get("targetMarks")
      ? Number(formData.get("targetMarks"))
      : null,
    targetRank: formData.get("targetRank")
      ? Number(formData.get("targetRank"))
      : null,
    scheduleStatus: formData.get("scheduleStatus")?.toString(),
    expectedStartDate: formData.get("expectedStartDate")?.toString() || "",
    expectedEndDate: formData.get("expectedEndDate")?.toString() || "",
    patternVersion: formData.get("patternVersion")
      ? Number(formData.get("patternVersion"))
      : 1,
    durationMinutes: formData.get("durationMinutes")
      ? Number(formData.get("durationMinutes"))
      : null,
    totalMarks: formData.get("totalMarks")
      ? Number(formData.get("totalMarks"))
      : null,
    officialUrl,
    correctMarks: formData.get("correctMarks")
      ? Number(formData.get("correctMarks"))
      : null,
    incorrectMarks: formData.get("incorrectMarks")
      ? Number(formData.get("incorrectMarks"))
      : null,
    unansweredMarks: formData.get("unansweredMarks")
      ? Number(formData.get("unansweredMarks"))
      : null,
    allowAgentAccess: formData.get("allowAgentAccess") === "on",
    visibility: formData.get("visibility")?.toString() || "PRIVATE",
  }

  const parsed = examSettingsSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check your settings inputs.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const scoringRules = Object.fromEntries(
    Object.entries({
      correctMarks: parsed.data.correctMarks,
      incorrectMarks: parsed.data.incorrectMarks,
      unansweredMarks: parsed.data.unansweredMarks,
    }).filter(([, value]) => value !== null)
  )

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    await executeToolAction({
      toolKey: "core.exam-prep",
      actionKey: "exam.update-settings",
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      input: {
        examId: parsed.data.examId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        examCode: parsed.data.examCode || null,
        conductingBody: parsed.data.conductingBody || null,
        targetMarks: parsed.data.targetMarks,
        targetRank: parsed.data.targetRank,
        scheduleStatus: parsed.data.scheduleStatus,
        expectedStartDate: parsed.data.expectedStartDate || null,
        expectedEndDate: parsed.data.expectedEndDate || null,
        patternVersion: parsed.data.patternVersion,
        durationMinutes: parsed.data.durationMinutes || null,
        totalMarks: parsed.data.totalMarks || null,
        officialUrl: parsed.data.officialUrl || null,
        scoringRules,
        allowAgentAccess: parsed.data.allowAgentAccess,
        visibility: parsed.data.visibility as "PRIVATE" | "WORKSPACE" | "PUBLIC",
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidatePath("/dashboard")
    revalidatePath(
      workspaceRoutes.examPrep.home(parsed.data.workspaceSlug),
      "layout"
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
      message: "Exam settings updated.",
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }
    return {
      status: "error",
      message: "An unexpected error occurred while updating exam settings.",
    }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  ExamPrepActionContextError,
  getExamPrepActionContext,
} from "@/lib/tools/definitions/exam-prep/action-context"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { subjectProgressPolicyUpdateSchema } from "@/lib/tools/exam-prep/progress/policy"

import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

const createSubjectSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  title: z.string().min(1, "Subject title is required").max(120),
  summary: z.string().max(4000).optional(),
  weightage: z.number().min(0).max(100),
  foundationLevel: z.enum(["Beginner", "Moderate", "Advanced"]),
  expectedMarks: z.number().min(0).optional().nullable(),
})

export type CreateSubjectState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<keyof z.infer<typeof createSubjectSchema>, string[]>>
}

export async function createSubjectAction(
  prevState: CreateSubjectState,
  formData: FormData
): Promise<CreateSubjectState> {
  const rawData = {
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    weightage: Number(formData.get("weightage")),
    foundationLevel: formData.get("foundationLevel"),
    expectedMarks: formData.get("expectedMarks") ? Number(formData.get("expectedMarks")) : null,
  }

  const parsed = createSubjectSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)

    await executeToolAction({
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      toolKey: "core.exam-prep",
      actionKey: "subject.create",
      idempotencyKey: crypto.randomUUID(),
      input: {
        examId: parsed.data.examId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        weightage: parsed.data.weightage,
        foundationLevel: parsed.data.foundationLevel,
        expectedMarks: parsed.data.expectedMarks,
      },
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Failed to create subject. Please try again.",
    }
  }

  revalidatePath(workspaceRoutes.examPrep.exam(parsed.data.workspaceSlug, parsed.data.examId))
  return { status: "success" }
}

const updateSubjectSettingsSchema = z
  .object({
    workspaceSlug: workspaceSlugSchema,
    subjectId: z.string().uuid(),
  })
  .and(subjectProgressPolicyUpdateSchema)

export type UpdateSubjectSettingsState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<keyof z.infer<typeof updateSubjectSettingsSchema>, string[]>>
}

export async function updateSubjectSettingsAction(
  prevState: UpdateSubjectSettingsState,
  formData: FormData
): Promise<UpdateSubjectSettingsState> {
  const rawData = {
    workspaceSlug: formData.get("workspaceSlug"),
    subjectId: formData.get("subjectId"),
    revisionTarget: readRequiredNumber(formData, "revisionTarget"),
    practiceTarget: readRequiredNumber(formData, "practiceTarget"),
    highYieldRevisionTarget: readRequiredNumber(formData, "highYieldRevisionTarget"),
    highYieldPracticeTarget: readRequiredNumber(formData, "highYieldPracticeTarget"),
    chapterTestTarget: readRequiredNumber(formData, "chapterTestTarget"),
    subjectTestTarget: readRequiredNumber(formData, "subjectTestTarget"),
  }

  const parsed = updateSubjectSettingsSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)

    await executeToolAction({
      workspaceId: context.workspaceId,
      installationId: context.installationId,
      toolKey: "core.exam-prep",
      actionKey: "subject.update-settings",
      idempotencyKey: crypto.randomUUID(),
      input: {
        subjectId: parsed.data.subjectId,
        revisionTarget: parsed.data.revisionTarget,
        practiceTarget: parsed.data.practiceTarget,
        highYieldRevisionTarget: parsed.data.highYieldRevisionTarget,
        highYieldPracticeTarget: parsed.data.highYieldPracticeTarget,
        chapterTestTarget: parsed.data.chapterTestTarget,
        subjectTestTarget: parsed.data.subjectTestTarget,
      },
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Failed to update subject settings. Please try again.",
    }
  }

  revalidatePath(workspaceRoutes.examPrep.home(parsed.data.workspaceSlug), "layout")
  revalidatePath(
    workspaceRoutes.examPrep.subjectSettings(parsed.data.workspaceSlug, parsed.data.subjectId)
  )
  return {
    status: "success",
    message: "Subject progress rules updated everywhere this subject is used.",
  }
}

function readRequiredNumber(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== "string" || value.trim() === "") return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

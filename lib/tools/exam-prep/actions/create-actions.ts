"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getExamPrepActionContext } from "@/lib/tools/definitions/exam-prep/action-context"
import {
  executeToolAction,
  ToolActionExecutionError,
} from "@/lib/tools/execute-tool-action"
import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

const examContentFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(4000),
  examDate: z.string().trim(),
  targetMarks: z.string().trim(),
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
    examDate: string
    targetMarks: string
  }
}

export async function createExamAction(
  _previousState: CreateExamActionState,
  formData: FormData
): Promise<CreateExamActionState> {
  const inputs = {
    title: formData.get("title")?.toString() || "",
    summary: formData.get("summary")?.toString() || "",
    examDate: formData.get("examDate")?.toString() || "",
    targetMarks: formData.get("targetMarks")?.toString() || "",
  }

  const parsed = formSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    idempotencyKey: formData.get("idempotencyKey"),
    title: inputs.title,
    summary: inputs.summary,
    examDate: inputs.examDate,
    targetMarks: inputs.targetMarks,
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      inputs,
    }
  }

  // Parse numeric targetMarks
  let parsedTargetMarks: number | null = null
  if (parsed.data.targetMarks) {
    const num = Number(parsed.data.targetMarks)
    if (!Number.isNaN(num) && num >= 0) {
      parsedTargetMarks = num
    }
  }

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
        examDate: parsed.data.examDate || null,
        targetMarks: parsedTargetMarks,
      },
      idempotencyKey: parsed.data.idempotencyKey,
    })

    revalidatePath("/dashboard")
    revalidatePath(workspaceRoutes.examPrep.home(parsed.data.workspaceSlug), "layout")

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

"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { ToolActionExecutionError } from "@/lib/tools/errors"

const arcContentFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(1).max(4000),
  currentReality: z.string().trim().min(1).max(8000),
  why: z.string().trim().max(4000),
  targetDate: z.string().trim(),
  constraints: z.string().max(6000),
})

const formSchema = arcContentFieldsSchema.extend({
  workspaceId: z.uuid(),
  installationId: z.uuid(),
  idempotencyKey: z.uuid(),
})

export type CreateArcActionState = {
  status: "idle" | "success" | "error"
  message: string
  rootBlockId?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export type ArcMutationActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export type UpdateArcActionState = CreateArcActionState

function parseConstraints(value: string) {
  const constraints = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  return constraints.length <= 20 &&
    constraints.every((item) => item.length <= 300)
    ? { success: true as const, constraints }
    : { success: false as const }
}

const arcMutationContextSchema = z.object({
  workspaceId: z.uuid(),
  installationId: z.uuid(),
  arcId: z.uuid(),
  idempotencyKey: z.uuid(),
})

function revalidateArc(workspaceSlug: string, arcId: string) {
  revalidatePath(workspaceRoutes.home(workspaceSlug))
  revalidatePath(workspaceRoutes.goalsPaths.home(workspaceSlug))
  revalidatePath(workspaceRoutes.goalsPaths.arc(workspaceSlug, arcId))
}

export async function createArcAction(
  workspaceSlug: string,
  _previousState: CreateArcActionState,
  formData: FormData
): Promise<CreateArcActionState> {
  const parsed = formSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    installationId: formData.get("installationId"),
    idempotencyKey: formData.get("idempotencyKey"),
    title: formData.get("title"),
    objective: formData.get("objective"),
    currentReality: formData.get("currentReality"),
    why: formData.get("why") ?? "",
    targetDate: formData.get("targetDate") ?? "",
    constraints: formData.get("constraints") ?? "",
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const constraintsResult = parseConstraints(parsed.data.constraints)
  if (!constraintsResult.success) {
    return {
      status: "error",
      message:
        "Use at most 20 constraints, with one short constraint per line.",
      fieldErrors: {
        constraints: ["Use at most 20 lines and 300 characters per line."],
      },
    }
  }

  const actionInput = {
    title: parsed.data.title,
    objective: parsed.data.objective,
    currentReality: parsed.data.currentReality,
    ...(parsed.data.why ? { why: parsed.data.why } : {}),
    targetDate: parsed.data.targetDate || null,
    constraints: constraintsResult.constraints,
  }

  try {
    const result = await executeToolAction({
      workspaceId: parsed.data.workspaceId,
      installationId: parsed.data.installationId,
      toolKey: "core.goals-paths",
      actionKey: "arc.create",
      idempotencyKey: parsed.data.idempotencyKey,
      input: actionInput,
    })

    revalidatePath(workspaceRoutes.home(workspaceSlug))
    revalidatePath(workspaceRoutes.goalsPaths.home(workspaceSlug))

    return {
      status: "success",
      message: "Arc created. Your first durable outcome is ready.",
      rootBlockId: result.rootBlockId,
    }
  } catch (error) {
    if (error instanceof ToolActionExecutionError) {
      return { status: "error", message: error.message }
    }

    return {
      status: "error",
      message: "The arc could not be created. Try again.",
    }
  }
}

export async function updateArcAction(
  workspaceSlug: string,
  _previousState: UpdateArcActionState,
  formData: FormData
): Promise<UpdateArcActionState> {
  const parsed = arcContentFieldsSchema
    .extend({
      workspaceId: z.uuid(),
      installationId: z.uuid(),
      idempotencyKey: z.uuid(),
      arcId: z.uuid(),
      expectedRevision: z.coerce.number().int().min(1),
    })
    .safeParse({
      workspaceId: formData.get("workspaceId"),
      installationId: formData.get("installationId"),
      idempotencyKey: formData.get("idempotencyKey"),
      arcId: formData.get("arcId"),
      expectedRevision: formData.get("expectedRevision"),
      title: formData.get("title"),
      objective: formData.get("objective"),
      currentReality: formData.get("currentReality"),
      why: formData.get("why") ?? "",
      targetDate: formData.get("targetDate") ?? "",
      constraints: formData.get("constraints") ?? "",
    })

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const constraintsResult = parseConstraints(parsed.data.constraints)
  if (!constraintsResult.success) {
    return {
      status: "error",
      message: "Use at most 20 constraints, one short constraint per line.",
      fieldErrors: {
        constraints: ["Use at most 20 lines and 300 characters per line."],
      },
    }
  }

  try {
    await executeToolAction({
      workspaceId: parsed.data.workspaceId,
      installationId: parsed.data.installationId,
      toolKey: "core.goals-paths",
      actionKey: "arc.update",
      idempotencyKey: parsed.data.idempotencyKey,
      input: {
        arcId: parsed.data.arcId,
        expectedRevision: parsed.data.expectedRevision,
        title: parsed.data.title,
        objective: parsed.data.objective,
        currentReality: parsed.data.currentReality,
        why: parsed.data.why || null,
        targetDate: parsed.data.targetDate || null,
        constraints: constraintsResult.constraints,
      },
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ToolActionExecutionError
          ? error.message
          : "The Arc could not be updated. Try again.",
    }
  }

  revalidateArc(workspaceSlug, parsed.data.arcId)
  redirect(workspaceRoutes.goalsPaths.arc(workspaceSlug, parsed.data.arcId))
}

export async function deleteArcAction(
  workspaceSlug: string,
  _previousState: ArcMutationActionState,
  formData: FormData
): Promise<ArcMutationActionState> {
  const parsed = arcMutationContextSchema
    .extend({
      expectedRevision: z.coerce.number().int().min(1),
    })
    .safeParse({
      workspaceId: formData.get("workspaceId"),
      installationId: formData.get("installationId"),
      arcId: formData.get("arcId"),
      idempotencyKey: formData.get("idempotencyKey"),
      expectedRevision: formData.get("expectedRevision"),
    })

  if (!parsed.success) {
    return { status: "error", message: "This Arc cannot be deleted." }
  }

  try {
    await executeToolAction({
      workspaceId: parsed.data.workspaceId,
      installationId: parsed.data.installationId,
      toolKey: "core.goals-paths",
      actionKey: "arc.delete",
      idempotencyKey: parsed.data.idempotencyKey,
      input: {
        arcId: parsed.data.arcId,
        expectedRevision: parsed.data.expectedRevision,
      },
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ToolActionExecutionError
          ? error.message
          : "The Arc could not be deleted.",
    }
  }

  revalidateArc(workspaceSlug, parsed.data.arcId)
  redirect(workspaceRoutes.goalsPaths.home(workspaceSlug))
}

export async function checkInArcAction(
  workspaceSlug: string,
  _previousState: ArcMutationActionState,
  formData: FormData
): Promise<ArcMutationActionState> {
  const parsed = arcMutationContextSchema
    .extend({
      progressPercent: z.coerce.number().min(0).max(100),
      note: z.string().trim().max(2000),
    })
    .safeParse({
      workspaceId: formData.get("workspaceId"),
      installationId: formData.get("installationId"),
      arcId: formData.get("arcId"),
      idempotencyKey: formData.get("idempotencyKey"),
      progressPercent: formData.get("progressPercent"),
      note: formData.get("note") ?? "",
    })

  if (!parsed.success) {
    return { status: "error", message: "Use a progress value from 0 to 100." }
  }

  try {
    await executeToolAction({
      workspaceId: parsed.data.workspaceId,
      installationId: parsed.data.installationId,
      toolKey: "core.goals-paths",
      actionKey: "arc.check-in",
      idempotencyKey: parsed.data.idempotencyKey,
      input: {
        arcId: parsed.data.arcId,
        progressPercent: parsed.data.progressPercent,
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      },
    })
    revalidateArc(workspaceSlug, parsed.data.arcId)
    return { status: "success", message: "Check-in recorded." }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ToolActionExecutionError
          ? error.message
          : "The check-in could not be recorded.",
    }
  }
}

export async function setArcStatusAction(
  workspaceSlug: string,
  _previousState: ArcMutationActionState,
  formData: FormData
): Promise<ArcMutationActionState> {
  const parsed = arcMutationContextSchema
    .extend({ status: z.enum(["active", "paused", "completed", "archived"]) })
    .safeParse({
      workspaceId: formData.get("workspaceId"),
      installationId: formData.get("installationId"),
      arcId: formData.get("arcId"),
      idempotencyKey: formData.get("idempotencyKey"),
      status: formData.get("status"),
    })

  if (!parsed.success) {
    return { status: "error", message: "Choose a valid Arc status." }
  }

  try {
    await executeToolAction({
      workspaceId: parsed.data.workspaceId,
      installationId: parsed.data.installationId,
      toolKey: "core.goals-paths",
      actionKey: "arc.set-status",
      idempotencyKey: parsed.data.idempotencyKey,
      input: { arcId: parsed.data.arcId, status: parsed.data.status },
    })
    revalidateArc(workspaceSlug, parsed.data.arcId)
    return { status: "success", message: "Arc status updated." }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ToolActionExecutionError
          ? error.message
          : "The Arc status could not be updated.",
    }
  }
}

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
import { subjectProgressPolicyUpdateSchema } from "@/lib/tools/exam-prep/progress/policy"
import { prisma } from "@/lib/prisma"

import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

const createSubjectSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  title: z.string().min(1, "Subject title is required").max(120),
  summary: z.string().max(4000).optional(),
  weightage: z.number().min(0).max(100),
})

export type CreateSubjectState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof createSubjectSchema>, string[]>
  >
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
      idempotencyKey: createIdempotencyKey(),
      input: {
        examId: parsed.data.examId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        weightage: parsed.data.weightage,
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

  revalidatePath(
    workspaceRoutes.examPrep.exam(parsed.data.workspaceSlug, parsed.data.examId)
  )
  return { status: "success" }
}

const attachSubjectSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  subjectId: z.string().uuid(),
  weightage: z.number().min(0).max(100),
})

const reorderSubjectsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()).max(500),
})

export type AttachSubjectState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof attachSubjectSchema>, string[]>
  >
}

/**
 * Links an existing workspace subject to this exam. The subject's syllabus and
 * foundation level remain shared; weightage and expected marks belong to this
 * specific exam-subject relationship.
 */
export async function attachSubjectAction(
  prevState: AttachSubjectState,
  formData: FormData
): Promise<AttachSubjectState> {
  const rawData = {
    workspaceSlug: formData.get("workspaceSlug"),
    examId: formData.get("examId"),
    subjectId: formData.get("subjectId"),
    weightage: Number(formData.get("weightage")),
  }

  const parsed = attachSubjectSchema.safeParse(rawData)
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
      actionKey: "exam.attach-subject",
      idempotencyKey: createIdempotencyKey(),
      input: {
        examId: parsed.data.examId,
        subjectId: parsed.data.subjectId,
        weightage: parsed.data.weightage,
      },
    })
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Failed to attach subject. Please try again.",
    }
  }

  revalidatePath(
    workspaceRoutes.examPrep.exam(parsed.data.workspaceSlug, parsed.data.examId)
  )
  return { status: "success" }
}

export async function reorderSubjectsAction(
  input: z.input<typeof reorderSubjectsSchema>
) {
  const parsed = reorderSubjectsSchema.parse(input)
  const context = await getExamPrepActionContext(parsed.workspaceSlug)

  await executeToolAction({
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    toolKey: "core.exam-prep",
    actionKey: "exam.reorder-subjects",
    idempotencyKey: createIdempotencyKey(),
    input: {
      examId: parsed.examId,
      subjectIds: parsed.subjectIds,
    },
  })

  revalidatePath(
    workspaceRoutes.examPrep.exam(parsed.workspaceSlug, parsed.examId)
  )
}

export type AttachableSubject = {
  id: string
  title: string
  summary: string | null
  foundationLevel: "Beginner" | "Moderate" | "Advanced"
}

/**
 * Returns active, Exam Prep subjects in this workspace that are not already
 * linked to the selected exam. This stays server-side so the workspace and
 * installation scope is verified before exposing reusable syllabus records.
 */
export async function getAttachableSubjectsAction(
  workspaceSlug: string,
  examId: string
): Promise<{ subjects: AttachableSubject[]; message?: string }> {
  const parsed = z
    .object({ workspaceSlug: workspaceSlugSchema, examId: z.string().uuid() })
    .safeParse({ workspaceSlug, examId })

  if (!parsed.success) {
    return { subjects: [], message: "The selected exam is invalid." }
  }

  try {
    const context = await getExamPrepActionContext(parsed.data.workspaceSlug)
    const [exam, relationType] = await Promise.all([
      prisma.block.findFirst({
        where: {
          id: parsed.data.examId,
          workspaceId: context.workspaceId,
          status: "ACTIVE",
          archivedAt: null,
          originToolInstallationId: context.installationId,
          blockType: { key: "exam-prep.exam" },
        },
        select: { id: true },
      }),
      prisma.blockRelationType.findUnique({
        where: { key: "exam-prep.exam-has-subject" },
        select: { id: true },
      }),
    ])

    if (!exam || !relationType) {
      return { subjects: [], message: "This exam is no longer available." }
    }

    const attachedRelations = await prisma.blockRelation.findMany({
      where: {
        workspaceId: context.workspaceId,
        fromBlockId: exam.id,
        relationTypeId: relationType.id,
      },
      select: { toBlockId: true },
    })

    const attachedSubjectIds = attachedRelations.map(
      (relation) => relation.toBlockId
    )
    const subjects = await prisma.block.findMany({
      where: {
        workspaceId: context.workspaceId,
        status: "ACTIVE",
        archivedAt: null,
        originToolInstallationId: context.installationId,
        blockType: { key: "exam-prep.subject" },
        ...(attachedSubjectIds.length > 0
          ? { id: { notIn: attachedSubjectIds } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        subjectDetails: { select: { foundationLevel: true } },
      },
      orderBy: { title: "asc" },
    })

    return {
      subjects: subjects.map((subject) => ({
        id: subject.id,
        title: subject.title,
        summary: subject.summary,
        foundationLevel:
          subject.subjectDetails?.foundationLevel === "ADVANCED"
            ? "Advanced"
            : subject.subjectDetails?.foundationLevel === "MODERATE"
              ? "Moderate"
              : "Beginner",
      })),
    }
  } catch (error) {
    return {
      subjects: [],
      message:
        error instanceof ExamPrepActionContextError || error instanceof Error
          ? error.message
          : "Unable to load reusable subjects right now.",
    }
  }
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
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof updateSubjectSettingsSchema>, string[]>
  >
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
    highYieldRevisionTarget: readRequiredNumber(
      formData,
      "highYieldRevisionTarget"
    ),
    highYieldPracticeTarget: readRequiredNumber(
      formData,
      "highYieldPracticeTarget"
    ),
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
      idempotencyKey: createIdempotencyKey(),
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

  revalidatePath(
    workspaceRoutes.examPrep.home(parsed.data.workspaceSlug),
    "layout"
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

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "../../../../generated/prisma/client"
import { requireVerifiedClaims } from "@/lib/auth/session"
import {
  getExamPrepActionContext,
  getExamPrepWriteContext,
} from "@/lib/tools/definitions/exam-prep/action-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import { normalizeUnifiedTestSchedule } from "./test-schedule-normalization"

function revalidateExamPrep(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.examPrep.home(workspaceSlug), "layout")
}

import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

// ─── Normalized mutation return shapes ─────────────────────────────────────

export type NormalizedTestRecord = {
  id: string
  examId: string
  subjectId: string | null
  chapterId: string | null
  title: string
  marksObtained: number
  totalMarks: number
  summary: string | null
  createdAt: string
  updatedAt: string
}

export type TestRecordCreateResult = {
  status: "created"
  record: NormalizedTestRecord
  runId: string
}

export type TestRecordUpdateResult = {
  status: "updated"
  record: NormalizedTestRecord
  runId: string
}

export type TestRecordDeleteResult = {
  status: "deleted"
  deletedRecord: {
    id: string
    examId: string
    subjectId: string | null
    chapterId: string | null
  }
  runId: string
}

const testRecordDataSchema = z.object({
  testRecord: z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    subjectId: z.string().uuid().nullable(),
    chapterId: z.string().uuid().nullable(),
    title: z.string(),
    marksObtained: z.number(),
    totalMarks: z.number(),
    summary: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
})

const deletedTestRecordDataSchema = z.object({
  deletedTestRecord: z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    subjectId: z.string().uuid().nullable(),
    chapterId: z.string().uuid().nullable(),
  }),
})

// ─── Thin mutation wrappers over executeToolAction pipeline ────────────────

const createTestRecordSchema = z
  .object({
    workspaceSlug: workspaceSlugSchema,
    examId: z.string().uuid(),
    subjectId: z.string().uuid(),
    chapterId: z.string().uuid().optional().nullable(),
    title: z.string().min(1, "Title is required").max(120),
    marksObtained: z.number().min(0),
    totalMarks: z.number().min(1),
    summary: z.string().optional().nullable(),
  })
  .refine((data) => data.marksObtained <= data.totalMarks, {
    message: "Marks obtained must not exceed total marks",
    path: ["marksObtained"],
  })

export async function createTestRecordAction(
  input: z.input<typeof createTestRecordSchema>
): Promise<TestRecordCreateResult> {
  const parsed = createTestRecordSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.create",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      examId: parsed.examId,
      subjectId: parsed.subjectId,
      chapterId: parsed.chapterId ?? null,
      title: parsed.title,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary ?? null,
    },
    idempotencyKey: crypto.randomUUID(),
  })

  const { testRecord } = testRecordDataSchema.parse(result.data)

  revalidateExamPrep(parsed.workspaceSlug)

  return {
    status: "created",
    record: testRecord,
    runId: result.runId,
  }
}

const updateTestRecordSchema = z
  .object({
    workspaceSlug: workspaceSlugSchema,
    id: z.string().uuid(),
    title: z.string().min(1, "Title is required").max(120),
    marksObtained: z.number().min(0),
    totalMarks: z.number().min(1),
    summary: z.string().optional().nullable(),
  })
  .refine((data) => data.marksObtained <= data.totalMarks, {
    message: "Marks obtained must not exceed total marks",
    path: ["marksObtained"],
  })

export async function updateTestRecordAction(
  input: z.input<typeof updateTestRecordSchema>
): Promise<TestRecordUpdateResult> {
  const parsed = updateTestRecordSchema.parse(input)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      testRecordId: parsed.id,
      title: parsed.title,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary ?? null,
    },
    idempotencyKey: crypto.randomUUID(),
  })

  const { testRecord } = testRecordDataSchema.parse(result.data)

  revalidateExamPrep(parsed.workspaceSlug)

  return {
    status: "updated",
    record: testRecord,
    runId: result.runId,
  }
}

const deleteTestRecordSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  id: z.string().uuid(),
})

export async function deleteTestRecordAction(
  workspaceSlug: string,
  id: string
): Promise<TestRecordDeleteResult> {
  const parsed = deleteTestRecordSchema.parse({ workspaceSlug, id })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  const result = await executeToolAction({
    toolKey: "core.exam-prep",
    actionKey: "test-record.delete",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    input: {
      workspaceId: context.workspaceId,
      testRecordId: parsed.id,
    },
    idempotencyKey: crypto.randomUUID(),
  })

  const { deletedTestRecord } = deletedTestRecordDataSchema.parse(result.data)

  revalidateExamPrep(parsed.workspaceSlug)

  return {
    status: "deleted",
    deletedRecord: deletedTestRecord,
    runId: result.runId,
  }
}

const getTestRecordsForChapterSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  chapterId: z.string().uuid(),
})

export async function getTestRecordsForChapterAction(
  workspaceSlug: string,
  chapterId: string
) {
  const parsed = getTestRecordsForChapterSchema.parse({
    workspaceSlug,
    chapterId,
  })
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(parsed.workspaceSlug)}`
  )
  const context = await getExamPrepActionContext(parsed.workspaceSlug)

  const records = await prisma.testRecord.findMany({
    where: {
      userId: claims.sub,
      workspaceId: context.workspaceId,
      chapterId: parsed.chapterId,
    },
    orderBy: { createdAt: "desc" },
  })

  return records.map((record) => ({
    ...record,
    marksObtained: Number(record.marksObtained),
    totalMarks: Number(record.totalMarks),
  }))
}

const getTestRecordsForSubjectSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  subjectId: z.string().uuid(),
})

export async function getTestRecordsForSubjectAction(
  workspaceSlug: string,
  subjectId: string
) {
  const parsed = getTestRecordsForSubjectSchema.parse({
    workspaceSlug,
    subjectId,
  })
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(parsed.workspaceSlug)}`
  )
  const context = await getExamPrepActionContext(parsed.workspaceSlug)

  const records = await prisma.testRecord.findMany({
    where: {
      userId: claims.sub,
      workspaceId: context.workspaceId,
      subjectId: parsed.subjectId,
      chapterId: null, // Only subject-level tests (multi-chapter or full subject)
    },
    orderBy: { createdAt: "desc" },
  })

  return records.map((record) => ({
    ...record,
    marksObtained: Number(record.marksObtained),
    totalMarks: Number(record.totalMarks),
  }))
}

function safeProperties(properties: unknown): Record<string, unknown> {
  if (
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    return { ...(properties as Record<string, unknown>) }
  }
  return {}
}

const scheduledTestSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1, "Title is required").max(120),
  date: z.string().max(100).optional(),
  scope: z.enum(["chapter", "multi-chapter", "subject"]).optional(),
  targetChapterIds: z.array(z.string().uuid()).max(100).optional(),
})

const updateScheduledTestsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  blockId: z.string().uuid(),
  scheduledTests: z.array(scheduledTestSchema).max(500),
})

export async function updateScheduledTestsAction(
  workspaceSlug: string,
  blockId: string,
  scheduledTests: z.infer<typeof scheduledTestSchema>[]
) {
  const parsed = updateScheduledTestsSchema.parse({
    workspaceSlug,
    blockId,
    scheduledTests,
  })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    const block = await tx.block.findFirst({
      where: {
        id: parsed.blockId,
        workspaceId: context.workspaceId,
        status: "ACTIVE",
      },
      include: { blockType: true },
    })

    if (!block) throw new Error("Block not found")
    if (
      block.blockType.key !== "exam-prep.subject" &&
      block.blockType.key !== "exam-prep.chapter"
    ) {
      throw new Error("Invalid block type for scheduled tests")
    }

    let testsToSave = parsed.scheduledTests
    if (block.blockType.key === "exam-prep.chapter") {
      testsToSave = testsToSave.map((t) => ({
        ...t,
        scope: "chapter",
        targetChapterIds: [parsed.blockId],
      }))
    } else if (block.blockType.key === "exam-prep.subject") {
      testsToSave = testsToSave.map((t) => ({
        ...t,
        scope: "subject",
        targetChapterIds: undefined,
      }))
    }

    const props = safeProperties(block.properties)
    props.scheduledTests = testsToSave

    await tx.block.update({
      where: { id: parsed.blockId },
      data: { properties: props as Prisma.InputJsonObject },
    })
  })

  revalidateExamPrep(workspaceSlug)
}

const syncSubjectTestScheduleSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  subjectId: z.string().uuid(),
  allTests: z.array(scheduledTestSchema).max(500),
})

export async function syncSubjectTestScheduleAction(
  workspaceSlug: string,
  subjectId: string,
  allTests: z.infer<typeof scheduledTestSchema>[]
) {
  const parsed = syncSubjectTestScheduleSchema.parse({
    workspaceSlug,
    subjectId,
    allTests,
  })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    const subject = await tx.block.findFirst({
      where: {
        id: parsed.subjectId,
        workspaceId: context.workspaceId,
        status: "ACTIVE",
      },
      include: { blockType: true },
    })
    if (!subject) throw new Error("Subject not found")
    if (subject.blockType.key !== "exam-prep.subject") {
      throw new Error("Invalid block type for subject test sync")
    }

    const chapterRelations = await tx.blockRelation.findMany({
      where: {
        fromBlockId: parsed.subjectId,
        workspaceId: context.workspaceId,
        relationType: { key: "exam-prep.subject-has-chapter" },
      },
    })
    const chapterIds = chapterRelations.map((r) => r.toBlockId)

    const chapters = await tx.block.findMany({
      where: {
        id: { in: chapterIds },
        workspaceId: context.workspaceId,
        status: "ACTIVE",
      },
    })

    const { subjectTests, chapterTestsMap } = normalizeUnifiedTestSchedule(
      parsed.allTests,
      safeProperties(subject.properties),
      chapters.map((c) => ({
        id: c.id,
        properties: safeProperties(c.properties),
      }))
    )

    const subjProps = safeProperties(subject.properties)
    subjProps.scheduledTests = subjectTests
    await tx.block.update({
      where: { id: parsed.subjectId },
      data: { properties: subjProps as Prisma.InputJsonObject },
    })

    for (const [chapId, chapTests] of chapterTestsMap.entries()) {
      const chapter = chapters.find((c) => c.id === chapId)!
      const chapProps = safeProperties(chapter.properties)
      chapProps.scheduledTests = chapTests

      await tx.block.update({
        where: { id: chapId },
        data: { properties: chapProps as Prisma.InputJsonObject },
      })
    }
  })

  revalidateExamPrep(workspaceSlug)
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Prisma } from "../../../../generated/prisma/client"
import { requireVerifiedClaims } from "@/lib/auth/session"
import { getExamPrepActionContext, getExamPrepWriteContext } from "@/lib/tools/definitions/exam-prep/action-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

function revalidateExamPrep(workspaceSlug: string) {
  revalidatePath("/dashboard")
  revalidatePath(workspaceRoutes.examPrep.home(workspaceSlug), "layout")
}

import { workspaceSlugSchema } from "@/lib/tools/exam-prep/actions/common"

const createTestRecordSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  examId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(120),
  marksObtained: z.number().min(0),
  totalMarks: z.number().min(1),
  summary: z.string().optional(),
})

export async function createTestRecordAction(input: z.input<typeof createTestRecordSchema>) {
  const parsed = createTestRecordSchema.parse(input)
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(parsed.workspaceSlug)}`)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    // Validate exam
    const exam = await tx.block.findFirst({
      where: { id: parsed.examId, workspaceId: context.workspaceId, blockType: { key: "exam-prep.exam" } }
    })
    if (!exam) throw new Error("Invalid exam")

    // Validate subject if provided
    if (parsed.subjectId) {
      const subject = await tx.block.findFirst({
        where: { id: parsed.subjectId, workspaceId: context.workspaceId, blockType: { key: "exam-prep.subject" } }
      })
      if (!subject) throw new Error("Invalid subject")

      const subjectRel = await tx.blockRelation.findFirst({
        where: { workspaceId: context.workspaceId, fromBlockId: parsed.examId, toBlockId: parsed.subjectId, relationType: { key: "exam-prep.exam-has-subject" } }
      })
      if (!subjectRel) throw new Error("Subject does not belong to this exam")

      // Validate chapter if provided
      if (parsed.chapterId) {
        const chapter = await tx.block.findFirst({
          where: { id: parsed.chapterId, workspaceId: context.workspaceId, blockType: { key: "exam-prep.chapter" } }
        })
        if (!chapter) throw new Error("Invalid chapter")

        const chapterRel = await tx.blockRelation.findFirst({
          where: { workspaceId: context.workspaceId, fromBlockId: parsed.subjectId, toBlockId: parsed.chapterId, relationType: { key: "exam-prep.subject-has-chapter" } }
        })
        if (!chapterRel) throw new Error("Chapter does not belong to this subject")
      }
    } else if (parsed.chapterId) {
      throw new Error("Chapter requires a subject")
    }

    await tx.testRecord.create({
      data: {
        userId: claims.sub,
        workspaceId: context.workspaceId,
        examId: parsed.examId,
        subjectId: parsed.subjectId,
        chapterId: parsed.chapterId,
        title: parsed.title,
        marksObtained: parsed.marksObtained,
        totalMarks: parsed.totalMarks,
        summary: parsed.summary,
      },
    })
  })

  revalidateExamPrep(parsed.workspaceSlug)
}

const updateTestRecordSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(120),
  marksObtained: z.number().min(0),
  totalMarks: z.number().min(1),
  summary: z.string().optional(),
})

export async function updateTestRecordAction(input: z.input<typeof updateTestRecordSchema>) {
  const parsed = updateTestRecordSchema.parse(input)
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(parsed.workspaceSlug)}`)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.testRecord.update({
    where: {
      id: parsed.id,
      userId: claims.sub,
      workspaceId: context.workspaceId,
    },
    data: {
      title: parsed.title,
      marksObtained: parsed.marksObtained,
      totalMarks: parsed.totalMarks,
      summary: parsed.summary,
    },
  })

  revalidateExamPrep(parsed.workspaceSlug)
}

const deleteTestRecordSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  id: z.string().uuid(),
})

export async function deleteTestRecordAction(workspaceSlug: string, id: string) {
  const parsed = deleteTestRecordSchema.parse({ workspaceSlug, id })
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(parsed.workspaceSlug)}`)
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    await tx.testRecord.delete({
      where: {
        id: parsed.id,
        userId: claims.sub,
        workspaceId: context.workspaceId,
      },
    })
  })

  revalidateExamPrep(parsed.workspaceSlug)
}

const getTestRecordsForChapterSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  chapterId: z.string().uuid(),
})

export async function getTestRecordsForChapterAction(workspaceSlug: string, chapterId: string) {
  const parsed = getTestRecordsForChapterSchema.parse({ workspaceSlug, chapterId })
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(parsed.workspaceSlug)}`)
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

export async function getTestRecordsForSubjectAction(workspaceSlug: string, subjectId: string) {
  const parsed = getTestRecordsForSubjectSchema.parse({ workspaceSlug, subjectId })
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(parsed.workspaceSlug)}`)
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

const scheduledTestSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1, "Title is required").max(120),
  date: z.string().max(100).optional(),
  scope: z.enum(["chapter", "multi-chapter", "subject"]).optional(),
  targetChapterIds: z.array(z.string().uuid()).max(100).optional(),
})

function safeProperties(properties: unknown): Record<string, unknown> {
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    return { ...(properties as Record<string, unknown>) }
  }
  return {}
}

const updateScheduledTestsSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  blockId: z.string().uuid(),
  scheduledTests: z.array(scheduledTestSchema).max(500),
})

export async function updateScheduledTestsAction(workspaceSlug: string, blockId: string, scheduledTests: z.infer<typeof scheduledTestSchema>[]) {
  const parsed = updateScheduledTestsSchema.parse({ workspaceSlug, blockId, scheduledTests })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    const block = await tx.block.findFirst({
      where: { id: parsed.blockId, workspaceId: context.workspaceId, status: "ACTIVE" },
      include: { blockType: true }
    })

    if (!block) throw new Error("Block not found")
    if (block.blockType.key !== "exam-prep.subject" && block.blockType.key !== "exam-prep.chapter") {
      throw new Error("Invalid block type for scheduled tests")
    }

    const props = safeProperties(block.properties)
    props.scheduledTests = parsed.scheduledTests

    await tx.block.update({
      where: { id: parsed.blockId },
      data: { properties: props as Prisma.InputJsonObject }
    })
  })

  revalidateExamPrep(workspaceSlug)
}

const syncSubjectTestScheduleSchema = z.object({
  workspaceSlug: workspaceSlugSchema,
  subjectId: z.string().uuid(),
  allTests: z.array(scheduledTestSchema).max(500),
})

export async function syncSubjectTestScheduleAction(workspaceSlug: string, subjectId: string, allTests: z.infer<typeof scheduledTestSchema>[]) {
  const parsed = syncSubjectTestScheduleSchema.parse({ workspaceSlug, subjectId, allTests })
  const context = await getExamPrepWriteContext(parsed.workspaceSlug)

  await prisma.$transaction(async (tx) => {
    const subject = await tx.block.findFirst({
      where: { id: parsed.subjectId, workspaceId: context.workspaceId, status: "ACTIVE" },
      include: { blockType: true }
    })
    if (!subject) throw new Error("Subject not found")
    if (subject.blockType.key !== "exam-prep.subject") {
      throw new Error("Invalid block type for subject test sync")
    }

    const chapterRelations = await tx.blockRelation.findMany({
      where: {
        fromBlockId: parsed.subjectId,
        workspaceId: context.workspaceId,
        relationType: { key: "exam-prep.subject-has-chapter" }
      }
    })
    const chapterIds = chapterRelations.map(r => r.toBlockId)
    
    const chapters = await tx.block.findMany({
      where: { id: { in: chapterIds }, workspaceId: context.workspaceId, status: "ACTIVE" }
    })

    const subjectTests = parsed.allTests.filter(t => t.scope === "subject" || t.scope === "multi-chapter" || !t.scope)
    
    const chapterTestsMap = new Map<string, z.infer<typeof scheduledTestSchema>[]>()
    for (const c of chapters) {
      chapterTestsMap.set(c.id, [])
    }

    for (const t of parsed.allTests) {
      if (t.scope === "chapter" && t.targetChapterIds && t.targetChapterIds.length > 0) {
        const cid = t.targetChapterIds[0]
        if (chapterTestsMap.has(cid)) {
          chapterTestsMap.get(cid)!.push(t)
        }
      }
    }

    const subjProps = safeProperties(subject.properties)
    subjProps.scheduledTests = subjectTests
    await tx.block.update({
      where: { id: parsed.subjectId },
      data: { properties: subjProps as Prisma.InputJsonObject }
    })

    for (const [chapId, chapTests] of chapterTestsMap.entries()) {
      const chapter = chapters.find(c => c.id === chapId)!
      const chapProps = safeProperties(chapter.properties)
      chapProps.scheduledTests = chapTests
      
      await tx.block.update({
        where: { id: chapId },
        data: { properties: chapProps as Prisma.InputJsonObject }
      })
    }
  })

  revalidateExamPrep(workspaceSlug)
}

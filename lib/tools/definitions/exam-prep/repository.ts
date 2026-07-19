import "server-only"

import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

const examPropertiesSchema = z
  .object({
    examCode: z.string().nullable().optional(),
    conductingBody: z.string().nullable().optional(),
    durationMinutes: z.number().int().nullable().optional(),
    totalMarks: z.number().nullable().optional(),
    targetMarks: z.number().nullable().optional(),
    examDate: z.string().nullable().optional(),
    officialUrl: z.string().nullable().optional(),
  })
  .passthrough()

const examRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    body: z.string().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    visibility: z.enum(["PRIVATE", "WORKSPACE", "PUBLIC"]),
    allowAgentAccess: z.boolean(),
    properties: examPropertiesSchema,
    schemaVersion: z.number().int(),
    revision: z.any(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
)

const stateRowsSchema = z.array(
  z.object({
    blockId: z.string().uuid(),
    status: z.enum([
      "NOT_STARTED",
      "ACTIVE",
      "PAUSED",
      "COMPLETED",
      "ARCHIVED",
    ]),
    progressPercent: z.any(),
    lastActivityAt: z.date().nullable(),
  })
)

export type ExamLifecycleStatus = 
  | "not_started"
  | "active"
  | "paused"
  | "completed"
  | "archived"

export type ExamListItem = {
  id: string
  title: string
  summary: string | null
  examCode: string | null
  examDate: string | null
  createdAt: string
  updatedAt: string
  lifecycleStatus: ExamLifecycleStatus
  progressPercent: number
  lastActivityAt: string | null
}

export type ExamDetail = ExamListItem & {
  revision: number
  conductingBody: string | null
  durationMinutes: number | null
  totalMarks: number | null
  targetMarks: number | null
  officialUrl: string | null
  body: string | null
  visibility: "private" | "workspace" | "public"
  allowAgentAccess: boolean
  schemaVersion: number
}

type ExamPrepIssue =
  | "workspace_unavailable"
  | "catalog_unavailable"
  | "data_unavailable"

function toNumber(value: string | number | null, fallback = 0) {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeExam(
  row: z.infer<typeof examRowsSchema>[number],
  state?: z.infer<typeof stateRowsSchema>[number]
): ExamListItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    examCode: row.properties.examCode ?? null,
    examDate: row.properties.examDate ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lifecycleStatus: (state?.status.toLowerCase() as ExamLifecycleStatus) ?? "active",
    progressPercent: toNumber(state?.progressPercent ?? null),
    lastActivityAt: state?.lastActivityAt?.toISOString() ?? null,
  }
}

export async function getExamsOverview(workspaceId: string, workspaceSlug: string) {
  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(workspaceSlug)}`)
  
  const blockType = await prisma.blockType.findUnique({
    where: { key: "exam-prep.exam" },
    select: { id: true }
  })

  if (!blockType) {
    return {
      exams: [] as ExamListItem[],
      issue: "catalog_unavailable" as const,
    }
  }

  const examsData = await prisma.block.findMany({
    where: {
      workspaceId: workspaceId,
      blockTypeId: blockType.id,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true, title: true, summary: true, body: true, status: true, visibility: true, allowAgentAccess: true, properties: true, schemaVersion: true, revision: true, createdAt: true, updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  })

  const examRows = examRowsSchema.safeParse(examsData)
  if (!examRows.success) {
    console.error("examRowsSchema parse error:", examRows.error)
    return {
      exams: [] as ExamListItem[],
      issue: "data_unavailable" as const,
    }
  }

  const blockIds = examRows.data.map((exam) => exam.id)
  const statesData = blockIds.length
    ? await prisma.userBlockState.findMany({
        where: {
          workspaceId: workspaceId,
          userId: claims.sub,
          blockId: { in: blockIds },
        },
        select: { blockId: true, status: true, progressPercent: true, lastActivityAt: true }
      })
    : []
  const stateRows = stateRowsSchema.safeParse(statesData)

  if (!stateRows.success) {
    console.error("stateRowsSchema parse error:", stateRows.error)
    return {
      exams: [] as ExamListItem[],
      issue: "data_unavailable" as const,
    }
  }

  const stateByBlockId = new Map(
    stateRows.data.map((state) => [state.blockId, state])
  )
  const exams = examRows.data
    .map((exam) => normalizeExam(exam, stateByBlockId.get(exam.id)))
    .filter((exam) => exam.lifecycleStatus !== "archived")

  return { exams, issue: null }
}

export async function getExamDetail(workspaceId: string, workspaceSlug: string, examId: string): Promise<{
  exam: ExamDetail | null
  issue: ExamPrepIssue | "not_found" | null
}> {
  const parsedExamId = z.uuid().safeParse(examId)
  if (!parsedExamId.success) {
    return { exam: null, issue: "not_found" }
  }

  const claims = await requireVerifiedClaims(`/workspace/${encodeURIComponent(workspaceSlug)}`)
  
  const blockType = await prisma.blockType.findUnique({
    where: { key: "exam-prep.exam" },
    select: { id: true }
  })

  if (!blockType) {
    return {
      exam: null,
      issue: "data_unavailable",
    }
  }

  const [examData, stateData] = await Promise.all([
    prisma.block.findFirst({
      where: {
        id: parsedExamId.data,
        workspaceId: workspaceId,
        blockTypeId: blockType.id,
        archivedAt: null,
      },
      select: { id: true, title: true, summary: true, body: true, status: true, visibility: true, allowAgentAccess: true, properties: true, schemaVersion: true, revision: true, createdAt: true, updatedAt: true }
    }),
    prisma.userBlockState.findUnique({
      where: {
        userId_blockId: {
          userId: claims.sub,
          blockId: parsedExamId.data
        },
        workspaceId: workspaceId
      },
      select: { blockId: true, status: true, progressPercent: true, lastActivityAt: true }
    })
  ])

  if (!examData) {
    return { exam: null, issue: "not_found" }
  }

  const examRows = examRowsSchema.safeParse([examData])
  const states = stateRowsSchema.safeParse(stateData ? [stateData] : [])

  if (!examRows.success || !states.success) {
    return {
      exam: null,
      issue: "data_unavailable",
    }
  }

  const row = examRows.data[0]
  const listItem = normalizeExam(row, states.data[0])
  return {
    issue: null,
    exam: {
      ...listItem,
      revision: toNumber(row.revision, 1),
      conductingBody: row.properties.conductingBody ?? null,
      durationMinutes: row.properties.durationMinutes ?? null,
      totalMarks: row.properties.totalMarks ?? null,
      targetMarks: row.properties.targetMarks ?? null,
      officialUrl: row.properties.officialUrl ?? null,
      body: row.body,
      visibility: row.visibility.toLowerCase() as "public" | "workspace" | "private",
      allowAgentAccess: row.allowAgentAccess,
      schemaVersion: row.schemaVersion,
    },
  }
}

export type SubjectListItem = {
  id: string
  title: string
  summary: string | null
  weightage: number
  foundationLevel: "Beginner" | "Moderate" | "Advanced"
  expectedMarks: number | null
  status: ExamLifecycleStatus
  progressPercent: number
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
}

export async function getExamSubjects(workspaceId: string, examId: string): Promise<{
  subjects: SubjectListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.exam-has-subject" },
    select: { id: true }
  })

  if (!relationType) {
    return { subjects: [], issue: "data_unavailable" }
  }

  const relations = await prisma.blockRelation.findMany({
    where: {
      workspaceId: workspaceId,
      fromBlockId: examId,
      relationTypeId: relationType.id
    },
    select: { toBlockId: true }
  })

  const subjectIds = relations.map((r) => r.toBlockId)

  if (subjectIds.length === 0) {
    return { subjects: [], issue: null }
  }

  const blocks = await prisma.block.findMany({
    where: {
      id: { in: subjectIds },
      workspaceId: workspaceId,
      status: "ACTIVE",
      archivedAt: null
    },
    select: { id: true, title: true, summary: true, properties: true, status: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "asc" }
  })

  if (!blocks) {
    return { subjects: [], issue: "data_unavailable" }
  }

  // For subjects we don't have progress_percent in user_block_states yet, 
  // but we can join it if needed. Let's just use 0 for now.
  const subjects: SubjectListItem[] = blocks.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    weightage: (row.properties as any).weightage ?? 0,
    foundationLevel: (row.properties as any).foundationLevel ?? "Beginner",
    expectedMarks: (row.properties as any).expectedMarks ?? null,
    status: row.status.toLowerCase() as ExamLifecycleStatus,
    progressPercent: 0,
    lastActivityAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return { subjects, issue: null }
}

export type ChapterListItem = {
  id: string
  title: string
  summary: string | null
  important: boolean
  createdAt: string
  updatedAt: string
}

export async function getSubjectDetail(workspaceId: string, subjectId: string): Promise<{
  subject: SubjectListItem | null
  issue: "not_found" | "data_unavailable" | null
}> {
  const row = await prisma.block.findFirst({
    where: { id: subjectId, workspaceId: workspaceId, archivedAt: null },
    select: { id: true, title: true, summary: true, properties: true, status: true, createdAt: true, updatedAt: true }
  })

  if (!row) return { subject: null, issue: "not_found" }

  const subject: SubjectListItem = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    weightage: (row.properties as any).weightage ?? 0,
    foundationLevel: (row.properties as any).foundationLevel ?? "Beginner",
    expectedMarks: (row.properties as any).expectedMarks ?? null,
    status: row.status.toLowerCase() as ExamLifecycleStatus,
    progressPercent: 0,
    lastActivityAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }

  return { subject, issue: null }
}

export async function getSubjectChapters(workspaceId: string, subjectId: string): Promise<{
  chapters: ChapterListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.subject-has-chapter" },
    select: { id: true }
  })

  if (!relationType) return { chapters: [], issue: "data_unavailable" }

  const relations = await prisma.blockRelation.findMany({
    where: { fromBlockId: subjectId, relationTypeId: relationType.id, workspaceId: workspaceId },
    select: { toBlockId: true }
  })

  const chapterIds = relations.map((r) => r.toBlockId)
  if (chapterIds.length === 0) return { chapters: [], issue: null }

  const blocks = await prisma.block.findMany({
    where: { id: { in: chapterIds }, workspaceId: workspaceId, status: "ACTIVE", archivedAt: null },
    select: { id: true, title: true, summary: true, properties: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "asc" }
  })

  if (!blocks) return { chapters: [], issue: "data_unavailable" }

  const chapters: ChapterListItem[] = blocks.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    important: (row.properties as any).important ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return { chapters, issue: null }
}

export type TopicListItem = {
  id: string
  title: string
  properties: {
    learningStatus: boolean
    revisionCount: number
    practiceCount: number
    testCount: number
    important: boolean
    lastRevised: string | null
    nextRevision: string | null
  }
  createdAt: string
  updatedAt: string
}

export async function getChapterDetail(workspaceId: string, chapterId: string): Promise<{
  chapter: ChapterListItem | null
  issue: "not_found" | "data_unavailable" | null
}> {
  const row = await prisma.block.findFirst({
    where: { id: chapterId, workspaceId: workspaceId, archivedAt: null },
    select: { id: true, title: true, summary: true, properties: true, createdAt: true, updatedAt: true }
  })

  if (!row) return { chapter: null, issue: "not_found" }

  const chapter: ChapterListItem = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    important: (row.properties as any).important ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }

  return { chapter, issue: null }
}

export async function getChapterSubjectId(workspaceId: string, chapterId: string): Promise<string | null> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.subject-has-chapter" },
    select: { id: true }
  })
  if (!relationType) return null
  
  const data = await prisma.blockRelation.findFirst({
    where: { toBlockId: chapterId, relationTypeId: relationType.id, workspaceId: workspaceId },
    select: { fromBlockId: true }
  })
  return data?.fromBlockId ?? null
}

export async function getChapterTopics(workspaceId: string, chapterId: string): Promise<{
  topics: TopicListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.chapter-has-topic" },
    select: { id: true }
  })

  if (!relationType) return { topics: [], issue: "data_unavailable" }

  const relations = await prisma.blockRelation.findMany({
    where: { fromBlockId: chapterId, relationTypeId: relationType.id, workspaceId: workspaceId },
    select: { toBlockId: true }
  })

  const topicIds = relations.map((r) => r.toBlockId)
  if (topicIds.length === 0) return { topics: [], issue: null }

  const blocks = await prisma.block.findMany({
    where: { id: { in: topicIds }, workspaceId: workspaceId, status: "ACTIVE", archivedAt: null },
    select: { id: true, title: true, summary: true, properties: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "asc" }
  })

  if (!blocks) return { topics: [], issue: "data_unavailable" }

  const topics: TopicListItem[] = blocks.map((row) => ({
    id: row.id,
    title: row.title,
    properties: {
      learningStatus: Boolean((row.properties as any).learningStatus),
      revisionCount: Number((row.properties as any).revisionCount ?? 0),
      practiceCount: Number((row.properties as any).practiceCount ?? 0),
      testCount: Number((row.properties as any).testCount ?? 0),
      important: Boolean((row.properties as any).important),
      lastRevised: (row.properties as any).lastRevised ?? null,
      nextRevision: (row.properties as any).nextRevision ?? null,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return { topics, issue: null }
}

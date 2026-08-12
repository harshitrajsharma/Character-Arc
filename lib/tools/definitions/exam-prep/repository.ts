/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only"

import { cache } from "react"
import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

const examRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    body: z.string().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    visibility: z.enum(["PRIVATE", "WORKSPACE", "PUBLIC"]),
    allowAgentAccess: z.boolean(),
    schemaVersion: z.number().int(),
    revision: z.any(),
    createdAt: z.date(),
    updatedAt: z.date(),
    originToolInstallationId: z.string().uuid().nullable(),
    examDetails: z.any().optional(),
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
  "not_started" | "active" | "paused" | "completed" | "archived"

export type ExamListItem = {
  id: string
  title: string
  summary: string | null
  examCode: string | null
  expectedStartDate: string | null
  officialStartAt: string | null
  scheduleStatus:
    "expected" | "announced" | "confirmed" | "postponed" | "cancelled"
  targetMarks: number | null
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
  scoringRules: any
  targetRank: number | null
  expectedEndDate: string | null
  officialEndAt: string | null
  timezone: string | null
  patternVersion: number
  metadata: any
  body: string | null
  visibility: "private" | "workspace" | "public"
  allowAgentAccess: boolean
  schemaVersion: number
  originToolInstallationId: string | null
}

type ExamPrepIssue =
  "workspace_unavailable" | "catalog_unavailable" | "data_unavailable"

function toNumber(value: string | number | null, fallback = 0) {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toFoundationLevel(
  level: "BEGINNER" | "MODERATE" | "ADVANCED" | undefined
): SubjectListItem["foundationLevel"] {
  if (level === "MODERATE") return "Moderate"
  if (level === "ADVANCED") return "Advanced"
  return "Beginner"
}

function normalizeExam(
  row: z.infer<typeof examRowsSchema>[number],
  state?: z.infer<typeof stateRowsSchema>[number]
): ExamListItem {
  const details = (row as any).examDetails
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    examCode: details?.examCode ?? null,
    expectedStartDate: details?.expectedStartDate
      ? new Date(details.expectedStartDate).toISOString().split("T")[0]
      : null,
    officialStartAt: details?.officialStartAt?.toISOString() ?? null,
    scheduleStatus:
      details?.scheduleStatus?.toLowerCase() as ExamListItem["scheduleStatus"],
    targetMarks:
      details?.targetMarks !== undefined && details?.targetMarks !== null
        ? Number(details.targetMarks)
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lifecycleStatus:
      (state?.status.toLowerCase() as ExamLifecycleStatus) ?? "active",
    progressPercent: toNumber(state?.progressPercent ?? null),
    lastActivityAt: state?.lastActivityAt?.toISOString() ?? null,
  }
}

export async function getExamsOverview(
  workspaceId: string,
  workspaceSlug: string,
  installationId: string
) {
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(workspaceSlug)}`
  )

  const blockType = await prisma.blockType.findUnique({
    where: { key: "exam-prep.exam" },
    select: { id: true },
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
      originToolInstallationId: installationId,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      body: true,
      status: true,
      visibility: true,
      allowAgentAccess: true,
      schemaVersion: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
      originToolInstallationId: true,
      examDetails: {
        select: {
          examCode: true,
          conductingBody: true,
          durationMinutes: true,
          totalMarks: true,
          targetMarks: true,
          expectedStartDate: true,
          officialStartAt: true,
          scheduleStatus: true,
          officialUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
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
        select: {
          blockId: true,
          status: true,
          progressPercent: true,
          lastActivityAt: true,
        },
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

export const getExamDetail = cache(
  async (
    workspaceId: string,
    workspaceSlug: string,
    examId: string
  ): Promise<{
    exam: ExamDetail | null
    issue: ExamPrepIssue | "not_found" | null
  }> => {
    const parsedExamId = z.uuid().safeParse(examId)
    if (!parsedExamId.success) {
      return { exam: null, issue: "not_found" }
    }

    const claims = await requireVerifiedClaims(
      `/workspace/${encodeURIComponent(workspaceSlug)}`
    )

    const blockType = await prisma.blockType.findUnique({
      where: { key: "exam-prep.exam" },
      select: { id: true },
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
        select: {
          id: true,
          title: true,
          summary: true,
          body: true,
          status: true,
          visibility: true,
          allowAgentAccess: true,
          schemaVersion: true,
          revision: true,
          createdAt: true,
          updatedAt: true,
          originToolInstallationId: true,
          examDetails: {
            select: {
              examCode: true,
              conductingBody: true,
              durationMinutes: true,
              totalMarks: true,
              targetMarks: true,
              targetRank: true,
              expectedStartDate: true,
              expectedEndDate: true,
              officialStartAt: true,
              officialEndAt: true,
              scheduleStatus: true,
              timezone: true,
              patternVersion: true,
              scoringRules: true,
              metadata: true,
              officialUrl: true,
            },
          },
        },
      }),
      prisma.userBlockState.findUnique({
        where: {
          userId_blockId: {
            userId: claims.sub,
            blockId: parsedExamId.data,
          },
          workspaceId: workspaceId,
        },
        select: {
          blockId: true,
          status: true,
          progressPercent: true,
          lastActivityAt: true,
        },
      }),
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
    const details = (row as any).examDetails
    const listItem = normalizeExam(row, states.data[0])
    return {
      issue: null,
      exam: {
        ...listItem,
        revision: toNumber(row.revision, 1),
        conductingBody: details?.conductingBody ?? null,
        durationMinutes: details?.durationMinutes ?? null,
        totalMarks:
          details?.totalMarks !== undefined && details?.totalMarks !== null
            ? Number(details.totalMarks)
            : null,
        officialUrl: details?.officialUrl ?? null,
        scoringRules: details?.scoringRules ?? {},
        targetRank: details?.targetRank ?? null,
        expectedEndDate: details?.expectedEndDate
          ? new Date(details.expectedEndDate).toISOString().split("T")[0]
          : null,
        officialEndAt: details?.officialEndAt?.toISOString() ?? null,
        timezone: details?.timezone ?? null,
        patternVersion: details?.patternVersion ?? 1,
        metadata: details?.metadata ?? {},
        body: row.body,
        visibility: row.visibility.toLowerCase() as
          "public" | "workspace" | "private",
        allowAgentAccess: row.allowAgentAccess,
        schemaVersion: row.schemaVersion,
        originToolInstallationId: row.originToolInstallationId,
      },
    }
  }
)

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

export async function getExamSubjects(
  workspaceId: string,
  examId: string
): Promise<{
  subjects: SubjectListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.exam-has-subject" },
    select: { id: true },
  })

  if (!relationType) {
    return { subjects: [], issue: "data_unavailable" }
  }

  const relations = await prisma.blockRelation.findMany({
    where: {
      workspaceId: workspaceId,
      fromBlockId: examId,
      relationTypeId: relationType.id,
    },
    select: {
      toBlockId: true,
      position: true,
      examSubject: { select: { weightage: true } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
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
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      subjectDetails: { select: { foundationLevel: true } },
    },
  })

  if (!blocks) {
    return { subjects: [], issue: "data_unavailable" }
  }

  // For subjects we don't have progress_percent in user_block_states yet,
  // but we can join it if needed. Let's just use 0 for now.
  const relationBySubjectId = new Map(
    relations.map((relation) => [relation.toBlockId, relation])
  )
  const blockById = new Map(blocks.map((block) => [block.id, block]))
  const subjects: SubjectListItem[] = relations.flatMap((relation) => {
    const row = blockById.get(relation.toBlockId)
    if (!row) return []

    return [
      {
        id: row.id,
        title: row.title,
        summary: row.summary,
        weightage: Number(
          relationBySubjectId.get(row.id)?.examSubject?.weightage ?? 0
        ),
        foundationLevel: toFoundationLevel(row.subjectDetails?.foundationLevel),
        expectedMarks: null,
        status: row.status.toLowerCase() as ExamLifecycleStatus,
        progressPercent: 0,
        lastActivityAt: null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    ]
  })

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

export async function getSubjectDetail(
  workspaceId: string,
  subjectId: string
): Promise<{
  subject: SubjectListItem | null
  issue: "not_found" | "data_unavailable" | null
}> {
  const row = await prisma.block.findFirst({
    where: { id: subjectId, workspaceId: workspaceId, archivedAt: null },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      subjectDetails: { select: { foundationLevel: true } },
    },
  })

  if (!row) return { subject: null, issue: "not_found" }

  const subject: SubjectListItem = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    // A subject can be linked to multiple exams, so its weightage is only
    // meaningful in an ExamSubjectConfig. This non-exam-scoped lookup does
    // not infer one arbitrarily.
    weightage: 0,
    foundationLevel: toFoundationLevel(row.subjectDetails?.foundationLevel),
    expectedMarks: null,
    status: row.status.toLowerCase() as ExamLifecycleStatus,
    progressPercent: 0,
    lastActivityAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }

  return { subject, issue: null }
}

export async function getSubjectChapters(
  workspaceId: string,
  subjectId: string
): Promise<{
  chapters: ChapterListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.subject-has-chapter" },
    select: { id: true },
  })

  if (!relationType) return { chapters: [], issue: "data_unavailable" }

  const relations = await prisma.blockRelation.findMany({
    where: {
      fromBlockId: subjectId,
      relationTypeId: relationType.id,
      workspaceId: workspaceId,
    },
    select: { toBlockId: true },
  })

  const chapterIds = relations.map((r) => r.toBlockId)
  if (chapterIds.length === 0) return { chapters: [], issue: null }

  const blocks = await prisma.block.findMany({
    where: {
      id: { in: chapterIds },
      workspaceId: workspaceId,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
      chapterDetails: { select: { isImportant: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!blocks) return { chapters: [], issue: "data_unavailable" }

  const chapters: ChapterListItem[] = blocks.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    important: row.chapterDetails?.isImportant ?? false,
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

export async function getChapterDetail(
  workspaceId: string,
  chapterId: string
): Promise<{
  chapter: ChapterListItem | null
  issue: "not_found" | "data_unavailable" | null
}> {
  const row = await prisma.block.findFirst({
    where: { id: chapterId, workspaceId: workspaceId, archivedAt: null },
    select: {
      id: true,
      title: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
      chapterDetails: { select: { isImportant: true } },
    },
  })

  if (!row) return { chapter: null, issue: "not_found" }

  const chapter: ChapterListItem = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    important: row.chapterDetails?.isImportant ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }

  return { chapter, issue: null }
}

export async function getChapterSubjectId(
  workspaceId: string,
  chapterId: string
): Promise<string | null> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.subject-has-chapter" },
    select: { id: true },
  })
  if (!relationType) return null

  const data = await prisma.blockRelation.findFirst({
    where: {
      toBlockId: chapterId,
      relationTypeId: relationType.id,
      workspaceId: workspaceId,
    },
    select: { fromBlockId: true },
  })
  return data?.fromBlockId ?? null
}

export async function getChapterTopics(
  workspaceId: string,
  chapterId: string
): Promise<{
  topics: TopicListItem[]
  issue: "data_unavailable" | null
}> {
  const relationType = await prisma.blockRelationType.findUnique({
    where: { key: "exam-prep.chapter-has-topic" },
    select: { id: true },
  })

  if (!relationType) return { topics: [], issue: "data_unavailable" }

  const relations = await prisma.blockRelation.findMany({
    where: {
      fromBlockId: chapterId,
      relationTypeId: relationType.id,
      workspaceId: workspaceId,
    },
    select: { toBlockId: true },
  })

  const topicIds = relations.map((r) => r.toBlockId)
  if (topicIds.length === 0) return { topics: [], issue: null }

  const blocks = await prisma.block.findMany({
    where: {
      id: { in: topicIds },
      workspaceId: workspaceId,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      summary: true,
      properties: true,
      createdAt: true,
      updatedAt: true,
      topicDetails: { select: { isImportant: true } },
    },
    orderBy: { createdAt: "asc" },
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
      important: row.topicDetails?.isImportant ?? false,
      lastRevised: (row.properties as any).lastRevised ?? null,
      nextRevision: (row.properties as any).nextRevision ?? null,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return { topics, issue: null }
}

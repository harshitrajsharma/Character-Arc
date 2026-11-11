import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import { agentStudyBlockWhere } from "@/lib/tools/agent-action-access"
import type {
  ToolActionResult,
  ToolExecutionPrincipal,
} from "@/lib/tools/contracts"
import type { ExecuteToolActionInput } from "@/lib/tools/execute-tool-action"
import {
  calculateProgressRollup,
  calculateTopicProgress,
} from "@/lib/tools/exam-prep/progress/rules"
import {
  normalizeSubjectProgressPolicy,
  type SubjectProgressPolicyInput,
} from "@/lib/tools/exam-prep/progress/policy"
import { calculateSubjectTestProgress } from "@/lib/tools/exam-prep/calculations/test-records"

export type AgentReadKind =
  | "exam.list"
  | "exam.get-context"
  | "exam.get-weak-topics"
  | "subject.list"
  | "subject.get-context"
  | "subject.get-progress"
  | "assessment.list"
  | "attempt.list"
  | "question.list"
const inputSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .nullish()
      .transform((value) => value ?? 25),
    cursor: z.string().min(1).max(512).optional(),
    examId: z.uuid().optional(),
    subjectId: z.uuid().optional(),
    chapterId: z.uuid().optional(),
    contextBlockId: z.uuid().optional(),
    assessmentId: z.uuid().optional(),
    status: z
      .enum(["IN_PROGRESS", "SUBMITTED", "EVALUATED", "ABANDONED"])
      .optional(),
    stage: z.enum(["learning", "revision", "practice", "test"]).optional(),
  })
  .strict()
const blockCursorSchema = z
  .object({
    kind: z.literal("block"),
    id: z.uuid(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
const edgeCursorSchema = z
  .object({ kind: z.literal("edge"), id: z.uuid(), position: z.number().int() })
  .strict()
const attemptCursorSchema = z
  .object({
    kind: z.literal("attempt"),
    id: z.uuid(),
    startedAt: z.iso.datetime(),
  })
  .strict()
const blockSelect = {
  id: true,
  title: true,
  revision: true,
  updatedAt: true,
} as const
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
function topicSnapshot(properties: unknown, important: boolean) {
  const props = object(properties)
  const count = (key: string) =>
    Number.isFinite(Number(props[key]))
      ? Math.max(0, Math.min(100, Number(props[key])))
      : 0
  return {
    important,
    learningStatus: props.learningStatus === true,
    revisionCount: count("revisionCount"),
    practiceCount: count("practiceCount"),
    testCount: count("testCount"),
  }
}
function topicParentFilter(
  visible: Prisma.BlockWhereInput & { workspaceId: string },
  subjectId?: string,
  examId?: string
): Prisma.BlockWhereInput {
  return {
    incomingRelations: {
      some: {
        workspaceId: visible.workspaceId,
        relationType: { key: "exam-prep.chapter-has-topic" },
        fromBlock: {
          ...visible,
          blockType: { key: "exam-prep.chapter" },
          incomingRelations: {
            some: {
              workspaceId: visible.workspaceId,
              ...(subjectId ? { fromBlockId: subjectId } : {}),
              relationType: { key: "exam-prep.subject-has-chapter" },
              fromBlock: {
                ...visible,
                blockType: { key: "exam-prep.subject" },
                ...(examId
                  ? {
                      incomingRelations: {
                        some: {
                          workspaceId: visible.workspaceId,
                          fromBlockId: examId,
                          relationType: { key: "exam-prep.exam-has-subject" },
                          fromBlock: {
                            ...visible,
                            blockType: { key: "exam-prep.exam" },
                          },
                        },
                      },
                    }
                  : {}),
              },
            },
          },
        },
      },
    },
  }
}
function cursor(
  input: string | undefined,
  kind: "block"
): z.infer<typeof blockCursorSchema> | null
function cursor(
  input: string | undefined,
  kind: "edge"
): z.infer<typeof edgeCursorSchema> | null
function cursor(
  input: string | undefined,
  kind: "attempt"
): z.infer<typeof attemptCursorSchema> | null
function cursor(input: string | undefined, kind: "block" | "edge" | "attempt") {
  if (!input) return null
  try {
    const value = JSON.parse(Buffer.from(input, "base64url").toString("utf8"))
    if (kind === "block") return blockCursorSchema.parse(value)
    if (kind === "attempt") return attemptCursorSchema.parse(value)
    return edgeCursorSchema.parse(value)
  } catch {
    throw new ToolActionExecutionError(
      "Invalid page cursor. Restart discovery without cursor.",
      "INVALID_INPUT"
    )
  }
}
const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url")
function blockBoundary(
  value: ReturnType<typeof blockCursorSchema.parse> | null
) {
  return value
    ? {
        OR: [
          { updatedAt: { lt: new Date(value.updatedAt) } },
          { updatedAt: new Date(value.updatedAt), id: { lt: value.id } },
        ],
      }
    : {}
}
function blockDto(block: {
  id: string
  title: string
  revision: bigint
  updatedAt: Date
}) {
  return {
    id: block.id,
    title: block.title,
    revision: Number(block.revision),
    updatedAt: block.updatedAt.toISOString(),
  }
}
function pageBlocks<T extends { id: string; updatedAt: Date }>(
  rows: T[],
  limit: number
) {
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? encode({
            kind: "block",
            id: last.id,
            updatedAt: last.updatedAt.toISOString(),
          })
        : null,
  }
}

/** Bounded, authorized discovery reads. No solution table or global workspace data is selected. */
export function createAgentReadExecutor(
  kind: AgentReadKind,
  client: PrismaClient = prisma
) {
  return async (
    input: ExecuteToolActionInput,
    principal: ToolExecutionPrincipal,
    handlerVersion: string
  ): Promise<ToolActionResult> => {
    if (!principal.actorId || principal.workspaceId !== input.workspaceId)
      throw new ToolActionExecutionError(
        "Workspace access is required.",
        "FORBIDDEN"
      )
    const parsed = inputSchema.safeParse(input.input)
    if (!parsed.success)
      throw new ToolActionExecutionError(
        "The discovery filters are invalid.",
        "INVALID_INPUT"
      )
    const args = parsed.data
    const runId = randomUUID()
    const data = await client.$transaction(async (tx) => {
      const [member, installation] = await Promise.all([
        tx.workspaceMember.findFirst({
          where: {
            workspaceId: input.workspaceId,
            userId: principal.actorId,
            workspace: { archivedAt: null },
          },
          select: { role: true },
        }),
        tx.toolInstallation.findFirst({
          where: {
            id: input.installationId,
            workspaceId: input.workspaceId,
            status: "ACTIVE",
          },
          select: {
            toolReleaseId: true,
            toolRelease: { select: { manifest: true } },
          },
        }),
      ])
      if (!member || !installation)
        throw new ToolActionExecutionError(
          "The active workspace tool is unavailable.",
          "FORBIDDEN"
        )
      const visible = {
        workspaceId: input.workspaceId,
        originToolInstallationId: input.installationId,
        status: "ACTIVE" as const,
        archivedAt: null,
        allowAgentAccess: true,
      }
      const search = args.search
        ? { title: { contains: args.search, mode: "insensitive" as const } }
        : {}
      let result: Record<string, unknown>
      if (
        kind === "exam.list" ||
        kind === "subject.list" ||
        kind === "exam.get-context"
      ) {
        const isExam = kind === "exam.list"
        if (kind === "exam.get-context" && !args.examId)
          throw new ToolActionExecutionError(
            "examId is required.",
            "INVALID_INPUT"
          )
        let examContext = null
        if (!isExam && args.examId) {
          const exam = await tx.block.findFirst({
            where: {
              ...visible,
              id: args.examId,
              blockType: { key: "exam-prep.exam" },
              examDetails: { isNot: null },
            },
            select: {
              ...blockSelect,
              examDetails: {
                select: {
                  examCode: true,
                  durationMinutes: true,
                  totalMarks: true,
                  officialStartAt: true,
                  expectedStartDate: true,
                },
              },
            },
          })
          if (!exam)
            throw new ToolActionExecutionError(
              "The agent-visible exam is unavailable.",
              "NOT_AVAILABLE"
            )
          examContext = exam
        }
        const rows = await tx.block.findMany({
          where: {
            ...agentStudyBlockWhere(
              input.workspaceId,
              isExam ? "exam" : "subject",
              input.installationId
            ),
            ...search,
            ...blockBoundary(cursor(args.cursor, "block")),
            blockType: { key: isExam ? "exam-prep.exam" : "exam-prep.subject" },
            ...(isExam
              ? { examDetails: { isNot: null } }
              : { subjectDetails: { isNot: null } }),
            ...(!isExam && args.examId
              ? {
                  incomingRelations: {
                    some: {
                      workspaceId: input.workspaceId,
                      fromBlockId: args.examId,
                      relationType: { key: "exam-prep.exam-has-subject" },
                      fromBlock: agentStudyBlockWhere(
                        input.workspaceId,
                        "exam",
                        input.installationId
                      ),
                    },
                  },
                }
              : {}),
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: args.limit + 1,
          select: blockSelect,
        })
        const page = pageBlocks(rows, args.limit)
        result = {
          items: page.items.map(blockDto),
          nextCursor: page.nextCursor,
          ...(examContext
            ? {
                exam: {
                  ...blockDto(examContext),
                  examCode: examContext.examDetails?.examCode ?? null,
                  durationMinutes:
                    examContext.examDetails?.durationMinutes ?? null,
                  totalMarks:
                    examContext.examDetails?.totalMarks?.toNumber() ?? null,
                  officialStartAt:
                    examContext.examDetails?.officialStartAt?.toISOString() ??
                    null,
                  expectedStartDate:
                    examContext.examDetails?.expectedStartDate?.toISOString() ??
                    null,
                },
                childType: "subject",
                continuation:
                  "Use subject.get-context to browse each subject’s chapters and topics.",
              }
            : {}),
        }
      } else if (kind === "subject.get-progress") {
        if (!args.subjectId)
          throw new ToolActionExecutionError(
            "subjectId is required.",
            "INVALID_INPUT"
          )
        const subject = await tx.block.findFirst({
          where: {
            ...visible,
            id: args.subjectId,
            blockType: { key: "exam-prep.subject" },
            subjectDetails: { isNot: null },
          },
          select: { ...blockSelect, properties: true },
        })
        if (!subject)
          throw new ToolActionExecutionError(
            "The agent-visible subject is unavailable.",
            "NOT_AVAILABLE"
          )
        const [chapters, topics] = await Promise.all([
          tx.block.findMany({
            where: {
              ...visible,
              blockType: { key: "exam-prep.chapter" },
              incomingRelations: {
                some: {
                  workspaceId: input.workspaceId,
                  fromBlockId: subject.id,
                  relationType: { key: "exam-prep.subject-has-chapter" },
                },
              },
            },
            select: { id: true },
            orderBy: { id: "asc" },
            take: 201,
          }),
          tx.block.findMany({
            where: {
              ...visible,
              blockType: { key: "exam-prep.topic" },
              ...topicParentFilter(visible, subject.id),
            },
            select: {
              properties: true,
              topicDetails: { select: { isImportant: true } },
            },
            orderBy: { id: "asc" },
            take: 501,
          }),
        ])
        const records = await tx.testRecord.findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: principal.actorId,
            exam: { ...visible, blockType: { key: "exam-prep.exam" } },
            OR: [
              { subjectId: subject.id },
              { chapterId: { in: chapters.map((chapter) => chapter.id) } },
            ],
          },
          select: {
            id: true,
            chapterId: true,
            scope: true,
            marksObtained: true,
            totalMarks: true,
            targetChapters: {
              where: {
                workspaceId: input.workspaceId,
                chapterId: { in: chapters.map((chapter) => chapter.id) },
              },
              select: { chapterId: true },
              take: 201,
            },
          },
          orderBy: { id: "asc" },
          take: 501,
        })
        const complete =
          chapters.length <= 200 &&
          topics.length <= 500 &&
          records.length <= 500 &&
          records.every((record) => record.targetChapters.length <= 200)
        const policy = normalizeSubjectProgressPolicy(
          object(subject.properties) as Partial<SubjectProgressPolicyInput>
        )
        const tests = complete
          ? calculateSubjectTestProgress({
              chapterIds: chapters.map((chapter) => chapter.id),
              policy,
              records: records.map((record) => ({
                id: record.id,
                chapterId: record.chapterId,
                scope: record.scope?.toLowerCase().replace("_", "-") as
                  "subject" | "chapter" | "multi-chapter" | undefined,
                marksObtained: record.marksObtained.toNumber(),
                totalMarks: record.totalMarks.toNumber(),
                targetChapterIds: record.targetChapters.map(
                  (chapter) => chapter.chapterId
                ),
              })),
            })
          : null
        result = {
          subject: blockDto(subject),
          complete,
          topicCount: complete ? topics.length : null,
          chapterCount: complete ? chapters.length : null,
          progress: complete
            ? calculateProgressRollup(
                topics.map((topic) =>
                  topicSnapshot(
                    topic.properties,
                    topic.topicDetails?.isImportant ?? false
                  )
                ),
                policy,
                tests!.percentage
              )
            : null,
          policy,
          testEvidence: tests,
          evidenceScope:
            "Agent-visible syllabus learning/revision/practice state; current user’s manual test records. CBT attempts remain separate assessment evidence.",
          ...(complete
            ? {}
            : {
                notice:
                  "This subject exceeds bounded rollup limits (200 chapters, 500 topics or 500 results). No partial progress is presented as a full rollup; use subject.get-context pages to inspect it.",
              }),
        }
      } else if (kind === "exam.get-weak-topics") {
        if (!args.examId || !args.stage)
          throw new ToolActionExecutionError(
            "examId and stage are required.",
            "INVALID_INPUT"
          )
        const exam = await tx.block.findFirst({
          where: {
            ...visible,
            id: args.examId,
            blockType: { key: "exam-prep.exam" },
            examDetails: { isNot: null },
          },
          select: { id: true },
        })
        if (!exam)
          throw new ToolActionExecutionError(
            "The agent-visible exam is unavailable.",
            "NOT_AVAILABLE"
          )
        const rows = await tx.block.findMany({
          where: {
            ...visible,
            ...search,
            ...blockBoundary(cursor(args.cursor, "block")),
            blockType: { key: "exam-prep.topic" },
            ...topicParentFilter(visible, undefined, exam.id),
          },
          select: {
            ...blockSelect,
            properties: true,
            topicDetails: { select: { isImportant: true } },
            incomingRelations: {
              where: {
                workspaceId: input.workspaceId,
                relationType: { key: "exam-prep.chapter-has-topic" },
                fromBlock: {
                  ...visible,
                  blockType: { key: "exam-prep.chapter" },
                },
              },
              take: 1,
              select: {
                fromBlock: {
                  select: {
                    incomingRelations: {
                      where: {
                        workspaceId: input.workspaceId,
                        relationType: { key: "exam-prep.subject-has-chapter" },
                        fromBlock: {
                          ...visible,
                          blockType: { key: "exam-prep.subject" },
                        },
                      },
                      take: 1,
                      select: { fromBlock: { select: { properties: true } } },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: args.limit + 1,
        })
        const page = pageBlocks(rows, args.limit)
        const personal =
          args.stage === "test"
            ? await tx.topicProgress.findMany({
                where: {
                  workspaceId: input.workspaceId,
                  userId: principal.actorId,
                  blockId: { in: page.items.map((topic) => topic.id) },
                },
                select: { blockId: true, proficiency: true },
                take: args.limit,
              })
            : []
        const proficiency = new Map(
          personal.map((item) => [item.blockId, item.proficiency.toNumber()])
        )
        const items = page.items
          .map((topic) => {
            const subjectProps =
              topic.incomingRelations[0]?.fromBlock.incomingRelations[0]
                ?.fromBlock.properties
            const policy = normalizeSubjectProgressPolicy(
              object(subjectProps) as Partial<SubjectProgressPolicyInput>
            )
            const progress =
              args.stage === "test"
                ? (proficiency.get(topic.id) ?? 0)
                : calculateTopicProgress(
                    topicSnapshot(
                      topic.properties,
                      topic.topicDetails?.isImportant ?? false
                    ),
                    policy
                  )[args.stage as "learning" | "revision" | "practice"]
            return {
              ...blockDto(topic),
              progress: Math.max(0, Math.min(100, progress)),
              important: topic.topicDetails?.isImportant ?? false,
            }
          })
          .filter((topic) => topic.progress < 100)
          .sort(
            (left, right) =>
              left.progress - right.progress ||
              Number(right.important) - Number(left.important)
          )
        result = {
          examId: exam.id,
          stage: args.stage,
          items,
          scannedCount: page.items.length,
          nextCursor: page.nextCursor,
          selectionScope:
            "Current page of agent-visible exam syllabus topics; continue with cursor to inspect more.",
          measure:
            args.stage === "test"
              ? "Current user’s assessment proficiency; unassessed topics are 0. Separate from manual test completion targets."
              : "Shared syllabus stage completion against each subject’s current targets.",
        }
      } else if (kind === "subject.get-context") {
        if (!args.subjectId)
          throw new ToolActionExecutionError(
            "subjectId is required.",
            "INVALID_INPUT"
          )
        const subject = await tx.block.findFirst({
          where: {
            ...visible,
            id: args.subjectId,
            blockType: { key: "exam-prep.subject" },
            subjectDetails: { isNot: null },
          },
          select: blockSelect,
        })
        if (!subject)
          throw new ToolActionExecutionError(
            "The agent-visible subject is unavailable.",
            "NOT_AVAILABLE"
          )
        let chapter: typeof subject | null = null
        if (args.chapterId) {
          const link = await tx.blockRelation.findFirst({
            where: {
              workspaceId: input.workspaceId,
              fromBlockId: subject.id,
              toBlockId: args.chapterId,
              relationType: { key: "exam-prep.subject-has-chapter" },
              toBlock: {
                ...visible,
                blockType: { key: "exam-prep.chapter" },
                chapterDetails: { isNot: null },
              },
            },
            select: { toBlock: { select: blockSelect } },
          })
          chapter = link?.toBlock ?? null
          if (!chapter)
            throw new ToolActionExecutionError(
              "The chapter is not an agent-visible child of this subject.",
              "NOT_AVAILABLE"
            )
        }
        const after = cursor(args.cursor, "edge")
        const rows = await tx.blockRelation.findMany({
          where: {
            workspaceId: input.workspaceId,
            fromBlockId: chapter?.id ?? subject.id,
            relationType: {
              key: chapter
                ? "exam-prep.chapter-has-topic"
                : "exam-prep.subject-has-chapter",
            },
            toBlock: {
              ...visible,
              ...search,
              blockType: {
                key: chapter ? "exam-prep.topic" : "exam-prep.chapter",
              },
            },
            ...(after
              ? {
                  OR: [
                    { position: { gt: after.position } },
                    { position: after.position, id: { gt: after.id } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            position: true,
            toBlock: { select: blockSelect },
          },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          take: args.limit + 1,
        })
        const items = rows.slice(0, args.limit)
        const last = items.at(-1)
        result = {
          subject: blockDto(subject),
          chapter: chapter ? blockDto(chapter) : null,
          childType: chapter ? "topic" : "chapter",
          items: items.map((row) => ({
            ...blockDto(row.toBlock),
            position: row.position,
          })),
          nextCursor:
            rows.length > args.limit && last
              ? encode({ kind: "edge", id: last.id, position: last.position })
              : null,
        }
      } else if (kind === "assessment.list") {
        const rows = await tx.block.findMany({
          where: {
            ...visible,
            ...search,
            ...blockBoundary(cursor(args.cursor, "block")),
            blockType: { key: "mock-tests.assessment" },
            assessmentDetails: {
              is: {
                workspaceId: input.workspaceId,
                status: { not: "ARCHIVED" },
                ...(args.contextBlockId
                  ? { examBlockId: args.contextBlockId }
                  : {}),
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: args.limit + 1,
          select: {
            ...blockSelect,
            assessmentDetails: {
              select: {
                status: true,
                durationMinutes: true,
                totalMarks: true,
                examBlock: {
                  select: {
                    id: true,
                  },
                },
                _count: { select: { questions: true } },
              },
            },
          },
        })
        const page = pageBlocks(rows, args.limit)
        const contextIds = [
          ...new Set(
            page.items.flatMap((row) =>
              row.assessmentDetails?.examBlock
                ? [row.assessmentDetails.examBlock.id]
                : []
            )
          ),
        ]
        const visibleContexts = contextIds.length
          ? await tx.block.findMany({
              where: {
                id: { in: contextIds },
                OR: (["exam", "subject", "chapter", "topic"] as const).map(
                  (studyKind) =>
                    agentStudyBlockWhere(input.workspaceId, studyKind)
                ),
              },
              take: contextIds.length,
              select: { id: true },
            })
          : []
        const visibleContextIds = new Set(visibleContexts.map((row) => row.id))
        result = {
          items: page.items.map((row) => ({
            ...blockDto(row),
            status: row.assessmentDetails!.status,
            durationMinutes: row.assessmentDetails!.durationMinutes,
            configuredMarks:
              row.assessmentDetails!.totalMarks?.toNumber() ?? null,
            questionCount: row.assessmentDetails!._count.questions,
            contextBlockId:
              row.assessmentDetails!.examBlock &&
              visibleContextIds.has(row.assessmentDetails!.examBlock.id)
                ? row.assessmentDetails!.examBlock!.id
                : null,
          })),
          nextCursor: page.nextCursor,
        }
      } else if (kind === "attempt.list") {
        const after = cursor(args.cursor, "attempt")
        const rows = await tx.attempt.findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: principal.actorId,
            ...(args.assessmentId ? { assessmentId: args.assessmentId } : {}),
            ...(args.status ? { status: args.status } : {}),
            assessment: {
              workspaceId: input.workspaceId,
              status: { not: "ARCHIVED" },
              block: {
                ...visible,
                ...search,
                blockType: { key: "mock-tests.assessment" },
              },
            },
            ...(after
              ? {
                  OR: [
                    { startedAt: { lt: new Date(after.startedAt) } },
                    {
                      startedAt: new Date(after.startedAt),
                      id: { lt: after.id },
                    },
                  ],
                }
              : {}),
          },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          take: args.limit + 1,
          select: {
            id: true,
            assessmentId: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            evaluatedAt: true,
            score: true,
            maxScore: true,
            timeSpentSeconds: true,
            assessment: { select: { block: { select: { title: true } } } },
          },
        })
        const items = rows.slice(0, args.limit)
        const last = items.at(-1)
        result = {
          items: items.map((row) => ({
            id: row.id,
            assessmentId: row.assessmentId,
            assessmentTitle: row.assessment.block.title,
            status: row.status,
            startedAt: row.startedAt.toISOString(),
            submittedAt: row.submittedAt?.toISOString() ?? null,
            evaluatedAt: row.evaluatedAt?.toISOString() ?? null,
            score:
              row.status === "EVALUATED"
                ? (row.score?.toNumber() ?? null)
                : null,
            maxScore:
              row.status === "EVALUATED"
                ? (row.maxScore?.toNumber() ?? null)
                : null,
            timeSpentSeconds: row.timeSpentSeconds,
          })),
          nextCursor:
            rows.length > args.limit && last
              ? encode({
                  kind: "attempt",
                  id: last.id,
                  startedAt: last.startedAt.toISOString(),
                })
              : null,
        }
      } else {
        const rows = await tx.question.findMany({
          where: {
            workspaceId: input.workspaceId,
            authoredById: principal.actorId,
            status: { not: "ARCHIVED" },
            ...blockBoundary(cursor(args.cursor, "block")),
            ...(args.search
              ? { stem: { contains: args.search, mode: "insensitive" } }
              : {}),
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: args.limit + 1,
          select: {
            id: true,
            stem: true,
            kind: true,
            difficulty: true,
            updatedAt: true,
            _count: { select: { options: true } },
          },
        })
        const page = pageBlocks(rows, args.limit)
        result = {
          items: page.items.map((row) => ({
            id: row.id,
            stemPreview: row.stem.slice(0, 400),
            kind: row.kind,
            difficulty: row.difficulty,
            updatedAt: row.updatedAt.toISOString(),
            optionCount: row._count.options,
          })),
          nextCursor: page.nextCursor,
        }
      }
      const jsonData = JSON.parse(
        JSON.stringify(result)
      ) as Prisma.InputJsonObject
      await tx.toolRun.create({
        data: {
          id: runId,
          workspaceId: input.workspaceId,
          installationId: input.installationId,
          toolReleaseId: installation.toolReleaseId,
          actorId: principal.actorId,
          actionKey: input.actionKey,
          handlerVersion,
          invocationSource: principal.invocationSource,
          idempotencyKey: input.idempotencyKey,
          inputHash: createHash("sha256")
            .update(JSON.stringify(input.input))
            .digest("hex"),
          manifestHash: createHash("sha256")
            .update(JSON.stringify(installation.toolRelease.manifest))
            .digest("hex"),
          status: "SUCCEEDED",
          startedAt: new Date(),
          completedAt: new Date(),
          payload: {
            create: {
              input: input.input as Prisma.InputJsonObject,
              output: { data: jsonData },
            },
          },
        },
      })
      return jsonData
    })
    return {
      runId,
      status: "succeeded",
      createdBlockIds: [],
      evidenceIds: [],
      data: data as ToolActionResult["data"],
    }
  }
}

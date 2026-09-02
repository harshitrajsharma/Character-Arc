import "server-only"

import { cache } from "react"
import { z } from "zod"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { buildAnalysis, type AnalysisDoc } from "./calculations/analysis"
import type { QuestionKind } from "./calculations/scoring"

export type MockTestStatus = "draft" | "published" | "archived"

export type MockTestListItem = {
  id: string
  title: string
  status: MockTestStatus
  questionCount: number
  durationMinutes: number | null
  totalMarks: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  attemptsCount: number
  myBestPercentage: number | null
}

export type RecentAttemptItem = {
  id: string
  assessmentId: string
  assessmentTitle: string
  status: "in_progress" | "submitted" | "evaluated" | "abandoned"
  score: number | null
  maxScore: number | null
  percentage: number | null
  startedAt: string
  submittedAt: string | null
}

export type PublicQuestion = {
  id: string
  kind: QuestionKind
  stem: string
  difficulty: number | null
  options: Array<{ key: string; content: string }>
}

export type AssessmentQuestionView = PublicQuestion & {
  position: number
  section: string | null
  marks: number
  negativeMarks: number
  answerKeys?: string[]
  numericAnswer?: number | null
  textAnswer?: string | null
  explanation?: string | null
  targetTitles?: string[]
}

export type QuestionBankItem = {
  id: string
  kind: QuestionKind
  stem: string
  difficulty: number | null
  status: "draft" | "published" | "archived"
  options: Array<{ key: string; content: string }>
  answerKeys: string[]
  numericAnswer: number | null
  textAnswer: string | null
  explanation: string | null
  targetTitles: string[]
  targetsCount: number
  assessmentsCount: number
  createdAt: string
  updatedAt: string
}

export type TargetableBlock = {
  blockId: string
  title: string
  blockTypeKey: string | null
}

export type WeakTopic = {
  blockId: string
  title: string | null
  blockTypeKey: string | null
  proficiency: number
  confidence: number
  evidenceCount: number
}

export type MockTestsOverview = {
  assessments: MockTestListItem[]
  recentAttempts: RecentAttemptItem[]
  issue: "catalog_unavailable" | "data_unavailable" | null
}

export type AssessmentAttemptHistory = {
  id: string
  attemptNumber: number
  status: "in_progress" | "submitted" | "evaluated" | "abandoned"
  startedAt: string
  submittedAt: string | null
  durationSeconds: number | null
  score: number | null
  maxScore: number | null
  accuracyRate: number | null
}

export type AssessmentDetail = {
  id: string
  title: string
  summary: string | null
  status: MockTestStatus
  revision: number
  durationMinutes: number | null
  totalMarks: number | null
  instructions: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  questionCount: number
  questions: AssessmentQuestionView[]
  isPublishable: boolean
}

export type PlayerAttempt = {
  attemptId: string
  attemptStatus: "in_progress" | "submitted" | "evaluated" | "abandoned"
  assessmentId: string
  assessmentTitle: string
  durationMinutes: number | null
  instructions: string | null
  startedAt: string
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  candidateName?: string | null
  candidateAvatarUrl?: string | null
  organizerName?: string | null
  questions: Array<
    AssessmentQuestionView & {
      selectedKeys: string[]
      answerText: string | null
    }
  >
}

function toNumber(
  value: { toString(): string } | number | null
): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value.toString())
  return Number.isFinite(parsed) ? parsed : null
}

function statusOf(value: string): MockTestStatus {
  if (value === "PUBLISHED") return "published"
  if (value === "ARCHIVED") return "archived"
  return "draft"
}

export async function getMockTestsOverview(
  workspaceId: string,
  workspaceSlug: string,
  installationId: string
): Promise<MockTestsOverview> {
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(workspaceSlug)}`
  )

  const blockType = await prisma.blockType.findUnique({
    where: { key: "mock-tests.assessment" },
    select: { id: true },
  })
  if (!blockType) {
    return { assessments: [], recentAttempts: [], issue: "catalog_unavailable" }
  }

  const blocks = await prisma.block.findMany({
    where: {
      workspaceId,
      blockTypeId: blockType.id,
      originToolInstallationId: installationId,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      assessmentDetails: {
        select: {
          status: true,
          durationMinutes: true,
          totalMarks: true,
          publishedAt: true,
          _count: { select: { questions: true, attempts: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  const assessmentIds = blocks.map((block) => block.id)
  const attemptsData = assessmentIds.length
    ? await prisma.attempt.findMany({
        where: {
          workspaceId,
          userId: claims.sub,
          assessmentId: { in: assessmentIds },
          status: "EVALUATED",
        },
        select: { assessmentId: true, score: true, maxScore: true },
      })
    : []

  const bestByAssessment = new Map<string, number>()
  for (const attempt of attemptsData) {
    const score = toNumber(attempt.score)
    const maxScore = toNumber(attempt.maxScore)
    if (score === null || maxScore === null || maxScore <= 0) continue
    const percentage = (score / maxScore) * 100
    const current = bestByAssessment.get(attempt.assessmentId)
    if (current === undefined || percentage > current) {
      bestByAssessment.set(attempt.assessmentId, percentage)
    }
  }

  const assessments: MockTestListItem[] = blocks.map((block) => ({
    id: block.id,
    title: block.title,
    status: statusOf(block.assessmentDetails?.status ?? "DRAFT"),
    questionCount: block.assessmentDetails?._count.questions ?? 0,
    durationMinutes: block.assessmentDetails?.durationMinutes ?? null,
    totalMarks: toNumber(block.assessmentDetails?.totalMarks ?? null),
    publishedAt: block.assessmentDetails?.publishedAt?.toISOString() ?? null,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
    attemptsCount: block.assessmentDetails?._count.attempts ?? 0,
    myBestPercentage: bestByAssessment.get(block.id) ?? null,
  }))

  const recentAttemptsData = await prisma.attempt.findMany({
    where: { workspaceId, userId: claims.sub },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      assessment: { select: { block: { select: { title: true } } } },
    },
    orderBy: { startedAt: "desc" },
    take: 5,
  })

  const recentAttempts: RecentAttemptItem[] = recentAttemptsData.map(
    (attempt) => {
      const score = toNumber(attempt.score)
      const maxScore = toNumber(attempt.maxScore)
      return {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        assessmentTitle: attempt.assessment.block.title,
        status: attempt.status.toLowerCase() as RecentAttemptItem["status"],
        score,
        maxScore,
        percentage:
          score !== null && maxScore !== null && maxScore > 0
            ? Math.round((score / maxScore) * 10000) / 100
            : null,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      }
    }
  )

  return { assessments, recentAttempts, issue: null }
}

export const getAssessmentDetail = cache(
  async (
    workspaceId: string,
    assessmentId: string
  ): Promise<AssessmentDetail | null> => {
    const parsed = z.uuid().safeParse(assessmentId)
    if (!parsed.success) return null

    const assessment = await prisma.assessment.findFirst({
      where: { blockId: assessmentId, workspaceId },
      select: {
        blockId: true,
        status: true,
        durationMinutes: true,
        totalMarks: true,
        instructions: true,
        publishedAt: true,
        block: {
          select: {
            title: true,
            summary: true,
            revision: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        questions: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            section: true,
            position: true,
            marks: true,
            negativeMarks: true,
            question: {
              select: {
                id: true,
                kind: true,
                stem: true,
                difficulty: true,
                status: true,
                options: {
                  orderBy: { position: "asc" },
                  select: { key: true, content: true, position: true },
                },
                solution: {
                  select: {
                    explanation: true,
                    numericAnswer: true,
                    textAnswer: true,
                    correctOptions: {
                      select: { questionOption: { select: { key: true } } },
                    },
                  },
                },
                targets: {
                  select: {
                    block: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!assessment) return null

    return {
      id: assessment.blockId,
      title: assessment.block.title,
      summary: assessment.block.summary,
      status: statusOf(assessment.status),
      revision: Number(assessment.block.revision),
      durationMinutes: assessment.durationMinutes,
      totalMarks: toNumber(assessment.totalMarks),
      instructions: assessment.instructions,
      publishedAt: assessment.publishedAt?.toISOString() ?? null,
      createdAt: assessment.block.createdAt.toISOString(),
      updatedAt: assessment.block.updatedAt.toISOString(),
      questionCount: assessment.questions.length,
      questions: assessment.questions.map((row) => ({
        id: row.question.id,
        kind: row.question.kind as QuestionKind,
        stem: row.question.stem,
        difficulty: row.question.difficulty,
        options: row.question.options.map((option) => ({
          key: option.key,
          content: option.content,
        })),
        answerKeys: (row.question.solution?.correctOptions ?? [])
          .map((c) => c.questionOption?.key)
          .filter((k): k is string => typeof k === "string"),
        numericAnswer: row.question.solution?.numericAnswer
          ? Number(row.question.solution.numericAnswer)
          : null,
        textAnswer: row.question.solution?.textAnswer ?? null,
        explanation: row.question.solution?.explanation ?? null,
        targetTitles: row.question.targets
          .map((t) => t.block?.title)
          .filter(
            (title): title is string =>
              typeof title === "string" && title.length > 0
          ),
        position: row.position,
        section: row.section,
        marks: toNumber(row.marks) ?? 0,
        negativeMarks: toNumber(row.negativeMarks) ?? 0,
      })),
      isPublishable: assessment.questions.length > 0,
    }
  }
)

export async function getAssessmentAttempts(
  workspaceId: string,
  assessmentId: string
): Promise<AssessmentAttemptHistory[]> {
  const claims = await requireVerifiedClaims(
    `/workspace/${encodeURIComponent(workspaceId)}`
  )
  const parsed = z.uuid().safeParse(assessmentId)
  if (!parsed.success) return []

  const where = { workspaceId, assessmentId, userId: claims.sub }
  const [rows, totalAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        maxScore: true,
        responses: {
          select: { isCorrect: true },
        },
      },
    }),
    prisma.attempt.count({ where }),
  ])

  return rows.map((row, index) => {
    const score = toNumber(row.score)
    const maxScore = toNumber(row.maxScore)
    const correctCount = row.responses.filter((r) => r.isCorrect).length
    const totalCount = row.responses.length
    const accuracyRate =
      totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null
    const durationSeconds =
      row.submittedAt && row.startedAt
        ? Math.max(
            0,
            Math.round(
              (row.submittedAt.getTime() - row.startedAt.getTime()) / 1000
            )
          )
        : null

    return {
      id: row.id,
      attemptNumber: totalAttempts - index,
      status: row.status.toLowerCase() as AssessmentAttemptHistory["status"],
      startedAt: row.startedAt.toISOString(),
      submittedAt: row.submittedAt?.toISOString() ?? null,
      durationSeconds,
      score,
      maxScore,
      accuracyRate,
    }
  })
}
export const getAttemptForPlayer = cache(
  async (
    workspaceId: string,
    attemptId: string,
    userId: string
  ): Promise<PlayerAttempt | null> => {
    const parsed = z.uuid().safeParse(attemptId)
    if (!parsed.success) return null

    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, workspaceId, userId },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        score: true,
        maxScore: true,
        startedAt: true,
        submittedAt: true,
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        workspace: {
          select: {
            name: true,
          },
        },
        assessment: {
          select: {
            durationMinutes: true,
            instructions: true,
            block: { select: { title: true } },
          },
        },
        responses: {
          select: {
            questionId: true,
            answerText: true,
            selectedOptions: {
              select: { questionOption: { select: { key: true } } },
            },
          },
        },
      },
    })
    if (!attempt) return null

    const questionsData = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: attempt.assessmentId, workspaceId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        section: true,
        position: true,
        marks: true,
        negativeMarks: true,
        question: {
          select: {
            id: true,
            kind: true,
            stem: true,
            difficulty: true,
            options: {
              orderBy: { position: "asc" },
              select: { key: true, content: true, position: true },
            },
          },
        },
      },
    })

    const responsesByQuestion = new Map(
      attempt.responses.map((response) => [
        response.questionId,
        {
          answerText: response.answerText,
          selectedKeys: response.selectedOptions.map(
            (option) => option.questionOption.key
          ),
        },
      ])
    )

    return {
      attemptId: attempt.id,
      attemptStatus:
        attempt.status.toLowerCase() as PlayerAttempt["attemptStatus"],
      assessmentId: attempt.assessmentId,
      assessmentTitle: attempt.assessment.block.title,
      durationMinutes: attempt.assessment.durationMinutes,
      instructions: attempt.assessment.instructions,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      score: toNumber(attempt.score),
      maxScore: toNumber(attempt.maxScore),
      candidateName: attempt.user?.displayName ?? null,
      candidateAvatarUrl: attempt.user?.avatarUrl ?? null,
      organizerName: attempt.workspace?.name ?? null,
      questions: questionsData.map((row) => {
        const saved = responsesByQuestion.get(row.question.id)
        return {
          id: row.question.id,
          kind: row.question.kind as QuestionKind,
          stem: row.question.stem,
          difficulty: row.question.difficulty,
          options: row.question.options.map((option) => ({
            key: option.key,
            content: option.content,
          })),
          position: row.position,
          section: row.section,
          marks: toNumber(row.marks) ?? 0,
          negativeMarks: toNumber(row.negativeMarks) ?? 0,
          selectedKeys: saved?.selectedKeys ?? [],
          answerText: saved?.answerText ?? null,
        }
      }),
    }
  }
)

export const getAttemptAnalysis = cache(
  async (
    workspaceId: string,
    attemptId: string,
    userId: string
  ): Promise<AnalysisDoc | null> => {
    const parsed = z.uuid().safeParse(attemptId)
    if (!parsed.success) return null

    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, workspaceId, userId },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        assessment: {
          select: {
            blockId: true,
            durationMinutes: true,
            block: { select: { title: true } },
          },
        },
        responses: {
          select: {
            questionId: true,
            answerText: true,
            isCorrect: true,
            awardedMarks: true,
            timeSpentSeconds: true,
            selectedOptions: {
              select: { questionOption: { select: { key: true } } },
            },
            question: {
              select: {
                id: true,
                kind: true,
                stem: true,
                difficulty: true,
                options: {
                  orderBy: { position: "asc" },
                  select: { id: true, key: true, content: true },
                },
                solution: {
                  select: {
                    explanation: true,
                    numericAnswer: true,
                    textAnswer: true,
                    correctOptions: { select: { questionOptionId: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!attempt) return null

    const questionConfigs = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: attempt.assessmentId, workspaceId },
      select: {
        questionId: true,
        section: true,
        position: true,
        marks: true,
        negativeMarks: true,
      },
    })
    const configByQuestion = new Map(
      questionConfigs.map((config) => [config.questionId, config])
    )

    const questions = attempt.responses.map((response) => {
      const config = configByQuestion.get(response.questionId)
      const optionIdToKey = new Map(
        response.question.options.map((option) => [option.id, option.key])
      )
      const correctKeys = (
        response.question.solution?.correctOptions ?? []
      ).map(
        (solutionOption) =>
          optionIdToKey.get(solutionOption.questionOptionId) ??
          solutionOption.questionOptionId
      )

      return {
        questionId: response.question.id,
        position: config?.position ?? 0,
        section: config?.section ?? null,
        kind: response.question.kind as QuestionKind,
        stem: response.question.stem,
        difficulty: response.question.difficulty,
        marks: toNumber(config?.marks ?? null) ?? 0,
        negativeMarks: toNumber(config?.negativeMarks ?? null) ?? 0,
        options: response.question.options.map((option) => ({
          key: option.key,
          content: option.content,
        })),
        selectedKeys: response.selectedOptions.map(
          (selected) => selected.questionOption.key
        ),
        answerText: response.answerText,
        timeSpentSeconds: response.timeSpentSeconds,
        isCorrect: response.isCorrect,
        awardedMarks: toNumber(response.awardedMarks) ?? 0,
        correctKeys,
        explanation: response.question.solution?.explanation ?? null,
        numericAnswer: toNumber(
          response.question.solution?.numericAnswer ?? null
        ),
        modelAnswer: response.question.solution?.textAnswer ?? null,
      }
    })

    const weakTopics = await getWeakTopics(workspaceId, userId, 10)

    return buildAnalysis({
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      assessmentTitle: attempt.assessment.block.title,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      durationMinutes: attempt.assessment.durationMinutes,
      questions,
      weakTopics,
    })
  }
)

export const getQuestionBank = cache(
  async (workspaceId: string): Promise<QuestionBankItem[]> => {
    const rows = await prisma.question.findMany({
      where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        kind: true,
        stem: true,
        difficulty: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        options: {
          select: { key: true, content: true },
          orderBy: { position: "asc" },
        },
        solution: {
          select: {
            numericAnswer: true,
            textAnswer: true,
            explanation: true,
            correctOptions: {
              select: { questionOption: { select: { key: true } } },
            },
          },
        },
        targets: {
          select: {
            block: { select: { title: true } },
          },
        },
        _count: { select: { assessments: true, targets: true } },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as QuestionKind,
      stem: row.stem,
      difficulty: row.difficulty,
      status: row.status.toLowerCase() as QuestionBankItem["status"],
      options: row.options.map((o) => ({ key: o.key, content: o.content })),
      answerKeys: (row.solution?.correctOptions ?? [])
        .map((c) => c.questionOption?.key)
        .filter((k): k is string => typeof k === "string"),
      numericAnswer: row.solution?.numericAnswer
        ? Number(row.solution.numericAnswer)
        : null,
      textAnswer: row.solution?.textAnswer ?? null,
      explanation: row.solution?.explanation ?? null,
      targetTitles: row.targets
        .map((t) => t.block?.title)
        .filter(
          (title): title is string =>
            typeof title === "string" && title.length > 0
        ),
      targetsCount: row._count.targets,
      assessmentsCount: row._count.assessments,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  }
)

export type QuestionDetail = {
  id: string
  kind: QuestionKind
  stem: string
  difficulty: number | null
  status: "draft" | "published" | "archived"
  options: Array<{ key: string; content: string; position: number }>
  answerKeys: string[]
  numericAnswer: number | null
  textAnswer: string | null
  explanation: string | null
  targets: Array<{
    blockId: string
    title: string | null
    blockTypeKey: string | null
    weight: number
    isPrimary: boolean
  }>
  createdAt: string
  updatedAt: string
}

export const getQuestionDetail = cache(
  async (
    workspaceId: string,
    questionId: string
  ): Promise<QuestionDetail | null> => {
    const parsed = z.uuid().safeParse(questionId)
    if (!parsed.success) return null

    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        workspaceId,
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      select: {
        id: true,
        kind: true,
        stem: true,
        difficulty: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        options: {
          orderBy: { position: "asc" },
          select: { key: true, content: true, position: true },
        },
        solution: {
          select: {
            explanation: true,
            numericAnswer: true,
            textAnswer: true,
            correctOptions: {
              select: { questionOption: { select: { key: true } } },
            },
          },
        },
        targets: {
          select: {
            blockId: true,
            weight: true,
            isPrimary: true,
            block: {
              select: { title: true, blockType: { select: { key: true } } },
            },
          },
        },
      },
    })
    if (!question) return null

    return {
      id: question.id,
      kind: question.kind as QuestionKind,
      stem: question.stem,
      difficulty: question.difficulty,
      status: question.status.toLowerCase() as QuestionDetail["status"],
      options: question.options.map((option) => ({
        key: option.key,
        content: option.content,
        position: option.position,
      })),
      answerKeys: (question.solution?.correctOptions ?? []).map(
        (option) => option.questionOption.key
      ),
      numericAnswer: toNumber(question.solution?.numericAnswer ?? null),
      textAnswer: question.solution?.textAnswer ?? null,
      explanation: question.solution?.explanation ?? null,
      targets: question.targets.map((target) => ({
        blockId: target.blockId,
        title: target.block.title,
        blockTypeKey: target.block.blockType.key,
        weight: toNumber(target.weight) ?? 100,
        isPrimary: target.isPrimary,
      })),
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    }
  }
)

export const getTargetableBlocks = cache(
  async (workspaceId: string): Promise<TargetableBlock[]> => {
    const blockTypes = await prisma.blockType.findMany({
      where: { key: { in: ["exam-prep.topic", "exam-prep.chapter"] } },
      select: { id: true, key: true },
    })
    if (blockTypes.length === 0) return []

    const rows = await prisma.block.findMany({
      where: {
        workspaceId,
        blockTypeId: { in: blockTypes.map((type) => type.id) },
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true, title: true, blockTypeId: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    })

    const keyById = new Map(blockTypes.map((type) => [type.id, type.key]))
    return rows.map((row) => ({
      blockId: row.id,
      title: row.title,
      blockTypeKey: keyById.get(row.blockTypeId) ?? null,
    }))
  }
)

export async function getWeakTopics(
  workspaceId: string,
  userId: string,
  limit = 20
): Promise<WeakTopic[]> {
  const rows = await prisma.topicProgress.findMany({
    where: { workspaceId, userId },
    orderBy: [{ proficiency: "asc" }, { confidence: "asc" }],
    take: Math.min(50, Math.max(1, limit)),
    select: {
      blockId: true,
      proficiency: true,
      confidence: true,
      evidenceCount: true,
      block: {
        select: {
          title: true,
          blockType: { select: { key: true } },
        },
      },
    },
  })

  return rows.map((row) => ({
    blockId: row.blockId,
    title: row.block.title,
    blockTypeKey: row.block.blockType.key,
    proficiency: toNumber(row.proficiency) ?? 0,
    confidence: toNumber(row.confidence) ?? 0,
    evidenceCount: row.evidenceCount,
  }))
}

export const getAttemptForExamRoom = cache(
  async (
    attemptId: string
  ): Promise<{ attempt: PlayerAttempt; workspaceSlug: string } | null> => {
    const parsed = z.uuid().safeParse(attemptId)
    if (!parsed.success) return null

    const attemptRow = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        workspace: { select: { slug: true } },
      },
    })
    if (!attemptRow) return null

    const playerAttempt = await getAttemptForPlayer(
      attemptRow.workspaceId,
      attemptRow.id,
      attemptRow.userId
    )
    if (!playerAttempt) return null

    return {
      attempt: playerAttempt,
      workspaceSlug: attemptRow.workspace.slug,
    }
  }
)

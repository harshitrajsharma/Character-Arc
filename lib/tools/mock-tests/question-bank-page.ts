import "server-only"

import type { Prisma, QuestionKind } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { QuestionBankItem } from "@/lib/tools/definitions/mock-tests/repository"

type SearchParams = Record<string, string | string[] | undefined>

export type QuestionBankPageData = {
  bank: QuestionBankItem[]
  total: number
  filteredTotal: number
  page: number
  pageSize: number
  totalPages: number
  stats: { total: number; choice: number; numeric: number; used: number }
  filters: {
    q: string
    type: string
    difficulty: string
    usage: string
    sort: string
  }
}

export function parseQuestionBankSearchParams(raw: SearchParams) {
  const value = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : ""
  const allowed = (key: string, options: string[], fallback: string) => {
    const candidate = value(key)
    return options.includes(candidate) ? candidate : fallback
  }
  const requestedPage = Number(value("page"))
  return {
    filters: {
      q: value("q").trim().slice(0, 500),
      type: allowed(
        "type",
        [
          "ALL",
          "SINGLE_CHOICE",
          "MULTIPLE_CHOICE",
          "NUMERIC",
          "TRUE_FALSE",
          "SHORT_ANSWER",
        ],
        "ALL"
      ),
      difficulty: allowed(
        "difficulty",
        ["ALL", "UNSET", "1", "2", "3", "4", "5"],
        "ALL"
      ),
      usage: allowed("usage", ["ALL", "REUSED", "UNUSED"], "ALL"),
      sort: allowed(
        "sort",
        ["newest", "oldest", "updated", "diff_desc", "diff_asc", "reused"],
        "newest"
      ),
    },
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    pageSize: Number(allowed("size", ["10", "20", "50"], "20")),
  }
}

/** The calling server route must verify workspace membership before reading. */
export async function getQuestionBankPage(
  workspaceId: string,
  raw: SearchParams
): Promise<QuestionBankPageData> {
  const {
    filters,
    page: requestedPage,
    pageSize,
  } = parseQuestionBankSearchParams(raw)
  const base: Prisma.QuestionWhereInput = {
    workspaceId,
    status: { in: ["DRAFT", "PUBLISHED"] },
  }
  const where: Prisma.QuestionWhereInput = { ...base }
  if (filters.type !== "ALL") where.kind = filters.type as QuestionKind
  if (filters.difficulty === "UNSET") where.difficulty = null
  else if (filters.difficulty !== "ALL")
    where.difficulty = Number(filters.difficulty)
  if (filters.usage === "REUSED") where.assessments = { some: {} }
  if (filters.usage === "UNUSED") where.assessments = { none: {} }
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const }
    where.OR = [
      { stem: contains },
      { options: { some: { content: contains } } },
      { solution: { is: { explanation: contains } } },
      { solution: { is: { textAnswer: contains } } },
      { targets: { some: { block: { title: contains } } } },
    ]
  }
  const [total, filteredTotal, choice, numeric, used] = await Promise.all([
    prisma.question.count({ where: base }),
    prisma.question.count({ where }),
    prisma.question.count({
      where: {
        ...base,
        kind: { in: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] },
      },
    }),
    prisma.question.count({ where: { ...base, kind: "NUMERIC" } }),
    prisma.question.count({ where: { ...base, assessments: { some: {} } } }),
  ])
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize))
  const page = Math.min(requestedPage, totalPages)
  let ordering: Prisma.QuestionOrderByWithRelationInput = { createdAt: "desc" }
  if (filters.sort === "oldest") ordering = { createdAt: "asc" }
  if (filters.sort === "updated") ordering = { updatedAt: "desc" }
  if (filters.sort === "reused") ordering = { assessments: { _count: "desc" } }
  if (filters.sort === "diff_asc" || filters.sort === "diff_desc") {
    ordering = {
      difficulty: {
        sort: filters.sort === "diff_asc" ? "asc" : "desc",
        nulls: "last",
      },
    }
  }
  const rows = await prisma.question.findMany({
    where,
    orderBy: [ordering, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
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
      targets: { select: { block: { select: { title: true } } } },
      _count: { select: { assessments: true, targets: true } },
    },
  })
  const bank: QuestionBankItem[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind as QuestionBankItem["kind"],
    stem: row.stem,
    difficulty: row.difficulty,
    status: row.status.toLowerCase() as QuestionBankItem["status"],
    options: row.options,
    answerKeys: (row.solution?.correctOptions ?? []).map(
      (item) => item.questionOption.key
    ),
    numericAnswer:
      row.solution?.numericAnswer == null
        ? null
        : Number(row.solution.numericAnswer),
    textAnswer: row.solution?.textAnswer ?? null,
    explanation: row.solution?.explanation ?? null,
    targetTitles: row.targets
      .map((target) => target.block.title)
      .filter(
        (title): title is string =>
          typeof title === "string" && title.length > 0
      ),
    targetsCount: row._count.targets,
    assessmentsCount: row._count.assessments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
  return {
    bank,
    total,
    filteredTotal,
    page,
    pageSize,
    totalPages,
    stats: { total, choice, numeric, used },
    filters,
  }
}

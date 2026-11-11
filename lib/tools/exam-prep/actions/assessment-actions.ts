"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { executeToolAction } from "@/lib/tools/execute-tool-action"
import {
  getMockTestsActionContext,
  getMockTestsWriteContext,
} from "@/lib/tools/definitions/mock-tests/action-context"
import { getSubjectAssessmentContext } from "../assessment-context"
import { subjectAssessmentScopeSchema } from "../assessment-study-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

const scopeSchema = subjectAssessmentScopeSchema.extend({
  workspaceSlug: z.string().trim().min(1).max(100),
})
const catalogSchema = scopeSchema.extend({
  search: z.string().trim().max(200).default(""),
  page: z.number().int().min(1).max(10000).default(1),
})

export type SubjectAssessmentCandidate = {
  id: string
  title: string
  revision: number
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED"
  questionCount: number
  durationMinutes: number | null
}

/** Bounded, authorized discovery; only unassigned papers can be linked here. */
export async function getSubjectAssessmentCatalogAction(
  input: z.input<typeof catalogSchema>
) {
  const parsed = catalogSchema.parse(input)
  await getSubjectAssessmentContext(parsed.workspaceSlug, parsed)
  const context = await getMockTestsActionContext(parsed.workspaceSlug)
  const where = {
    workspaceId: context.workspaceId,
    examBlockId: null,
    status: { not: "ARCHIVED" as const },
    block: {
      status: "ACTIVE" as const,
      archivedAt: null,
      originToolInstallationId: context.installationId,
      ...(parsed.search
        ? { title: { contains: parsed.search, mode: "insensitive" as const } }
        : {}),
    },
  }
  const total = await prisma.assessment.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const page = Math.min(parsed.page, totalPages)
  const papers = await prisma.assessment.findMany({
    where,
    orderBy: [{ block: { updatedAt: "desc" } }, { blockId: "asc" }],
    skip: (page - 1) * 20,
    take: 20,
    select: {
      blockId: true,
      status: true,
      durationMinutes: true,
      block: { select: { title: true, revision: true } },
      _count: {
        select: {
          questions: { where: { question: { status: { not: "ARCHIVED" } } } },
        },
      },
    },
  })
  return {
    items: papers.map((paper): SubjectAssessmentCandidate => ({
      id: paper.blockId,
      title: paper.block.title,
      revision: Number(paper.block.revision),
      status: paper.status,
      questionCount: paper._count.questions,
      durationMinutes: paper.durationMinutes,
    })),
    total,
    page,
    totalPages,
  }
}

const linkSchema = scopeSchema.extend({
  assessmentId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  operation: z.enum(["link", "unlink"]),
  idempotencyKey: z.string().min(1).max(128),
})

/** Reuse the canonical revision/idempotency-aware metadata action; never copy content/results. */
export async function setSubjectAssessmentLinkAction(
  input: z.input<typeof linkSchema>
) {
  const parsed = linkSchema.parse(input)
  const study = await getSubjectAssessmentContext(parsed.workspaceSlug, parsed)
  if (!study.canWrite)
    throw new Error("You do not have permission to manage subject assessments.")
  const context = await getMockTestsWriteContext(parsed.workspaceSlug)
  const current = await prisma.assessment.findFirst({
    where: {
      blockId: parsed.assessmentId,
      workspaceId: context.workspaceId,
      status: { not: "ARCHIVED" },
      block: {
        status: "ACTIVE",
        archivedAt: null,
        originToolInstallationId: context.installationId,
      },
    },
    select: {
      examBlockId: true,
      instructions: true,
      durationMinutes: true,
      totalMarks: true,
      block: { select: { title: true, revision: true } },
    },
  })
  if (!current) throw new Error("This assessment is no longer available.")
  // The exact current revision is also checked inside the write transaction.
  // An uncertain retry is allowed to reach the canonical idempotency replay.
  if (Number(current.block.revision) === parsed.expectedRevision) {
    if (parsed.operation === "link" && current.examBlockId !== null) {
      throw new Error(
        "This assessment already has a study context. Open it to change that context explicitly."
      )
    }
    if (
      parsed.operation === "unlink" &&
      current.examBlockId !== study.targetBlockId
    ) {
      throw new Error(
        "This assessment is not directly linked to this study area."
      )
    }
  }
  const result = await executeToolAction({
    toolKey: "core.mock-tests",
    actionKey: "assessment.update",
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    idempotencyKey: parsed.idempotencyKey,
    input: {
      assessmentId: parsed.assessmentId,
      expectedRevision: parsed.expectedRevision,
      title: current.block.title,
      instructions: current.instructions,
      durationMinutes: current.durationMinutes,
      totalMarks:
        current.totalMarks === null ? null : Number(current.totalMarks),
      examBlockId: parsed.operation === "link" ? study.targetBlockId : null,
    },
  })
  revalidatePath(workspaceRoutes.examPrep.home(parsed.workspaceSlug), "layout")
  revalidatePath(workspaceRoutes.mockTests.home(parsed.workspaceSlug), "layout")
  return { runId: result.runId }
}

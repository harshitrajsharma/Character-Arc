import "server-only"
import { unstable_rethrow } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { activeExamPrepBlock } from "./assessment-study-validation"
import { ToolActionExecutionError } from "@/lib/tools/errors"
import {
  getWorkspaceIdentity,
  getActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import {
  subjectAssessmentScopeSchema,
  subjectTestsHref,
  parseSubjectTestsReturn,
  type SubjectAssessmentContext,
  type SubjectAssessmentScope,
} from "./assessment-study-context"

/** A contextual create/link must use a real active exam → subject → chapter graph. */
export async function getSubjectAssessmentContext(
  workspaceSlug: string,
  input: SubjectAssessmentScope
): Promise<SubjectAssessmentContext> {
  const scope = subjectAssessmentScopeSchema.parse(input)
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await getActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )
  const active = activeExamPrepBlock(workspace.id, installation.id)
  const subject = await prisma.blockRelation.findFirst({
    where: {
      workspaceId: workspace.id,
      fromBlockId: scope.examId,
      toBlockId: scope.subjectId,
      relationType: { key: "exam-prep.exam-has-subject" },
      fromBlock: {
        ...active,
        blockType: { key: "exam-prep.exam" },
        examDetails: { isNot: null },
      },
      toBlock: {
        ...active,
        blockType: { key: "exam-prep.subject" },
        subjectDetails: { isNot: null },
      },
    },
    select: {
      fromBlock: { select: { title: true } },
      toBlock: { select: { title: true } },
    },
  })
  if (!subject)
    throw new ToolActionExecutionError(
      "This subject is not available in this exam.",
      "NOT_AVAILABLE"
    )
  let chapterTitle: string | null = null
  if (scope.chapterId) {
    const chapter = await prisma.blockRelation.findFirst({
      where: {
        workspaceId: workspace.id,
        fromBlockId: scope.subjectId,
        toBlockId: scope.chapterId,
        relationType: { key: "exam-prep.subject-has-chapter" },
        fromBlock: { ...active, blockType: { key: "exam-prep.subject" } },
        toBlock: {
          ...active,
          blockType: { key: "exam-prep.chapter" },
          chapterDetails: { isNot: null },
        },
      },
      select: { toBlock: { select: { title: true } } },
    })
    if (!chapter)
      throw new ToolActionExecutionError(
        "This chapter is not available in this subject.",
        "NOT_AVAILABLE"
      )
    chapterTitle = chapter.toBlock.title
  }
  return {
    ...scope,
    targetBlockId: scope.chapterId ?? scope.subjectId,
    examTitle: subject.fromBlock.title,
    subjectTitle: subject.toBlock.title,
    chapterTitle,
    canWrite: workspace.role !== "VIEWER",
    returnHref: subjectTestsHref(workspaceSlug, scope),
  }
}

export async function resolveSubjectTestsReturn(
  workspaceSlug: string,
  value: unknown
) {
  const scope = parseSubjectTestsReturn(workspaceSlug, value)
  if (!scope) return null
  try {
    return await getSubjectAssessmentContext(workspaceSlug, scope)
  } catch (error) {
    unstable_rethrow(error)
    return null
  }
}

import { z } from "zod"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const subjectAssessmentScopeSchema = z.object({
  examId: z.uuid(),
  subjectId: z.uuid(),
  chapterId: z.uuid().optional(),
})

export type SubjectAssessmentScope = z.infer<
  typeof subjectAssessmentScopeSchema
>
export type SubjectAssessmentContext = SubjectAssessmentScope & {
  targetBlockId: string
  examTitle: string
  subjectTitle: string
  chapterTitle: string | null
  returnHref: string
  canWrite: boolean
}

export function subjectTestsHref(
  workspaceSlug: string,
  scope: SubjectAssessmentScope
) {
  const query = new URLSearchParams({ stage: "test" })
  if (scope.chapterId) {
    query.set("chapterId", scope.chapterId)
    query.set("type", "chapter-test")
  }
  return `${workspaceRoutes.examPrep.subject(workspaceSlug, scope.examId, scope.subjectId)}?${query}`
}

export function subjectAssessmentCreationHref(
  workspaceSlug: string,
  scope: SubjectAssessmentScope
) {
  const query = new URLSearchParams({
    fromExam: scope.examId,
    fromSubject: scope.subjectId,
  })
  if (scope.chapterId) query.set("fromChapter", scope.chapterId)
  return `${workspaceRoutes.mockTests.new(workspaceSlug)}?${query}`
}

/** Only a canonical subject Tests destination in the current workspace is accepted. */
export function parseSubjectTestsReturn(
  workspaceSlug: string,
  value: unknown
): SubjectAssessmentScope | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    return null
  try {
    const url = new URL(value, "https://character-arc.invalid")
    if (url.origin !== "https://character-arc.invalid") return null
    const prefix = `${workspaceRoutes.examPrep.home(workspaceSlug)}/`
    if (!url.pathname.startsWith(prefix)) return null
    const parts = url.pathname.slice(prefix.length).split("/")
    if (parts.length !== 3 || parts[1] !== "subjects") return null
    const parsed = subjectAssessmentScopeSchema.safeParse({
      examId: parts[0],
      subjectId: parts[2],
      chapterId: url.searchParams.get("chapterId") ?? undefined,
    })
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function withSubjectReturn(href: string, returnHref?: string | null) {
  if (!returnHref) return href
  const url = new URL(href, "https://character-arc.invalid")
  url.searchParams.set("returnTo", returnHref)
  return `${url.pathname}${url.search}${url.hash}`
}

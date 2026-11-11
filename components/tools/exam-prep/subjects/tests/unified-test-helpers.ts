import type {
  ScheduledTest,
  SubjectLinkedAssessment,
} from "@/types/progressapp/domain"
import type { BaseTestRecord } from "@/types/progressapp/domain/assessment"

export function joinTestRecords(
  plans: ScheduledTest[],
  records: BaseTestRecord[]
) {
  const byId = new Map(records.map((record) => [record.id, record]))
  const byPlan = new Map(
    records
      .filter((record) => record.scheduledTestId)
      .map((record) => [record.scheduledTestId, record])
  )
  const joinedIds = new Set<string>()
  const scheduled = plans.map((plan) => {
    const record =
      (plan.testRecordId ? byId.get(plan.testRecordId) : undefined) ??
      byPlan.get(plan.id)
    if (record) joinedIds.add(record.id)
    return { plan, record }
  })
  return {
    scheduled,
    standalone: records.filter((record) => !joinedIds.has(record.id)),
  }
}

export function assessmentsForScope(
  assessments: SubjectLinkedAssessment[],
  chapterId?: string
) {
  return assessments.filter((assessment) =>
    chapterId ? assessment.targetChapterIds.includes(chapterId) : true
  )
}

export type AssessmentListFilter = "all" | "linked" | "matched"
export type AssessmentStatusFilter = "all" | "published" | "draft" | "active"

/** Local projection is bounded upstream; prioritize an unfinished test, then direct links. */
export function filterSubjectAssessments(
  assessments: SubjectLinkedAssessment[],
  filter: AssessmentListFilter,
  search: string,
  status: AssessmentStatusFilter = "all"
) {
  const query = search.trim().toLocaleLowerCase()
  const active = (assessment: SubjectLinkedAssessment) =>
    assessment.attempts.some((attempt) => attempt.status === "IN_PROGRESS")
  return assessments
    .filter(
      (assessment) =>
        (filter === "all" ||
          (filter === "linked" && assessment.linkage === "context") ||
          (filter === "matched" && assessment.linkage !== "context")) &&
        (status === "all" ||
          (status === "active" && active(assessment)) ||
          (status === "published" && assessment.status === "PUBLISHED") ||
          (status === "draft" &&
            ["DRAFT", "IN_REVIEW"].includes(assessment.status))) &&
        (!query || assessment.title.toLocaleLowerCase().includes(query))
    )
    .sort(
      (left, right) =>
        Number(active(right)) - Number(active(left)) ||
        Number(right.linkage === "context") - Number(left.linkage === "context")
    )
}

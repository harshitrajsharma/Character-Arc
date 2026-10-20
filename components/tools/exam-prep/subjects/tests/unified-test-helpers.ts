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
    chapterId
      ? assessment.targetChapterIds.includes(chapterId)
      : assessment.targetsWholeSubject
  )
}

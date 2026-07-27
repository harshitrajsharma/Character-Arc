import type { SyllabusStage } from "@/components/tools/exam-prep/subjects/syllabus/syllabus-model"
import type { StudyPathStepKind, StudyPathStep } from "@/lib/tools/exam-prep/study-path"

export function isPendingStudyPathStep(step: StudyPathStep): boolean {
  return step.status !== "completed" && step.status !== "overachieved"
}

export interface NavigationTarget {
  stage: SyllabusStage
  chapterId?: string
  topicId?: string
  type: StudyPathStepKind
  timestamp: number
}

export function getNavigationTargetForStep(step: StudyPathStep): NavigationTarget {
  let stage: SyllabusStage = "learning"
  if (step.kind === "learn") {
    stage = "learning"
  } else if (step.kind === "revise") {
    stage = "revision"
  } else if (step.kind === "practice") {
    stage = "practice"
  } else if (step.kind === "chapter-test" || step.kind === "subject-test" || step.kind === "remediation") {
    stage = "test"
  }

  return {
    stage,
    chapterId: step.kind === "subject-test" ? undefined : step.chapterId,
    topicId: (step.kind === "learn" || step.kind === "revise" || step.kind === "practice") ? step.topicId : undefined,
    type: step.kind,
    timestamp: Date.now(),
  }
}

export function getActionLabelForStep(kind: StudyPathStepKind): string {
  switch (kind) {
    case "learn":
      return "Learn topic"
    case "revise":
      return "Start revision"
    case "practice":
      return "Start practice"
    case "chapter-test":
      return "Open chapter test"
    case "subject-test":
      return "Open subject test"
    case "remediation":
      return "Review test"
  }
}
